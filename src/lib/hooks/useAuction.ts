'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  getAuctionById,
  getBidsForAuction,
  getAuctionStats,
  placeBid,
  buyNow,
  type AuctionProduct,
  type AuctionBid,
} from '@/lib/services/auctionService';
import { getSessionWithTimeout } from '@/lib/supabase/client';

interface UseAuctionReturn {
  // Datos
  auction: AuctionProduct | null;
  bids: AuctionBid[];
  stats: any;
  currentBid: number;
  timeRemainingMs: number;
  
  // Estados
  loading: boolean;
  error: string | null;
  isWinning: boolean;
  isActive: boolean;
  isEnded: boolean;
  
  // Acciones
  placeBid: (amount: number) => Promise<{ success: boolean; error?: string }>;
  buyNow: () => Promise<{ success: boolean; error?: string }>;
  refresh: () => Promise<void>;
}

export function useAuction(productId: string): UseAuctionReturn {
  const [auction, setAuction] = useState<AuctionProduct | null>(null);
  const [bids, setBids] = useState<AuctionBid[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [lastBidTime, setLastBidTime] = useState<number>(0);

  // Calcular estados derivados
  const currentBid = auction?.current_bid || auction?.price || 0;
  const isActive = auction?.auction_status === 'active';
  const isEnded = auction?.auction_status === 'ended' || auction?.auction_status === 'cancelled';
  
  // Calcular tiempo restante usando tiempo sincronizado
  const timeRemainingMs = (() => {
    if (!auction?.auction_end_at || isEnded) return 0;
    try {
      const { getSyncedNow } = require('@/lib/utils/timeSync');
      const endAt = new Date(auction.auction_end_at).getTime();
      const syncedNow = getSyncedNow();
      return Math.max(0, endAt - syncedNow);
    } catch {
      // Fallback si timeSync no está disponible
      const endAt = new Date(auction.auction_end_at).getTime();
      const now = Date.now();
      return Math.max(0, endAt - now);
    }
  })();

  // Verificar si el usuario está ganando
  const isWinning = (() => {
    if (!currentUserId || !bids.length) return false;
    const highestBid = bids[0];
    return highestBid?.bidder_id === currentUserId;
  })();

  // Cargar datos
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [auctionData, bidsData, statsData] = await Promise.all([
        getAuctionById(productId),
        getBidsForAuction(productId),
        getAuctionStats(productId),
      ]);

      if (!auctionData) {
        setError('Subasta no encontrada');
        return;
      }

      setAuction(auctionData);
      setBids(bidsData);
      setStats(statsData);
    } catch (err: any) {
      console.error('Error loading auction:', err);
      setError(err.message || 'Error al cargar la subasta');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  // Obtener usuario actual
  useEffect(() => {
    const loadUser = async () => {
      const { data: session } = await getSessionWithTimeout();
      if (session?.session?.user?.id) {
        setCurrentUserId(session.session.user.id);
      }
    };
    loadUser();
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    if (productId) {
      loadData();
    }
  }, [productId, loadData]);

  // Configurar suscripciones en tiempo real
  useEffect(() => {
    if (!productId) return;

    const channel = supabase
      .channel(`auction-${productId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `id=eq.${productId}`,
        },
        () => {
          // Recargar cuando cambia el producto
          loadData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'auction_bids',
          filter: `product_id=eq.${productId}`,
        },
        (payload) => {
          // Nueva puja detectada - actualizar tiempo para anti-sniping
          setLastBidTime(Date.now());
          // Recargar pujas y subasta para obtener estado actualizado
          Promise.all([
            getBidsForAuction(productId).then(setBids).catch(console.error),
            getAuctionById(productId).then((auction) => {
              if (auction) {
                setAuction(auction);
              }
            }).catch(console.error),
          ]).catch(console.error);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [productId, loadData]);

  // Función para colocar puja
  const handlePlaceBid = useCallback(
    async (amount: number): Promise<{ success: boolean; error?: string }> => {
      if (!currentUserId) {
        return { success: false, error: 'Debes iniciar sesión para pujar' };
      }

      if (auction?.seller_id === currentUserId) {
        return { success: false, error: 'No puedes pujar en tus propias subastas' };
      }

      if (!isActive) {
        return { success: false, error: 'La subasta no está activa' };
      }

      try {
        // Generar idempotency key para prevenir pujas duplicadas
        const idempotencyKey = crypto.randomUUID();
        const result = await placeBid(productId, currentUserId, amount, idempotencyKey);
        
        if (result.success) {
          // Si se aplicó bonus time, actualizar el estado inmediatamente con el nuevo end_time
          // Esto evita que el timer muestre tiempo incorrecto mientras se recarga
          if (result.bonus_applied && result.bonus_new_end_time && auction) {
            // Actualizar auction_end_at inmediatamente
            setAuction({
              ...auction,
              auction_end_at: result.bonus_new_end_time,
            });
            
            // Log para debugging
            console.log('[useAuction] Bonus time aplicado, actualizando end_time', {
              oldEndTime: auction.auction_end_at,
              newEndTime: result.bonus_new_end_time,
              extensionSeconds: result.bonus_extension_seconds,
            });
          }
          
          // Recargar datos para obtener estado actualizado completo
          // El tiempo real también actualizará automáticamente, pero esto asegura consistencia
          await loadData();
          setLastBidTime(Date.now());
        }
        
        return result;
      } catch (err: any) {
        return {
          success: false,
          error: err.message || 'Error inesperado al colocar la puja',
        };
      }
    },
    [productId, currentUserId, auction, isActive, loadData]
  );

  // Función para compra ahora
  const handleBuyNow = useCallback(
    async (): Promise<{ success: boolean; error?: string }> => {
      if (!currentUserId) {
        return { success: false, error: 'Debes iniciar sesión para comprar' };
      }

      if (auction?.seller_id === currentUserId) {
        return { success: false, error: 'No puedes comprar tus propias subastas' };
      }

      if (!auction?.buy_now_price) {
        return { success: false, error: 'Esta subasta no tiene opción de compra ahora' };
      }

      if (!isActive) {
        return { success: false, error: 'La subasta no está activa' };
      }

      try {
        const result = await buyNow(productId, currentUserId);
        
        if (result.success) {
          // Recargar datos
          await loadData();
        }
        
        return result;
      } catch (err: any) {
        return {
          success: false,
          error: err.message || 'Error inesperado',
        };
      }
    },
    [productId, currentUserId, auction, isActive, loadData]
  );

  return {
    // Datos
    auction,
    bids,
    stats,
    currentBid,
    timeRemainingMs,
    
    // Estados
    loading,
    error,
    isWinning,
    isActive,
    isEnded,
    
    // Acciones
    placeBid: handlePlaceBid,
    buyNow: handleBuyNow,
    refresh: loadData,
  };
}


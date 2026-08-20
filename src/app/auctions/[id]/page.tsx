'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getAuctionById, getAuctionStats, getRelatedActiveAuctions, type AuctionProduct } from '@/lib/services/auctionService';
import AuctionTimer from '@/components/auction/AuctionTimer';
import BidForm from '@/components/auction/BidForm';
import BidHistory from '@/components/auction/BidHistory';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui';
import { ArrowLeft, Gavel, User, MapPin, Calendar, Clock, ChevronLeft, ChevronRight, Share2, Flag, TrendingUp, ShoppingCart, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import ProductImageGallery from '@/components/ProductImageGallery';
import { getSyncedNow } from '@/lib/utils/timeSync';

export default function AuctionDetailPage() {
  const params = useParams();
  const productId = params.id as string;
  
  const [auction, setAuction] = useState<AuctionProduct | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastBidTime, setLastBidTime] = useState<number>(0);
  const [sellerInfo, setSellerInfo] = useState<any>(null);
  const [newBidNotification, setNewBidNotification] = useState<string | null>(null);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [relatedAuctions, setRelatedAuctions] = useState<Array<{id: string; title: string; image_url: string | null}>>([]);
  const [serverTime, setServerTime] = useState<number>(Date.now());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [maxVersion, setMaxVersion] = useState<number>(0); // Para descartar mensajes viejos
  const [isConnected, setIsConnected] = useState<boolean>(true); // Estado de conexión WebSocket
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myBidPosition, setMyBidPosition] = useState<number | null>(null); // Posición del usuario (1ro, 2do, etc.)
  const [winnerInfo, setWinnerInfo] = useState<any>(null);
  const [recentEvents, setRecentEvents] = useState<Array<{type: string; message: string; time: string}>>([]);
  const [previousEndAt, setPreviousEndAt] = useState<string | null>(null); // Para detectar extensiones anti-sniping
  
  // Refs para polling adaptativo (accesibles desde callbacks)
  const isInAntiSnipingRef = useRef<boolean>(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Contador para limitar requests durante anti-sniping
  const lastLoadTimeRef = useRef<number>(0);
  const requestsInLastSecondRef = useRef<number>(0);
  const requestsResetIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Función para reproducir sonido (mover fuera de useEffect)
  const playBidSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.warn('No se pudo reproducir sonido:', error);
    }
  }, [soundEnabled]);
  
  // Función para confetti
  const triggerBidConfetti = useCallback(() => {
    const colors = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles: Array<{x: number; y: number; vx: number; vy: number; color: string}> = [];
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
    
    let animationFrame: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((particle, i) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.2;
        
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 4, 0, Math.PI * 2);
        ctx.fill();
        
        if (particle.y > canvas.height) {
          particles.splice(i, 1);
        }
      });
      
      if (particles.length > 0) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        if (document.body.contains(canvas)) {
          document.body.removeChild(canvas);
        }
      }
    };
    
    animate();
    setTimeout(() => {
      if (document.body.contains(canvas)) {
        document.body.removeChild(canvas);
      }
    }, 3000);
  }, []);

  useEffect(() => {
    if (productId) {
      loadAuction();
      
      // ============================================
      // POLLING ADAPTATIVO: Aumentar frecuencia en últimos segundos
      // ============================================
      const setupAdaptivePolling = () => {
        // Limpiar intervalo anterior si existe
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
        
        // Calcular tiempo restante
        if (!auction?.auction_end_at || auction.auction_status === 'ended' || auction.auction_status === 'cancelled') {
          // Si la subasta terminó, usar polling normal de 10s (para detectar cierre)
          pollingIntervalRef.current = setInterval(() => {
            loadAuction();
          }, 10000);
          return;
        }
        
        const endAtMs = new Date(auction.auction_end_at).getTime();
        const now = getSyncedNow();
        const remainingMs = Math.max(0, endAtMs - now);
        
        // Determinar intervalo según tiempo restante
        let intervalMs: number;
        
        if (isInAntiSnipingRef.current) {
          // Durante extensión anti-sniping: actualizar cada 500ms usando quick endpoint
          intervalMs = 500;
          if (process.env.NODE_ENV === 'development') {
            console.log('⚡ ANTI-SNIPING: Polling cada 500ms (quick)');
          }
          
          pollingIntervalRef.current = setInterval(() => {
            loadAuctionQuick();
          }, intervalMs);
        } else if (remainingMs <= 10000) {
          // Últimos 10 segundos: actualizar cada 1 segundo usando quick
          intervalMs = 1000;
          if (process.env.NODE_ENV === 'development') {
            console.log('🔥 ÚLTIMOS 10s: Polling cada 1s (quick)');
          }
          
          pollingIntervalRef.current = setInterval(() => {
            loadAuctionQuick();
          }, intervalMs);
        } else if (remainingMs <= 30000) {
          // Últimos 30 segundos: actualizar cada 2 segundos usando quick
          intervalMs = 2000;
          if (process.env.NODE_ENV === 'development') {
            console.log('🔥 ÚLTIMOS 30s: Polling cada 2s (quick)');
          }
          
          pollingIntervalRef.current = setInterval(() => {
            loadAuctionQuick();
          }, intervalMs);
        } else if (remainingMs <= 60000) {
          // Último minuto: actualizar cada 3 segundos
          intervalMs = 3000;
          if (process.env.NODE_ENV === 'development') {
            console.log('⏱️ ÚLTIMO MINUTO: Polling cada 3s');
          }
          
          pollingIntervalRef.current = setInterval(() => {
            loadAuction();
          }, intervalMs);
        } else {
          // Normal: actualizar cada 10 segundos
          intervalMs = 10000;
          
          pollingIntervalRef.current = setInterval(() => {
            loadAuction();
          }, intervalMs);
        }
      };
      
      // Configurar polling inicial
      setupAdaptivePolling();
      
      // Reconfigurar polling cada 5 segundos para ajustar según tiempo restante
      const pollingConfigInterval = setInterval(() => {
        setupAdaptivePolling();
      }, 5000);
      
      // Configurar suscripción en tiempo real para actualizar el timer cuando hay nuevas pujas
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
          (payload) => {
            // Recargar subasta cuando cambia
            if (payload.new) {
              const newAuction = payload.new as any;
              
              // Verificar versión para descartar mensajes viejos
              const messageVersion = newAuction.auction_version || 0;
              if (messageVersion < maxVersion) {
                console.warn('⚠️ Ignorando mensaje viejo (version:', messageVersion, '< max:', maxVersion, ')');
                return;
              }
              
              // Actualizar versión máxima vista
              if (messageVersion > maxVersion) {
                setMaxVersion(messageVersion);
              }
              
              // DETECTAR ANTI-SNIPING: Si cambió auction_end_at, es una extensión de tiempo
              if (newAuction.auction_end_at && previousEndAt && newAuction.auction_end_at !== previousEndAt) {
                const oldEndAt = new Date(previousEndAt);
                const newEndAt = new Date(newAuction.auction_end_at);
                const extensionMs = newEndAt.getTime() - oldEndAt.getTime();
                
                if (extensionMs > 0) {
                  if (process.env.NODE_ENV === 'development') {
                    console.log('⏰ ⚠️ ANTI-SNIPING ACTIVADO: +' + (extensionMs / 1000) + 's');
                  }
                  isInAntiSnipingRef.current = true; // Activar flag para polling ultra-rápido
                  requestsInLastSecondRef.current = 0; // Reset contador al activar anti-sniping
                  setNewBidNotification(`⏰ Tiempo extendido por nueva puja (+${Math.floor(extensionMs / 1000)}s)`);
                  
                  // Reconfigurar polling inmediatamente para usar frecuencia anti-sniping
                  setupAdaptivePolling();
                  
                  // Desactivar flag después de la extensión (con margen de seguridad)
                  setTimeout(() => {
                    isInAntiSnipingRef.current = false;
                    requestsInLastSecondRef.current = 0;
                    setupAdaptivePolling(); // Reconfigurar polling
                  }, extensionMs + 5000); // Mantener polling rápido durante extensión + 5s
                  
                  // Sonido especial para extensión
                  try {
                    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(1500, audioContext.currentTime + 0.2);
                    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.4);
                  } catch (e) {}
                  
                  // Ocultar notificación después de 5 segundos
                  setTimeout(() => setNewBidNotification(null), 5000);
                }
              }
              
              // Guardar nuevo end_at
              if (newAuction.auction_end_at) {
                setPreviousEndAt(newAuction.auction_end_at);
                setLastBidTime(serverTime);
              }
              
              // Si cambió el estado, actualizar UI
              if (newAuction.auction_status) {
                console.log('🔄 Estado de subasta actualizado:', newAuction.auction_status, 'version:', messageVersion);
              }
            }
            
            loadAuction();
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
            // Nueva puja recibida - actualizar tiempo para anti-sniping
            setLastBidTime(serverTime);
            
            // Efectos de sonido y confetti
            playBidSound();
            triggerBidConfetti();
            
            // Feedback visual: mostrar notificación de nueva puja
            if (payload.new) {
              const newBid = payload.new as any;
              const bidAmount = formatCurrency(newBid.amount);
              if (process.env.NODE_ENV === 'development') {
              console.log('💰 Nueva puja recibida:', bidAmount);
            }
              setNewBidNotification(`¡Nueva puja: ${bidAmount}!`);
              // Ocultar notificación después de 5 segundos
              setTimeout(() => setNewBidNotification(null), 5000);
            }
            
            // CRÍTICO: Recargar subasta inmediatamente para actualizar winner_id y current_bid
            // Esto asegura que todos los usuarios vean quién es el ganador actual
            if (auction?.auction_end_at) {
              const endAtMs = new Date(auction.auction_end_at).getTime();
              const now = getSyncedNow();
              const remainingMs = endAtMs - now;
              
              if (remainingMs <= 30000) {
                // En últimos 30s, usar quick endpoint para respuesta más rápida
                loadAuctionQuick();
              } else {
                loadAuction();
              }
              
              if (remainingMs <= 60000) {
                // Si quedan menos de 60 segundos, reconfigurar polling para usar frecuencia máxima
                setupAdaptivePolling();
              }
            } else {
              loadAuction();
            }
          }
        )
        .subscribe((status) => {
          // Detectar estado de conexión
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ Conectado a canal de subasta');
            }
                      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                        setIsConnected(false);
                        // Solo loguear warning en desarrollo o si es un error persistente
                        if (process.env.NODE_ENV === 'development') {
                          console.warn('⚠️ Desconectado del canal de subasta. El sistema intentará reconectar automáticamente...');
                        }
                        
                        // Recargar datos de la subasta después de un breve retraso
                        // El canal de Supabase se reconectará automáticamente
                        setTimeout(() => {
                          if (process.env.NODE_ENV === 'development') {
                            console.log('🔄 Recargando datos de la subasta...');
                          }
                          loadAuction();
                        }, 2000);
                      }
        });
      
      // Sincronizar tiempo del servidor periódicamente (más frecuente en últimos segundos)
      const setupTimeSync = () => {
        if (timeSyncIntervalRef.current) {
          clearInterval(timeSyncIntervalRef.current);
        }
        
        // Calcular tiempo restante para determinar frecuencia
        if (!auction?.auction_end_at || auction.auction_status === 'ended' || auction.auction_status === 'cancelled') {
          // Subasta terminada: sincronizar cada 30s
          timeSyncIntervalRef.current = setInterval(async () => {
            try {
              const { getServerTime } = await import('@/lib/utils/timeSync');
              const serverTimeNow = await getServerTime();
              setServerTime(serverTimeNow);
            } catch (err) {
              console.warn('Error sincronizando tiempo:', err);
            }
          }, 30000);
          return;
        }
        
        const endAtMs = new Date(auction.auction_end_at).getTime();
        const now = getSyncedNow();
        const remainingMs = Math.max(0, endAtMs - now);
        
        // Sincronizar más frecuentemente en últimos segundos
        const syncInterval = remainingMs <= 60000 ? 5000 : 30000; // 5s si quedan <60s, 30s si no
        
        timeSyncIntervalRef.current = setInterval(async () => {
          try {
            const { getServerTime } = await import('@/lib/utils/timeSync');
            const serverTimeNow = await getServerTime();
            setServerTime(serverTimeNow);
          } catch (err) {
            console.warn('Error sincronizando tiempo:', err);
          }
        }, syncInterval);
      };
      
      setupTimeSync();
      
      // Reconfigurar sincronización de tiempo cada 10 segundos
      const timeSyncConfigInterval = setInterval(() => {
        setupTimeSync();
      }, 10000);
      
      // Reset contador de requests cada segundo durante anti-sniping
      requestsResetIntervalRef.current = setInterval(() => {
        requestsInLastSecondRef.current = 0;
      }, 1000);
      
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
        if (timeSyncIntervalRef.current) {
          clearInterval(timeSyncIntervalRef.current);
        }
        if (requestsResetIntervalRef.current) {
          clearInterval(requestsResetIntervalRef.current);
        }
        clearInterval(pollingConfigInterval);
        clearInterval(timeSyncConfigInterval);
        supabase.removeChannel(channel);
      };
    }
  }, [productId, playBidSound, triggerBidConfetti]);

  // Función para cargar solo datos críticos (últimos segundos)
  const loadAuctionQuick = async () => {
    try {
      const now = Date.now();
      
      // Límite de seguridad: máximo 5 requests por segundo durante anti-sniping
      if (isInAntiSnipingRef.current) {
        const timeSinceLastLoad = now - lastLoadTimeRef.current;
        if (timeSinceLastLoad < 200) {
          // Si pasó menos de 200ms desde la última carga, saltar esta
          return;
        }
        
        requestsInLastSecondRef.current++;
        if (requestsInLastSecondRef.current > 5) {
          // Límite de 5 requests por segundo alcanzado
          return;
        }
      }
      
      lastLoadTimeRef.current = now;
      
      // Endpoint liviano solo para datos críticos
      const response = await fetch(`/api/auctions/${productId}/quick`, {
        cache: 'no-store',
      });
      
      if (!response.ok) {
        // Si falla quick endpoint, usar load completo
        await loadAuction();
        return;
      }
      
      const quickData = await response.json();
      
      // Actualizar solo campos críticos
      if (auction) {
        setAuction({
          ...auction,
          current_bid: quickData.current_bid,
          winner_id: quickData.winner_id,
          auction_status: quickData.auction_status,
          auction_end_at: quickData.auction_end_at,
          total_bids: quickData.total_bids,
        });
        
        // Actualizar previousEndAt si cambió (anti-sniping)
        if (quickData.auction_end_at && quickData.auction_end_at !== previousEndAt) {
          setPreviousEndAt(quickData.auction_end_at);
        }
        
        // Si terminó, cargar datos completos una vez
        if (quickData.auction_status === 'ended' && auction.auction_status !== 'ended') {
          await loadAuction();
        }
      }
    } catch (err) {
      // Si falla, intentar carga completa
      console.warn('Error en loadAuctionQuick, usando loadAuction completo:', err);
      await loadAuction();
    }
  };

  const loadAuction = async (useQuick: boolean = false) => {
    try {
      // Early return: Si la subasta terminó y ya tenemos los datos, no recargar innecesariamente
      if (auction?.auction_status === 'ended' && !useQuick) {
        // Solo recargar una vez más para asegurar datos finales
        const hasLoadedAfterEnd = sessionStorage.getItem(`auction-ended-${productId}`);
        if (hasLoadedAfterEnd) {
          return;
        }
        sessionStorage.setItem(`auction-ended-${productId}`, 'true');
      }
      
      setError(null);
      
      // Determinar si usar endpoint quick (últimos 30 segundos)
      const shouldUseQuick = useQuick || (() => {
        if (!auction?.auction_end_at) return false;
        const endAtMs = new Date(auction.auction_end_at).getTime();
        const now = getSyncedNow();
        const remainingMs = Math.max(0, endAtMs - now);
        return remainingMs <= 30000; // Usar quick en últimos 30s
      })();
      
      if (shouldUseQuick && !useQuick) {
        // Si estamos en últimos 30s pero no fue llamado explícitamente como quick, usar quick
        await loadAuctionQuick();
        return;
      }
      
      // Obtener usuario actual
      try {
        const { getSessionWithTimeout } = await import('@/lib/supabase/client');
        const { data: session } = await getSessionWithTimeout();
        if (session?.session?.user?.id) {
          setCurrentUserId(session.session.user.id);
        }
      } catch (err) {
        // Reducir logs verbosos en producción
        if (process.env.NODE_ENV === 'development') {
          console.warn('Error obteniendo usuario:', err);
        }
      }
      
      // Obtener tiempo del servidor para sincronización
      try {
        const { getServerTime } = await import('@/lib/utils/timeSync');
        const serverTimeNow = await getServerTime();
        setServerTime(serverTimeNow);
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Error sincronizando tiempo del servidor:', err);
        }
        setServerTime(Date.now());
      }
      
      // Usar versión optimizada con caché y queries consolidadas
      const [auctionData, statsData] = await Promise.all([
        getAuctionById(productId, { 
          useCache: !shouldUseQuick, // No usar caché en últimos segundos
          includeSellerInfo: true, 
          includeImages: true 
        }),
        getAuctionStats(productId),
      ]);

      if (!auctionData) {
        setError('Subasta no encontrada');
        return;
      }

      // Cargar información del vendedor (solo si no vino en auctionData)
      // Mejor práctica: usar el servicio que maneja errores correctamente
      if (auctionData.seller_id && !(auctionData as any).seller_info) {
        try {
          // Usar servicio que maneja mejor los errores y RLS
          const { getSellerProfileById } = await import('@/lib/services/sellerProfileService');
          const sellerProfile = await getSellerProfileById(auctionData.seller_id);
          
          if (sellerProfile) {
            setSellerInfo({
              id: sellerProfile.id,
              first_name: sellerProfile.first_name || null,
              last_name: sellerProfile.last_name || null,
              email: sellerProfile.email || null,
            });
          } else {
            // Fallback silencioso - no romper la página si falta info del vendedor
            setSellerInfo({
              id: auctionData.seller_id,
              first_name: null,
              last_name: null,
              email: null,
            });
          }
        } catch (err: any) {
          // Error silencioso - continuar sin info del vendedor
          // NO loguear errores esperados (400, 401, PGRST116) - estos son normales en producción
          const isExpectedError = 
            err?.code === 'PGRST116' || 
            err?.code === '23505' ||
            err?.message?.includes('400') ||
            err?.message?.includes('401') ||
            err?.message?.includes('Unauthorized') ||
            err?.message?.includes('Bad Request') ||
            err?.status === 400 ||
            err?.status === 401;
          
          if (!isExpectedError && process.env.NODE_ENV === 'development') {
            console.warn('⚠️ Error cargando info del vendedor (no crítico):', err?.message || err);
          }
          
          setSellerInfo({
            id: auctionData.seller_id,
            first_name: null,
            last_name: null,
            email: null,
          });
        }
      } else if ((auctionData as any).seller_info) {
        // Si ya viene en auctionData, usar eso
        setSellerInfo((auctionData as any).seller_info);
      } else if (!auctionData.seller_id) {
        // Solo mostrar error si realmente no hay seller_id
        console.warn('⚠️ Subasta sin seller_id');
        setError('Esta subasta no tiene vendedor asignado');
      }

      setAuction(auctionData);
      setStats(statsData);
      
      // Inicializar versión máxima cuando se carga la subasta
      if ((auctionData as any).auction_version !== undefined) {
        setMaxVersion((auctionData as any).auction_version);
      }
      
      // Inicializar previousEndAt
      if (auctionData.auction_end_at) {
        setPreviousEndAt(auctionData.auction_end_at);
      }
      
      // Calcular posición del usuario actual si está pujando
      if (currentUserId && auctionData) {
        try {
          const { data: myBids } = await supabase
            .from('auction_bids')
            .select('amount, bid_time')
            .eq('product_id', productId)
            .eq('bidder_id', currentUserId)
            .eq('is_retracted', false)
            .order('amount', { ascending: false })
            .order('bid_time', { ascending: false })
            .limit(1);
          
          if (myBids && myBids.length > 0) {
            type BidItem = { amount: number };
            const myHighestBid = (myBids[0] as BidItem).amount;
            
            // Obtener todas las pujas ordenadas para encontrar posición
            const { data: allBids } = await supabase
              .from('auction_bids')
              .select('bidder_id, amount')
              .eq('product_id', productId)
              .eq('is_retracted', false)
              .order('amount', { ascending: false });
            
            type AllBidItem = { bidder_id: string; amount: number };
            
            if (allBids) {
              const uniqueBidders = new Map<string, number>();
              (allBids as AllBidItem[]).forEach(bid => {
                if (!uniqueBidders.has(bid.bidder_id) || uniqueBidders.get(bid.bidder_id)! < bid.amount) {
                  uniqueBidders.set(bid.bidder_id, bid.amount);
                }
              });
              
              const sortedUnique = Array.from(uniqueBidders.entries())
                .sort((a, b) => b[1] - a[1]);
              
              const myPosition = sortedUnique.findIndex(([bidderId]) => bidderId === currentUserId);
              if (myPosition !== -1) {
                setMyBidPosition(myPosition + 1); // 1-indexed
              }
            }
          }
        } catch (err) {
          console.warn('Error calculando posición:', err);
        }
      }
      
      // Cargar información del ganador si la subasta terminó
      if (auctionData.auction_status === 'ended' && auctionData.winner_id) {
        try {
          // Usar servicio para obtener perfil del ganador (mejor manejo de errores)
          const { getSellerProfileById } = await import('@/lib/services/sellerProfileService');
          const winnerProfile = await getSellerProfileById(auctionData.winner_id);
          
          if (winnerProfile) {
            setWinnerInfo({
              id: winnerProfile.id,
              first_name: winnerProfile.first_name || null,
              last_name: winnerProfile.last_name || null,
              email: winnerProfile.email || null,
            });
          }
        } catch (err: any) {
          // Error silencioso - continuar sin info del ganador
          // NO loguear errores esperados en producción
          const isExpectedError = 
            err?.code === 'PGRST116' || 
            err?.message?.includes('400') ||
            err?.message?.includes('401') ||
            err?.status === 400 ||
            err?.status === 401;
          
          if (!isExpectedError && process.env.NODE_ENV === 'development') {
            console.warn('⚠️ Error cargando info del ganador (no crítico):', err?.message || err);
          }
        }
      }
      
      // Cargar eventos recientes de auditoría
      try {
        const { data: events } = await supabase
          .from('auction_events')
          .select('event_type, event_data, server_timestamp')
          .eq('product_id', productId)
          .order('server_timestamp', { ascending: false })
          .limit(10);
        
        if (events) {
          type AuctionEvent = { event_type: string; event_data?: Record<string, any>; server_timestamp: string };
          const formattedEvents = (events as AuctionEvent[]).map(event => {
            let message = '';
            const data = event.event_data || {};
            
            switch (event.event_type) {
              case 'BID_PLACED':
                message = `Nueva puja: ${formatCurrency(data.amount || 0)}`;
                break;
              case 'BID_REJECTED':
                message = `Puja rechazada: ${data.reason || 'Motivo desconocido'}`;
                break;
              case 'TIMER_EXTENDED':
                // Mostrar mensaje más claro sobre bonus time
                if (data.reason) {
                  // Límite alcanzado
                  if (data.reason === 'max_duration_reached') {
                    message = `⏱️ Bonus time deshabilitado: duración máxima alcanzada`;
                  } else if (data.reason === 'max_extensions_reached') {
                    message = `⏱️ Bonus time deshabilitado: máximo de extensiones alcanzado (${data.max_extensions || 50})`;
                  } else {
                    message = `⏱️ Bonus time: ${data.reason}`;
                  }
                } else {
                  // Extensión exitosa
                  const extensionSeconds = data.extension_seconds || data.window_seconds || 0;
                  message = `⏰ Bonus time activado: +${extensionSeconds}s`;
                }
                break;
              case 'LOT_CLOSED':
                message = `🏁 Subasta finalizada. Ganador: ${formatCurrency(data.winning_bid || 0)}`;
                break;
              default:
                message = event.event_type;
            }
            
            return {
              type: event.event_type,
              message,
              time: event.server_timestamp,
            };
          });
          
          setRecentEvents(formattedEvents);
        }
      } catch (err) {
        console.warn('Error cargando eventos:', err);
      }
      
      // Cargar todas las imágenes del producto
      const { data: imagesData, error: imagesError } = await supabase
        .from('product_images')
        .select('url')
        .eq('product_id', productId)
        .order('idx', { ascending: true });
      
      if (!imagesError && imagesData && imagesData.length > 0) {
        type ImageItem = { url: string };
        const imageUrls = (imagesData as ImageItem[]).map(img => img.url).filter(Boolean);
        setProductImages(imageUrls);
        console.log('📸 Imágenes cargadas:', imageUrls.length);
      } else {
        // Fallback a image_url si no hay imágenes en product_images
        const fallbackImages = auctionData.image_url ? [auctionData.image_url] : [];
        setProductImages(fallbackImages);
        console.log('⚠️ Usando image_url como fallback');
      }
      
      // Cargar subastas relacionadas (misma lógica de filtrado que /auctions)
      try {
        const related = await getRelatedActiveAuctions(productId, 10);
        setRelatedAuctions(related);
        console.log('🔗 Subastas relacionadas cargadas:', related.length);
      } catch (relatedErr: any) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Error cargando subastas relacionadas:', relatedErr?.message || relatedErr);
        }
      }
      
    } catch (err: any) {
      console.error('Error loading auction:', err);
      setError(err.message || 'Error al cargar la subasta');
    } finally {
      setLoading(false);
    }
  };

  const handleBidPlaced = () => {
    // Recargar subasta y actualizar timer
    loadAuction();
    setLastBidTime(serverTime);
  };

  const handleBuyNow = () => {
    // Recargar para mostrar estado actualizado
    loadAuction();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cargando subasta...</p>
        </div>
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-lg font-semibold text-red-600 mb-2">
            {error || 'Subasta no encontrada'}
          </p>
          <Link href="/auctions" className="text-primary underline">
            ← Volver a subastas
          </Link>
        </div>
      </div>
    );
  }

  // Calcular tiempo para el timer usando tiempo sincronizado del servidor
  // Usar getSyncedNow() para obtener tiempo sincronizado actualizado
  // Calcular dentro del render para que se actualice en cada renderizado
  const syncedNowMs = getSyncedNow();
  
  // Determinar estado real de la subasta
  // Considerar tanto el estado en BD como las fechas reales
  const hasStartDate = auction.auction_start_at ? new Date(auction.auction_start_at).getTime() <= syncedNowMs : true; // Si no tiene start_at, considerar que ya empezó
  const hasEndDate = auction.auction_end_at ? new Date(auction.auction_end_at).getTime() > syncedNowMs : false;
  
  // La subasta está realmente activa si:
  // 1. El estado en BD es 'active' Y la fecha de inicio ya pasó (si existe), Y la fecha de fin no pasó (si existe)
  // 2. O si no tiene start_at pero tiene estado 'active' y no está finalizada
  const isActive = auction.auction_status === 'active' && 
                   hasStartDate && // CRÍTICO: Debe haber iniciado
                   (hasEndDate || !auction.auction_end_at); // Y no debe haber finalizado (si tiene end_at)
  
  // La subasta está programada si:
  // - Tiene estado 'scheduled', O
  // - Tiene estado 'active' pero aún no ha iniciado (start_at en el futuro)
  const isScheduled = auction.auction_status === 'scheduled' || 
                     (auction.auction_status === 'active' && auction.auction_start_at && !hasStartDate);
  const isEnded: boolean = Boolean(
    auction.auction_status === 'ended' || 
    auction.auction_status === 'cancelled' || 
    (auction.auction_end_at && new Date(auction.auction_end_at).getTime() <= syncedNowMs)
  );
  const currentBid = auction.current_bid || auction.price;
  let endAtMs = 0;
  let startAtMs = 0;
  
  // IMPORTANTE: Si la subasta ya finalizó, no calcular tiempos (mostrar estado finalizado)
  if (isEnded) {
    // No calcular tiempos si ya finalizó - el componente mostrará el estado finalizado
    endAtMs = 0;
    startAtMs = 0;
  } else {
    // Para subastas activas, mostrar tiempo hasta el fin
    if (auction.auction_end_at && isActive) {
      const endDate = new Date(auction.auction_end_at);
      endAtMs = endDate.getTime();
      // Si ya pasó el tiempo pero no está marcada como ended, aún mostrar (puede estar procesando)
      if (endAtMs <= syncedNowMs) {
        // Si pasó el tiempo pero el estado aún no es 'ended', podría estar en proceso
        // Mantener endAtMs para que el timer muestre 0:00 o el componente maneje la expiración
        // El servidor debería actualizar el estado a 'ended' pronto
      }
    }
    
    // Para subastas programadas, mostrar tiempo hasta el inicio
    // Solo si está programada Y tiene fecha de inicio
    if (auction.auction_start_at && isScheduled) {
      const startDate = new Date(auction.auction_start_at);
      startAtMs = startDate.getTime();
      // Solo mostrar si la fecha es en el futuro (usando tiempo sincronizado)
      if (startAtMs <= syncedNowMs) {
        // Si la fecha ya pasó pero sigue en scheduled, el servidor debería activarla
        // Por ahora, no mostrar timer (startAtMs = 0)
        startAtMs = 0;
      }
    }
  }
  
  // Debug: log de valores para verificar (solo en desarrollo)
  if (process.env.NODE_ENV === 'development') {
    console.log('🕐 Timer Debug:', {
    status: auction.auction_status,
    isActive,
    isScheduled,
    isEnded,
    auction_start_at: auction.auction_start_at,
    auction_end_at: auction.auction_end_at,
    startAtMs,
    endAtMs,
      startAtDate: startAtMs > 0 ? new Date(startAtMs).toISOString() : null,
      endAtDate: endAtMs > 0 ? new Date(endAtMs).toISOString() : null,
    });
  }

  // Encontrar índice de subasta actual en las relacionadas (protección contra errores)
  const currentAuctionIndex = Array.isArray(relatedAuctions) 
    ? relatedAuctions.findIndex(a => a?.id === productId) 
    : -1;
  const prevAuction = currentAuctionIndex > 0 && Array.isArray(relatedAuctions)
    ? relatedAuctions[currentAuctionIndex - 1] || null
    : null;
  const nextAuction = currentAuctionIndex >= 0 && Array.isArray(relatedAuctions) && currentAuctionIndex < relatedAuctions.length - 1 
    ? relatedAuctions[currentAuctionIndex + 1] || null
    : Array.isArray(relatedAuctions) && relatedAuctions.length > 0 && currentAuctionIndex === -1 
      ? relatedAuctions[0] || null
      : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notificación de nueva puja */}
      {newBidNotification && (
        <div className="fixed top-20 right-4 z-50 animate-slide-in-right">
          <div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 border-2 border-white">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            <p className="font-bold">{newBidNotification}</p>
          </div>
        </div>
      )}

      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/auctions"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a subastas
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna izquierda: Imágenes y detalles del producto */}
          <div className="lg:col-span-2 space-y-6">
            {/* Título y estado del lote - Mejorado estéticamente */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border-2 border-gray-200 p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{auction.title}</h1>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant={isActive ? 'success' : isEnded ? 'secondary' : 'warning'} size="lg">
                      {isActive ? 'ACTIVA' : isEnded ? 'FINALIZADA' : isScheduled ? 'PROGRAMADA' : 'PROGRAMADA'}
                    </Badge>
                    {auction.reserve_price && (
                      <Badge variant="warning" size="md">
                        Con Reserva
                      </Badge>
                    )}
                    {!auction.reserve_price && (
                      <Badge variant="secondary" size="md">
                        Sin Reserva
                      </Badge>
                    )}
                  </div>
                </div>
                {/* Número de lote simulado */}
                <div className="text-right">
                  <p className="text-sm text-gray-500">Lote</p>
                  <p className="text-xl font-bold text-gray-900">#{auction.id.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>

              {/* Información clave del lote */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Precio inicial</p>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(auction.attributes?.auction?.starting_price || auction.price)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Pujas</p>
                  <p className="font-semibold text-gray-900">{auction.total_bids || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Condición</p>
                  <p className="font-semibold text-gray-900 capitalize">
                    {auction.condition === 'nuevo' ? 'Nuevo' : 
                     auction.condition === 'usado_como_nuevo' ? 'Usado como nuevo' : 'Usado'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Categoría</p>
                  <p className="font-semibold text-gray-900">Producto</p>
                </div>
              </div>
            </div>

            {/* Galería de imágenes mejorada */}
            <Card className="overflow-hidden shadow-lg border-2 border-gray-200">
              <CardContent className="p-0 bg-white">
                {productImages.length > 0 ? (
                  <ProductImageGallery images={productImages} title={auction.title} />
                ) : (
                  <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <div className="text-center">
                      <Gavel className="h-24 w-24 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium">Sin imágenes disponibles</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Descripción y detalles - Mejorado */}
            <Card className="shadow-lg border-2 border-gray-200 hover:shadow-xl transition-shadow">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
                <CardTitle className="text-xl text-gray-900">Descripción</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {auction.description ? (
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 whitespace-pre-line leading-relaxed text-base">
                      {auction.description}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500 italic text-center py-4">Sin descripción disponible</p>
                )}
              </CardContent>
            </Card>

            {/* Información del vendedor - Mejorado */}
            <Card className="shadow-lg border-2 border-gray-200 hover:shadow-xl transition-shadow">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-white border-b">
                <CardTitle className="text-xl flex items-center gap-2 text-gray-900">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <User className="h-5 w-5 text-purple-600" />
                  </div>
                  Información del Vendedor
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {sellerInfo ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                        <User className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {sellerInfo.first_name || sellerInfo.last_name
                            ? `${sellerInfo.first_name || ''} ${sellerInfo.last_name || ''}`.trim()
                            : sellerInfo.email 
                            ? sellerInfo.email.split('@')[0] 
                            : `Vendedor ${sellerInfo.id.slice(0, 8)}`}
                        </p>
                        {sellerInfo.email ? (
                          <p className="text-sm text-gray-500">{sellerInfo.email}</p>
                        ) : (
                          <p className="text-xs text-gray-400">ID: {sellerInfo.id.slice(0, 8)}...</p>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/seller/${sellerInfo.id}`}
                      className="inline-block text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Ver perfil del vendedor →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-gray-500">Cargando información del vendedor...</p>
                    <p className="text-xs text-gray-400">Si persiste, el vendedor puede no existir</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Columna derecha: Área de pujas destacada */}
          <div className="space-y-6">
            {/* Timer prominente - Solo mostrar si NO está finalizada y tiene tiempo */}
            {!isEnded && (endAtMs > 0 || startAtMs > 0) && (
              <Card className="border-2 border-blue-500 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 opacity-10 animate-pulse"></div>
                <CardContent className="p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Clock className="h-5 w-5 text-blue-600 animate-pulse" />
                      <p className="text-sm font-bold text-blue-900 uppercase tracking-wide">
                        {isActive ? '⏱️ TIEMPO RESTANTE' : '⏰ INICIA EN'}
                      </p>
                      <Clock className="h-5 w-5 text-blue-600 animate-pulse" />
                    </div>
                    {isActive && endAtMs > 0 ? (
                      <div className="relative">
                        <AuctionTimer
                          endAtMs={endAtMs}
                          serverNowMs={syncedNowMs}
                          variant="full"
                          size="lg"
                          lastBidAtMs={lastBidTime}
                          onExpire={() => {
                            if (soundEnabled) {
                              // Sonido de finalización
                              try {
                                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                                const oscillator = audioContext.createOscillator();
                                const gainNode = audioContext.createGain();
                                oscillator.connect(gainNode);
                                gainNode.connect(audioContext.destination);
                                oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
                                oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.3);
                                gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
                                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                                oscillator.start(audioContext.currentTime);
                                oscillator.stop(audioContext.currentTime + 0.3);
                              } catch (e) {}
                            }
                            loadAuction();
                          }}
                        />
                      </div>
                    ) : startAtMs > 0 ? (
                      <AuctionTimer
                        endAtMs={startAtMs}
                        serverNowMs={syncedNowMs}
                        variant="full"
                        size="lg"
                        onExpire={() => {
                          loadAuction();
                        }}
                      />
                    ) : null}
                    {/* Toggle de sonido */}
                    {(isActive && endAtMs > 0) || startAtMs > 0 ? (
                      <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className="mt-3 text-xs text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1 mx-auto"
                        title={soundEnabled ? 'Sonido activado' : 'Sonido desactivado'}
                      >
                        {soundEnabled ? '🔊' : '🔇'} {soundEnabled ? 'Sonido ON' : 'Sonido OFF'}
                      </button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Mostrar mensaje si está programada pero no hay fechas configuradas - Solo si NO está finalizada */}
            {!isEnded && isScheduled && endAtMs === 0 && startAtMs === 0 && (
              <Card className="border-2 border-yellow-400 shadow-lg">
                <CardContent className="p-6 bg-yellow-50">
                  <div className="text-center">
                    <p className="text-sm font-medium text-yellow-900 mb-2">
                      ⚠️ Subasta Programada
                    </p>
                    <p className="text-xs text-yellow-700">
                      {auction.auction_start_at 
                        ? 'La fecha de inicio ya pasó. La subasta se activará pronto.'
                        : 'Las fechas de inicio aún no están configuradas'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Estado finalizado - MEJORADO con información del ganador */}
            {isEnded && (
              <Card className="border-2 border-emerald-500 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-green-400 to-teal-500 opacity-10"></div>
                <CardContent className="p-6 text-center bg-gradient-to-br from-emerald-50 to-green-50 relative">
                  <Badge variant="success" size="lg" className="mb-4 animate-bounce-in">
                    🏆 SUBASTA FINALIZADA
                  </Badge>
                  
                  {currentUserId === auction.winner_id && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl text-white shadow-lg animate-pulse-glow">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Gavel className="h-6 w-6" />
                        <h3 className="text-xl font-bold">¡GANASTE ESTA SUBASTA!</h3>
                        <Gavel className="h-6 w-6" />
                      </div>
                      <p className="text-sm opacity-90">
                        Precio final: {formatCurrency(auction.current_bid || auction.price)}
                      </p>
                      <div className="mt-4 flex gap-2 justify-center">
                        <Button
                          onClick={() => {
                            const checkoutUrl = `/checkout?auction=${productId}`;
                            window.location.href = checkoutUrl;
                          }}
                          className="bg-white text-emerald-600 hover:bg-emerald-50 font-bold"
                        >
                          💳 Pagar Ahora
                        </Button>
                        <Button
                          onClick={() => window.location.href = `/seller/${auction.seller_id}`}
                          variant="outline"
                          className="border-white text-white hover:bg-white hover:text-emerald-600"
                        >
                          💬 Contactar Vendedor
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {auction.winner_id && winnerInfo && currentUserId !== auction.winner_id && (
                    <div className="mt-4 p-4 bg-white rounded-lg border-2 border-emerald-200">
                      <p className="text-sm text-gray-600 mb-2">Ganador:</p>
                      <p className="font-bold text-lg text-gray-900">
                        {winnerInfo.first_name || winnerInfo.last_name
                          ? `${winnerInfo.first_name || ''} ${winnerInfo.last_name || ''}`.trim()
                          : winnerInfo.email?.split('@')[0] || 'Usuario'}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Precio ganador: {formatCurrency(auction.current_bid || auction.price)}
                      </p>
                    </div>
                  )}
                  
                  {!auction.winner_id && (
                    <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-sm text-yellow-800">
                        ⚠️ Esta subasta finalizó sin ganador (sin pujas)
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Área de pujas - Estilo tipo Copart/IAA */}
            {/* Mostrar formulario si está activa (ahora incluye verificación de fechas) */}
            {isActive && (
              <Card className="border-2 border-purple-500 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
                  <CardTitle className="text-xl text-center">ZONA DE PUJAS</CardTitle>
                </CardHeader>
                <CardContent className="p-6 bg-white">
                  {/* Precio actual en círculo grande - Actualiza en tiempo real */}
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      <div 
                        className={`w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-xl border-4 border-white transition-all duration-300 ${
                          newBidNotification ? 'animate-pulse scale-110' : ''
                        } ${myBidPosition === 1 ? 'ring-4 ring-emerald-400 ring-offset-2' : ''}`}
                      >
                        <div className="text-center text-white">
                          <p className="text-xs font-medium opacity-90 mb-1">PUJA ACTUAL</p>
                          <p className="text-2xl font-bold transition-all">
                            {formatCurrency(currentBid).split(' ')[0]}
                          </p>
                          <p className="text-xs mt-1">Gs.</p>
                        </div>
                      </div>
                      {auction.total_bids > 0 && (
                        <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold shadow-lg animate-bounce">
                          {auction.total_bids}
                        </div>
                      )}
                      {/* Indicador de posición si el usuario está pujando */}
                      {myBidPosition !== null && myBidPosition > 0 && (
                        <div className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold shadow-lg ${
                          myBidPosition === 1 
                            ? 'bg-emerald-500 text-white animate-pulse' 
                            : myBidPosition === 2
                            ? 'bg-amber-500 text-white'
                            : 'bg-gray-500 text-white'
                        }`}>
                          {myBidPosition === 1 ? '👑 Eres el máximo postor' : `Posición #${myBidPosition}`}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Indicador si fuiste superado */}
                  {myBidPosition !== null && myBidPosition > 1 && (
                    <Alert variant="warning" className="mb-4">
                      <AlertDescription className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Fuiste superado. Tu posición actual: #{myBidPosition}. ¡Puja más para recuperar el primer lugar!
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Incremento mínimo visible */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-blue-900 font-medium">Incremento mínimo:</span>
                      <span className="text-blue-900 font-bold">
                        {formatCurrency(auction.min_bid_increment || 1000)}
                      </span>
                    </div>
                  </div>

                  {/* Indicador de conexión */}
                  {!isConnected && (
                    <Alert variant="warning" className="mb-4">
                      <AlertDescription className="flex items-center gap-2">
                        <Clock className="h-4 w-4 animate-pulse" />
                        <div>
                          <strong>Desconectado del canal en tiempo real</strong>
                          <p className="text-sm mt-1 opacity-90">
                            No recibirás actualizaciones instantáneas. Las pujas siguen funcionando normalmente.
                            Intentando reconectar...
                          </p>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Formulario de puja */}
                  <div className={isConnected ? '' : 'opacity-90'}>
                    <BidForm
                      productId={productId}
                      currentBid={currentBid}
                      minBidIncrement={auction.min_bid_increment}
                      buyNowPrice={auction.buy_now_price}
                      sellerId={auction.seller_id}
                      onBidPlaced={handleBidPlaced}
                      onBuyNow={handleBuyNow}
                      auctionEndAt={auction.auction_end_at}
                      isAuctionEnded={isEnded}
                    />
                  </div>

                  {/* Compra ahora destacada - Solo mostrar cuando la subasta haya terminado */}
                  {auction.buy_now_price && isEnded && (
                    <div className="mt-6 pt-6 border-t">
                      {(() => {
                        const needsApproval = currentBid < auction.buy_now_price;
                        const approvalStatus = (auction as any).approval_status;
                        const approvalDeadline = (auction as any).approval_deadline;
                        
                        if (needsApproval) {
                          // Mostrar estado de aprobación
                          if (approvalStatus === 'approved') {
                            return (
                              <div className="text-center p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                  <p className="text-sm font-bold text-green-900">Compra Aprobada</p>
                                </div>
                                <p className="text-sm text-green-800 mb-2">
                                  El vendedor ha aprobado la compra. Puedes proceder con el pago.
                                </p>
                                <Button
                                  onClick={() => {
                                    const checkoutUrl = `/checkout?auction=${productId}`;
                                    window.location.href = checkoutUrl;
                                  }}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  💳 Proceder al Pago
                                </Button>
                              </div>
                            );
                          } else if (approvalStatus === 'rejected') {
                            return (
                              <div className="text-center p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                  <XCircle className="h-5 w-5 text-red-600" />
                                  <p className="text-sm font-bold text-red-900">Compra Rechazada</p>
                                </div>
                                <p className="text-sm text-red-800 mb-2">
                                  El vendedor ha rechazado la compra. El monto ganador no alcanzó el precio esperado.
                                </p>
                              </div>
                            );
                          } else {
                            // pending_approval o null
                            return (
                              <div className="text-center p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                  <ShoppingCart className="h-5 w-5 text-amber-600" />
                                  <p className="text-sm font-bold text-amber-900">Monto menor a la oferta esperada</p>
                                </div>
                                <p className="text-sm text-amber-800 mb-1">
                                  Monto ganador: <span className="font-semibold">{formatCurrency(currentBid)}</span>
                                </p>
                                <p className="text-sm text-amber-800 mb-2">
                                  Precio de compra inmediata: <span className="font-semibold">{formatCurrency(auction.buy_now_price)}</span>
                                </p>
                                <p className="text-sm font-semibold text-amber-900 mb-2">
                                  Se espera aprobación del vendedor para confirmar la compra.
                                </p>
                                {approvalDeadline && (
                                  <p className="text-xs text-amber-700">
                                    Plazo de respuesta: {new Date(approvalDeadline).toLocaleDateString('es-PY', { 
                                      day: 'numeric', 
                                      month: 'short', 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </p>
                                )}
                              </div>
                            );
                          }
                        } else {
                          // Monto >= buy_now_price, mostrar botón normal
                          return (
                            <div className="text-center mb-4">
                              <p className="text-sm text-gray-600 mb-2">Compra Inmediata</p>
                              <p className="text-2xl font-bold text-emerald-600">
                                {formatCurrency(auction.buy_now_price)}
                              </p>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Historial de pujas */}
            <Card>
              <CardContent className="p-6">
                <BidHistory productId={productId} realtime={true} />
              </CardContent>
            </Card>

            {/* Información adicional del lote */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información del Lote</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Estado:</span>
                  <Badge variant={isActive ? 'success' : isEnded ? 'secondary' : 'warning'} size="sm">
                    {(() => {
                      // Calcular estado real usando tiempo sincronizado
                      if (isEnded) return 'Finalizada';
                      if (isActive) return 'En vivo';
                      if (isScheduled) return 'Programada';
                      // Si no tiene fecha de inicio pero tiene fecha de fin pasada, está finalizada
                      if (auction.auction_end_at) {
                        const endDate = new Date(auction.auction_end_at).getTime();
                        if (endDate <= syncedNowMs) return 'Finalizada';
                      }
                      return 'Programada';
                    })()}
                  </Badge>
                </div>
                {auction.auction_start_at && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Inicio:</span>
                    <span className="text-sm font-medium">
                      {new Date(auction.auction_start_at).toLocaleString('es-PY', {
                        timeZone: 'America/Asuncion',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
                {auction.auction_end_at && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Finaliza:</span>
                    <span className="text-sm font-medium">
                      {new Date(auction.auction_end_at).toLocaleString('es-PY', {
                        timeZone: 'America/Asuncion',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
                {auction.reserve_price && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Precio de reserva:</span>
                    <span className="text-sm font-semibold text-orange-600">
                      {formatCurrency(auction.reserve_price)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Navegación entre subastas - Parte inferior */}
        {(prevAuction || nextAuction) && (
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex items-center justify-between gap-4">
              {/* Subasta Anterior */}
              {prevAuction && (
                <Link
                  href={`/auctions/${prevAuction.id}`}
                  className="flex-1 group bg-white rounded-lg shadow-md hover:shadow-xl border-2 border-gray-200 hover:border-blue-500 transition-all overflow-hidden"
                >
                  <div className="flex items-center gap-4 p-4">
                    <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                      {prevAuction.image_url ? (
                        <Image
                          src={prevAuction.image_url}
                          alt={prevAuction.title}
                          width={96}
                          height={96}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <Gavel className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                        <ChevronLeft className="h-4 w-4" />
                        <span className="font-medium">Anterior</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                        {prevAuction.title}
                      </h3>
                    </div>
                  </div>
                </Link>
              )}
              
              {/* Spacer si solo hay una dirección */}
              {!prevAuction && <div className="flex-1" />}
              {!nextAuction && <div className="flex-1" />}

              {/* Subasta Siguiente */}
              {nextAuction && (
                <Link
                  href={`/auctions/${nextAuction.id}`}
                  className="flex-1 group bg-white rounded-lg shadow-md hover:shadow-xl border-2 border-gray-200 hover:border-blue-500 transition-all overflow-hidden"
                >
                  <div className="flex items-center gap-4 p-4">
                    <div className="flex-1 min-w-0 text-right">
                      <div className="flex items-center justify-end gap-2 text-gray-500 text-sm mb-1">
                        <span className="font-medium">Siguiente</span>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                      <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                        {nextAuction.title}
                      </h3>
                    </div>
                    <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                      {nextAuction.image_url ? (
                        <Image
                          src={nextAuction.image_url}
                          alt={nextAuction.title}
                          width={96}
                          height={96}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <Gavel className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Subastas Relacionadas - Grid */}
        {Array.isArray(relatedAuctions) && relatedAuctions.length > 0 && (
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Más Subastas</h2>
              <p className="text-gray-600">Explora otras subastas disponibles</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {relatedAuctions.slice(0, 8).filter(related => related && related.id).map((related) => (
                <Link
                  key={related.id}
                  href={`/auctions/${related.id}`}
                  className="group bg-white rounded-lg shadow-md hover:shadow-xl border-2 border-gray-200 hover:border-blue-500 transition-all overflow-hidden"
                >
                  <div className="aspect-square relative overflow-hidden bg-gray-100">
                    {related.image_url ? (
                      <Image
                        src={related.image_url}
                        alt={related.title}
                        width={300}
                        height={300}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <Gavel className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                      <Gavel className="h-3 w-3" />
                      SUBASTA
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {related?.title || 'Sin título'}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


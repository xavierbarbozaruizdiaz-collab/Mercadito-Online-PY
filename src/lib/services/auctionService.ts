// ============================================
// MERCADITO ONLINE PY - AUCTION SERVICE
// Servicio para gestionar subastas y pujas
// ============================================

import { supabase } from '@/lib/supabaseClient';

// ============================================
// TIPOS
// ============================================

export interface AuctionBid {
  id: string;
  product_id: string;
  bidder_id: string;
  amount: number;
  bid_time: string;
  is_auto_bid: boolean;
  is_retracted: boolean;
  created_at: string;
  bidder?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  };
}

export interface AuctionProduct {
  id: string;
  title: string;
  description?: string;
  price: number;
  cover_url?: string;
  condition: string;
  sale_type: 'auction';
  auction_status: 'scheduled' | 'active' | 'ended' | 'cancelled';
  auction_start_at?: string;
  auction_end_at?: string;
  current_bid?: number;
  min_bid_increment?: number;
  buy_now_price?: number;
  reserve_price?: number;
  winner_id?: string;
  total_bids: number;
  seller_id: string;
  created_at?: string; // Fecha de creación del producto
  attributes?: {
    auction?: {
      starting_price: number;
      buy_now_price?: number;
      start_date: string;
    };
  };
}

export interface AuctionStats {
  total_bids: number;
  current_bid: number;
  starting_price: number;
  min_increment: number;
  time_remaining_ms: number;
  is_active: boolean;
  winner_id?: string;
}

// ============================================
// FUNCIONES DEL SERVICIO
// ============================================

/**
 * Obtiene todas las subastas activas
 */
export async function getActiveAuctions(filters?: {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}): Promise<AuctionProduct[]> {
  try {
    const now = new Date().toISOString();
    
        // Primero, obtener todas las subastas (sale_type = 'auction')
        // Solo incluir productos activos o pausados (no archivados/vendidos/eliminados)
        let query = supabase
          .from('products')
          .select('*')
          .eq('sale_type', 'auction')
          // Excluir productos sin seller_id (productos huérfanos/eliminados)
          .not('seller_id', 'is', null);
        
        // Filtrar por status: incluir solo active, paused, o null (para compatibilidad)
        // Excluir explícitamente: archived, sold, deleted
        query = query.or('status.is.null,status.eq.active,status.eq.paused');

    if (filters?.category) {
      query = query.eq('category_id', filters.category);
    }

    if (filters?.minPrice) {
      query = query.gte('price', filters.minPrice);
    }

    if (filters?.maxPrice) {
      query = query.lte('price', filters.maxPrice);
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error en query de subastas:', error);
      throw error;
    }

    console.log('🔍 Subastas encontradas (sin filtrar):', data?.length || 0);
    
    let refreshedData: any[] | null = null;
    
    // Log detallado de cada subasta para debuggear
    if (data && data.length > 0) {
      console.log('📋 Detalles de subastas encontradas:');
      data.forEach((auction: any, index: number) => {
        console.log(`Subasta ${index + 1}:`, {
          id: auction.id,
          title: auction.title,
          sale_type: auction.sale_type,
          auction_status: auction.auction_status,
          auction_start_at: auction.auction_start_at,
          auction_end_at: auction.auction_end_at,
          current_bid: auction.current_bid,
          price: auction.price
        });
      });
      
      // ACTUALIZAR ESTADOS de todas las subastas antes de filtrar
      console.log('🔄 Actualizando estados de subastas...');
      await Promise.all(
        (data || []).map((auction: any) => checkAndUpdateAuctionStatus(auction.id))
      );
      
      // RECARGAR los datos después de actualizar estados
      console.log('✅ Estados actualizados, recargando datos...');
      const refreshedQuery = supabase
        .from('products')
        .select('*')
        .eq('sale_type', 'auction')
        .not('seller_id', 'is', null)
        .or('status.is.null,status.eq.active,status.eq.paused');
      
      if (filters?.category) {
        refreshedQuery.eq('category_id', filters.category);
      }
      if (filters?.minPrice) {
        refreshedQuery.gte('price', filters.minPrice);
      }
      if (filters?.maxPrice) {
        refreshedQuery.lte('price', filters.maxPrice);
      }
      if (filters?.search) {
        refreshedQuery.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      
      const { data: refreshed, error: refreshError } = await refreshedQuery;
      if (!refreshError && refreshed) {
        refreshedData = refreshed;
        console.log('✅ Datos recargados después de actualizar estados:', refreshedData.length);
      }
    }

    // Usar datos refrescados si están disponibles, sino usar los originales
    const dataToFilter = refreshedData || data || [];
    
    // Filtrar en memoria para ser más flexible con los estados
    const filteredData = dataToFilter.filter((auction: any) => {
      // EXCLUIR si no tiene seller_id (producto huérfano o eliminado incorrectamente)
      if (!auction.seller_id) {
        console.log(`❌ Subasta "${auction.title}" excluida - sin seller_id (producto huérfano)`);
        return false;
      }
      
      // EXCLUIR si está eliminada, archivada, vendida o cancelada
      const productStatus = auction.status;
      if (productStatus === 'archived' || productStatus === 'sold' || productStatus === 'deleted') {
        console.log(`❌ Subasta "${auction.title}" excluida - status: ${productStatus}`);
        return false;
      }
      
      // EXCLUIR si está cancelada o finalizada
      const auctionStatus = auction.auction_status;
      if (auctionStatus === 'cancelled' || auctionStatus === 'ended') {
        console.log(`❌ Subasta "${auction.title}" excluida - auction_status: ${auctionStatus}`);
        return false;
      }
      
      // Incluir si:
      // 1. Tiene auction_status = 'active'
      // 2. O tiene auction_status = 'scheduled' (aunque no tenga fechas configuradas aún)
      // 3. O no tiene auction_status pero tiene auction_end_at en el futuro
      
      const status = auction.auction_status;
      const endAt = auction.auction_end_at;
      const startAt = auction.auction_start_at;
      
      console.log(`🔎 Filtrando subasta "${auction.title}":`, {
        status,
        endAt,
        startAt,
        now: Date.now(),
        endTime: endAt ? new Date(endAt).getTime() : null,
        startTime: startAt ? new Date(startAt).getTime() : null
      });
      
      // Si está finalizada o cancelada, excluirla (ya se filtró arriba pero por seguridad)
      if (status === 'ended' || status === 'cancelled') {
        console.log(`❌ Subasta "${auction.title}" excluida - finalizada/cancelada`);
        return false;
      }
      
      // Si está activa, incluirla (verificar fecha de fin si existe)
      if (status === 'active') {
        if (endAt) {
          const endTime = new Date(endAt).getTime();
          const now = Date.now();
          if (endTime <= now) {
            console.log(`❌ Subasta "${auction.title}" está activa pero ya terminó`);
            return false; // Ya terminó
          }
        }
        // Verificar que el producto no esté archivado/vendido
        if (productStatus === 'archived' || productStatus === 'sold' || productStatus === 'deleted') {
          console.log(`❌ Subasta "${auction.title}" está activa pero producto está ${productStatus}`);
          return false;
        }
        console.log(`✅ Subasta "${auction.title}" es activa`);
        return true;
      }

      // Si está programada, incluirla si:
      // 1. No tiene fecha de inicio (para pruebas inmediatas)
      // 2. O la fecha de inicio ya pasó (debería estar activa pero no se actualizó aún)
      // 3. O la fecha de inicio es muy cercana (dentro de 1 minuto, tolerancia)
      if (status === 'scheduled') {
        // Si no tiene fecha de inicio, incluirla (para pruebas inmediatas)
        if (!startAt) {
          console.log(`✅ Subasta "${auction.title}" está programada sin fecha de inicio, se incluye para activación inmediata`);
          return true;
        }
        
        // Si tiene fecha de inicio
        const startTime = new Date(startAt).getTime();
        const now = Date.now();
        const shouldStart = startTime <= now;
        
        console.log(`🔍 Subasta "${auction.title}" está programada. Debería empezar: ${shouldStart}`, {
          startTime,
          now,
          diff: now - startTime,
          startAtISO: startAt
        });
        
        // Si tiene fecha de fin, verificar que no haya terminado
        if (endAt) {
          const endTime = new Date(endAt).getTime();
          if (endTime <= now) {
            console.log(`❌ Subasta "${auction.title}" está programada pero ya terminó`);
            return false;
          }
        }
        
        // IMPORTANTE: Incluir TODAS las subastas programadas, incluso si tienen fecha futura
        // El usuario debe poder ver las subastas que están próximas a iniciar
        // Solo excluir si la fecha de fin ya pasó
        console.log(`✅ Subasta "${auction.title}" está programada (se incluye - visible aunque no haya comenzado)`);
        return true;
      }

      // Si no tiene status pero tiene fecha de fin en el futuro, incluirla
      if (!status && endAt) {
        const endTime = new Date(endAt).getTime();
        if (endTime > Date.now()) {
          console.log(`✅ Subasta "${auction.title}" no tiene status pero tiene fecha de fin válida`);
          return true;
        }
        console.log(`❌ Subasta "${auction.title}" no tiene status y la fecha ya pasó`);
        return false;
      }

      // Si no tiene status y no tiene fecha de fin, pero es de tipo subasta, incluirla de todos modos
      if (!status && !endAt && auction.sale_type === 'auction') {
        console.log(`✅ Subasta "${auction.title}" es tipo subasta pero sin status/fechas configuradas, se incluye`);
        return true;
      }

      console.log(`❌ Subasta "${auction.title}" no cumple ningún criterio`);
      return false;
    });

    console.log('✅ Subastas filtradas (activas):', filteredData.length);

    // Ordenar por fecha de fin
    filteredData.sort((a: any, b: any) => {
      const aEnd = a.auction_end_at ? new Date(a.auction_end_at).getTime() : 0;
      const bEnd = b.auction_end_at ? new Date(b.auction_end_at).getTime() : 0;
      return aEnd - bEnd;
    });

    return filteredData as AuctionProduct[];
  } catch (error) {
    console.error('Error fetching active auctions:', error);
    // Retornar array vacío en lugar de lanzar error para mejor UX
    return [];
  }
}

/**
 * Verifica y actualiza el estado de una subasta según las fechas
 */
async function checkAndUpdateAuctionStatus(productId: string): Promise<void> {
  try {
    const now = new Date().toISOString();
    
    // Obtener la subasta actual
    const { data: auction, error: fetchError } = await supabase
      .from('products')
      .select('auction_status, auction_start_at, auction_end_at')
      .eq('id', productId)
      .single();

    if (fetchError || !auction) return;

    type AuctionData = { auction_status: string; auction_start_at?: string; auction_end_at?: string };
    const auctionData = auction as AuctionData;
    
    const status = auctionData.auction_status;
    const startAt = auctionData.auction_start_at;
    const endAt = auctionData.auction_end_at;

    // Verificar si debería estar activa pero está programada
    if (status === 'scheduled' && startAt) {
      const startDate = new Date(startAt);
      const nowDate = new Date();
      
      // Si la fecha de inicio ya pasó O está muy cerca (dentro de 2 minutos), activar
      const timeDiff = startDate.getTime() - nowDate.getTime();
      const twoMinutes = 2 * 60 * 1000; // 2 minutos de tolerancia
      
      if (startDate <= nowDate || timeDiff <= twoMinutes) {
        // Verificar si también debería estar finalizada
        if (endAt) {
          const endDate = new Date(endAt);
          if (endDate <= nowDate) {
            // Ya terminó, marcarla como finalizada
            await (supabase as any)
              .from('products')
              .update({ 
                auction_status: 'ended',
                updated_at: now
              })
              .eq('id', productId);
            console.log(`✅ Subasta ${productId} actualizada a FINALIZADA`);
          } else {
            // Debería estar activa
            await (supabase as any)
              .from('products')
              .update({ 
                auction_status: 'active',
                updated_at: now
              })
              .eq('id', productId);
            console.log(`✅ Subasta ${productId} actualizada a ACTIVA`);
          }
        } else {
          // No tiene fecha de fin, solo activar
          await (supabase as any)
            .from('products')
            .update({ 
              auction_status: 'active',
              updated_at: now
            })
            .eq('id', productId);
          console.log(`✅ Subasta ${productId} actualizada a ACTIVA`);
        }
      }
    }
    
    // Verificar si está activa pero ya terminó
    if (status === 'active' && endAt) {
      const endDate = new Date(endAt);
      const nowDate = new Date();
      
      if (endDate <= nowDate) {
        await (supabase as any)
          .from('products')
          .update({ 
            auction_status: 'ended',
            updated_at: now
          })
          .eq('id', productId);
        console.log(`✅ Subasta ${productId} actualizada a FINALIZADA (ya había terminado)`);
      }
    }
  } catch (error) {
    console.error('Error checking auction status:', error);
    // No lanzar error, solo loguear
  }
}

/**
 * Obtiene una subasta por ID con todos los detalles
 * Actualiza automáticamente el estado si es necesario
 */
export async function getAuctionById(productId: string): Promise<AuctionProduct | null> {
  try {
    // Primero verificar y actualizar estado si es necesario
    await checkAndUpdateAuctionStatus(productId);
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('sale_type', 'auction')
      // Excluir productos sin seller_id (productos huérfanos)
      .not('seller_id', 'is', null)
      // Solo incluir productos activos o pausados (no archivados/vendidos)
      .or('status.is.null,status.eq.active,status.eq.paused')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('⚠️ Subasta no encontrada o eliminada:', productId);
        return null;
      }
      throw error;
    }

    // Verificación adicional después de obtener los datos
    if (data) {
      const product = data as any;
      
      // Excluir si está archivada/vendida/eliminada
      if (product.status === 'archived' || product.status === 'sold' || product.status === 'deleted') {
        console.log('⚠️ Subasta excluida - status:', product.status);
        return null;
      }
      
      // Excluir si está cancelada
      if (product.auction_status === 'cancelled') {
        console.log('⚠️ Subasta excluida - cancelada');
        return null;
      }
      
      // Excluir si no tiene seller_id (por seguridad adicional)
      if (!product.seller_id) {
        console.log('⚠️ Subasta excluida - sin seller_id');
        return null;
      }
    }

    return data as AuctionProduct;
  } catch (error) {
    console.error('Error fetching auction:', error);
    throw error;
  }
}

/**
 * Obtiene las pujas de una subasta
 */
export async function getBidsForAuction(
  productId: string,
  limit: number = 20
): Promise<AuctionBid[]> {
  try {
    // Primero obtener las pujas
    const { data: bidsData, error: bidsError } = await supabase
      .from('auction_bids')
      .select('*')
      .eq('product_id', productId)
      .eq('is_retracted', false)
      .order('amount', { ascending: false })
      .order('bid_time', { ascending: false })
      .limit(limit);

    if (bidsError) throw bidsError;

    if (!bidsData || bidsData.length === 0) {
      return [];
    }

    // Obtener los IDs de los postores
    const bidderIds = [...new Set(bidsData.map((bid: any) => bid.bidder_id))];

    // Obtener los perfiles de los postores
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('id', bidderIds);

    if (profilesError) {
      console.warn('Error fetching profiles for bids:', profilesError);
      // Continuar sin perfiles, pero retornar las pujas
    }

    // Crear un mapa de perfiles por ID
    const profilesMap = new Map();
    if (profilesData) {
      profilesData.forEach((profile: any) => {
        profilesMap.set(profile.id, profile);
      });
    }

    // Combinar pujas con perfiles
    const bidsWithProfiles = bidsData.map((bid: any) => ({
      ...bid,
      bidder: profilesMap.get(bid.bidder_id) || {
        id: bid.bidder_id,
        first_name: null,
        last_name: null,
        email: null,
      },
    }));

    return bidsWithProfiles as AuctionBid[];
  } catch (error) {
    console.error('Error fetching bids:', error);
    throw error;
  }
}

/**
 * Coloca una puja en una subasta
 */
export async function placeBid(
  productId: string,
  bidderId: string,
  amount: number
): Promise<{ bid_id: string; success: boolean; error?: string; version?: number; end_at?: string; server_timestamp?: string; is_duplicate?: boolean }> {
  try {
    // Generar idempotency key para prevenir pujas duplicadas
    const idempotencyKey = crypto.randomUUID();
    const clientSentAt = new Date().toISOString();
    
    const { data, error } = await (supabase as any).rpc('place_bid', {
      p_product_id: productId,
      p_bidder_id: bidderId,
      p_amount: amount,
      p_idempotency_key: idempotencyKey,
      p_client_sent_at: clientSentAt,
    });

    if (error) {
      console.error('Error placing bid:', error);
      return {
        bid_id: '',
        success: false,
        error: error.message || 'Error al colocar la puja',
      };
    }

    // La nueva función retorna JSONB con más información
    if (typeof data === 'object' && data !== null && 'bid_id' in data) {
      // Nueva respuesta con más datos
      return {
        success: data.success || true,
        bid_id: data.bid_id || '',
        version: data.version,
        end_at: data.end_at,
        server_timestamp: data.server_timestamp,
        is_duplicate: data.is_duplicate || false,
      };
    }

    // Compatibilidad con respuesta antigua (solo UUID)
    return {
      bid_id: typeof data === 'string' ? data : '',
      success: true,
    };
  } catch (error: any) {
    console.error('Error placing bid:', error);
    return {
      bid_id: '',
      success: false,
      error: error.message || 'Error inesperado al colocar la puja',
    };
  }
}

/**
 * Compra ahora (Buy Now)
 */
export async function buyNow(
  productId: string,
  buyerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await (supabase as any).rpc('buy_now_auction', {
      p_product_id: productId,
      p_buyer_id: buyerId,
    });

    if (error) {
      console.error('Error in buy now:', error);
      return {
        success: false,
        error: error.message || 'Error al realizar compra ahora',
      };
    }

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Error in buy now:', error);
    return {
      success: false,
      error: error.message || 'Error inesperado',
    };
  }
}

/**
 * Obtiene las pujas de un usuario
 */
export async function getUserBids(userId: string): Promise<Array<AuctionBid & { product: AuctionProduct }>> {
  try {
    const { data: bidsData, error: bidsError } = await supabase
      .from('auction_bids')
      .select('*')
      .eq('bidder_id', userId)
      .eq('is_retracted', false)
      .order('created_at', { ascending: false });

    if (bidsError) throw bidsError;

    if (!bidsData || bidsData.length === 0) {
      return [];
    }

    // Obtener productos para cada puja
    const productIds = [...new Set(bidsData.map((b: any) => b.product_id))];
    
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds)
      .eq('sale_type', 'auction');

    if (productsError) throw productsError;

    const productsMap = new Map(
      (productsData || []).map((p: any) => [p.id, p as AuctionProduct])
    );

    // Combinar pujas con productos
    return (bidsData || []).map((bid: any) => ({
      ...bid,
      product: productsMap.get(bid.product_id),
    })) as Array<AuctionBid & { product: AuctionProduct }>;
  } catch (error) {
    console.error('Error fetching user bids:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de una subasta
 */
export async function getAuctionStats(productId: string): Promise<AuctionStats | null> {
  try {
    const auction = await getAuctionById(productId);
    if (!auction) return null;

    const startingPrice = auction.attributes?.auction?.starting_price || auction.price;
    const currentBid = auction.current_bid || startingPrice;
    const minIncrement = auction.min_bid_increment || 1000;

    // Calcular tiempo restante
    let timeRemainingMs = 0;
    if (auction.auction_end_at) {
      const endAt = new Date(auction.auction_end_at).getTime();
      const now = Date.now();
      timeRemainingMs = Math.max(0, endAt - now);
    }

    return {
      total_bids: auction.total_bids || 0,
      current_bid: currentBid,
      starting_price: startingPrice,
      min_increment: minIncrement,
      time_remaining_ms: timeRemainingMs,
      is_active: auction.auction_status === 'active',
      winner_id: auction.winner_id,
    };
  } catch (error) {
    console.error('Error getting auction stats:', error);
    return null;
  }
}

/**
 * Calcula el incremento mínimo sugerido para una puja
 */
export function calculateMinBidIncrement(currentBid: number): number {
  if (currentBid < 10000) return 1000;
  if (currentBid < 50000) return 5000;
  if (currentBid < 100000) return 10000;
  return Math.round(currentBid * 0.10); // 10%
}

/**
 * Obtiene las subastas de un vendedor
 */
export async function getSellerAuctions(sellerId: string): Promise<AuctionProduct[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('seller_id', sellerId)
      .eq('sale_type', 'auction')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []) as AuctionProduct[];
  } catch (error) {
    console.error('Error fetching seller auctions:', error);
    throw error;
  }
}


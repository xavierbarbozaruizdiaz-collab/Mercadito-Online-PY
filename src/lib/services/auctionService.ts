// ============================================
// MERCADITO ONLINE PY - AUCTION SERVICE
// Servicio para gestionar subastas y pujas
// ============================================

import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/utils/logger';

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
    city?: string;
  };
}

export interface AuctionProduct {
  id: string;
  title: string;
  description?: string;
  price: number;
  image_url?: string;
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
  seller_id?: string;
}): Promise<AuctionProduct[]> {
  try {
        // Primero, obtener todas las subastas (sale_type = 'auction')
        // Solo incluir productos activos o pausados (no archivados/vendidos/eliminados)
        // Optimizado: solo seleccionar columnas necesarias
        let query = supabase
          .from('products')
          .select('id, title, description, price, image_url:cover_url, condition, sale_type, auction_status, auction_start_at, auction_end_at, current_bid, min_bid_increment, buy_now_price, reserve_price, winner_id, total_bids, seller_id, status, category_id, created_at')
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

    if (filters?.seller_id) {
      query = query.eq('seller_id', filters.seller_id);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error en query de subastas', error);
      throw error;
    }

    logger.debug('Subastas encontradas (sin filtrar)', { count: data?.length || 0 });
    
    let refreshedData: any[] | null = null;
    
    // ACTUALIZAR ESTADOS de todas las subastas antes de filtrar
    if (data && data.length > 0) {
      logger.debug('Actualizando estados de subastas', { count: data.length });
      await Promise.all(
        (data || []).map((auction: any) => checkAndUpdateAuctionStatus(auction.id))
      );
      
      // RECARGAR los datos después de actualizar estados
      logger.debug('Estados actualizados, recargando datos');
      const refreshedQuery = supabase
        .from('products')
        .select('id, title, description, price, image_url:cover_url, condition, sale_type, auction_status, auction_start_at, auction_end_at, current_bid, min_bid_increment, buy_now_price, reserve_price, winner_id, total_bids, seller_id, status, category_id, created_at')
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
        if (refreshedData) {
          logger.debug('Datos recargados después de actualizar estados', { count: refreshedData.length });
        }
      }
    }

    // Usar datos refrescados si están disponibles, sino usar los originales
    const dataToFilter = refreshedData || data || [];
    
    // Filtrar en memoria para ser más flexible con los estados
    const filteredData = dataToFilter.filter((auction: any) => {
      // EXCLUIR si no tiene seller_id (producto huérfano o eliminado incorrectamente)
      if (!auction.seller_id) {
        logger.debug('Subasta excluida - sin seller_id', { auctionId: auction.id, title: auction.title });
        return false;
      }
      
      // EXCLUIR si está eliminada, archivada, vendida o cancelada
      const productStatus = auction.status;
      if (productStatus === 'archived' || productStatus === 'sold' || productStatus === 'deleted') {
        logger.debug('Subasta excluida - status inválido', { auctionId: auction.id, status: productStatus });
        return false;
      }
      
      // EXCLUIR si está cancelada o finalizada
      const auctionStatus = auction.auction_status;
      if (auctionStatus === 'cancelled' || auctionStatus === 'ended') {
        logger.debug('Subasta excluida - auction_status finalizado', { auctionId: auction.id, status: auctionStatus });
        return false;
      }
      
      // Incluir si:
      // 1. Tiene auction_status = 'active'
      // 2. O tiene auction_status = 'scheduled' (aunque no tenga fechas configuradas aún)
      // 3. O no tiene auction_status pero tiene auction_end_at en el futuro
      
      const status = auction.auction_status;
      const endAt = auction.auction_end_at;
      const startAt = auction.auction_start_at;
      
      // Si está finalizada o cancelada, excluirla (ya se filtró arriba pero por seguridad)
      if (status === 'ended' || status === 'cancelled') {
        return false;
      }
      
      // Si está activa, incluirla (verificar fecha de fin si existe)
      if (status === 'active') {
        if (endAt) {
          const endTime = new Date(endAt).getTime();
          const now = Date.now();
          if (endTime <= now) {
            logger.debug('Subasta activa pero ya terminó', { auctionId: auction.id, endAt });
            return false; // Ya terminó
          }
        }
        // Verificar que el producto no esté archivado/vendido
        if (productStatus === 'archived' || productStatus === 'sold' || productStatus === 'deleted') {
          logger.debug('Subasta activa pero producto inválido', { auctionId: auction.id, productStatus });
          return false;
        }
        return true;
      }

      // Si está programada, incluirla si:
      // 1. No tiene fecha de inicio (para pruebas inmediatas)
      // 2. O la fecha de inicio ya pasó (debería estar activa pero no se actualizó aún)
      // 3. O la fecha de inicio es muy cercana (dentro de 1 minuto, tolerancia)
      if (status === 'scheduled') {
        // Si no tiene fecha de inicio, incluirla (para pruebas inmediatas)
        if (!startAt) {
          return true;
        }
        
        // Si tiene fecha de inicio
        const now = Date.now();
        
        // Si tiene fecha de fin, verificar que no haya terminado
        if (endAt) {
          const endTime = new Date(endAt).getTime();
          if (endTime <= now) {
            logger.debug('Subasta programada pero ya terminó', { auctionId: auction.id, endAt });
            return false;
          }
        }
        
        // IMPORTANTE: Incluir TODAS las subastas programadas, incluso si tienen fecha futura
        // El usuario debe poder ver las subastas que están próximas a iniciar
        // Solo excluir si la fecha de fin ya pasó
        return true;
      }

      // Si no tiene status pero tiene fecha de fin en el futuro, incluirla
      if (!status && endAt) {
        const endTime = new Date(endAt).getTime();
        if (endTime > Date.now()) {
          return true;
        }
        return false;
      }

      // Si no tiene status y no tiene fecha de fin, pero es de tipo subasta, incluirla de todos modos
      if (!status && !endAt && auction.sale_type === 'auction') {
        return true;
      }

      return false;
    });

    logger.debug('Subastas filtradas (activas)', { count: filteredData.length });

    // Ordenar por fecha de fin
    filteredData.sort((a: any, b: any) => {
      const aEnd = a.auction_end_at ? new Date(a.auction_end_at).getTime() : 0;
      const bEnd = b.auction_end_at ? new Date(b.auction_end_at).getTime() : 0;
      return aEnd - bEnd;
    });

    return filteredData as AuctionProduct[];
  } catch (error) {
    logger.error('Error fetching active auctions', error);
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
            logger.debug('Subasta actualizada a FINALIZADA', { productId });
          } else {
            // Debería estar activa
            await (supabase as any)
              .from('products')
              .update({ 
                auction_status: 'active',
                updated_at: now
              })
              .eq('id', productId);
            logger.debug('Subasta actualizada a ACTIVA', { productId });
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
          logger.debug('Subasta actualizada a ACTIVA', { productId });
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
        logger.debug('Subasta actualizada a FINALIZADA (ya había terminado)', { productId });
      }
    }
  } catch (error) {
    logger.error('Error checking auction status', error, { productId });
    // No lanzar error, solo loguear
  }
}

/**
 * Obtiene una subasta por ID con todos los detalles (OPTIMIZADO)
 * Usa caché Redis para datos estáticos y consolida queries
 * Actualiza automáticamente el estado si es necesario
 */
export async function getAuctionById(
  productId: string,
  options?: { useCache?: boolean; includeSellerInfo?: boolean; includeImages?: boolean }
): Promise<AuctionProduct | null> {
  const { useCache = true, includeSellerInfo = false, includeImages = false } = options || {};

  try {
    // Intentar obtener datos estáticos desde caché
    if (useCache) {
      try {
        const { getCachedAuctionStaticData } = await import('@/lib/redis/cache');
        const cachedStatic = await getCachedAuctionStaticData(productId);
        
        if (cachedStatic) {
          // Obtener solo datos dinámicos (más rápido)
          const { data: dynamicData, error: dynamicError } = await supabase
            .from('products')
            .select('current_bid, winner_id, auction_status, auction_end_at, total_bids, auction_version')
            .eq('id', productId)
            .single();

          if (!dynamicError && dynamicData) {
            // Combinar datos estáticos (caché) con dinámicos (DB)
            const combined = {
              ...cachedStatic,
              ...dynamicData,
              image_url: cachedStatic.image_url,
            };
            
            logger.debug('[Auction Service] Usando caché para datos estáticos', { productId });
            return combined as AuctionProduct;
          }
        }
      } catch (cacheError) {
        // Si falla el caché, continuar con query normal
        logger.warn('[Auction Service] Error accediendo caché, usando query normal', cacheError);
      }
    }

    // Si no hay caché o falló, hacer query completa
    // Primero verificar y actualizar estado si es necesario
    await checkAndUpdateAuctionStatus(productId);
    
    // Query consolidada: obtener producto + información relacionada en una sola llamada
    // NOTA: No hacemos join con profiles porque products.seller_id referencia auth.users, no profiles
    // Si se necesita información del vendedor, hacer consulta separada
    const query = supabase
      .from('products')
      .select(`
        id, 
        title, 
        description, 
        price, 
        cover_url,
        condition, 
        sale_type, 
        auction_status, 
        auction_start_at, 
        auction_end_at, 
        current_bid, 
        min_bid_increment, 
        buy_now_price, 
        reserve_price, 
        winner_id, 
        total_bids, 
        seller_id, 
        status, 
        category_id, 
        created_at, 
        attributes,
        auction_version,
        store_id
        ${includeImages ? ', product_images(url, idx)' : ''}
      `)
      .eq('id', productId)
      .eq('sale_type', 'auction')
      .not('seller_id', 'is', null)
      .or('status.is.null,status.eq.active,status.eq.paused')
      .single();

    const { data, error } = await query;

    if (error) {
      if (error.code === 'PGRST116') {
        logger.debug('Subasta no encontrada o eliminada', { productId });
        return null;
      }
      throw error;
    }

    // Verificación adicional después de obtener los datos
    if (data) {
      const product = data as any;
      
      // Excluir si está archivada/vendida/eliminada
      if (product.status === 'archived' || product.status === 'sold' || product.status === 'deleted') {
        logger.debug('Subasta excluida - status inválido', { productId, status: product.status });
        return null;
      }
      
      // Excluir si está cancelada
      if (product.auction_status === 'cancelled') {
        logger.debug('Subasta excluida - cancelada', { productId });
        return null;
      }
      
      // Excluir si no tiene seller_id (por seguridad adicional)
      if (!product.seller_id) {
        logger.debug('Subasta excluida - sin seller_id', { productId });
        return null;
      }

      // Normalizar datos
      const normalized: any = {
        ...product,
        image_url: product.cover_url || product.image_url,
      };

      // Si se necesita información del vendedor, hacer consulta separada
      // (no podemos hacer join porque products.seller_id referencia auth.users, no profiles)
      if (includeSellerInfo && product.seller_id) {
        try {
          const { data: sellerProfile, error: sellerError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .eq('id', product.seller_id)
            .single();
          
          if (!sellerError && sellerProfile) {
            normalized.seller_info = sellerProfile;
          }
        } catch (err) {
          // Si falla, continuar sin información del vendedor
          logger.warn('Error fetching seller profile', err);
        }
      }

      // Si se incluyeron imágenes, normalizarlas
      if (includeImages && product.product_images) {
        normalized.images = (Array.isArray(product.product_images) ? product.product_images : [])
          .sort((a: any, b: any) => (a.idx || 0) - (b.idx || 0))
          .map((img: any) => img.url)
          .filter(Boolean);
      }

      // Guardar datos estáticos en caché para próximas requests
      if (useCache) {
        try {
          const { setCachedAuctionStaticData, separateAuctionData } = await import('@/lib/redis/cache');
          const { static: staticData } = separateAuctionData(normalized);
          
          // Agregar seller_info e images si están disponibles
          if (normalized.seller_info) {
            staticData.seller_info = normalized.seller_info;
          }
          if (normalized.images) {
            staticData.images = normalized.images;
          }
          
          await setCachedAuctionStaticData(productId, staticData, 45); // 45 segundos TTL
        } catch (cacheError) {
          // No crítico si falla el caché
          logger.warn('[Auction Service] Error guardando en caché', cacheError);
        }
      }

      return normalized as AuctionProduct;
    }

    return null;
  } catch (error) {
    logger.error('Error fetching auction', error, { productId });
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
    // Primero obtener las pujas (solo columnas necesarias)
    const { data: bidsData, error: bidsError } = await supabase
      .from('auction_bids')
      .select('id, product_id, bidder_id, amount, bid_time, is_auto_bid, is_retracted, created_at')
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
      .select('id, first_name, last_name, email, city')
      .in('id', bidderIds);

    if (profilesError) {
      logger.warn('Error fetching profiles for bids', profilesError);
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
        city: null,
      },
    }));

    return bidsWithProfiles as AuctionBid[];
  } catch (error) {
    logger.error('Error fetching bids', error, { productId });
    throw error;
  }
}

/**
 * Coloca una puja en una subasta
 * 
 * NOTA: Ahora usa el endpoint /api/auctions/[id]/bid que incluye:
 * - Locks distribuidos con Redis
 * - Rate limiting distribuido
 * - Validaciones exhaustivas
 * - Manejo robusto de condiciones de carrera
 */
export async function placeBid(
  productId: string,
  bidderId: string,
  amount: number,
  idempotencyKey?: string
): Promise<{ 
  bid_id: string; 
  success: boolean; 
  error?: string; 
  error_code?: string; 
  version?: number; 
  end_at?: string; 
  server_timestamp?: string; 
  is_duplicate?: boolean; 
  retry_after?: number;
  // Información de bonus time (anti-sniping)
  bonus_applied?: boolean;
  bonus_new_end_time?: string;
  bonus_extension_seconds?: number;
}> {
  try {
    // Generar idempotency key si no se proporciona
    const finalIdempotencyKey = idempotencyKey || crypto.randomUUID();

    // Llamar al nuevo endpoint que maneja locks y rate limiting
    const response = await fetch(`/api/auctions/${productId}/bid`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bidAmount: amount,
        idempotencyKey: finalIdempotencyKey,
      }),
    });

    const data = await response.json();

    // Si la respuesta no es exitosa, retornar error
    if (!response.ok || !data.success) {
      logger.warn('Puja rechazada por el servidor', {
        productId,
        bidderId,
        amount,
        status: response.status,
        error: data.error,
        retryAfter: data.retry_after,
      });

      return {
        bid_id: data.bid_id || '',
        success: false,
        error: data.error || 'Error al colocar la puja',
        error_code: data.error_code, // Pasar código de error (ej: "AUCTION_ENDED")
        retry_after: data.retry_after,
      };
    }

    // Puja exitosa
    logger.info('Puja colocada exitosamente', {
      productId,
      bidderId,
      amount,
      bidId: data.bid_id,
      currentBid: data.current_bid,
    });

    return {
      bid_id: data.bid_id || '',
      success: true,
      version: data.version,
      end_at: data.auction_end_at,
      is_duplicate: false,
      // Información de bonus time
      bonus_applied: data.bonus_applied || false,
      bonus_new_end_time: data.bonus_new_end_time,
      bonus_extension_seconds: data.bonus_extension_seconds,
    };
  } catch (error: any) {
    logger.error('Error placing bid', error, { productId, bidderId, amount });
    
    // Si es error de red, dar mensaje más claro
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      return {
        bid_id: '',
        success: false,
        error: 'Error de conexión. Verifica tu internet e intenta de nuevo.',
      };
    }

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
    const { error } = await (supabase as any).rpc('buy_now_auction', {
      p_product_id: productId,
      p_buyer_id: buyerId,
    });

    if (error) {
      logger.error('Error in buy now', error, { productId, buyerId });
      return {
        success: false,
        error: error.message || 'Error al realizar compra ahora',
      };
    }

    return {
      success: true,
    };
  } catch (error: any) {
    logger.error('Error in buy now', error, { productId, buyerId });
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
      .select('id, product_id, bidder_id, amount, bid_time, is_auto_bid, is_retracted, created_at')
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
      .select('id, title, description, price, cover_url, condition, sale_type, auction_status, auction_start_at, auction_end_at, current_bid, min_bid_increment, buy_now_price, reserve_price, winner_id, total_bids, seller_id, created_at')
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
    logger.error('Error fetching user bids', error, { userId });
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
    logger.error('Error getting auction stats', error, { productId });
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
      .select('id, title, description, price, cover_url, condition, sale_type, auction_status, auction_start_at, auction_end_at, current_bid, min_bid_increment, buy_now_price, reserve_price, winner_id, total_bids, seller_id, created_at')
      .eq('seller_id', sellerId)
      .eq('sale_type', 'auction')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []) as AuctionProduct[];
  } catch (error) {
    logger.error('Error fetching seller auctions', error, { sellerId });
    throw error;
  }
}


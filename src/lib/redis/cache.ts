// ============================================
// MERCADITO ONLINE PY - REDIS CACHE FOR AUCTIONS
// Sistema de caché para datos estáticos de subastas
// Reduce carga en Supabase cuando miles de usuarios miran la misma subasta
// ============================================

import { getRedis, isRedisAvailable } from './client';
import { logger } from '@/lib/utils/logger';

// ============================================
// TIPOS
// ============================================

export interface AuctionStaticData {
  // Datos que NO cambian frecuentemente (cacheables)
  id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
  condition: string;
  sale_type: 'auction';
  category_id: string | null;
  seller_id: string;
  store_id: string | null;
  created_at: string;
  auction_start_at: string | null;
  min_bid_increment: number | null;
  buy_now_price: number | null;
  reserve_price: number | null;
  attributes: Record<string, any> | null;
  // Información del vendedor (cambia raramente)
  seller_info?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
  // Imágenes del producto (cambian raramente)
  images?: string[];
}

export interface AuctionDynamicData {
  // Datos que cambian frecuentemente (NO cacheables)
  current_bid: number | null;
  winner_id: string | null;
  auction_status: 'scheduled' | 'active' | 'ended' | 'cancelled';
  auction_end_at: string | null;
  total_bids: number;
  auction_version: number | null;
}

// ============================================
// CONSTANTES
// ============================================

const CACHE_PREFIX = 'auction:static:';
const DEFAULT_TTL_SECONDS = 45; // 45 segundos para datos estáticos

// ============================================
// FUNCIONES DE CACHÉ
// ============================================

/**
 * Obtiene datos estáticos de una subasta desde caché
 * 
 * @param auctionId - ID de la subasta
 * @returns Datos estáticos o null si no están en caché
 */
export async function getCachedAuctionStaticData(
  auctionId: string
): Promise<AuctionStaticData | null> {
  if (!isRedisAvailable()) {
    return null;
  }

  const redis = getRedis();
  if (!redis) {
    return null;
  }

  try {
    const cacheKey = `${CACHE_PREFIX}${auctionId}`;
    const cached = await redis.get<string>(cacheKey);

    if (!cached) {
      return null;
    }

    const data = JSON.parse(cached) as AuctionStaticData;
    logger.debug('[Auction Cache] Cache HIT', { auctionId });
    return data;
  } catch (error) {
    logger.error('[Auction Cache] Error obteniendo caché', error, { auctionId });
    return null;
  }
}

/**
 * Guarda datos estáticos de una subasta en caché
 * 
 * @param auctionId - ID de la subasta
 * @param data - Datos estáticos a cachear
 * @param ttlSeconds - Tiempo de vida en segundos (default: 45)
 */
export async function setCachedAuctionStaticData(
  auctionId: string,
  data: AuctionStaticData,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<boolean> {
  if (!isRedisAvailable()) {
    return false;
  }

  const redis = getRedis();
  if (!redis) {
    return false;
  }

  try {
    const cacheKey = `${CACHE_PREFIX}${auctionId}`;
    const serialized = JSON.stringify(data);

    await redis.set(cacheKey, serialized, { ex: ttlSeconds });
    logger.debug('[Auction Cache] Cache SET', { auctionId, ttlSeconds });
    return true;
  } catch (error) {
    logger.error('[Auction Cache] Error guardando caché', error, { auctionId });
    return false;
  }
}

/**
 * Invalida el caché de una subasta
 * Útil cuando se actualiza información estática (ej: descripción, imágenes)
 * 
 * @param auctionId - ID de la subasta
 */
export async function invalidateAuctionCache(auctionId: string): Promise<boolean> {
  if (!isRedisAvailable()) {
    return false;
  }

  const redis = getRedis();
  if (!redis) {
    return false;
  }

  try {
    const cacheKey = `${CACHE_PREFIX}${auctionId}`;
    await redis.del(cacheKey);
    logger.debug('[Auction Cache] Cache invalidado', { auctionId });
    return true;
  } catch (error) {
    logger.error('[Auction Cache] Error invalidando caché', error, { auctionId });
    return false;
  }
}

/**
 * Separa datos estáticos de dinámicos de una subasta
 * 
 * @param auction - Datos completos de la subasta
 * @returns Objeto con datos estáticos y dinámicos separados
 */
export function separateAuctionData(auction: any): {
  static: AuctionStaticData;
  dynamic: AuctionDynamicData;
} {
  const staticData: AuctionStaticData = {
    id: auction.id,
    title: auction.title,
    description: auction.description,
    price: auction.price,
    image_url: auction.image_url || auction.cover_url,
    condition: auction.condition,
    sale_type: 'auction',
    category_id: auction.category_id,
    seller_id: auction.seller_id,
    store_id: auction.store_id,
    created_at: auction.created_at,
    auction_start_at: auction.auction_start_at,
    min_bid_increment: auction.min_bid_increment,
    buy_now_price: auction.buy_now_price,
    reserve_price: auction.reserve_price,
    attributes: auction.attributes,
  };

  const dynamicData: AuctionDynamicData = {
    current_bid: auction.current_bid,
    winner_id: auction.winner_id,
    auction_status: auction.auction_status,
    auction_end_at: auction.auction_end_at,
    total_bids: auction.total_bids || 0,
    auction_version: auction.auction_version || null,
  };

  return { static: staticData, dynamic: dynamicData };
}

/**
 * Combina datos estáticos y dinámicos en un objeto completo
 */
export function combineAuctionData(
  staticData: AuctionStaticData,
  dynamicData: AuctionDynamicData
): any {
  return {
    ...staticData,
    ...dynamicData,
  };
}








// ============================================
// MERCADITO ONLINE PY - AUCTION POSITION ENDPOINT
// Endpoint optimizado para calcular posición de un usuario en una subasta
// Usa SQL eficiente sin traer todas las pujas (optimizado para 1000+ oferentes)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { getRedis, isRedisAvailable } from '@/lib/redis/client';
import { logger } from '@/lib/utils/logger';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_PREFIX = 'auction:position:';
const CACHE_TTL_SECONDS = 5; // 5 segundos (corto porque cambia frecuentemente)

/**
 * Calcula la posición de un usuario en una subasta usando SQL optimizado
 * Solo calcula la posición sin traer todas las pujas
 */
async function calculateBidPosition(
  auctionId: string,
  userId: string
): Promise<{ position: number | null; isWinner: boolean }> {
  try {
    // Primero verificar si el usuario es el ganador actual (winner_id)
    const { data: auction, error: auctionError } = await (supabaseAdmin as any)
      .from('products')
      .select('winner_id')
      .eq('id', auctionId)
      .single();

    if (auctionError || !auction) {
      return { position: null, isWinner: false };
    }

    // Si el usuario es el ganador, posición 1
    if (auction.winner_id === userId) {
      return { position: 1, isWinner: true };
    }

    // Si no es ganador, calcular posición usando SQL optimizado
    // Query que agrupa por bidder_id y obtiene la máxima puja de cada uno
    // Luego cuenta cuántos tienen pujas mayores que el usuario
    const { data: positionData, error: positionError } = await (supabaseAdmin as any)
      .rpc('get_bidder_position', {
        p_product_id: auctionId,
        p_bidder_id: userId,
      });

    if (positionError) {
      // Si la función RPC no existe, usar query alternativa
      logger.warn('RPC get_bidder_position no disponible, usando query alternativa', { auctionId, userId });
      
      // Query alternativa: obtener máxima puja del usuario y contar cuántos tienen más
      const { data: myMaxBid } = await (supabaseAdmin as any)
        .from('auction_bids')
        .select('amount')
        .eq('product_id', auctionId)
        .eq('bidder_id', userId)
        .eq('is_retracted', false)
        .order('amount', { ascending: false })
        .limit(1)
        .single();

      if (!myMaxBid || !myMaxBid.amount) {
        return { position: null, isWinner: false };
      }

      // Contar cuántos bidders únicos tienen pujas mayores
      // Usar subquery optimizada
      const { data: higherBidders, error: countError } = await (supabaseAdmin as any)
        .from('auction_bids')
        .select('bidder_id', { count: 'exact', head: true })
        .eq('product_id', auctionId)
        .eq('is_retracted', false)
        .gt('amount', myMaxBid.amount);

      if (countError) {
        logger.error('Error contando pujadores con pujas mayores', countError, { auctionId, userId });
        return { position: null, isWinner: false };
      }

      // La posición es el número de bidders con pujas mayores + 1
      // Pero necesitamos contar bidders únicos, no pujas
      // Usar query más compleja
      const { data: uniqueHigherBidders } = await (supabaseAdmin as any)
        .rpc('count_unique_bidders_above', {
          p_product_id: auctionId,
          p_min_amount: myMaxBid.amount,
        });

      if (uniqueHigherBidders !== null && uniqueHigherBidders !== undefined) {
        return { position: uniqueHigherBidders + 1, isWinner: false };
      }

      // Fallback: query manual para contar bidders únicos
      const { data: allBids } = await (supabaseAdmin as any)
        .from('auction_bids')
        .select('bidder_id, amount')
        .eq('product_id', auctionId)
        .eq('is_retracted', false)
        .gt('amount', myMaxBid.amount);

      if (allBids) {
        const uniqueBidders = new Set(allBids.map((bid: any) => bid.bidder_id));
        return { position: uniqueBidders.size + 1, isWinner: false };
      }

      return { position: null, isWinner: false };
    }

    // Si la función RPC existe y devuelve datos
    if (positionData !== null && positionData !== undefined) {
      return { position: positionData + 1, isWinner: false }; // +1 porque es 0-indexed
    }

    return { position: null, isWinner: false };
  } catch (error) {
    logger.error('Error calculando posición de puja', error, { auctionId, userId });
    return { position: null, isWinner: false };
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const auctionId = params.id;

    if (!auctionId) {
      return NextResponse.json({ error: 'auctionId requerido' }, { status: 400 });
    }

    // Obtener usuario autenticado
    const supabaseServer = await createServerClient();
    const { data: { user } } = await supabaseServer.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const userId = user.id;

    // Intentar obtener del caché Redis
    const cacheKey = `${CACHE_PREFIX}${auctionId}:${userId}`;
    if (isRedisAvailable()) {
      const redis = getRedis();
      if (redis) {
        try {
          const cached = await redis.get<string>(cacheKey);
          if (cached) {
            const cachedData = JSON.parse(cached);
            logger.debug('[Position Cache] Cache HIT', { auctionId, userId });
            return NextResponse.json(cachedData, {
              headers: {
                'X-Cache': 'HIT',
                'Cache-Control': 'private, max-age=5',
              },
            });
          }
        } catch (cacheError: any) {
          // Solo loguear errores inesperados (no conexión Redis que es esperado si no está configurado)
          const isExpectedError = 
            cacheError?.code === 'ECONNREFUSED' ||
            cacheError?.message?.includes('Connection') ||
            cacheError?.message?.includes('Redis') ||
            !isRedisAvailable();
          
          if (!isExpectedError && process.env.NODE_ENV === 'development') {
            logger.debug('Error obteniendo posición desde caché', cacheError);
          }
          // Continuar sin caché - no es crítico
        }
      }
    }

    // Calcular posición
    const result = await calculateBidPosition(auctionId, userId);

    // Guardar en caché Redis
    if (isRedisAvailable()) {
      const redis = getRedis();
      if (redis) {
        try {
          await redis.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL_SECONDS });
          logger.debug('[Position Cache] Cache SET', { auctionId, userId });
        } catch (cacheError: any) {
          // Solo loguear errores inesperados (no conexión Redis que es esperado si no está configurado)
          const isExpectedError = 
            cacheError?.code === 'ECONNREFUSED' ||
            cacheError?.message?.includes('Connection') ||
            cacheError?.message?.includes('Redis') ||
            !isRedisAvailable();
          
          if (!isExpectedError && process.env.NODE_ENV === 'development') {
            logger.debug('Error guardando posición en caché', cacheError);
          }
          // Continuar sin caché - no es crítico
        }
      }
    }

    return NextResponse.json(result, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'private, max-age=5',
      },
    });
  } catch (err: any) {
    const params = await context.params;
    logger.error('[Position API] Error inesperado', err, { auctionId: params.id });
    return NextResponse.json(
      { error: err?.message || 'Error al calcular posición' },
      { status: 500 }
    );
  }
}


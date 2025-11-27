// ============================================
// MERCADITO ONLINE PY - AUCTION BID ENDPOINT
// Endpoint crítico para manejar pujas concurrentes con locks distribuidos
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { getAuctionLockKey, withLock } from '@/lib/redis/locks';
import { checkUserRateLimit, checkIpRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/redis/rateLimit';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // No cachear este endpoint

// ============================================
// TIPOS
// ============================================

interface BidRequest {
  bidAmount: number;
  idempotencyKey?: string; // Clave de idempotencia del cliente
}

interface BidResponse {
  success: boolean;
  bid_id?: string;
  current_bid?: number;
  winner_id?: string;
  auction_status?: string;
  auction_end_at?: string;
  version?: number;
  error?: string;
  error_code?: string; // Código de error específico (ej: "AUCTION_ENDED")
  retry_after?: number; // Segundos hasta que se puede intentar de nuevo
  // Información de bonus time (anti-sniping)
  bonus_applied?: boolean; // true si se aplicó bonus time en esta puja
  bonus_new_end_time?: string; // Nueva fecha de fin si se aplicó bonus (ISO string)
  bonus_extension_seconds?: number; // Cuántos segundos se extendió
}

// ============================================
// HELPER: Obtener IP del cliente
// ============================================

function getClientIp(request: NextRequest): string {
  // Intentar obtener IP de headers comunes
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip'); // Cloudflare

  if (cfConnectingIp) return cfConnectingIp;
  if (forwarded) return forwarded.split(',')[0].trim();
  if (realIp) return realIp;

  return 'unknown';
}

// ============================================
// HELPER: Obtener usuario autenticado
// ============================================

async function getAuthenticatedUser(request: NextRequest) {
  try {
    // Intentar obtener token del header Authorization
    const authHeader = request.headers.get('authorization');
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && user) return user;
    }

    // Fallback: obtener desde cookies usando createServerClient
    // En Next.js App Router, necesitamos usar cookies() para obtener la sesión
    try {
      const { createServerClient } = await import('@/lib/supabase/server');
      const supabaseServer = await createServerClient();
      const { data: { user }, error } = await supabaseServer.auth.getUser();
      if (!error && user) return user;
    } catch (serverError) {
      logger.warn('[Bid API] Error obteniendo usuario desde server client', serverError);
    }

    return null;
  } catch (error) {
    logger.error('[Bid API] Error obteniendo usuario', error);
    return null;
  }
}

// ============================================
// HELPER: Validar subasta
// ============================================

async function validateAuction(auctionId: string) {
  const { data: auction, error } = await supabaseAdmin
    .from('products')
    .select(
      'id, seller_id, sale_type, auction_status, auction_end_at, current_bid, min_bid_increment, total_bids, winner_id, auction_version, attributes'
    )
    .eq('id', auctionId)
    .single();

  if (error || !auction) {
    return { valid: false, error: 'Subasta no encontrada', errorCode: undefined, auction: null };
  }

  if (auction.sale_type !== 'auction') {
    return { valid: false, error: 'El producto no es una subasta', errorCode: undefined, auction: null };
  }

  if (auction.auction_status !== 'active') {
    // Si está ended, retornar código específico
    if (auction.auction_status === 'ended') {
      return {
        valid: false,
        error: 'La subasta ya ha finalizado',
        errorCode: 'AUCTION_ENDED',
        auction: null,
      };
    }
    return {
      valid: false,
      error: `La subasta no está activa. Estado: ${auction.auction_status}`,
      errorCode: undefined,
      auction: null,
    };
  }

  // ⚠️ IMPORTANTE: NO validamos tiempo aquí con Date.now()
  // La validación de tiempo se delega completamente a PostgreSQL (place_bid)
  // PostgreSQL usa NOW() como fuente de verdad única
  // Esto garantiza consistencia entre todas las validaciones

  return { valid: true, error: null, errorCode: undefined, auction };
}

// ============================================
// HELPER: Validar monto de puja
// ============================================

function validateBidAmount(
  bidAmount: number,
  currentBid: number | null,
  minIncrement: number | null,
  startingPrice?: number
): { valid: boolean; error?: string; requiredAmount?: number } {
  if (bidAmount <= 0) {
    return { valid: false, error: 'El monto de la puja debe ser mayor a 0' };
  }

  // Determinar precio base
  const basePrice = currentBid || startingPrice || 0;
  const increment = minIncrement || 1000; // Default: 1000 guaraníes
  const requiredAmount = basePrice + increment;

  if (bidAmount < requiredAmount) {
    return {
      valid: false,
      error: `El monto debe ser al menos Gs. ${requiredAmount.toLocaleString()} (precio actual + incremento mínimo)`,
      requiredAmount,
    };
  }

  return { valid: true };
}

// ============================================
// ENDPOINT PRINCIPAL
// ============================================

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const params = await context.params;
  const auctionId = params.id;

  try {
    // ========================================
    // 1. VALIDAR AUTENTICACIÓN
    // ========================================
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json<BidResponse>(
        { success: false, error: 'No autenticado. Debes iniciar sesión para pujar.' },
        { status: 401 }
      );
    }

    const userId = user.id;
    const clientIp = getClientIp(request);

    // ========================================
    // 2. VALIDAR RATE LIMITING
    // ========================================
    // Rate limit por usuario
    const userRateLimit = await checkUserRateLimit(userId, RATE_LIMIT_CONFIGS.BID_BY_USER);
    if (!userRateLimit.allowed) {
      logger.warn('[Bid API] Rate limit excedido por usuario', {
        userId,
        auctionId,
        retryAfter: userRateLimit.retryAfter,
      });
      return NextResponse.json<BidResponse>(
        {
          success: false,
          error: `Has alcanzado el límite de pujas. Intenta de nuevo en ${userRateLimit.retryAfter || 60} segundos.`,
          retry_after: userRateLimit.retryAfter,
        },
        { status: 429 }
      );
    }

    // Rate limit por IP (adicional)
    const ipRateLimit = await checkIpRateLimit(clientIp, RATE_LIMIT_CONFIGS.BID_BY_IP);
    if (!ipRateLimit.allowed) {
      logger.warn('[Bid API] Rate limit excedido por IP', {
        clientIp,
        auctionId,
        retryAfter: ipRateLimit.retryAfter,
      });
      return NextResponse.json<BidResponse>(
        {
          success: false,
          error: `Límite de pujas excedido desde esta IP. Intenta de nuevo en ${ipRateLimit.retryAfter || 60} segundos.`,
          retry_after: ipRateLimit.retryAfter,
        },
        { status: 429 }
      );
    }

    // ========================================
    // 3. VALIDAR REQUEST BODY
    // ========================================
    let body: BidRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json<BidResponse>(
        { success: false, error: 'Body inválido. Se requiere bidAmount.' },
        { status: 400 }
      );
    }

    const { bidAmount, idempotencyKey } = body;

    if (!bidAmount || typeof bidAmount !== 'number') {
      return NextResponse.json<BidResponse>(
        { success: false, error: 'bidAmount es requerido y debe ser un número' },
        { status: 400 }
      );
    }

    // ========================================
    // 4. ADQUIRIR LOCK DISTRIBUIDO
    // ========================================
    const lockKey = getAuctionLockKey(auctionId);

    const result = await withLock(
      lockKey,
      async () => {
        // ====================================
        // 5. VALIDAR SUBASTA (re-lectura con lock)
        // ====================================
        // NOTA: Esta validación NO verifica tiempo (no usa Date.now())
        // La validación de tiempo se delega a PostgreSQL place_bid() que usa NOW()
        const validation = await validateAuction(auctionId);
        if (!validation.valid || !validation.auction) {
          const error = new Error(validation.error || 'Subasta inválida') as any;
          error.errorCode = validation.errorCode; // Pasar código de error
          throw error;
        }

        const auction = validation.auction;

        // Verificar que el usuario no sea el vendedor
        if (auction.seller_id === userId) {
          throw new Error('No puedes pujar en tus propias subastas');
        }

        // ====================================
        // 6. VALIDAR MONTO DE PUJA
        // ====================================
        const startingPrice = auction.attributes?.auction?.starting_price || auction.current_bid || 0;
        const bidValidation = validateBidAmount(
          bidAmount,
          auction.current_bid,
          auction.min_bid_increment,
          startingPrice
        );

        if (!bidValidation.valid) {
          throw new Error(bidValidation.error || 'Monto de puja inválido');
        }

        // ====================================
        // 7. LLAMAR A FUNCIÓN RPC DE POSTGRES
        // ====================================
        // La función place_bid en PostgreSQL maneja:
        // - Idempotencia (si se pasa idempotencyKey)
        // - Validaciones adicionales
        // - Actualización de la subasta
        // - Extensión de tiempo (anti-sniping)
        // - Notificaciones

        const clientSentAt = new Date().toISOString();
        const { data: rpcResult, error: rpcError } = await (supabaseAdmin as any).rpc('place_bid', {
          p_product_id: auctionId,
          p_bidder_id: userId,
          p_amount: bidAmount,
          p_idempotency_key: idempotencyKey || null,
          p_client_sent_at: clientSentAt,
        });

        if (rpcError) {
          // Detectar si el error es por subasta expirada o estado inválido
          const errorMessage = rpcError.message || 'Error al procesar la puja';
          const isAuctionEnded = 
            errorMessage.includes('finalizado') ||
            errorMessage.includes('expirado') ||
            errorMessage.includes('ha finalizado');
          const isAuctionNotActive = 
            errorMessage.includes('no está activa') ||
            errorMessage.includes('not_active');
          
          // Logging específico según el tipo de error
          if (isAuctionEnded) {
            logger.warn('[Bid API] Puja rechazada: subasta ya finalizada', {
              auctionId,
              userId,
              bidAmount,
              error: errorMessage,
            });
          } else if (isAuctionNotActive) {
            logger.warn('[Bid API] Puja rechazada: subasta no está activa', {
              auctionId,
              userId,
              bidAmount,
              error: errorMessage,
            });
          } else {
            logger.error('[Bid API] Error en place_bid RPC', rpcError, {
              auctionId,
              userId,
              bidAmount,
            });
          }
          
          const error = new Error(errorMessage) as any;
          if (isAuctionEnded) {
            error.errorCode = 'AUCTION_ENDED';
          }
          throw error;
        }

        // La función retorna JSONB con información de la puja
        if (typeof rpcResult === 'object' && rpcResult !== null) {
          // Nueva respuesta con más datos, incluyendo información de bonus time
          const bonusApplied = rpcResult.bonus_applied === true;
          const bonusNewEndTime = rpcResult.bonus_new_end_time 
            ? new Date(rpcResult.bonus_new_end_time).toISOString() 
            : undefined;
          
          // Logging cuando se aplica bonus time
          if (bonusApplied) {
            logger.info('[Bid API] Bonus time aplicado', {
              auctionId,
              userId,
              oldEndTime: rpcResult.auction_end_at,
              newEndTime: bonusNewEndTime,
              extensionSeconds: rpcResult.bonus_extension_seconds,
            });
          }
          
          return {
            success: rpcResult.success !== false,
            bid_id: rpcResult.bid_id,
            current_bid: rpcResult.current_bid || bidAmount,
            winner_id: rpcResult.winner_id,
            auction_status: rpcResult.auction_status || 'active',
            auction_end_at: rpcResult.auction_end_at || bonusNewEndTime,
            version: rpcResult.version,
            is_duplicate: rpcResult.is_duplicate || false,
            // Información de bonus time
            bonus_applied: bonusApplied,
            bonus_new_end_time: bonusNewEndTime,
            bonus_extension_seconds: rpcResult.bonus_extension_seconds || undefined,
          };
        }

        // Compatibilidad con respuesta antigua (solo UUID)
        return {
          success: true,
          bid_id: typeof rpcResult === 'string' ? rpcResult : undefined,
          current_bid: bidAmount,
        };
      },
      {
        // TTL de 15 segundos para cubrir:
        // - Validación de subasta (query DB): ~100-200ms
        // - Validación de monto (cálculo): ~10ms
        // - place_bid() RPC (puede ser lento bajo carga): ~500-2000ms
        // - Re-lectura de estado: ~100-200ms
        // - Latencia de red y procesamiento: ~200-500ms
        // Total esperado: ~1-3 segundos en condiciones normales
        // TTL de 15s da margen para picos de latencia y carga alta
        // Si la operación falla, el lock expira automáticamente (no queda colgado)
        ttlSeconds: 15,
        retryAttempts: 0, // No reintentar (fallar rápido)
      }
    );

    // ========================================
    // 8. MANEJAR RESULTADO
    // ========================================
    if (!result.success) {
      const errorMessage = result.error?.message || 'Error al procesar la puja';
      const errorCode = (result.error as any)?.errorCode;
      logger.error('[Bid API] Error en withLock', result.error, { auctionId, userId, errorCode });

      // Si es error de subasta finalizada, retornar 400 con código específico
      if (errorCode === 'AUCTION_ENDED' || errorMessage.includes('finalizado') || errorMessage.includes('expirado')) {
        return NextResponse.json<BidResponse>(
          { 
            success: false, 
            error: 'La subasta ya ha finalizado',
            error_code: 'AUCTION_ENDED'
          },
          { status: 400 }
        );
      }

      // Si es error de validación (no activa), retornar 400
      if (errorMessage.includes('no está activa')) {
        return NextResponse.json<BidResponse>(
          { success: false, error: errorMessage },
          { status: 400 }
        );
      }

      // Si es error de monto, retornar 400
      if (errorMessage.includes('monto') || errorMessage.includes('incremento')) {
        return NextResponse.json<BidResponse>(
          { success: false, error: errorMessage },
          { status: 400 }
        );
      }

      // Otros errores: 500
      return NextResponse.json<BidResponse>(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    }

    const bidData = result.result as any;

    // ========================================
    // 9. OBTENER ESTADO ACTUALIZADO DE LA SUBASTA
    // ========================================
    // Re-leer la subasta para obtener el estado más reciente
    const { data: updatedAuction } = await supabaseAdmin
      .from('products')
      .select('current_bid, winner_id, auction_status, auction_end_at, auction_version')
      .eq('id', auctionId)
      .single();

    // ========================================
    // 10. RESPUESTA EXITOSA
    // ========================================
    // NOTA: El sistema de tiempo real (Supabase Realtime) ya está integrado.
    // Cuando place_bid inserta en auction_bids, el stream SSE en /api/auctions/[id]/stream
    // automáticamente emite un evento BID_PLACED a todos los clientes conectados.
    // No se requiere acción adicional aquí.

    const response: BidResponse = {
      success: true,
      bid_id: bidData.bid_id,
      current_bid: updatedAuction?.current_bid || bidData.current_bid,
      winner_id: updatedAuction?.winner_id || bidData.winner_id,
      auction_status: updatedAuction?.auction_status || bidData.auction_status || 'active',
      auction_end_at: updatedAuction?.auction_end_at || bidData.auction_end_at,
      version: updatedAuction?.auction_version || bidData.version,
    };

    // ========================================
    // 11. INVALIDAR CACHÉ REDIS
    // ========================================
    // Invalidar caché de datos estáticos cuando hay cambios relevantes
    // Esto asegura que los usuarios no vean datos obsoletos después de una puja
    try {
      const { invalidateAuctionCache } = await import('@/lib/redis/cache');
      await invalidateAuctionCache(auctionId);
      logger.debug('[Bid API] Caché invalidado después de puja exitosa', { auctionId });
    } catch (cacheError) {
      // No crítico si falla la invalidación, pero loguear
      logger.warn('[Bid API] Error invalidando caché después de puja', cacheError, { auctionId });
    }

    const duration = Date.now() - startTime;
    logger.info('[Bid API] Puja procesada exitosamente', {
      auctionId,
      userId,
      bidAmount,
      duration,
      bidId: response.bid_id,
    });

    return NextResponse.json<BidResponse>(response, { status: 200 });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error('[Bid API] Error inesperado', error, {
      auctionId: params.id,
      duration,
    });

    return NextResponse.json<BidResponse>(
      {
        success: false,
        error: error.message || 'Error inesperado al procesar la puja',
      },
      { status: 500 }
    );
  }
}


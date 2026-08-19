// ============================================
// MERCADITO ONLINE PY - AUTO-CIERRE DE SUBASTAS
// Endpoint para cerrar subastas expiradas
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { invalidateAuctionCache } from '@/lib/redis/cache';
import { logger } from '@/lib/utils/logger';

/**
 * POST /api/auctions/close-expired
 * 
 * Cierra subastas expiradas y activa subastas programadas.
 * Este endpoint debe ser llamado periódicamente (cada minuto) por un cron job.
 * 
 * Headers requeridos (opcional para seguridad):
 * - X-API-Key: API key para proteger el endpoint (configurar en variables de entorno)
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar API key si está configurado
    const apiKey = process.env.AUCTION_CRON_API_KEY;
    if (apiKey) {
      const providedKey = request.headers.get('X-API-Key');
      if (providedKey !== apiKey) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Ejecutar función para cerrar subastas expiradas
    const { data: closedCount, error: closeError } = await (supabase as any).rpc(
      'close_expired_auctions'
    );

    if (closeError) {
      logger.error('[Close Expired] Error closing expired auctions', closeError);
      return NextResponse.json(
        {
          success: false,
          error: closeError.message,
          closed_count: null,
          activated_count: null,
        },
        { status: 500 }
      );
    }

    // Logging mínimo: registrar cuando se cierran subastas
    if (closedCount && closedCount > 0) {
      logger.info('[Close Expired] Subastas cerradas exitosamente', {
        closedCount,
        timestamp: new Date().toISOString(),
      });
    }

    // Invalidar caché Redis para todas las subastas cerradas
    // La función close_expired_auctions() retorna el conteo pero no los IDs
    // Obtenemos los IDs de las subastas que fueron cerradas recientemente
    if (closedCount && closedCount > 0) {
      try {
        // Obtener IDs de subastas que fueron cerradas en los últimos 2 minutos
        // (ventana de tiempo para cubrir posibles retrasos en updated_at)
        const twoMinutesAgo = new Date(Date.now() - 120000).toISOString();
        const { data: closedAuctions, error: fetchError } = await (supabase as any)
          .from('products')
          .select('id')
          .eq('sale_type', 'auction')
          .eq('auction_status', 'ended')
          .not('auction_end_at', 'is', null)
          .lte('auction_end_at', new Date().toISOString()) // Ya expiraron
          .gte('updated_at', twoMinutesAgo); // Cerradas recientemente

        if (!fetchError && closedAuctions && closedAuctions.length > 0) {
          // Invalidar caché para cada subasta cerrada
          // Ejecutar en paralelo para mejor rendimiento
          const invalidationPromises = closedAuctions.map((auction: any) =>
            invalidateAuctionCache(auction.id).catch((err) => {
              logger.warn('[Close Expired] Error invalidando caché para subasta', err, {
                auctionId: auction.id,
              });
              return false; // Continuar con las demás aunque una falle
            })
          );

          const results = await Promise.all(invalidationPromises);
          const successCount = results.filter((r) => r === true).length;
          
          logger.info('[Close Expired] Caché invalidado para subastas cerradas', {
            total: closedAuctions.length,
            successful: successCount,
            failed: closedAuctions.length - successCount,
          });
        } else if (closedCount > 0) {
          // Si hay subastas cerradas pero no encontramos IDs, loguear advertencia
          logger.warn('[Close Expired] Subastas cerradas pero no se encontraron IDs para invalidar caché', {
            closedCount,
          });
        }
      } catch (cacheError) {
        // No crítico si falla la invalidación, pero loguear
        logger.warn('[Close Expired] Error invalidando caché después de cerrar subastas', cacheError, {
          closedCount,
        });
      }
    }

    // Ejecutar función para activar subastas programadas
    const { data: activatedCount, error: activateError } = await (supabase as any).rpc(
      'activate_scheduled_auctions'
    );

    if (activateError) {
      console.error('Error activating scheduled auctions:', activateError);
      return NextResponse.json(
        {
          success: false,
          error: activateError.message,
          closed_count: closedCount || 0,
          activated_count: null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      closed_count: closedCount || 0,
      activated_count: activatedCount || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Unexpected error in close-expired endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unexpected error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auctions/close-expired
 * 
 * Versión GET para facilitar testing manual
 */
export async function GET(request: NextRequest) {
  // Llamar a POST internamente
  return POST(request);
}


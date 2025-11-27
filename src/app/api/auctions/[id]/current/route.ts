// ============================================
// MERCADITO ONLINE PY - AUCTION CURRENT DATA
// Endpoint liviano para obtener solo datos dinámicos de una subasta
// Usado para actualizar UI sin recargar toda la página
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // Siempre dinámico

interface CurrentAuctionData {
  current_bid: number | null;
  winner_id: string | null;
  auction_status: 'scheduled' | 'active' | 'ended' | 'cancelled';
  auction_end_at: string | null;
  total_bids: number;
  auction_version: number | null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const auctionId = params.id;

  try {
    // Query con validación de tiempo usando PostgreSQL NOW()
    // Usar RPC para obtener datos con validación de tiempo del servidor
    const { data: dbData, error: dbError } = await supabaseAdmin
      .from('products')
      .select('current_bid, winner_id, auction_status, auction_end_at, total_bids, auction_version')
      .eq('id', auctionId)
      .eq('sale_type', 'auction')
      .single();

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        logger.info('[Auction Current API] Subasta no encontrada', { auctionId });
        return NextResponse.json(
          { error: 'Subasta no encontrada' },
          { status: 404 }
        );
      }
      throw dbError;
    }

    if (!dbData) {
      logger.info('[Auction Current API] Subasta no encontrada (data null)', { auctionId });
      return NextResponse.json(
        { error: 'Subasta no encontrada' },
        { status: 404 }
      );
    }

    // VALIDACIÓN CRÍTICA: Verificar tiempo usando PostgreSQL NOW()
    // Si la subasta expiró según el servidor, forzar estado "ended"
    // También refrescar desde DB si está cerca de expirar (últimos 30 segundos)
    // para evitar datos obsoletos bajo alta concurrencia
    let finalStatus = dbData.auction_status as 'scheduled' | 'active' | 'ended' | 'cancelled';
    let needsRefresh = false;
    
    if (dbData.auction_end_at && finalStatus === 'active') {
      // Verificar si está cerca de expirar (últimos 30 segundos)
      // Si es así, refrescar desde DB para obtener estado más reciente
      const endAt = new Date(dbData.auction_end_at);
      const timeUntilEnd = endAt.getTime() - Date.now();
      
      if (timeUntilEnd > 0 && timeUntilEnd < 30000) {
        // Está cerca de expirar, refrescar desde DB para evitar datos obsoletos
        needsRefresh = true;
        logger.debug('[Auction Current API] Subasta cerca de expirar, refrescando desde DB', {
          auctionId,
          secondsRemaining: Math.floor(timeUntilEnd / 1000),
        });
        
        // Re-leer desde DB para obtener estado más reciente
        const { data: refreshedData, error: refreshError } = await supabaseAdmin
          .from('products')
          .select('auction_status, auction_end_at, current_bid, winner_id, auction_version')
          .eq('id', auctionId)
          .single();
        
        if (!refreshError && refreshedData) {
          // Usar datos refrescados
          dbData.auction_status = refreshedData.auction_status;
          dbData.auction_end_at = refreshedData.auction_end_at;
          dbData.current_bid = refreshedData.current_bid;
          dbData.winner_id = refreshedData.winner_id;
          dbData.auction_version = refreshedData.auction_version;
          finalStatus = refreshedData.auction_status as any;
        }
      }
      
      // Obtener tiempo del servidor para comparar (siempre, para validación)
      const { data: serverTimeData, error: timeError } = await supabaseAdmin
        .rpc('get_server_time');
      
      if (!timeError && serverTimeData) {
        const serverNow = new Date(serverTimeData);
        const endAtDate = new Date(dbData.auction_end_at);
        
        // Si el tiempo del servidor indica que expiró, forzar estado "ended"
        if (serverNow >= endAtDate) {
          logger.info('[Auction Current API] Subasta expirada según servidor, forzando estado "ended"', {
            auctionId,
            serverNow: serverNow.toISOString(),
            endAt: endAtDate.toISOString(),
          });
          finalStatus = 'ended';
          
          // Actualizar estado en DB si está desactualizado (asíncrono, no bloquea respuesta)
          supabaseAdmin
            .from('products')
            .update({ auction_status: 'ended' })
            .eq('id', auctionId)
            .eq('auction_status', 'active')
            .then(({ error: updateError }) => {
              if (updateError) {
                logger.warn('[Auction Current API] Error actualizando estado expirado', updateError, { auctionId });
              } else {
                logger.info('[Auction Current API] Estado actualizado a "ended"', { auctionId });
              }
            });
        }
      } else if (timeError) {
        // Si falla obtener tiempo del servidor, usar comparación local como fallback
        logger.warn('[Auction Current API] Error obteniendo tiempo del servidor, usando fallback local', timeError, { auctionId });
        const localNow = new Date();
        const endAtDate = new Date(dbData.auction_end_at);
        if (localNow >= endAtDate) {
          finalStatus = 'ended';
        }
      }
    }

    // Si el estado en DB ya es "ended", respetarlo
    if (dbData.auction_status === 'ended') {
      finalStatus = 'ended';
    }

    const response: CurrentAuctionData = {
      current_bid: dbData.current_bid,
      winner_id: dbData.winner_id,
      auction_status: finalStatus,
      auction_end_at: dbData.auction_end_at,
      total_bids: dbData.total_bids || 0,
      auction_version: dbData.auction_version || null,
    };

    // Logging mínimo: solo cuando detectamos estado cerrado o cerca de expirar
    if (finalStatus === 'ended') {
      logger.info('[Auction Current API] Subasta cerrada', { auctionId, status: finalStatus });
    } else if (dbData.auction_end_at) {
      const endAt = new Date(dbData.auction_end_at);
      const timeUntilEnd = endAt.getTime() - Date.now();
      // Solo loguear si está muy cerca de expirar (últimos 10 segundos)
      if (timeUntilEnd > 0 && timeUntilEnd < 10000) {
        logger.debug('[Auction Current API] Subasta cerca de expirar', {
          auctionId,
          secondsRemaining: Math.floor(timeUntilEnd / 1000),
        });
      }
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate', // No cachear datos dinámicos
      },
    });
  } catch (error: any) {
    logger.error('[Auction Current API] Error', error, { auctionId });
    return NextResponse.json(
      { error: error.message || 'Error al obtener datos de la subasta' },
      { status: 500 }
    );
  }
}


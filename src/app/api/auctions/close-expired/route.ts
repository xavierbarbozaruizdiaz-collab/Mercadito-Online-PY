// ============================================
// MERCADITO ONLINE PY - AUTO-CIERRE DE SUBASTAS
// Endpoint para cerrar subastas expiradas
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

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
      console.error('Error closing expired auctions:', closeError);
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


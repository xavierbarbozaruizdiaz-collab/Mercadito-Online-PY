import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { checkAndUpdateAuctionStatus } from '@/lib/services/auctionService';

/**
 * API Route para actualizar estados de subastas automáticamente
 * 
 * Se ejecuta cada minuto mediante Vercel Cron Jobs
 * Actualiza subastas programadas que deben activarse (scheduled -> active)
 * 
 * NOTA: Vercel no soporta intervalos menores a 1 minuto en cron jobs.
 * Esto es aceptable porque el endpoint de pujas ya actualiza el estado antes de validar.
 * 
 * Configurar en vercel.json:
 * {
 *   "path": "/api/cron/update-auction-statuses",
 *   "schedule": "* * * * *"
 * }
 */

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  // Verificar que viene de Vercel Cron (opcional pero recomendado)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Obtener subastas programadas que deben activarse
    const now = new Date().toISOString();
    // AUMENTADO A 4 MINUTOS: Dar más margen para sincronización entre clientes
    const fourMinutesFromNow = new Date(Date.now() + 4 * 60 * 1000).toISOString();

    const { data: scheduledAuctions, error: fetchError } = await (supabaseAdmin as any)
      .from('products')
      .select('id, auction_status, auction_start_at, auction_end_at')
      .eq('sale_type', 'auction')
      .eq('auction_status', 'scheduled')
      .not('auction_start_at', 'is', null)
      .lte('auction_start_at', fourMinutesFromNow); // Incluir las que deben activarse pronto (4 minutos de margen)

    if (fetchError) {
      console.error('Error obteniendo subastas programadas:', fetchError);
      return NextResponse.json(
        { 
          success: false, 
          error: fetchError.message,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    if (!scheduledAuctions || scheduledAuctions.length === 0) {
      return NextResponse.json({
        success: true,
        updated: 0,
        message: 'No hay subastas programadas que necesiten actualización',
        timestamp: new Date().toISOString(),
      });
    }

    // Actualizar estado de cada subasta
    let updatedCount = 0;
    const errors: string[] = [];

    for (const auction of scheduledAuctions) {
      try {
        await checkAndUpdateAuctionStatus(auction.id);
        updatedCount++;
      } catch (error: any) {
        errors.push(`Error actualizando subasta ${auction.id}: ${error.message}`);
        console.error(`Error actualizando subasta ${auction.id}:`, error);
      }
    }

    console.log(`✅ Actualizadas ${updatedCount} de ${scheduledAuctions.length} subastas programadas`);

    return NextResponse.json({
      success: true,
      updated: updatedCount,
      total: scheduledAuctions.length,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}


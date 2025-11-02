// ============================================
// MERCADITO ONLINE PY - LIMPIEZA DE INACTIVOS
// API Route para ocultar productos sin stock y pausar tiendas inactivas
// 
// Se ejecuta a las 3 AM mediante Vercel Cron Jobs
// Configurar en vercel.json o Supabase Cron
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/config/env';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Verificar autorización (cron secret)
  const authHeader = request.headers.get('authorization');
  const cronSecret = env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('Unauthorized cron request to cleanup-inactive', {
      hasAuth: !!authHeader,
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Crear cliente con service role para bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    logger.info('Ejecutando limpieza de inactivos', { timestamp: new Date().toISOString() });

    // Ejecutar función de limpieza
    const { data: cleanupResult, error: cleanupError } = await supabase.rpc('cleanup_inactive_items');

    if (cleanupError) {
      logger.error('Error ejecutando limpieza de inactivos', cleanupError);
      return NextResponse.json(
        {
          success: false,
          error: cleanupError.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    const productsHidden = cleanupResult?.products_hidden || 0;
    const storesPaused = cleanupResult?.stores_paused || 0;
    const logId = cleanupResult?.log_id;

    logger.info('Limpieza de inactivos completada', {
      productsHidden,
      storesPaused,
      logId,
    });

    // Crear alerta si hay muchas acciones
    if (productsHidden > 50 || storesPaused > 10) {
      await supabase.from('admin_alerts').insert({
        alert_type: 'maintenance_completed',
        severity: 'low',
        title: 'Limpieza automática ejecutada',
        description: `Se ocultaron ${productsHidden} productos sin stock y se pausaron ${storesPaused} tiendas inactivas`,
        related_entity_type: 'system',
        metadata: {
          products_hidden: productsHidden,
          stores_paused: storesPaused,
          log_id: logId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      productsHidden,
      storesPaused,
      logId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Error en limpieza de inactivos', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error desconocido en limpieza',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}


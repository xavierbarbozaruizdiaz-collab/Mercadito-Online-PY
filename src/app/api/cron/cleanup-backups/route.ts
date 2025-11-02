// ============================================
// MERCADITO ONLINE PY - LIMPIEZA DE BACKUPS ANTIGUOS
// API Route para marcar backups expirados (>4 semanas)
// 
// Se ejecuta los domingos a la 3 AM mediante Vercel Cron Jobs
// Configurar en vercel.json o Supabase Cron
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/config/env';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  // Verificar autorización (cron secret)
  const authHeader = request.headers.get('authorization');
  const cronSecret = env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('Unauthorized cron request to cleanup-backups', {
      hasAuth: !!authHeader,
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Crear cliente con service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    logger.info('Iniciando limpieza de backups antiguos', { timestamp: new Date().toISOString() });

    // Ejecutar función SQL para limpiar backups expirados
    const { data: cleanupResult, error: cleanupError } = await supabase.rpc('cleanup_old_backups');

    if (cleanupError) {
      logger.error('Error ejecutando limpieza de backups', cleanupError);
      return NextResponse.json(
        {
          success: false,
          error: cleanupError.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    const expiredBackups = cleanupResult?.expired_backups_marked || 0;

    logger.info('Limpieza de backups completada', {
      expiredBackupsMarked: expiredBackups,
    });

    // Nota: La eliminación física de backups en S3/R2 debe hacerse desde servicio externo
    // o manualmente desde el dashboard de S3/R2 usando lifecycle policies

    return NextResponse.json({
      success: true,
      expiredBackupsMarked: expiredBackups,
      note: 'Backups marcados como expirados. Eliminación física requiere configuración en S3/R2 o acción manual.',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Error en limpieza de backups', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error desconocido en limpieza de backups',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}


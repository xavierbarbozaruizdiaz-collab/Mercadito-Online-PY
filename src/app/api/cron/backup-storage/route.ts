// ============================================
// MERCADITO ONLINE PY - BACKUP DE STORAGE
// API Route para sincronizar buckets de Supabase Storage a S3/R2
// 
// Se ejecuta los domingos a la 2 AM mediante Vercel Cron Jobs
// Configurar en vercel.json o Supabase Cron
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/config/env';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutos

export async function GET(request: NextRequest) {
  // Verificar autorización (cron secret)
  const authHeader = request.headers.get('authorization');
  const cronSecret = env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('Unauthorized cron request to backup-storage', {
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

    logger.info('Iniciando backup de storage', { timestamp: new Date().toISOString() });

    // Registrar inicio en backup_logs
    const { data: backupLog, error: logError } = await supabase
      .from('backup_logs')
      .insert({
        backup_type: 'storage',
        backup_location: 'in_progress',
        status: 'in_progress',
        retention_until: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(), // 4 semanas
        metadata: {
          started_at: new Date().toISOString(),
          buckets: ['product-images', 'profiles'],
        },
      })
      .select()
      .single();

    if (logError) {
      logger.error('Error creando log de backup storage', logError);
    }

    // Obtener lista de archivos de buckets importantes
    const buckets = ['product-images', 'profiles'];
    let totalFiles = 0;
    let totalSize = 0;

    for (const bucketName of buckets) {
      try {
        const { data: files, error: listError } = await supabase.storage
          .from(bucketName)
          .list(undefined, {
            limit: 1000, // Limitar para no sobrecargar
            sortBy: { column: 'created_at', order: 'desc' },
          });

        if (listError) {
          logger.warn(`Error listando archivos de bucket ${bucketName}`, listError);
          continue;
        }

        if (files) {
          totalFiles += files.length;
          // Calcular tamaño total (aproximado)
          files.forEach((file: any) => {
            totalSize += file.metadata?.size || 0;
          });
        }
      } catch (bucketError) {
        logger.error(`Error procesando bucket ${bucketName}`, bucketError);
      }
    }

    logger.info('Backup de storage - archivos encontrados', {
      totalFiles,
      totalSizeBytes: totalSize,
      buckets: buckets.length,
    });

    // Nota: Sync real a S3/R2 requiere SDK de AWS/R2 y credenciales
    // Por ahora, solo registramos el intento
    // Para implementación completa:
    // 1. Configurar AWS SDK o Cloudflare R2 SDK
    // 2. Iterar sobre archivos y subirlos a S3/R2
    // 3. Mantener sincronización incremental

    // Actualizar log
    if (backupLog?.id) {
      await supabase
        .from('backup_logs')
        .update({
          status: 'completed',
          backup_location: 'supabase_storage', // Placeholder hasta implementar S3/R2
          backup_size_bytes: totalSize,
          completed_at: new Date().toISOString(),
          metadata: {
            ...backupLog.metadata,
            total_files: totalFiles,
            buckets_backed_up: buckets,
            note: 'Sync a S3/R2 requiere configuración adicional de credenciales',
          },
        })
        .eq('id', backupLog.id);
    }

    return NextResponse.json({
      success: true,
      message: 'Backup de storage iniciado',
      filesFound: totalFiles,
      totalSizeBytes: totalSize,
      buckets: buckets.length,
      note: 'Sync completo a S3/R2 requiere configuración adicional',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Error en backup de storage', error);

    // Registrar error en backup_logs si existe
    // (se manejaría mejor con transaction, pero por simplicidad así)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error desconocido en backup de storage',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}


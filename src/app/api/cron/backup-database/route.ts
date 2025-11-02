// ============================================
// MERCADITO ONLINE PY - BACKUP DE BASE DE DATOS
// API Route para crear backup automático de la base de datos
// 
// Se ejecuta los domingos a la 1 AM mediante Vercel Cron Jobs
// Configurar en vercel.json o Supabase Cron
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/config/env';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs'; // Necesita Node.js para pg_dump
export const maxDuration = 300; // 5 minutos para backups grandes

export async function GET(request: NextRequest) {
  // Verificar autorización (cron secret)
  const authHeader = request.headers.get('authorization');
  const cronSecret = env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('Unauthorized cron request to backup-database', {
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

    logger.info('Iniciando backup de base de datos', { timestamp: new Date().toISOString() });

    // Registrar inicio en backup_logs
    const { data: backupLog, error: logError } = await supabase
      .from('backup_logs')
      .insert({
        backup_type: 'database',
        backup_location: 'in_progress',
        status: 'in_progress',
        retention_until: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(), // 4 semanas
        metadata: {
          started_at: new Date().toISOString(),
          method: 'pg_dump',
        },
      })
      .select()
      .single();

    if (logError) {
      logger.error('Error creando log de backup', logError);
    }

    // Nota: En producción, esto debería usar un servicio externo o Supabase native backups
    // Por ahora, registramos el intento y sugerimos usar Supabase Dashboard backups
    // Para implementación completa, requeriría:
    // - Acceso a Supabase DB directo (no disponible en Vercel edge functions)
    // - Servicio separado o usar Supabase Scheduled Backups nativo

    logger.warn('Backup de DB requiere implementación completa con servicio externo o Supabase nativo', {
      backupLogId: backupLog?.id,
    });

    // Actualizar log indicando que requiere acción manual o configuración adicional
    if (backupLog?.id) {
      await supabase
        .from('backup_logs')
        .update({
          status: 'failed',
          error_message: 'Backup requiere configuración de Supabase Scheduled Backups o servicio externo',
          completed_at: new Date().toISOString(),
          metadata: {
            ...backupLog.metadata,
            note: 'Usar Supabase Dashboard → Database → Backups para configurar backups automáticos',
          },
        })
        .eq('id', backupLog.id);
    }

    // Crear alerta para admin sobre necesidad de configurar backups
    await supabase.from('admin_alerts').insert({
      alert_type: 'system_error',
      severity: 'medium',
      title: 'Configuración de Backups Requerida',
      description:
        'Los backups automáticos requieren configuración adicional. Usar Supabase Dashboard → Database → Backups',
      related_entity_type: 'system',
      metadata: {
        action_required: 'configure_supabase_backups',
        documentation_url: 'https://supabase.com/docs/guides/platform/backups',
      },
    });

    return NextResponse.json({
      success: false,
      message:
        'Backup requiere configuración de Supabase Scheduled Backups. Ver documentación en Supabase Dashboard.',
      note: 'Supabase ofrece backups automáticos nativos en Dashboard → Database → Backups',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Error en backup de base de datos', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error desconocido en backup',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}


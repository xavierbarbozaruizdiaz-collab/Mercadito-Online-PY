// ============================================
// MERCADITO ONLINE PY - CRON: EXPIRAR MEMBRESÍAS
// Verifica y expira membresías vencidas
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/utils/logger';

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  // Verificar CRON_SECRET
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    logger.warn('Intento no autorizado de expirar membresías', {
      hasAuth: !!authHeader,
      expected: !!process.env.CRON_SECRET,
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    logger.info('Iniciando verificación de membresías expiradas...');

    // Ejecutar función SQL para expirar membresías
    const { data, error } = await (supabase as any).rpc('check_and_expire_memberships');

    if (error) {
      logger.error('Error expirando membresías', error);
      return NextResponse.json(
        { error: 'Error expirando membresías', details: error.message },
        { status: 500 }
      );
    }

    logger.info('Membresías expiradas verificadas', data);

    // Obtener usuarios cuya membresía expiró recientemente (en la última hora)
    // para pausar sus productos que excedan límites
    const { data: expiredUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, membership_level, membership_expires_at')
      .not('membership_level', 'is', null)
      .lt('membership_expires_at', new Date().toISOString())
      .gte('membership_expires_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Última hora

    let productsPausedSummary: any[] = [];

    if (usersError) {
      logger.warn('Error obteniendo usuarios con membresía expirada', usersError);
    } else if (expiredUsers && expiredUsers.length > 0) {
      logger.info(`Procesando pausa de productos para ${expiredUsers.length} usuario(s)`);
      
      // Pausar productos para cada usuario que expiró
      for (const user of expiredUsers) {
        const u = user as any;
        try {
          const { data: pauseResult, error: pauseError } = await (supabase as any).rpc(
            'pause_products_on_membership_expiration',
            { p_user_id: u.id }
          );

          if (pauseError) {
            logger.error(`Error pausando productos para usuario ${u.id}`, pauseError);
          } else if (pauseResult && pauseResult.length > 0) {
            const result = pauseResult[0];
            logger.info(`Productos pausados para usuario ${u.id}`, {
              products_paused: result.products_paused,
              products_kept_active: result.products_kept_active,
              message: result.message,
            });

            productsPausedSummary.push({
              user_id: u.id,
              membership_level: u.membership_level,
              ...result,
            });

            // Crear notificación para el usuario
            try {
              await (supabase as any).from('notifications').insert({
                user_id: u.id,
                type: 'system',
                title: 'Productos pausados por expiración de membresía',
                message: result.message || 'Algunos productos fueron pausados porque tu membresía expiró',
                content: `Tu membresía ${u.membership_level} ha expirado. ${result.products_paused} producto(s) fueron pausados automáticamente para cumplir con los límites. Renueva tu membresía para reactivarlos.`,
                data: {
                  products_paused: result.products_paused,
                  products_kept_active: result.products_kept_active,
                },
              });
            } catch (notifError) {
              logger.warn('Error creando notificación de productos pausados', notifError);
            }
          }
        } catch (userError) {
          logger.error(`Error procesando usuario ${u.id}`, userError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      result: data,
      products_paused_summary: productsPausedSummary,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    logger.error('Error en cron de expirar membresías', err);
    return NextResponse.json(
      { error: 'Error interno', message: err.message },
      { status: 500 }
    );
  }
}


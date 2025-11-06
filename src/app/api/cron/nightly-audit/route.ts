// ============================================
// MERCADITO ONLINE PY - AUDITORÍA NOCTURNA
// API Route para ejecutar verificaciones automáticas nocturnas
// 
// Se ejecuta a las 2 AM mediante Vercel Cron Jobs
// Configurar en vercel.json o Supabase Cron
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/config/env';
import { logger } from '@/lib/utils/logger';
import { EmailService } from '@/lib/services/emailService';

export const runtime = 'nodejs';
export const maxDuration = 60; // Auditoría puede tardar más tiempo

export async function GET(request: NextRequest) {
  // Verificar autorización (cron secret)
  const authHeader = request.headers.get('authorization');
  const cronSecret = env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('Unauthorized cron request to nightly-audit', {
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

    logger.info('Ejecutando auditoría nocturna', { timestamp: new Date().toISOString() });

    // 1. Ejecutar función de auditoría
    const { data: auditResult, error: auditError } = await supabase.rpc('run_nightly_audit');
    
    // 2. Verificar subastas sin pago y aplicar multas (compradores)
    const { data: penaltyResult, error: penaltyError } = await supabase.rpc('check_unpaid_auctions_and_apply_penalties');
    
    if (penaltyError) {
      logger.error('Error aplicando multas por no-pago', penaltyError);
    } else if (penaltyResult) {
      logger.info('Multas aplicadas por no-pago', {
        total_checked: penaltyResult.total_checked || 0,
        penalties_applied: penaltyResult.penalties_applied || 0,
      });
    }

    // 3. Verificar entregas pendientes y aplicar multas (vendedores)
    const { data: deliveryResult, error: deliveryError } = await supabase.rpc('check_unfulfilled_orders_and_apply_penalties');
    
    if (deliveryError) {
      logger.error('Error verificando entregas y aplicando multas', deliveryError);
    } else if (deliveryResult) {
      logger.info('Multas aplicadas por falta de entrega', {
        total_checked: deliveryResult.total_checked || 0,
        penalties_applied: deliveryResult.penalties_applied || 0,
        orders_refunded: deliveryResult.orders_refunded || 0,
        sellers_restricted: deliveryResult.sellers_restricted || 0,
      });
    }

    // 4. Enviar avisos de entregas próximas a vencer
    const { data: warningsResult, error: warningsError } = await supabase.rpc('send_delivery_warnings');
    
    if (warningsError) {
      logger.error('Error enviando avisos de entrega', warningsError);
    } else if (warningsResult) {
      logger.info('Avisos de entrega enviados', {
        warnings_sent: warningsResult.warnings_sent || 0,
      });
    }

    if (auditError) {
      logger.error('Error ejecutando auditoría nocturna', auditError);
      return NextResponse.json(
        {
          success: false,
          error: auditError.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    const alertsCreated = auditResult?.alerts_created || 0;
    const alertsByType = auditResult?.by_type || {};

    logger.info('Auditoría nocturna completada', {
      alertsCreated,
      breakdown: alertsByType,
    });

    // Obtener alertas críticas y altas para enviar email
    const { data: criticalAlerts, error: alertsError } = await supabase
      .from('admin_alerts')
      .select('id, alert_type, severity, title, description, created_at')
      .in('severity', ['critical', 'high'])
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(20);

    if (alertsError) {
      logger.warn('Error obteniendo alertas críticas para email', alertsError);
    }

    // Enviar email a admin si hay alertas críticas/altas
    if (criticalAlerts && criticalAlerts.length > 0) {
      try {
        // Obtener email de admin (primer usuario con role='admin')
        const { data: admin, error: adminError } = await supabase
          .from('profiles')
          .select('email')
          .eq('role', 'admin')
          .limit(1)
          .single();

        if (!adminError && admin?.email) {
          const alertSummary = criticalAlerts
            .map(
              (alert, idx) =>
                `${idx + 1}. [${alert.severity.toUpperCase()}] ${alert.title}\n   ${alert.description}`
            )
            .join('\n\n');

          await EmailService.sendEmail({
            to: admin.email,
            subject: `🚨 Alertas del Sistema - ${criticalAlerts.length} alertas críticas/altas`,
            html: `
              <h2>Resumen de Auditoría Nocturna</h2>
              <p><strong>Total de alertas creadas:</strong> ${alertsCreated}</p>
              <p><strong>Desglose:</strong></p>
              <ul>
                <li>Órdenes sin pago: ${alertsByType.unpaid_orders || 0}</li>
                <li>Subastas sin orden: ${alertsByType.missing_auction_orders || 0}</li>
                <li>Postores sospechosos: ${alertsByType.suspicious_bidders || 0}</li>
              </ul>
              
              <h3>Alertas Críticas y Altas (${criticalAlerts.length})</h3>
              <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px;">${alertSummary}</pre>
              
              <p><small>Ejecutado: ${new Date().toLocaleString('es-PY')}</small></p>
            `,
          });

          logger.info('Email de alertas enviado a admin', { adminEmail: admin.email });
        } else {
          logger.warn('No se encontró admin para enviar email de alertas', adminError);
        }
      } catch (emailError) {
        logger.error('Error enviando email de alertas', emailError);
        // No fallar la auditoría si falla el email
      }
    }

    return NextResponse.json({
      success: true,
      alertsCreated,
      alertsByType,
      criticalAlertsCount: criticalAlerts?.length || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Error en auditoría nocturna', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error desconocido en auditoría',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}


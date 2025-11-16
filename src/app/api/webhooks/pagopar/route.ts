// ============================================
// MERCADITO ONLINE PY - WEBHOOK PAGOPAR
// Recibe notificaciones de Pagopar cuando se confirma un pago
// ============================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/utils/logger';
import type { Database } from '@/types/database';

// Cliente de Supabase con service role para bypass RLS
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurado');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Estados de pago aprobados en Pagopar
const APPROVED_PAYMENT_STATES = ['pagada', 'pagado', 'success', 'approved', 'completed', 'completado'];

// Función auxiliar para determinar si el pago está aprobado
function isPaymentApproved(paymentState: any): boolean {
  if (!paymentState) return false;
  
  const stateStr = String(paymentState).toLowerCase().trim();
  return APPROVED_PAYMENT_STATES.some(approved => stateStr === approved);
}

// Función auxiliar para extraer external_reference del payload de Pagopar
function extractExternalReference(payload: any): string | null {
  // Pagopar puede enviar external_reference en diferentes lugares del payload
  // Intentamos varios campos posibles
  return (
    payload?.external_reference ||
    payload?.referencia_externa ||
    payload?.referencia ||
    payload?.resultado?.external_reference ||
    payload?.resultado?.referencia_externa ||
    payload?.datos?.external_reference ||
    payload?.datos?.referencia_externa ||
    null
  );
}

// Función auxiliar para extraer el estado del pago
function extractPaymentState(payload: any): string | null {
  return (
    payload?.estado ||
    payload?.status ||
    payload?.resultado?.estado ||
    payload?.resultado?.status ||
    payload?.datos?.estado ||
    payload?.datos?.status ||
    null
  );
}

// Función auxiliar para extraer id_factura o id_operacion
function extractInvoiceId(payload: any): string | null {
  return (
    payload?.id_factura?.toString() ||
    payload?.id_operacion?.toString() ||
    payload?.operation_id?.toString() ||
    payload?.resultado?.id_factura?.toString() ||
    payload?.resultado?.id_operacion?.toString() ||
    payload?.datos?.id_factura?.toString() ||
    payload?.datos?.id_operacion?.toString() ||
    null
  );
}

// Función auxiliar para extraer el monto pagado
function extractAmount(payload: any): number | null {
  const amount = 
    payload?.monto_pagado ||
    payload?.monto ||
    payload?.amount ||
    payload?.resultado?.monto_pagado ||
    payload?.resultado?.monto ||
    payload?.datos?.monto_pagado ||
    payload?.datos?.monto ||
    null;
  
  return amount ? parseFloat(String(amount)) : null;
}

export async function POST(req: Request) {
  let payload: any = null;
  
  try {
    const rawBody = await req.text();
    
    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      logger.error('[Pagopar Webhook] body no es JSON válido', { rawBody, error: parseError });
      // Devolver 200 para no romper comunicación con Pagopar
      return NextResponse.json({ ok: true, error: 'Invalid JSON' }, { status: 200 });
    }

    // Log sanitizado del payload (sin datos sensibles)
    logger.info('[Pagopar Webhook] payload recibido', {
      hasPayload: !!payload,
      hasResultado: !!payload?.resultado,
      hasDatos: !!payload?.datos,
      externalReference: extractExternalReference(payload),
      paymentState: extractPaymentState(payload),
      invoiceId: extractInvoiceId(payload),
    });

    // Extraer datos del payload
    const externalReference = extractExternalReference(payload);
    const paymentState = extractPaymentState(payload);
    const invoiceId = extractInvoiceId(payload);
    const amount = extractAmount(payload);

    // Si no hay external_reference, ignorar (no es una membresía u orden conocida)
    if (!externalReference) {
      logger.warn('[Pagopar Webhook] No se encontró external_reference en el payload', { payload });
      return NextResponse.json({ ok: true, ignored: true, reason: 'No external_reference' }, { status: 200 });
    }

    // Determinar si el pago está aprobado
    const isApproved = isPaymentApproved(paymentState);
    
    logger.info('[Pagopar Webhook] Estado del pago', {
      externalReference,
      paymentState,
      isApproved,
      invoiceId,
      amount,
    });

    // Si el pago NO está aprobado, ignorar
    if (!isApproved) {
      logger.info('[Pagopar Webhook] Pago no aprobado, ignorando', {
        externalReference,
        paymentState,
      });
      return NextResponse.json({ ok: true, ignored: true, reason: 'Payment not approved', state: paymentState }, { status: 200 });
    }

    // Crear cliente de Supabase con service role
    const supabase = getSupabaseAdmin();

    // Buscar suscripción de membresía por external_reference (subscriptionId)
    const { data: subscription, error: subscriptionError } = await supabase
      .from('membership_subscriptions')
      .select('id, user_id, plan_id, status, payment_status, subscription_type, amount_paid')
      .eq('id', externalReference)
      .single();

    if (subscriptionError) {
      // Si no es error de "no encontrado", podría ser una orden u otro tipo
      if (subscriptionError.code !== 'PGRST116') {
        logger.error('[Pagopar Webhook] Error buscando suscripción', {
          externalReference,
          error: subscriptionError,
        });
        // No fallar completamente, podría ser una orden
        // Intentar buscar como orden
      } else {
        logger.info('[Pagopar Webhook] No se encontró suscripción, podría ser una orden', {
          externalReference,
        });
      }
    }

    // Si encontramos una suscripción de membresía, procesarla
    // Verificar explícitamente que no haya error y que subscription exista
    if (!subscriptionError && subscription) {
      logger.info('[Pagopar Webhook] Suscripción encontrada', {
        subscriptionId: subscription.id,
        userId: subscription.user_id,
        planId: subscription.plan_id,
        currentStatus: subscription.status,
        currentPaymentStatus: subscription.payment_status,
      });

      // Verificar si ya está activa y pagada (idempotencia)
      if (subscription.status === 'active' && subscription.payment_status === 'completed') {
        logger.info('[Pagopar Webhook] Suscripción ya está activa y pagada (idempotencia)', {
          subscriptionId: subscription.id,
        });
        return NextResponse.json({ ok: true, alreadyActive: true }, { status: 200 });
      }

      // Obtener información del plan
      const { data: plan, error: planError } = await supabase
        .from('membership_plans')
        .select('id, level, name, duration_days')
        .eq('id', subscription.plan_id)
        .single();

      if (planError || !plan) {
        logger.error('[Pagopar Webhook] Plan no encontrado', {
          subscriptionId: subscription.id,
          planId: subscription.plan_id,
          error: planError,
        });
        return NextResponse.json({ ok: false, error: 'Plan not found' }, { status: 500 });
      }

      // Calcular fechas según tipo de suscripción
      const now = new Date();
      const durationDays = 
        subscription.subscription_type === 'yearly' 
          ? (plan.duration_days || 30) * 12
          : plan.duration_days || 30;
      
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + durationDays);

      // Actualizar suscripción directamente (en lugar de crear una nueva)
      const { error: updateError } = await supabase
        .from('membership_subscriptions')
        .update({
          status: 'active',
          payment_status: 'completed',
          payment_method: 'pagopar',
          payment_provider: 'pagopar',
          payment_reference: invoiceId || null,
          amount_paid: amount || subscription.amount_paid || 0,
          starts_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          paid_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', subscription.id);

      if (updateError) {
        logger.error('[Pagopar Webhook] Error actualizando suscripción', {
          subscriptionId: subscription.id,
          error: updateError,
        });
        return NextResponse.json({ ok: false, error: 'Failed to update subscription' }, { status: 500 });
      }

      // Actualizar perfil del usuario con la membresía
      // Nota: profiles no tiene columna updated_at según el schema actual
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          membership_level: plan.level,
          membership_expires_at: expiresAt.toISOString(),
        })
        .eq('id', subscription.user_id);

      if (profileError) {
        logger.error('[Pagopar Webhook] Error actualizando perfil', {
          userId: subscription.user_id,
          error: profileError,
        });
        // No fallar completamente, la suscripción ya está actualizada
      }

      logger.info('[Pagopar Webhook] Membresía activada exitosamente', {
        subscriptionId: subscription.id,
        userId: subscription.user_id,
        planId: subscription.plan_id,
        planLevel: plan.level,
        expiresAt: expiresAt.toISOString(),
      });

      // Siempre responder OK para no romper comunicación con Pagopar
      return NextResponse.json({ 
        ok: true, 
        activated: true,
        subscriptionId: subscription.id,
      }, { status: 200 });
    }

    // Si no encontramos suscripción, podría ser una orden (flujo existente)
    // Mantener compatibilidad con el flujo anterior
    logger.info('[Pagopar Webhook] No es una membresía, podría ser una orden', {
      externalReference,
    });

    // TODO: Aquí se podría agregar lógica para procesar órdenes si es necesario
    // Por ahora, solo procesamos membresías

    return NextResponse.json({ ok: true, ignored: true, reason: 'Not a membership subscription' }, { status: 200 });
    
  } catch (err: any) {
    logger.error('[Pagopar Webhook] error inesperado', {
      error: err,
      message: err?.message,
      stack: err?.stack,
      payload: payload ? 'presente' : 'ausente',
    });
    
    // Siempre responder 200 para no romper comunicación con Pagopar
    // Pero incluir el error en la respuesta para debugging
    return NextResponse.json({ 
      ok: false, 
      error: err?.message || 'Internal server error' 
    }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'Pagopar webhook' });
}

// ============================================
// MERCADITO ONLINE PY - WHATSAPP NOTIFICATIONS
// Módulo genérico para notificaciones por WhatsApp (apagable por env)
// ============================================

import { formatPhoneForWhatsApp } from '@/lib/utils';
import { logger } from '@/lib/utils/logger';

// ============================================
// TIPOS
// ============================================

export type SourcingOrderStatus =
  | 'pending_sourcing'
  | 'sourcing'
  | 'found'
  | 'completed'
  | 'cancelled';

export interface NotifySourcingOrderChangeParams {
  type: 'created' | 'status_changed';
  sourcingOrderId: string;
  toPhone: string; // número del usuario, en el formato que se maneje internamente
  status?: SourcingOrderStatus;
  message?: string; // mensaje pre-armado opcional
  rawQuery?: string; // query original del sourcing_order (opcional, para mensajes personalizados)
}

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================

/**
 * Envía notificación por WhatsApp para cambios en sourcing_orders.
 * Si no hay configuración de WhatsApp, no hace nada (modo LPMS: no rompe nada).
 */
export async function notifySourcingOrderChange(
  params: NotifySourcingOrderChangeParams,
): Promise<void> {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiKey = process.env.WHATSAPP_API_KEY;
  const apiEnabled = process.env.WHATSAPP_API_ENABLED === 'true';

  // 🔒 Modo LPMS: si NO hay configuración, no hacer nada y no romper nada.
  if (!apiEnabled || !apiUrl || !apiKey) {
    logger.debug('[WhatsApp notifications disabled]', {
      reason: 'Missing WHATSAPP_API_ENABLED, WHATSAPP_API_URL or WHATSAPP_API_KEY',
      type: params.type,
      sourcingOrderId: params.sourcingOrderId,
      status: params.status,
    });
    return;
  }

  // Formatear teléfono usando helper existente
  const whatsappPhone = formatPhoneForWhatsApp(params.toPhone);
  
  if (!whatsappPhone) {
    logger.warn('[WhatsApp notification skipped]', {
      reason: 'Invalid phone number',
      phone: params.toPhone,
      sourcingOrderId: params.sourcingOrderId,
    });
    return;
  }

  // Construir mensaje
  const message = params.message ?? buildDefaultMessageForSourcingOrder(params);

  // Preparar body para API
  const body = {
    to: whatsappPhone,
    type: params.type,
    status: params.status,
    sourcingOrderId: params.sourcingOrderId,
    message: message,
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      logger.warn('[WhatsApp notification API error]', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        sourcingOrderId: params.sourcingOrderId,
      });
      // LPMS: No lanzar error, solo loguear
      return;
    }

    logger.debug('[WhatsApp notification sent]', {
      type: params.type,
      sourcingOrderId: params.sourcingOrderId,
      phone: whatsappPhone,
    });
  } catch (error) {
    logger.error('[WhatsApp notification error]', error, {
      sourcingOrderId: params.sourcingOrderId,
      phone: whatsappPhone,
    });
    // LPMS: NUNCA lanzar error hacia arriba.
    // Las notificaciones NO deben romper el flujo del negocio.
  }
}

// ============================================
// HELPER: Construir mensaje por defecto
// ============================================

function buildDefaultMessageForSourcingOrder(
  params: NotifySourcingOrderChangeParams,
): string {
  if (params.type === 'created') {
    return (
      'Recibimos tu pedido por conseguir en Mercadito Online ✅ ' +
      'Te avisamos cuando empecemos a buscarlo.'
    );
  }

  if (params.type === 'status_changed') {
    switch (params.status) {
      case 'sourcing':
        return (
          'Empezamos a buscar tu pedido en Mercadito Online 🔍 ' +
          'Te avisamos apenas tengamos una opción para vos.'
        );
      case 'found':
        return (
          '¡Buenas noticias! Encontramos una opción para tu pedido en Mercadito Online 🎉 ' +
          'Entrá a la app para ver el precio y los detalles.'
        );
      case 'completed':
        return (
          'Tu pedido por conseguir fue completado en Mercadito Online ✅ ' +
          'Gracias por confiar en nosotros 🙌'
        );
      case 'cancelled':
        return (
          'Tu pedido por conseguir fue cancelado en Mercadito Online. ' +
          'Si querés, podés crear uno nuevo desde la app cuando gustes.'
        );
      default:
        return 'Actualizamos el estado de tu pedido por conseguir en Mercadito Online.';
    }
  }

  return 'Actualizamos tu pedido por conseguir en Mercadito Online.';
}


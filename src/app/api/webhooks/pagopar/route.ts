// ============================================
// MERCADITO ONLINE PY - WEBHOOK PAGOPAR
// Endpoint para recibir notificaciones de Pagopar cuando se paga una factura
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getPagoparInvoiceStatus } from '@/lib/services/pagoparService';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    // Verificar autorización (Pagopar envía un token o firma)
    const authHeader = request.headers.get('authorization');
    const pagoparSecret = process.env.PAGOPAR_WEBHOOK_SECRET;

    // TODO: Implementar verificación de firma si Pagopar la proporciona
    // if (pagoparSecret && authHeader !== `Bearer ${pagoparSecret}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const body = await request.json();
    const { id_factura, estado, monto_pagado, fecha_pago, metodo_pago } = body;

    if (!id_factura) {
      return NextResponse.json(
        { error: 'id_factura is required' },
        { status: 400 }
      );
    }

    logger.info('Pagopar webhook received', {
      id_factura,
      estado,
      monto_pagado,
      fecha_pago,
    });

    // Buscar orden por payment_reference
    const { data: order, error: orderError } = await (supabase as any)
      .from('orders')
      .select('id, buyer_id, total_amount, status, payment_provider')
      .eq('payment_reference', id_factura.toString())
      .eq('payment_provider', 'pagopar')
      .maybeSingle();

    if (orderError) {
      logger.error('Error finding order for Pagopar webhook', orderError);
      return NextResponse.json(
        { error: 'Error processing webhook' },
        { status: 500 }
      );
    }

    if (!order) {
      logger.warn('Order not found for Pagopar invoice', { id_factura });
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Si la orden ya está pagada, no hacer nada
    if (order.status === 'paid' || order.status === 'confirmed') {
      logger.info('Order already paid, ignoring webhook', { orderId: order.id });
      return NextResponse.json({ success: true, message: 'Order already paid' });
    }

    // Actualizar estado de la orden según el estado de Pagopar
    if (estado === 'pagada' && monto_pagado >= order.total_amount) {
      // Confirmar pago de la orden
      await (supabase as any)
        .from('orders')
        .update({
          status: 'confirmed',
          payment_status: 'completed',
          payment_confirmed_at: fecha_pago || new Date().toISOString(),
          payment_method: metodo_pago || 'pagopar',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      // Crear notificación para el comprador
      try {
        await (supabase as any)
          .from('notifications')
          .insert({
            user_id: order.buyer_id,
            type: 'order',
            title: 'Pago confirmado',
            message: `Tu pago para la orden #${order.id.slice(0, 8)} ha sido confirmado`,
            content: `El pago de ${monto_pagado?.toLocaleString('es-PY')} Gs. ha sido procesado exitosamente.`,
            data: {
              order_id: order.id,
              amount: monto_pagado,
            },
          });
      } catch (notifError) {
        logger.warn('Error creating notification', notifError);
      }

      logger.info('Order payment confirmed via Pagopar webhook', {
        orderId: order.id,
        invoiceId: id_factura,
        amount: monto_pagado,
      });
    } else if (estado === 'vencida' || estado === 'cancelada') {
      // Marcar como cancelada
      await (supabase as any)
        .from('orders')
        .update({
          status: 'cancelled',
          payment_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('Error processing Pagopar webhook', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET para verificación (si Pagopar requiere)
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'Pagopar webhook' });
}





// ============================================
// MERCADITO ONLINE PY - API: CREAR FACTURA PAGOPAR
// Endpoint para crear una factura de pago en Pagopar
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import {
  createPagoparInvoice,
  formatPagoparBuyer,
  formatPagoparItems,
  calculateDueDate,
} from '@/lib/services/pagoparService';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, buyerData, items, totalAmount, paymentMethod } = body ?? {};

    logger.info('[pagopar][create-invoice] start', {
      orderId,
      hasBuyerData: !!buyerData,
      hasItems: Array.isArray(items) && items.length > 0,
      hasTokens: Boolean(process.env.NEXT_PUBLIC_PAGOPAR_PUBLIC_TOKEN && process.env.PAGOPAR_PRIVATE_TOKEN),
    });

    if (!orderId || !buyerData || !items || !totalAmount) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, buyerData, items, totalAmount' },
        { status: 400 }
      );
    }

    if (!process.env.NEXT_PUBLIC_PAGOPAR_PUBLIC_TOKEN || !process.env.PAGOPAR_PRIVATE_TOKEN) {
      logger.error('[pagopar][create-invoice] missing env tokens');
      return NextResponse.json(
        { error: 'Pagopar credentials are not configured. Contact support.' },
        { status: 500 }
      );
    }

    let sessionUserId: string | null = null;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.id) {
        sessionUserId = session.user.id;
      }
    } catch (sessionError) {
      logger.warn('[pagopar][create-invoice] session lookup failed', sessionError);
    }

    const requestBuyerId = sessionUserId ?? 'guest';

    const { data: order, error: orderError } = await (supabase as any)
      .from('orders')
      .select('id, buyer_id, total_amount, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      logger.error('[pagopar][create-invoice] order not found', { orderId, error: orderError });
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (requestBuyerId !== 'guest' && order.buyer_id !== requestBuyerId) {
      logger.warn('[pagopar][create-invoice] unauthorized access', { orderId, requestBuyerId });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (order.status === 'paid') {
      return NextResponse.json({ error: 'Order already paid' }, { status: 400 });
    }

    if (order.status === 'failed') {
      return NextResponse.json({ error: 'Order is already marked as failed' }, { status: 400 });
    }

    // Formatear datos para Pagopar
    const pagoparBuyer = formatPagoparBuyer({
      fullName: buyerData.fullName || buyerData.full_name || 'Cliente',
      email: buyerData.email || buyerData.email_address || '',
      phone: buyerData.phone || '',
      ruc: buyerData.ruc || buyerData.document || undefined,
    });

    const pagoparItems = formatPagoparItems(items);
    const tipoFactura = paymentMethod === 'card' ? 2 : 1;

    try {
      const invoice = await createPagoparInvoice({
        monto_total: Math.round(totalAmount),
        tipo_factura: tipoFactura,
        comprador: pagoparBuyer,
        items: pagoparItems,
        fecha_vencimiento: calculateDueDate(7),
        venta: { forma_pago: 1 },
      });

      await (supabase as any)
        .from('orders')
        .update({
          payment_provider: 'pagopar',
          payment_reference: invoice.id_factura.toString(),
          status: 'pending_payment',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      logger.info('[pagopar][create-invoice] invoice created', {
        orderId,
        invoiceId: invoice.id_factura,
      });

      return NextResponse.json({
        success: true,
        invoice: {
          id: invoice.id_factura,
          link_pago: invoice.link_pago,
          qr_code: invoice.qr_code,
        },
      });
    } catch (pagoparError: any) {
      logger.error('[pagopar][create-invoice] error creating invoice', {
        orderId,
        message: pagoparError?.message,
      });

      await (supabase as any)
        .from('orders')
        .update({
          status: 'failed',
          payment_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      return NextResponse.json(
        { error: pagoparError?.message || 'Error al crear factura con Pagopar' },
        { status: 502 }
      );
    }
  } catch (error: any) {
    logger.error('[pagopar][create-invoice] unexpected error', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


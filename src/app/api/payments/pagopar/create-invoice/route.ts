// ============================================
// MERCADITO ONLINE PY - API: CREAR FACTURA PAGOPAR
// Endpoint para crear una factura de pago en Pagopar
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { 
  createPagoparInvoice, 
  formatPagoparBuyer, 
  formatPagoparItems,
  calculateDueDate 
} from '@/lib/services/pagoparService';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, buyerData, items, totalAmount, paymentMethod } = body;

    // Validación básica
    if (!orderId || !buyerData || !items || !totalAmount) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, buyerData, items, totalAmount' },
        { status: 400 }
      );
    }

    // Verificar que la orden existe y pertenece al usuario
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: order, error: orderError } = await (supabase as any)
      .from('orders')
      .select('id, buyer_id, total_amount, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      logger.error('Order not found for Pagopar invoice', orderError);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (order.buyer_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Verificar que la orden no esté ya pagada
    if (order.status === 'paid' || order.status === 'confirmed') {
      return NextResponse.json(
        { error: 'Order already paid' },
        { status: 400 }
      );
    }

    // Formatear datos para Pagopar
    const pagoparBuyer = formatPagoparBuyer({
      fullName: buyerData.fullName || buyerData.full_name || 'Cliente',
      email: buyerData.email || session.user.email || '',
      phone: buyerData.phone || '',
      ruc: buyerData.ruc || buyerData.document || undefined,
    });

    const pagoparItems = formatPagoparItems(items);

    // Determinar tipo de factura según método de pago
    // 1 = Factura (solo efectivo/transferencia)
    // 2 = Factura + Tarjeta (permite tarjeta también)
    const tipoFactura = paymentMethod === 'card' ? 2 : 1;

    // Crear factura en Pagopar
    try {
      const invoice = await createPagoparInvoice({
        monto_total: Math.round(totalAmount),
        tipo_factura: tipoFactura,
        comprador: pagoparBuyer,
        items: pagoparItems,
        fecha_vencimiento: calculateDueDate(7), // 7 días para pagar
        venta: {
          forma_pago: 1, // Contado
        },
      });

      // Guardar referencia de factura en la orden
      await (supabase as any)
        .from('orders')
        .update({
          payment_provider: 'pagopar',
          payment_reference: invoice.id_factura.toString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      logger.info('Pagopar invoice created for order', {
        orderId,
        invoiceId: invoice.id_factura,
        link: invoice.link_pago,
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
      logger.error('Error creating Pagopar invoice', pagoparError);
      
      // Si Pagopar no está configurado, retornar mock para desarrollo
      if (pagoparError.message?.includes('not configured') || 
          (!process.env.PAGOPAR_PUBLIC_TOKEN && !process.env.PAGOPAR_PUBLIC_KEY)) {
        logger.warn('Pagopar not configured, returning mock invoice');
        
        return NextResponse.json({
          success: true,
          invoice: {
            id: `mock_${Date.now()}`,
            link_pago: `/checkout/pagopar-mock?order=${orderId}`,
            qr_code: null,
          },
          message: 'Pagopar not configured - using mock. Set PAGOPAR_PUBLIC_KEY and PAGOPAR_PRIVATE_KEY to use real payments.',
        });
      }

      return NextResponse.json(
        { error: pagoparError.message || 'Error creating Pagopar invoice' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    logger.error('Error in create Pagopar invoice endpoint', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


// ============================================
// MERCADITO ONLINE PY - API: CONSULTAR ESTADO PAGOPAR
// Endpoint para consultar el estado de una factura Pagopar
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getPagoparInvoiceStatus } from '@/lib/services/pagoparService';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const invoiceId = searchParams.get('invoice_id');
    const orderId = searchParams.get('order_id');

    if (!invoiceId && !orderId) {
      return NextResponse.json(
        { error: 'invoice_id or order_id is required' },
        { status: 400 }
      );
    }

    // Si se proporciona order_id, obtener invoice_id desde la orden
    let pagoparInvoiceId: string | null = invoiceId || null;
    
    if (orderId) {
      const { data: order, error: orderError } = await (supabase as any)
        .from('orders')
        .select('payment_reference, payment_provider')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }

      if (order.payment_provider !== 'pagopar') {
        return NextResponse.json(
          { error: 'Order does not use Pagopar' },
          { status: 400 }
        );
      }

      pagoparInvoiceId = order.payment_reference;
    }

    if (!pagoparInvoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID not found' },
        { status: 404 }
      );
    }

    try {
      const invoiceStatus = await getPagoparInvoiceStatus(parseInt(pagoparInvoiceId));

      // Mapear estados de Pagopar a estados de la aplicación
      const statusMap: Record<string, string> = {
        'pendiente': 'pending',
        'pagada': 'paid',
        'vencida': 'expired',
        'cancelada': 'cancelled',
      };

      const mappedStatus = statusMap[invoiceStatus.estado] || invoiceStatus.estado;

      return NextResponse.json({
        success: true,
        status: mappedStatus,
        pagopar_status: invoiceStatus.estado,
        amount_total: invoiceStatus.monto_total,
        amount_paid: invoiceStatus.monto_pagado,
        payment_date: invoiceStatus.fecha_pago,
        payment_method: invoiceStatus.metodo_pago,
        is_paid: invoiceStatus.estado === 'pagada',
      });
    } catch (pagoparError: any) {
      logger.error('Error getting Pagopar invoice status', pagoparError);
      
      // Si Pagopar no está configurado, retornar mock
      if (!process.env.PAGOPAR_PUBLIC_TOKEN && !process.env.PAGOPAR_PUBLIC_KEY) {
        return NextResponse.json({
          success: true,
          status: 'pending',
          pagopar_status: 'pendiente',
          amount_total: 0,
          amount_paid: 0,
          is_paid: false,
          message: 'Pagopar not configured - using mock status',
        });
      }

      return NextResponse.json(
        { error: pagoparError.message || 'Error getting invoice status' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    logger.error('Error in Pagopar status endpoint', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


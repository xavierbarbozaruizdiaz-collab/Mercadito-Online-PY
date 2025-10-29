// src/app/api/payments/paypal/status/route.ts
// Endpoint para obtener el estado de una orden de PayPal

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId is required' },
        { status: 400 }
      );
    }

    const paypalClientId = process.env.PAYPAL_CLIENT_ID;
    const paypalSecret = process.env.PAYPAL_SECRET;

    if (!paypalClientId || !paypalSecret) {
      // Mock para desarrollo
      return NextResponse.json({
        status: 'COMPLETED',
        amount: 0,
        message: 'PayPal not configured - using mock status',
      });
    }

    // En producción, obtener el estado real de la orden
    // const paypal = require('@paypal/checkout-server-sdk');
    // const environment = paypalMode === 'live' 
    //   ? new paypal.core.LiveEnvironment(paypalClientId, paypalSecret)
    //   : new paypal.core.SandboxEnvironment(paypalClientId, paypalSecret);
    // const client = new paypal.core.PayPalHttpClient(environment);
    // 
    // const request = new paypal.orders.OrdersGetRequest(orderId);
    // const response = await client.execute(request);
    // const order = response.result;

    return NextResponse.json({
      status: 'COMPLETED',
      amount: 0,
      message: 'Configure PayPal credentials to get real order status',
    });
  } catch (error: any) {
    console.error('Error getting PayPal order status:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


// src/app/api/payments/paypal/capture-order/route.ts
// Endpoint para capturar una orden de PayPal después de aprobación

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = body;

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
        success: true,
        transactionId: `TXN_MOCK_${Date.now()}`,
        message: 'PayPal not configured - payment would be captured in production',
      });
    }

    // En producción, capturar la orden real con PayPal SDK
    // const paypal = require('@paypal/checkout-server-sdk');
    // const environment = paypalMode === 'live' 
    //   ? new paypal.core.LiveEnvironment(paypalClientId, paypalSecret)
    //   : new paypal.core.SandboxEnvironment(paypalClientId, paypalSecret);
    // const client = new paypal.core.PayPalHttpClient(environment);
    // 
    // const request = new paypal.orders.OrdersCaptureRequest(orderId);
    // const response = await client.execute(request);
    // const capture = response.result;

    return NextResponse.json({
      success: true,
      transactionId: `TXN_MOCK_${Date.now()}`,
      message: 'Configure PayPal credentials to capture real payments',
    });
  } catch (error: any) {
    console.error('Error capturing PayPal order:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


// src/app/api/payments/stripe/confirm/route.ts
// Endpoint para confirmar un pago de Stripe

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentIntentId, paymentMethodId } = body;

    if (!paymentIntentId || !paymentMethodId) {
      return NextResponse.json(
        { error: 'paymentIntentId and paymentMethodId are required' },
        { status: 400 }
      );
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      // Mock para desarrollo
      return NextResponse.json({
        success: true,
        message: 'Stripe not configured - payment would be confirmed in production',
      });
    }

    // En producción, confirmar el pago real con Stripe
    // const stripe = require('stripe')(stripeSecretKey);
    // const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
    //   payment_method: paymentMethodId,
    // });

    return NextResponse.json({
      success: true,
      message: 'Configure STRIPE_SECRET_KEY to use real Stripe payments',
    });
  } catch (error: any) {
    console.error('Error confirming Stripe payment:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


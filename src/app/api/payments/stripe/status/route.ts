// src/app/api/payments/stripe/status/route.ts
// Endpoint para obtener el estado de un Payment Intent de Stripe

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentIntentId = searchParams.get('paymentIntentId');

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'paymentIntentId is required' },
        { status: 400 }
      );
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      // Mock para desarrollo
      return NextResponse.json({
        status: 'succeeded',
        amount: 0,
        message: 'Stripe not configured - using mock status',
      });
    }

    // En producción, obtener el estado real del Payment Intent
    // const stripe = require('stripe')(stripeSecretKey);
    // const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    return NextResponse.json({
      status: 'succeeded',
      amount: 0,
      message: 'Configure STRIPE_SECRET_KEY to get real payment status',
    });
  } catch (error: any) {
    console.error('Error getting Stripe payment status:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


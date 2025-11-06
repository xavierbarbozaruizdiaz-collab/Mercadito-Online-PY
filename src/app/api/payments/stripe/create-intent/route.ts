// src/app/api/payments/stripe/create-intent/route.ts
// Endpoint para crear un Payment Intent de Stripe

import { NextRequest, NextResponse } from 'next/server';

/**
 * NOTA: Este endpoint requiere instalar @stripe/stripe-js y stripe
 * npm install stripe @stripe/stripe-js
 * 
 * Variables de entorno necesarias:
 * STRIPE_SECRET_KEY=sk_test_... o sk_live_...
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, currency, orderId, metadata } = body;

    // Validación básica
    if (!amount || !orderId) {
      return NextResponse.json(
        { error: 'Amount and orderId are required' },
        { status: 400 }
      );
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      // Si no hay clave configurada, retornar mock para desarrollo
      return NextResponse.json({
        paymentIntent: {
          id: `pi_mock_${Date.now()}`,
          clientSecret: `pi_mock_${Date.now()}_secret_mock`,
          amount,
          currency: currency || 'PYG',
          status: 'requires_payment_method',
        },
        message: 'Stripe not configured - using mock',
      });
    }

    // En producción, aquí importarías Stripe y crearías el Payment Intent real
    // const stripe = require('stripe')(stripeSecretKey);
    // 
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount: amount * 100, // Stripe usa centavos
    //   currency: currency.toLowerCase() === 'pyg' ? 'usd' : currency.toLowerCase(),
    //   metadata: {
    //     order_id: orderId,
    //     ...metadata,
    //   },
    // });

    // Por ahora, retornamos un mock hasta que se configure Stripe
    return NextResponse.json({
      paymentIntent: {
        id: `pi_mock_${Date.now()}`,
        clientSecret: `pi_mock_${Date.now()}_secret_configure_stripe`,
        amount,
        currency: currency || 'PYG',
        status: 'requires_payment_method',
      },
      message: 'Configure STRIPE_SECRET_KEY in .env.local to use real Stripe payments',
    });
  } catch (error: any) {
    console.error('Error creating Stripe payment intent:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


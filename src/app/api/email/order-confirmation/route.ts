// src/app/api/email/order-confirmation/route.ts
// API route para enviar confirmación de pedido

import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/services/emailService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, orderNumber, orderDetails } = body;

    if (!email || !orderNumber || !orderDetails) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    const success = await EmailService.sendOrderConfirmation(
      email,
      orderNumber,
      orderDetails
    );

    if (success) {
      return NextResponse.json({ success: true, message: 'Email enviado' });
    } else {
      return NextResponse.json(
        { error: 'Error al enviar email' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error en API de order confirmation:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}


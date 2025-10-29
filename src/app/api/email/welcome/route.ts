// src/app/api/email/welcome/route.ts
// API route para enviar email de bienvenida

import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/services/emailService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, userName } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email es requerido' },
        { status: 400 }
      );
    }

    const success = await EmailService.sendWelcomeEmail(
      email,
      userName || 'Usuario'
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
    console.error('Error en API de welcome email:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}


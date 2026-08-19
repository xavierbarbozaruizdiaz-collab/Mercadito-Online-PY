import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/services/emailService';
import { requireUser } from '@/lib/auth/apiAuth';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { email, orderNumber, orderDetails } = body;

    if (!email || !orderNumber || !orderDetails) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    if (auth.user.email && email.toLowerCase() !== auth.user.email.toLowerCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const success = await EmailService.sendOrderConfirmation(
      email,
      orderNumber,
      orderDetails
    );

    if (success) {
      return NextResponse.json({ success: true, message: 'Email enviado' });
    }
    return NextResponse.json({ error: 'Error al enviar email' }, { status: 500 });
  } catch (error: any) {
    console.error('Error en API de order confirmation:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

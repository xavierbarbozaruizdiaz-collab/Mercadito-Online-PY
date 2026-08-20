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

    // No bloquear el checkout si el servicio de email no está configurado
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY no configurada. Se omite envío de email de confirmación.');
      return NextResponse.json({
        success: false,
        message: 'Email no enviado (configuración faltante)',
      });
    }

    const success = await EmailService.sendOrderConfirmation(
      email,
      orderNumber,
      orderDetails
    );

    if (success) {
      return NextResponse.json({ success: true, message: 'Email enviado' });
    }

    console.error('No se pudo enviar el email de confirmación, pero el pedido se creó correctamente.');
    return NextResponse.json({
      success: false,
      message: 'No se pudo enviar el email, pero el pedido quedó confirmado',
    });
  } catch (error: any) {
    console.error('Error en API de order confirmation:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

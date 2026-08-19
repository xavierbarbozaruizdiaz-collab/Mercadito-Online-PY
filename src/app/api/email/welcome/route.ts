import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/services/emailService';
import { requireUser } from '@/lib/auth/apiAuth';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { email, userName } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email es requerido' }, { status: 400 });
    }

    // Solo el propio usuario (o se puede ampliar a admin luego)
    if (auth.user.email && email.toLowerCase() !== auth.user.email.toLowerCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const success = await EmailService.sendWelcomeEmail(email, userName || 'Usuario');

    if (success) {
      return NextResponse.json({ success: true, message: 'Email enviado' });
    }
    return NextResponse.json({ error: 'Error al enviar email' }, { status: 500 });
  } catch (error: any) {
    console.error('Error en API de welcome email:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

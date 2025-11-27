// ============================================
// MERCADITO ONLINE PY - WEBHOOK WHATSAPP CLOUD API
// GET: verificación de webhook (hub.challenge)
// POST: recepción de eventos de mensajes / estados
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!verifyToken) {
    logger.warn('[WhatsAppWebhook][GET] WHATSAPP_VERIFY_TOKEN no configurado');
    return new Response('Webhook verification disabled', { status: 403 });
  }

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    logger.info('[WhatsAppWebhook][GET] Verificación exitosa');
    return new Response(challenge, { status: 200 });
  }

  logger.warn('[WhatsAppWebhook][GET] Verificación fallida', { mode, token });
  return new Response('Forbidden', { status: 403 });
}

export async function POST(req: NextRequest) {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!verifyToken) {
    logger.warn('[WhatsAppWebhook][POST] WHATSAPP_VERIFY_TOKEN no configurado, ignorando payload');
    return NextResponse.json({ ok: false, reason: 'verify token not configured' }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => null);

    logger.info('[WhatsAppWebhook][POST] Evento recibido de WhatsApp Cloud', {
      hasBody: !!body,
      object: body?.object,
    });

    // Por ahora solo logueamos, sin persistir
    if (body?.entry) {
      for (const entry of body.entry) {
        logger.debug('[WhatsAppWebhook][ENTRY]', {
          id: entry?.id,
          changesCount: entry?.changes?.length ?? 0,
        });
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    logger.error('[WhatsAppWebhook][POST] Error procesando webhook', {
      message: error?.message,
    });
    // No rompemos la comunicación con Meta: siempre 200 aunque haya error interno
    return NextResponse.json(
      { success: false, error: error?.message || 'Unexpected error' },
      { status: 200 }
    );
  }
}

















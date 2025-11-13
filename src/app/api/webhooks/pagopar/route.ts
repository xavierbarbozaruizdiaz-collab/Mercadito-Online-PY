// ============================================
// MERCADITO ONLINE PY - WEBHOOK PAGOPAR
// Endpoint simplificado para registrar notificaciones
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  let payload: unknown = null;

  try {
    payload = await request.json();
  } catch (error) {
    logger.warn('Pagopar webhook payload parse error', {
      message: error instanceof Error ? error.message : 'unknown_error',
    });
  }

  logger.info('Pagopar webhook received', { payload });

  return NextResponse.json({ respuesta: true }, { status: 200 });
}

// GET para verificación (si Pagopar requiere)
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'Pagopar webhook' });
}











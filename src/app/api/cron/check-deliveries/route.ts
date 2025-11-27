// ============================================
// MERCADITO ONLINE PY - CRON: VERIFICAR ENTREGAS
// Verifica entregas pendientes y aplica multas a vendedores
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/utils/logger';

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  // Verificar CRON_SECRET
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    logger.warn('Intento no autorizado de verificar entregas', {
      hasAuth: !!authHeader,
      expected: !!process.env.CRON_SECRET,
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    logger.info('Iniciando verificación de entregas pendientes...');

    // 1. Enviar avisos de entregas próximas a vencer
    const { data: warningsResult, error: warningsError } = await (supabase as any).rpc('send_delivery_warnings');
    
    if (warningsError) {
      logger.error('Error enviando avisos de entrega', warningsError);
    } else if (warningsResult) {
      logger.info('Avisos de entrega enviados', {
        warnings_sent: warningsResult.warnings_sent || 0,
      });
    }

    // 2. Verificar entregas pendientes y aplicar multas
    const { data: penaltyResult, error: penaltyError } = await (supabase as any).rpc('check_unfulfilled_orders_and_apply_penalties');

    if (penaltyError) {
      logger.error('Error verificando entregas y aplicando multas', penaltyError);
      return NextResponse.json(
        { error: 'Error verificando entregas', details: penaltyError.message },
        { status: 500 }
      );
    }

    logger.info('Verificación de entregas completada', penaltyResult);

    return NextResponse.json({
      success: true,
      result: penaltyResult,
      warnings: warningsResult,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    logger.error('Error en cron de verificaciones de entregas', err);
    return NextResponse.json(
      { error: 'Error interno', message: err.message },
      { status: 500 }
    );
  }
}














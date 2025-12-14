// ============================================
// DEBUG ENDPOINT - Test función insert_product_image
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, testUrl, testThumbnailUrl } = body;

    if (!productId) {
      return NextResponse.json({ error: 'productId requerido' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: 'Variables de entorno faltantes' },
        { status: 500 }
      );
    }

    const adminClient = createClient<Database>(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    logger.info('[TEST] Llamando función insert_product_image', {
      productId,
      url: testUrl || 'https://test.com/image.jpg',
      thumbnailUrl: testThumbnailUrl || 'https://test.com/thumb.jpg',
    });

    // Test 1: Verificar que la función existe
    const { data: functionExists, error: checkError } = await adminClient
      .from('pg_proc')
      .select('proname')
      .eq('proname', 'insert_product_image')
      .single();

    logger.info('[TEST] Verificación función', {
      functionExists: !!functionExists,
      checkError: checkError?.message,
    });

    // Test 2: Llamar la función RPC
    const { data: rpcResult, error: rpcError } = await (adminClient as any).rpc(
      'insert_product_image',
      {
        p_product_id: productId,
        p_url: testUrl || 'https://test.com/image.jpg',
        p_thumbnail_url: testThumbnailUrl || 'https://test.com/thumb.jpg',
        p_alt_text: 'Test image',
        p_sort_order: 0,
        p_is_cover: false,
      }
    );

    logger.info('[TEST] Resultado RPC', {
      hasData: !!rpcResult,
      dataType: Array.isArray(rpcResult) ? 'array' : typeof rpcResult,
      dataLength: Array.isArray(rpcResult) ? rpcResult.length : 'N/A',
      hasError: !!rpcError,
      errorCode: rpcError?.code,
      errorMessage: rpcError?.message,
      errorDetails: rpcError?.details,
      errorHint: rpcError?.hint,
    });

    if (rpcError) {
      return NextResponse.json(
        {
          success: false,
          error: rpcError.message,
          code: rpcError.code,
          details: rpcError.details,
          hint: rpcError.hint,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      functionExists: !!functionExists,
      rpcResult,
      message: 'Función RPC ejecutada correctamente',
    });
  } catch (error: any) {
    logger.error('[TEST] Error inesperado', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}








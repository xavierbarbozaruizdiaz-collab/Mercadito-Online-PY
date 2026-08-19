// ============================================
// DEBUG ENDPOINT - Diagnóstico completo de upload-images
// ============================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const adminClient = createClient<Database>(supabaseUrl!, serviceKey!, {
      auth: { persistSession: false },
    });

    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      environment: {
        hasSupabaseUrl: !!supabaseUrl,
        hasServiceKey: !!serviceKey,
        hasAnonKey: !!anonKey,
        serviceKeyLength: serviceKey?.length || 0,
        serviceKeyPrefix: serviceKey?.substring(0, 20) || 'N/A',
        isServiceRoleFormat: serviceKey?.startsWith('eyJ') && (serviceKey?.length || 0) > 100,
      },
      functionExists: null,
      functionTest: null,
      directInsertTest: null,
    };

    // Test 1: Verificar que la función existe intentando llamarla
    try {
      const { data: testRpc, error: testError } = await (adminClient as any).rpc('insert_product_image', {
        p_product_id: '00000000-0000-0000-0000-000000000000', // UUID inválido para test
        p_url: 'https://test.com/test.jpg',
        p_thumbnail_url: 'https://test.com/thumb.jpg',
        p_alt_text: 'test',
        p_sort_order: 0,
        p_is_cover: false,
      });
      diagnostics.functionExists = true;
      diagnostics.functionTest = {
        called: true,
        error: testError?.message || null,
        errorCode: testError?.code || null,
        isRLSError: testError?.code === '42501',
      };
    } catch (rpcErr: any) {
      // Si el error es "function does not exist", la función no existe
      // Si es otro error (como foreign key), la función existe pero falló por otra razón
      diagnostics.functionExists = !rpcErr?.message?.includes('does not exist') && !rpcErr?.message?.includes('function');
      diagnostics.functionTest = {
        called: false,
        error: rpcErr?.message || 'Function not found',
        errorCode: rpcErr?.code || null,
      };
    }

    // Test 2: Intentar INSERT directo (debería fallar con RLS si no funciona)
    try {
      const { data: insertTest, error: insertError } = await (adminClient as any)
        .from('product_images')
        .insert({
          product_id: '00000000-0000-0000-0000-000000000000',
          url: 'https://test.com/test.jpg',
          thumbnail_url: 'https://test.com/thumb.jpg',
          alt_text: 'test',
          sort_order: 0,
          is_cover: false,
        })
        .select()
        .single();

      diagnostics.directInsertTest = {
        success: !insertError,
        error: insertError?.message || null,
        errorCode: insertError?.code || null,
        isRLSError: insertError?.code === '42501',
      };
    } catch (insertErr: any) {
      diagnostics.directInsertTest = {
        success: false,
        error: insertErr?.message || 'Unknown error',
        isRLSError: insertErr?.code === '42501' || insertErr?.message?.includes('row-level security'),
      };
    }

    logger.info('[DEBUG] Upload images status check', diagnostics);

    return NextResponse.json({
      success: true,
      ...diagnostics,
    });
  } catch (error: any) {
    logger.error('[DEBUG] Error en diagnóstico', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}


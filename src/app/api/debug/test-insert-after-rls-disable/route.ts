// ============================================
// [DEBUG] Test INSERT después de deshabilitar RLS
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Missing env vars' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'productId required' },
        { status: 400 }
      );
    }

    // Crear adminClient igual que en upload-images
    const adminClient = createClient<Database>(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verificar que el producto existe
    const { data: product, error: productError } = await adminClient
      .from('products')
      .select('id')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { success: false, error: 'Product not found', details: productError?.message },
        { status: 404 }
      );
    }

    // Intentar INSERT
    const { data: inserted, error: insertError } = await (adminClient as any)
      .from('product_images')
      .insert({
        product_id: productId,
        url: 'https://test.com/test.jpg',
        thumbnail_url: 'https://test.com/thumb.jpg',
        alt_text: '[TEST] After RLS disable',
        sort_order: 99999,
        is_cover: false,
      })
      .select()
      .single();

    if (insertError) {
      logger.error('[DEBUG] INSERT failed after RLS disable', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'INSERT failed',
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
        },
        { status: 500 }
      );
    }

    // Limpiar
    await adminClient
      .from('product_images')
      .delete()
      .eq('id', inserted.id);

    return NextResponse.json({
      success: true,
      message: 'INSERT successful! RLS is disabled correctly.',
      insertedId: inserted.id,
    });
  } catch (error: any) {
    logger.error('[DEBUG] Unexpected error', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}







// ============================================
// [DEBUG] Test INSERT simple sin procesamiento de imágenes
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing env vars' }, { status: 500 });
    }

    // Crear adminClient EXACTAMENTE igual que en upload-images
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

    logger.info('[DEBUG] Test INSERT simple', {
      productId,
      serviceRoleKeyLength: serviceRoleKey.length,
      serviceRoleKeyPrefix: serviceRoleKey.substring(0, 20),
    });

    // INSERT directo (igual que en upload-images)
    const { data: inserted, error: insertError } = await (adminClient as any)
      .from('product_images')
      .insert({
        product_id: productId,
        url: 'https://test.com/test.jpg',
        thumbnail_url: 'https://test.com/thumb.jpg',
        alt_text: '[TEST SIMPLE]',
        sort_order: 99999,
        is_cover: false,
      })
      .select()
      .single();

    if (insertError) {
      logger.error('[DEBUG] INSERT simple falló', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        isRLSError: insertError.code === '42501',
      });

      return NextResponse.json(
        {
          success: false,
          error: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
          isRLSError: insertError.code === '42501',
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
      message: 'INSERT simple funcionó correctamente',
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







// ============================================
// [DEBUG ONLY] Endpoint temporal para probar RLS de product_images con service_role
// NO USAR EN PRODUCCIÓN FINAL. Eliminar cuando terminemos el diagnóstico.
// ============================================
//
// Objetivo: Demostrar con una prueba controlada si el error RLS viene de:
// 1. Un INSERT hecho con cliente normal (anon), o
// 2. Un INSERT hecho con cliente admin (service_role)
//
// Este endpoint usa SOLO service_role, sin leer cookies ni autenticación de usuario.
// Si este endpoint funciona, significa que service_role realmente ignora RLS.
// Si este endpoint falla con el mismo error RLS, entonces hay un problema más profundo.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // [DEBUG] Verificar variables de entorno
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      logger.error('[DEBUG] Missing environment variables', {
        hasUrl: !!supabaseUrl,
        hasServiceRole: !!serviceRoleKey,
      });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing env',
          details: {
            hasUrl: !!supabaseUrl,
            hasServiceRole: !!serviceRoleKey,
          }
        },
        { status: 500 }
      );
    }

    // [DEBUG] Crear cliente admin directamente (sin Proxy, sin cookies)
    // Esto es igual a como debería hacerse en el endpoint real
    const directAdminClient = createClient<Database>(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        },
      }
    );

    // [DEBUG] Log de creación del cliente
    logger.warn('[DEBUG] Direct admin client created for test', {
      url: supabaseUrl,
      serviceRoleKeyLength: serviceRoleKey.length,
      serviceRoleKeyPrefix: serviceRoleKey.substring(0, 12),
      clientType: 'direct_admin_with_service_role',
    });

    // [DEBUG] Leer body del request
    const body = await request.json();
    const { productId } = body;

    if (!productId || typeof productId !== 'string') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'productId is required and must be a string UUID',
        },
        { status: 400 }
      );
    }

    // [DEBUG] Verificar que el producto existe (usando admin client para evitar RLS)
    const { data: product, error: productCheckError } = await directAdminClient
      .from('products')
      .select('id, seller_id')
      .eq('id', productId)
      .single();

    if (productCheckError || !product) {
      logger.error('[DEBUG] Product not found', {
        productId,
        error: productCheckError?.message,
      });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Product not found',
          details: productCheckError?.message,
        },
        { status: 404 }
      );
    }

    logger.info('[DEBUG] Product found, attempting INSERT', {
      productId,
      sellerId: (product as any).seller_id,
    });

    // [DEBUG] Intentar INSERT en product_images usando SOLO service_role
    // Este es el punto crítico: si esto falla con error RLS, significa que
    // incluso el service_role está siendo evaluado con RLS (lo cual NO debería pasar)
    const { data: imageData, error: imageError } = await (directAdminClient as any)
      .from('product_images')
      .insert({
        product_id: productId,
        url: 'https://example.com/test.jpg',
        thumbnail_url: 'https://example.com/test-thumb.jpg',
        alt_text: '[DEBUG TEST] Test image inserted via service_role',
        sort_order: 9999, // Número alto para identificar fácilmente en BD
        is_cover: false,
      })
      .select()
      .single();

    if (imageError) {
      // [DEBUG] Log detallado del error RLS
      logger.error('[DEBUG] INSERT failed with error', {
        code: imageError.code,
        message: imageError.message,
        details: imageError.details,
        hint: imageError.hint,
        productId,
        errorType: imageError.code === '42501' ? 'RLS_VIOLATION' : 'OTHER',
        usingServiceRole: true,
        serviceRoleKeyLength: serviceRoleKey.length,
        serviceRoleKeyPrefix: serviceRoleKey.substring(0, 12),
      });

      return NextResponse.json(
        {
          success: false,
          errorCode: imageError.code,
          message: imageError.message,
          details: imageError.details,
          hint: imageError.hint,
          usingServiceRole: true,
          interpretation: imageError.code === '42501' 
            ? 'RLS se está aplicando incluso con service_role. Esto NO debería pasar. Verificar configuración de Supabase o políticas conflictivas.'
            : 'Error desconocido, no relacionado con RLS.',
        },
        { status: 500 }
      );
    }

    // [DEBUG] Éxito - el INSERT funcionó con service_role
    logger.info('[DEBUG] INSERT successful with service_role', {
      productId,
      imageId: imageData?.id,
      usingServiceRole: true,
    });

    // [DEBUG] Limpiar: eliminar el registro de prueba
    // (opcional, pero recomendado para no dejar basura en BD)
    try {
      await directAdminClient
        .from('product_images')
        .delete()
        .eq('id', imageData.id);
      
      logger.info('[DEBUG] Test record cleaned up', { imageId: imageData.id });
    } catch (cleanupError: any) {
      logger.warn('[DEBUG] Failed to cleanup test record', {
        imageId: imageData.id,
        error: cleanupError?.message,
      });
      // No fallar aquí, solo loguear
    }

    return NextResponse.json({
      success: true,
      message: 'INSERT successful with service_role. RLS is correctly bypassed.',
      imageId: imageData.id,
      usingServiceRole: true,
    });
  } catch (error: any) {
    logger.error('[DEBUG] Unexpected error in test endpoint', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Unexpected error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}


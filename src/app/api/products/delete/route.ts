import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import type { Database } from '@/types/database';

export const runtime = 'nodejs';

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(req: NextRequest) {
  let productId: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    productId = body.productId;

    if (!productId || !isUuid(productId)) {
      return NextResponse.json({ error: 'INVALID_PRODUCT_ID' }, { status: 400 });
    }

    // Intentar autenticación con cookies primero
    let supabase = await createServerClient();
    let { data: { user }, error: authError } = await supabase.auth.getUser();
    let currentUser = user;

    // Si falla, intentar con token Bearer del header
    if (!currentUser) {
      const authHeader = req.headers.get('authorization');
      const bearerToken = authHeader?.toLowerCase().startsWith('bearer ')
        ? authHeader.slice(7)
        : null;

      if (bearerToken) {
        const supabaseWithToken = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            auth: { autoRefreshToken: false, persistSession: false },
            global: {
              headers: {
                Authorization: `Bearer ${bearerToken}`,
              },
            },
          }
        );
        supabase = supabaseWithToken;
        const { data: tokenUser, error: tokenError } = await supabaseWithToken.auth.getUser();
        currentUser = tokenUser?.user || null;
        authError = tokenError;
      }
    }

    if (!currentUser?.id) {
      logger.warn('[delete-product][AUTH] NO USER - devolviendo 401', {
        error: authError?.message,
      });
      return NextResponse.json({ error: 'UNAUTHORIZED_NO_USER' }, { status: 401 });
    }

    const userId = currentUser.id;

    // Verificar ownership con anon client
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, seller_id')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'PRODUCT_NOT_FOUND' }, { status: 404 });
    }

    if ((product as any).seller_id !== userId) {
      return NextResponse.json({ error: 'UNAUTHORIZED_NOT_OWNER' }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    if (!url || !serviceKey) {
      logger.error('[delete-product][CONFIG] Faltan variables de entorno', { hasUrl: !!url, hasKey: !!serviceKey });
      return NextResponse.json(
        { error: 'SERVER_CONFIG_ERROR' },
        { status: 500 }
      );
    }

    const admin = createClient<Database>(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { apikey: serviceKey } }
    });

    // Obtener imágenes y borrar del storage
    logger.info('[delete-product][STORAGE] Obteniendo imágenes', { productId });
    const { data: images, error: imagesSelectError } = await admin
      .from('product_images')
      .select('url')
      .eq('product_id', productId);

    if (imagesSelectError) {
      logger.warn('[delete-product][STORAGE] Error obteniendo imágenes (continuando)', imagesSelectError, { productId });
    }

    if (images && images.length > 0) {
      logger.info('[delete-product][STORAGE] Imágenes encontradas', { productId, count: images.length });
      const paths = images
        .map((img: any) => img?.url)
        .filter(Boolean)
        .map((url: string) => {
          const idx = url.indexOf('/product-images/');
          return idx !== -1 ? url.slice(idx + '/product-images/'.length) : null;
        })
        .filter(Boolean) as string[];

      if (paths.length > 0) {
        logger.info('[delete-product][STORAGE] Borrando archivos del storage', { productId, pathsCount: paths.length });
        const { error: storageError } = await admin.storage.from('product-images').remove(paths);
        if (storageError) {
          logger.warn('[delete-product][STORAGE] Error borrando archivos del storage (continuando)', storageError, { productId });
          // No fallar aquí, es best-effort
        } else {
          logger.info('[delete-product][STORAGE] Archivos borrados del storage', { productId });
        }
      }
    } else {
      logger.info('[delete-product][STORAGE] No hay imágenes para borrar', { productId });
    }

    // Borrar imágenes y producto con admin (bypasa RLS)
    logger.info('[delete-product][DELETE] Iniciando borrado', { productId });
    
    const { count: imagesDeleted, error: imagesDeleteError } = await admin
      .from('product_images')
      .delete({ count: 'exact' })
      .eq('product_id', productId);

    if (imagesDeleteError) {
      logger.error('[delete-product][DELETE] Error borrando imágenes', imagesDeleteError, { productId });
      throw imagesDeleteError;
    }

    logger.info('[delete-product][DELETE] Imágenes borradas', { productId, count: imagesDeleted });

    const { count: productsDeleted, error: productsDeleteError } = await admin
      .from('products')
      .delete({ count: 'exact' })
      .eq('id', productId);

    if (productsDeleteError) {
      logger.error('[delete-product][DELETE] Error borrando producto', productsDeleteError, { productId });
      throw productsDeleteError;
    }

    logger.info('[delete-product][DELETE] Producto borrado', { productId, count: productsDeleted });

    // Verificar que realmente se borró
    if (productsDeleted === 0) {
      logger.error('[delete-product][DELETE] CRÍTICO: DELETE retornó count 0', undefined, { productId });
      return NextResponse.json(
        { error: 'DELETE_FAILED_NO_ROWS_DELETED' },
        { status: 500 }
      );
    }

    // Verificación final: confirmar que el producto ya no existe
    const { data: verifyProduct } = await admin
      .from('products')
      .select('id')
      .eq('id', productId)
      .single();

    if (verifyProduct) {
      logger.error('[delete-product][DELETE] CRÍTICO: Producto sigue existiendo después de DELETE', undefined, { productId });
      return NextResponse.json(
        { error: 'DELETE_FAILED_PRODUCT_STILL_EXISTS' },
        { status: 500 }
      );
    }

    logger.info('[delete-product][DELETE] ✅ Borrado confirmado', { productId });
    return NextResponse.json({ success: true, deleted: productsDeleted });
  } catch (error: any) {
    const errorMessage = error?.message || 'DELETE_ERROR';
    const errorCode = error?.code || 'UNKNOWN';
    const errorDetails = error?.details || null;
    const errorHint = error?.hint || null;

    logger.error('[delete-product][ERROR] Error completo', {
      message: errorMessage,
      code: errorCode,
      details: errorDetails,
      hint: errorHint,
      stack: error?.stack,
      productId,
      errorName: error?.name,
    });

    // Retornar error más específico
    return NextResponse.json(
      { 
        error: errorMessage,
        code: errorCode,
        details: errorDetails,
        hint: errorHint,
      },
      { status: 500 }
    );
  }
}


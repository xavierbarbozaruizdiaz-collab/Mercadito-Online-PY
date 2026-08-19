// ============================================
// MERCADITO ONLINE PY - UPLOAD PRODUCT IMAGES WITH THUMBNAILS
// API Route para subir imágenes de productos con generación de thumbnails
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { THUMBNAIL_SIZES, getThumbnailFileName } from '@/lib/utils/imageThumbnails';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let productId: string | null = null;
  try {
    logger.info('[upload-images] START - Request recibido');

    // Cliente server (anon) para auth, SELECT y storage
    let supabase = await createServerClient();

    // Intentar obtener user desde cookies; fallback a Authorization: Bearer
    const { data: { user }, error } = await supabase.auth.getUser();
    let currentUser = user;
    let authError = error;

    if (!currentUser) {
      const authHeader = request.headers.get('authorization');
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
      logger.warn('[upload-images][AUTH] NO USER - devolviendo 401', {
        error: authError?.message,
      });
      return NextResponse.json({ error: 'UNAUTHORIZED_NO_USER' }, { status: 401 });
    }

    const userId = currentUser.id;

    const formData = await request.formData();
    productId = formData.get('productId') as string;
    const file = formData.get('file') as File;

    if (!productId || !file) {
      return NextResponse.json(
        { error: 'productId and file are required' },
        { status: 400 }
      );
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId);
    if (!isUuid) {
      logger.warn('[upload-images][VALIDATION] productId no es UUID', { productId });
      return NextResponse.json(
        { error: 'INVALID_PRODUCT_ID' },
        { status: 400 }
      );
    }

    // Verificar que el producto pertenece al usuario (SELECT con anon key)
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, seller_id')
      .eq('id', productId)
      .single();

    const ownershipOk = !!product && (product as any).seller_id === userId;

    logger.info('[upload-images][OWNERSHIP] Verificación de dueño', {
      productId,
      productSellerId: (product as any)?.seller_id,
      currentUserId: userId,
      ownershipOk,
      productError: productError?.message,
    });

    if (!ownershipOk) {
      logger.warn('[upload-images][OWNERSHIP] Usuario no es dueño del producto', {
        productId,
        productSellerId: (product as any)?.seller_id,
        currentUserId: userId,
      });
      return NextResponse.json({ error: 'UNAUTHORIZED_NOT_OWNER' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { apikey: serviceKey } }
    });

    // [IMAGES LEVEL2] Pipeline de subida: full + thumbnail + WebP
    // Flujo actual:
    // 1. Se recibe el archivo desde el formulario de producto
    // 2. Se convierte a Buffer para procesamiento con sharp
    // 3. Se genera versión full (máx 1200px) y thumbnails en WebP
    // 4. Se sube a Supabase Storage bucket 'product-images'
    // 5. Se guarda en product_images y se actualiza products.thumbnail_url si es cover

    // Convertir File a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Generar thumbnails
    const fileExt = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const fileName = `${productId}-${timestamp}.${fileExt}`;
    const basePath = `products/${productId}`;

    const uploadedUrls: Record<string, string> = {};

    // [IMAGES LEVEL2] Subir imagen full optimizada (máx 1200px para reducir tamaño)
    const compressedFull = await sharp(imageBuffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 }) // Usar WebP para mejor compresión
      .toBuffer();

    const fullPath = `${basePath}/full_${timestamp}.webp`;
    const { error: fullError } = await supabase.storage
      .from('product-images')
      .upload(fullPath, compressedFull, {
        contentType: 'image/webp',
        cacheControl: '31536000', // 1 año
      });

    if (fullError) throw fullError;

    const { data: fullUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fullPath);
    uploadedUrls.original = fullUrlData.publicUrl;
    uploadedUrls.full = fullUrlData.publicUrl;

    // [IMAGES LEVEL2] Generar y subir thumbnails en WebP (más livianos)
    const thumbnailSizes: Array<keyof typeof THUMBNAIL_SIZES> = ['thumbnail', 'small', 'medium'];
    
    for (const size of thumbnailSizes) {
      const dimensions = THUMBNAIL_SIZES[size];
      const thumbnail = await sharp(imageBuffer)
        .resize(dimensions.width, dimensions.height, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 80 }) // WebP para thumbnails (30-50% más liviano que JPEG)
        .toBuffer();

      const thumbnailFileName = `thumb_${timestamp}_${size}.webp`;
      const thumbnailPath = `${basePath}/${thumbnailFileName}`;

      const { error: thumbError } = await supabase.storage
        .from('product-images')
        .upload(thumbnailPath, thumbnail, {
          contentType: 'image/webp',
          cacheControl: '31536000',
        });

      if (!thumbError) {
        const { data: thumbUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(thumbnailPath);
        uploadedUrls[size] = thumbUrlData.publicUrl;
      }
    }

    // [IMAGES LEVEL2] Crear registro en product_images
    // INSERT con admin (service_role)
    const thumbnailUrl = uploadedUrls.thumbnail || uploadedUrls.small || uploadedUrls.full || uploadedUrls.original;
    const fullUrl = uploadedUrls.full || uploadedUrls.original;

    logger.info('[upload-images][INSERT] ✅ Imágenes subidas a storage correctamente', {
      productId,
      url: fullUrl,
      thumbnailUrl,
      uploadedUrls,
    });

    const insertResult = await admin
      .from('product_images')
      .insert({
        product_id: productId,
        url: fullUrl,
        thumbnail_url: thumbnailUrl,
        alt_text: file.name || '',
        sort_order: 0,
        is_cover: false,
      })
      .select('*')
      .single();

    const { data: insertedImage, error: insertError } = insertResult;

    if (insertError) {
      logger.error('[upload-images][INSERT] ❌ INSERT falló', {
        error: insertError.message,
        errorCode: insertError.code,
        errorDetails: insertError.details,
        errorHint: insertError.hint,
        productId,
      });
      return NextResponse.json(
        { 
          error: insertError.message || 'Error al guardar la imagen',
          code: insertError.code,
          details: insertError.details,
        },
        { status: 500 }
      );
    }

    if (!insertedImage) {
      logger.error('[upload-images][INSERT] No se pudo insertar la imagen');
      return NextResponse.json(
        { error: 'Error al guardar la imagen: no se retornaron datos' },
        { status: 500 }
      );
    }

    logger.info('[upload-images][INSERT] ✅ Imagen insertada correctamente', {
      imageId: insertedImage.id,
      productId,
    });

    // [IMAGES LEVEL2] Si esta es la primera imagen o es cover, actualizar products.thumbnail_url
    // Verificar si es la primera imagen del producto (será cover por defecto)
    // SELECT usa cliente normal (anon)
    const { data: existingImages } = await supabase
      .from('product_images')
      .select('id')
      .eq('product_id', productId)
      .neq('id', insertedImage.id);

    if (!existingImages || existingImages.length === 0) {
      // Primera imagen: actualizar cover_url y thumbnail_url
      // UPDATE con adminClient (service_role)
      logger.info('[upload-images][UPDATE] Intentando actualizar products (primera imagen)', {
        productId,
      });

      const { error: updateProductError } = await admin
        .from('products')
        .update({
          cover_url: uploadedUrls.full || uploadedUrls.original,
          thumbnail_url: thumbnailUrl,
        })
        .eq('id', productId);

      if (updateProductError) {
        logger.warn('[upload-images][UPDATE] Error updating products (no crítico, continuando)', {
          code: updateProductError.code,
          message: updateProductError.message,
        });
        // No fallar aquí, solo loguear (la imagen ya se insertó)
      } else {
        logger.info('[upload-images][UPDATE] Products actualizado correctamente');
      }

      // Marcar como cover
      // UPDATE con adminClient (service_role)
      logger.info('[upload-images][UPDATE] Intentando marcar imagen como cover', {
        imageId: insertedImage.id,
      });

      const { error: updateCoverError } = await admin
        .from('product_images')
        .update({ is_cover: true })
        .eq('id', insertedImage.id);

      if (updateCoverError) {
        logger.warn('[upload-images][UPDATE] Error marking image as cover (no crítico, continuando)', {
          code: updateCoverError.code,
          message: updateCoverError.message,
        });
        // No fallar aquí, solo loguear (la imagen ya se insertó)
      } else {
        logger.info('[upload-images][UPDATE] Imagen marcada como cover correctamente');
      }
    }

    return NextResponse.json({
      success: true,
      image: insertedImage,
      urls: uploadedUrls,
    });
  } catch (error: any) {
    logger.error('[upload-images][ERROR] Error inesperado en el endpoint', {
      error: error.message,
      errorStack: error.stack,
      productId,
      errorName: error.name,
    });
    return NextResponse.json(
      { 
        error: error.message || 'Error uploading image',
        type: 'UNEXPECTED_ERROR',
        details: error.stack,
      },
      { status: 500 }
    );
  }
}

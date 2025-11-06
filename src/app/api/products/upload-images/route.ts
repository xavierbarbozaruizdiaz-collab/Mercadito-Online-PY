// ============================================
// MERCADITO ONLINE PY - UPLOAD PRODUCT IMAGES WITH THUMBNAILS
// API Route para subir imágenes de productos con generación de thumbnails
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import sharp from 'sharp';
import { THUMBNAIL_SIZES, getThumbnailFileName } from '@/lib/utils/imageThumbnails';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let productId: string | null = null;
  try {
    const formData = await request.formData();
    productId = formData.get('productId') as string;
    const file = formData.get('file') as File;

    if (!productId || !file) {
      return NextResponse.json(
        { error: 'productId and file are required' },
        { status: 400 }
      );
    }

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verificar que el producto pertenece al usuario
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, seller_id')
      .eq('id', productId)
      .single();

    if (productError || !product || (product as any).seller_id !== user.id) {
      return NextResponse.json({ error: 'Product not found or unauthorized' }, { status: 403 });
    }

    // Convertir File a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Generar thumbnails
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${productId}-${Date.now()}.${fileExt}`;
    const basePath = `products/${productId}`;

    const uploadedUrls: Record<string, string> = {};

    // Subir imagen original (comprimida)
    const compressedOriginal = await sharp(imageBuffer)
      .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();

    const originalPath = `${basePath}/${fileName}`;
    const { error: originalError } = await supabase.storage
      .from('product-images')
      .upload(originalPath, compressedOriginal, {
        contentType: 'image/jpeg',
        cacheControl: '31536000', // 1 año
      });

    if (originalError) throw originalError;

    const { data: originalUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(originalPath);
    uploadedUrls.original = originalUrlData.publicUrl;

    // Generar y subir thumbnails
    const thumbnailSizes: Array<keyof typeof THUMBNAIL_SIZES> = ['thumbnail', 'small', 'medium'];
    
    for (const size of thumbnailSizes) {
      const dimensions = THUMBNAIL_SIZES[size];
      const thumbnail = await sharp(imageBuffer)
        .resize(dimensions.width, dimensions.height, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();

      const thumbnailFileName = getThumbnailFileName(fileName, size);
      const thumbnailPath = `${basePath}/${thumbnailFileName}`;

      const { error: thumbError } = await supabase.storage
        .from('product-images')
        .upload(thumbnailPath, thumbnail, {
          contentType: 'image/jpeg',
          cacheControl: '31536000',
        });

      if (!thumbError) {
        const { data: thumbUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(thumbnailPath);
        uploadedUrls[size] = thumbUrlData.publicUrl;
      }
    }

    // Crear registro en la base de datos
    const { data: imageData, error: imageError } = await (supabase as any)
      .from('product_images')
      .insert({
        product_id: productId,
        url: uploadedUrls.original,
        thumbnail_url: uploadedUrls.thumbnail || uploadedUrls.original,
        alt_text: file.name,
        sort_order: 0,
        is_cover: false,
      })
      .select()
      .single();

    if (imageError) throw imageError;

    return NextResponse.json({
      success: true,
      image: imageData,
      urls: uploadedUrls,
    });
  } catch (error: any) {
    logger.error('Error uploading product image', error, { productId });
    return NextResponse.json(
      { error: error.message || 'Error uploading image' },
      { status: 500 }
    );
  }
}



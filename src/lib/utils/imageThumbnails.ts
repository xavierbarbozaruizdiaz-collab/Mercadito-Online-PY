// ============================================
// MERCADITO ONLINE PY - IMAGE THUMBNAILS UTILITY
// Generación de thumbnails para optimizar carga
// ============================================

import sharp from 'sharp';

/**
 * Tamaños de thumbnails predefinidos
 */
export const THUMBNAIL_SIZES = {
  thumbnail: { width: 150, height: 150 }, // Para listas
  small: { width: 300, height: 300 },     // Para grids
  medium: { width: 600, height: 600 },    // Para detalles
  large: { width: 1200, height: 1200 },   // Para zoom
} as const;

export type ThumbnailSize = keyof typeof THUMBNAIL_SIZES;

/**
 * Genera un thumbnail de una imagen
 * @param imageBuffer - Buffer de la imagen original
 * @param size - Tamaño del thumbnail
 * @param quality - Calidad (1-100), default 80
 * @returns Buffer del thumbnail generado
 */
export async function generateThumbnail(
  imageBuffer: Buffer,
  size: ThumbnailSize = 'medium',
  quality: number = 80
): Promise<Buffer> {
  const dimensions = THUMBNAIL_SIZES[size];
  
  return await sharp(imageBuffer)
    .resize(dimensions.width, dimensions.height, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();
}

/**
 * Genera múltiples thumbnails de una imagen
 * @param imageBuffer - Buffer de la imagen original
 * @param sizes - Array de tamaños a generar
 * @param quality - Calidad por defecto (puede ser objeto para cada tamaño)
 * @returns Objeto con los thumbnails generados
 */
export async function generateThumbnails(
  imageBuffer: Buffer,
  sizes: ThumbnailSize[] = ['thumbnail', 'small', 'medium'],
  quality: number | Record<ThumbnailSize, number> = 80
): Promise<Record<ThumbnailSize, Buffer>> {
  const results: Partial<Record<ThumbnailSize, Buffer>> = {};

  await Promise.all(
    sizes.map(async (size) => {
      const sizeQuality = typeof quality === 'object' ? quality[size] : quality;
      results[size] = await generateThumbnail(imageBuffer, size, sizeQuality);
    })
  );

  return results as Record<ThumbnailSize, Buffer>;
}

/**
 * Genera un thumbnail optimizado para web (WebP)
 */
export async function generateWebPThumbnail(
  imageBuffer: Buffer,
  size: ThumbnailSize = 'medium',
  quality: number = 80
): Promise<Buffer> {
  const dimensions = THUMBNAIL_SIZES[size];
  
  return await sharp(imageBuffer)
    .resize(dimensions.width, dimensions.height, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality })
    .toBuffer();
}

/**
 * Obtiene el nombre del archivo thumbnail basado en el original
 */
export function getThumbnailFileName(
  originalFileName: string,
  size: ThumbnailSize
): string {
  const ext = originalFileName.split('.').pop();
  const baseName = originalFileName.replace(`.${ext}`, '');
  return `${baseName}_${size}.${ext}`;
}



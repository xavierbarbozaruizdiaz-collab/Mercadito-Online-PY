// ============================================ 
// MERCADITO ONLINE PY - IMAGE UPLOAD UTILITY
// Utilidad compartida para subir imágenes a Supabase Storage
// ============================================

import { supabase } from '@/lib/supabase/client';
import imageCompression from 'browser-image-compression';

/**
 * Comprime una imagen usando browser-image-compression
 */
export async function compressImage(file: File, options?: {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
}): Promise<File> {
  const opts = {
    maxSizeMB: options?.maxSizeMB || 0.5,
    maxWidthOrHeight: options?.maxWidthOrHeight || 1000,
    useWebWorker: true,
  };
  
  try {
    return await imageCompression(file, opts);
  } catch (error) {
    console.warn('Error comprimiendo imagen, usando original:', error);
    return file;
  }
}

/**
 * Sube una imagen a Supabase Storage
 * @param file - El archivo de imagen a subir
 * @param bucket - El bucket de Supabase Storage (ej: 'profiles', 'stores', 'banners', 'product-images')
 * @param path - La ruta dentro del bucket (ej: 'avatars', 'covers', 'banners')
 * @param options - Opciones adicionales para compresión
 * @returns La URL pública de la imagen subida
 */
export async function uploadImage(
  file: File,
  bucket: string,
  path?: string,
  options?: {
    compress?: boolean;
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
  }
): Promise<string> {
  try {
    // Comprimir si está habilitado (por defecto sí)
    const shouldCompress = options?.compress !== false;
    const fileToUpload = shouldCompress
      ? await compressImage(file, {
          maxSizeMB: options?.maxSizeMB,
          maxWidthOrHeight: options?.maxWidthOrHeight,
        })
      : file;

    // Generar nombre de archivo único
    const ext = fileToUpload.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const fileName = path 
      ? `${path}/${timestamp}-${random}.${ext}`
      : `${timestamp}-${random}.${ext}`;

    // Subir a Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileToUpload, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error subiendo imagen:', uploadError);
      throw new Error(`Error subiendo imagen: ${uploadError.message}`);
    }

    // Obtener URL pública
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    
    if (!data?.publicUrl) {
      throw new Error('No se pudo obtener la URL pública de la imagen');
    }

    return data.publicUrl;
  } catch (error: any) {
    console.error('Error en uploadImage:', error);
    throw error;
  }
}

/**
 * Elimina una imagen de Supabase Storage
 * @param bucket - El bucket de Supabase Storage
 * @param fileName - El nombre del archivo a eliminar (con o sin ruta)
 */
export async function deleteImage(bucket: string, fileName: string): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([fileName]);

    if (error) {
      console.error('Error eliminando imagen:', error);
      throw new Error(`Error eliminando imagen: ${error.message}`);
    }
  } catch (error: any) {
    console.error('Error en deleteImage:', error);
    throw error;
  }
}

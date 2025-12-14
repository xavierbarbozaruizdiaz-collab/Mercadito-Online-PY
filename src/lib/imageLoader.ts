// ============================================
// MERCADITO ONLINE PY - CUSTOM IMAGE LOADER FOR NEXT.JS
// Loader personalizado para manejar imágenes de Supabase y otros orígenes
// ============================================

import { ImageLoader } from 'next/image';

/**
 * Loader personalizado para Next.js Image component
 * Maneja correctamente las URLs de Supabase Storage para evitar errores 403
 * 
 * IMPORTANTE: Para URLs de Supabase, devolvemos la URL directamente sin modificaciones.
 * Esto evita que Next.js intente acceder a la URL desde el servidor y obtenga un 403.
 * Las URLs públicas de Supabase son accesibles directamente desde el cliente.
 */
const customLoader: ImageLoader = ({ src, width, quality }) => {
  // Si es una URL de Supabase Storage, devolverla directamente sin modificaciones
  // IMPORTANTE: Cuando un loader personalizado devuelve una URL absoluta (https://...),
  // Next.js la usa directamente sin pasar por el optimizador. Esto es lo que queremos.
  if (src.includes('supabase.co/storage')) {
    // Verificar que la URL es válida
    try {
      const url = new URL(src);
      // IMPORTANTE: Devolver la URL absoluta tal cual
      // Next.js usará esta URL directamente sin optimización
      return url.toString();
    } catch (error) {
      // Si falla el parsing, devolver la URL original de todas formas
      console.warn('Error parsing Supabase image URL:', error, 'URL:', src);
      return src;
    }
  }
  
  // Para URLs relativas o locales, usar el optimizador de Next.js
  // Si la URL ya es absoluta pero no es de Supabase, también usar el optimizador
  if (src.startsWith('http://') || src.startsWith('https://')) {
    // URL externa no-Supabase: usar optimizador de Next.js
    return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality || 75}`;
  }
  
  // URL relativa: usar optimizador de Next.js
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality || 75}`;
};

export default customLoader;


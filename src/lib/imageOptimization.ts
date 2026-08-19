// ============================================
// MERCADITO ONLINE PY - IMAGE OPTIMIZATION
// Configuración de optimización de imágenes
// ============================================

import { ImageLoader } from 'next/image';

// Loader personalizado para Supabase Storage
export const supabaseImageLoader: ImageLoader = ({ src, width, quality }) => {
  // Si es una URL de Supabase Storage, optimizar
  if (src.includes('supabase.co/storage')) {
    const url = new URL(src);
    url.searchParams.set('width', width.toString());
    url.searchParams.set('quality', (quality || 75).toString());
    return url.toString();
  }
  
  // Para otras URLs, usar el servicio de optimización de Next.js
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality || 75}`;
};

// Configuración de dominios permitidos para imágenes
function supabaseHostFromEnv(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
}

export const imageDomains = [
  supabaseHostFromEnv(),
  'placehold.co',
  'images.unsplash.com',
  'via.placeholder.com',
].filter(Boolean) as string[];

// Configuración de tamaños de imagen
export const imageSizes = {
  thumbnail: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  product: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw',
  hero: '100vw',
  avatar: '(max-width: 768px) 50px, 80px',
};

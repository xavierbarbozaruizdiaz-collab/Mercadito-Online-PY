// ============================================
// MERCADITO ONLINE PY - OPTIMIZED IMAGE COMPONENT
// Componente React para imágenes optimizadas
// ============================================

'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ImageOptimizer } from '@/lib/cdn/imageOptimizer';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
  quality?: number;
  device?: 'mobile' | 'tablet' | 'desktop';
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  sizes,
  quality,
  device = 'desktop'
}: OptimizedImageProps) {
  const [imageError, setImageError] = useState(false);
  const imageOptimizer = ImageOptimizer.getInstance();

  // Si es una URL de Supabase, usar directamente sin optimización adicional
  // El loader personalizado de Next.js manejará el acceso correctamente
  let optimizedSrc = src;
  
  // Para URLs de Supabase, no usar el ImageOptimizer ya que puede causar problemas
  if (src.includes('supabase.co/storage')) {
    optimizedSrc = src;
  } else {
    // Para otras URLs, intentar optimizar
    try {
      optimizedSrc = imageOptimizer.generateOptimizedUrl(src, {
        width,
        height,
        quality,
        device
      });
      
      // Si la URL generada contiene Cloudinary pero no está configurado, usar original
      if (optimizedSrc.includes('res.cloudinary.com/your-cloud') || (optimizedSrc.includes('res.cloudinary.com') && !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME)) {
        optimizedSrc = src; // Usar URL original
      }
    } catch (err) {
      // Si falla la optimización, usar URL original
      optimizedSrc = src;
    }
  }

  // Generar srcset si no se proporciona sizes y no hay error
  const srcSet = sizes ? undefined : (imageError ? undefined : imageOptimizer.generateSrcSet(src));
  const sizesAttr = sizes || imageOptimizer.generateSizes();

  if (imageError) {
    return (
      <div 
        className={`bg-gray-200 flex items-center justify-center ${className || ''}`}
        style={{ width, height }}
      >
        <span className="text-gray-500 text-sm">Imagen no disponible</span>
      </div>
    );
  }

  // Para URLs de Supabase, deshabilitar optimización para evitar 404
  // El loader personalizado devuelve la URL directamente, pero Next.js puede intentar optimizar de todas formas
  const isSupabaseUrl = optimizedSrc.includes('supabase.co/storage');
  
  return (
    <Image
      src={optimizedSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      sizes={sizesAttr}
      unoptimized={isSupabaseUrl}
      onError={() => {
        console.error('Error cargando imagen:', optimizedSrc);
        setImageError(true);
      }}
    />
  );
}

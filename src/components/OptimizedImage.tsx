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

  // Generar URL optimizada
  const optimizedSrc = imageOptimizer.generateOptimizedUrl(src, {
    width,
    height,
    quality,
    device
  });

  // Generar srcset si no se proporciona sizes
  const srcSet = sizes ? undefined : imageOptimizer.generateSrcSet(src);
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

  return (
    <Image
      src={optimizedSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      sizes={sizesAttr}
      onError={() => setImageError(true)}
      // Usar srcSet si está disponible
      {...(srcSet && { srcSet })}
    />
  );
}

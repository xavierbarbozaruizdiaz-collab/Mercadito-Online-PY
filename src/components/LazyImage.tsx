// src/components/LazyImage.tsx
// Componente de imagen con lazy loading

'use client';

import { useState, useEffect } from 'react';
import { useLazyLoad } from '@/lib/hooks/useLazyLoad';
import Image from 'next/image';

interface LazyImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholder?: string;
  priority?: boolean;
  quality?: number;
}

export default function LazyImage({
  src,
  alt,
  width,
  height,
  className = '',
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzljYTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxvYWRpbmcuLi48L3RleHQ+PC9zdmc+',
  priority = false,
  quality = 75,
}: LazyImageProps) {
  const [ref, isVisible] = useLazyLoad<HTMLDivElement>({
    enabled: !priority,
    threshold: 0.1,
    rootMargin: '50px',
  });
  const [imageError, setImageError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const shouldLoad = priority || isVisible;

  useEffect(() => {
    setImageError(false);
    setIsLoaded(false);
  }, [src]);

  if (!width || !height) {
    // Usar img tag para imágenes sin dimensiones definidas
    return (
      <div ref={ref} className={className}>
        {shouldLoad && !imageError ? (
          <img
            src={src}
            alt={alt}
            className={className}
            onLoad={() => setIsLoaded(true)}
            onError={() => setImageError(true)}
            loading={priority ? 'eager' : 'lazy'}
            style={{
              opacity: isLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease-in-out',
            }}
          />
        ) : imageError ? (
          <div className="bg-gray-200 flex items-center justify-center h-full">
            <span className="text-gray-500 text-sm">Imagen no disponible</span>
          </div>
        ) : (
          <img src={placeholder} alt="" className={className} aria-hidden="true" />
        )}
      </div>
    );
  }

  // Usar Next.js Image cuando hay dimensiones
  return (
    <div ref={ref} className={className}>
      {shouldLoad && !imageError ? (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={className}
          quality={quality}
          priority={priority}
          onError={() => setImageError(true)}
          style={{
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
          }}
          onLoad={() => setIsLoaded(true)}
        />
      ) : imageError ? (
        <div
          className="bg-gray-200 flex items-center justify-center"
          style={{ width, height }}
        >
          <span className="text-gray-500 text-sm">Imagen no disponible</span>
        </div>
      ) : (
        <img
          src={placeholder}
          alt=""
          className={className}
          style={{ width, height }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}


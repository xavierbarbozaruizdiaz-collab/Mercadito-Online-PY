// src/lib/hooks/usePrefetch.ts
// Hook para prefetch inteligente de recursos

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { prefetchResource, preloadResource, isFastConnection } from '@/lib/utils/performance';

interface UsePrefetchOptions {
  urls?: string[];
  routes?: string[];
  preload?: boolean;
  enabled?: boolean;
}

/**
 * Hook para prefetch de recursos y rutas
 */
export function usePrefetch(options: UsePrefetchOptions = {}) {
  const { urls = [], routes = [], preload = false, enabled = true } = options;
  const router = useRouter();

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const isFast = isFastConnection();

    // Solo hacer prefetch si la conexión es rápida
    if (!isFast && !preload) {
      return;
    }

    // Prefetch rutas de Next.js
    routes.forEach((route) => {
      router.prefetch(route);
    });

    // Prefetch/preload URLs externas
    urls.forEach((url) => {
      if (preload) {
        // Determinar el tipo de recurso
        let as: 'script' | 'style' | 'image' | 'font' | 'fetch' = 'fetch';
        
        if (url.endsWith('.js')) as = 'script';
        else if (url.endsWith('.css')) as = 'style';
        else if (url.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i)) as = 'image';
        else if (url.match(/\.(woff|woff2|ttf|otf)$/i)) as = 'font';

        preloadResource(url, as).catch((error) => {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`Failed to preload ${url}:`, error);
          }
        });
      } else {
        prefetchResource(url).catch((error) => {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`Failed to prefetch ${url}:`, error);
          }
        });
      }
    });
  }, [urls, routes, preload, enabled, router]);
}

/**
 * Hook para prefetch de rutas de Next.js basado en hover
 */
export function useRoutePrefetch() {
  const router = useRouter();

  const prefetchRoute = (href: string) => {
    if (typeof window === 'undefined') return;
    
    // Prefetch en hover con un pequeño delay para evitar prefetch no deseado
    const timeoutId = setTimeout(() => {
      router.prefetch(href);
    }, 150);

    return () => clearTimeout(timeoutId);
  };

  return { prefetchRoute };
}


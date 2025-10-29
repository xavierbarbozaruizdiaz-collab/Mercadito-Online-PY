// src/lib/hooks/useLazyLoad.ts
// Hook para lazy loading de imágenes y contenido

'use client';

import { useEffect, useRef, useState, RefObject } from 'react';

interface UseLazyLoadOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}

export function useLazyLoad<T extends HTMLElement = HTMLDivElement>(
  options: UseLazyLoadOptions = {}
): [RefObject<T>, boolean] {
  const { threshold = 0.1, rootMargin = '50px', enabled = true } = options;
  const elementRef = useRef<T>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    if (!enabled || !elementRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(elementRef.current);

    return () => {
      observer.disconnect();
    };
  }, [enabled, threshold, rootMargin]);

  return [elementRef, isIntersecting];
}


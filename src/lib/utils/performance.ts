// src/lib/utils/performance.ts
// Utilidades para optimización de performance

/**
 * Prefetch de recursos críticos
 */
export async function prefetchResource(url: string, as?: 'script' | 'style' | 'image' | 'font'): Promise<void> {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  if (as) {
    link.as = as;
  }
  document.head.appendChild(link);
}

/**
 * Preload de recursos críticos
 */
export async function preloadResource(
  url: string,
  as: 'script' | 'style' | 'image' | 'font' | 'fetch',
  options?: {
    crossorigin?: 'anonymous' | 'use-credentials';
    type?: string;
  }
): Promise<void> {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = url;
  link.as = as;
  
  if (options?.crossorigin) {
    link.crossOrigin = options.crossorigin;
  }
  
  if (options?.type) {
    link.type = options.type;
  }

  document.head.appendChild(link);
}

/**
 * Medir performance de una función
 */
export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  if (typeof window === 'undefined') {
    return await fn();
  }

  const start = performance.now();
  try {
    const result = await fn();
    const end = performance.now();
    const duration = end - start;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    }

    // Registrar en analytics si está disponible
    if (typeof window !== 'undefined' && 'analytics' in window) {
      // analytics.trackPerformance({ name, duration });
    }

    return result;
  } catch (error) {
    const end = performance.now();
    const duration = end - start;
    console.error(`[Performance] ${name} failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
}

/**
 * Debounce para mejorar performance en eventos frecuentes
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle para limitar frecuencia de ejecución
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Lazy load de módulos dinámicos
 */
export async function dynamicImport<T = any>(
  modulePath: string,
  options?: { loading?: () => Promise<void> }
): Promise<T> {
  if (options?.loading) {
    await options.loading();
  }

  const module = await import(modulePath);
  return module.default || module;
}

/**
 * Optimizar imágenes antes de cargar
 */
export function optimizeImageUrl(
  url: string,
  width?: number,
  quality: number = 75,
  format?: 'webp' | 'jpeg' | 'png'
): string {
  // Si es una URL de Supabase Storage, agregar parámetros de transformación
  if (url.includes('supabase.co/storage')) {
    const urlObj = new URL(url);
    if (width) urlObj.searchParams.set('width', width.toString());
    urlObj.searchParams.set('quality', quality.toString());
    if (format) urlObj.searchParams.set('format', format);
    return urlObj.toString();
  }

  // Para otros servicios, retornar URL original o usar un servicio de optimización
  return url;
}

/**
 * Verificar si el usuario tiene conexión rápida
 */
export function isFastConnection(): boolean {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return true; // Asumir conexión rápida por defecto
  }

  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  if (!connection) return true;

  // Verificar effectiveType (4g, 3g, 2g, slow-2g)
  const effectiveType = connection.effectiveType;
  if (effectiveType) {
    return effectiveType === '4g' || effectiveType === '3g';
  }

  // Verificar downlink speed
  const downlink = connection.downlink;
  if (downlink) {
    return downlink >= 1.5; // Mbps
  }

  return true;
}

/**
 * Obtener estrategia de carga basada en conexión
 */
export function getLoadingStrategy(): 'aggressive' | 'conservative' | 'balanced' {
  if (isFastConnection()) {
    return 'aggressive'; // Preload más recursos
  }

  const connection = (navigator as any).connection;
  if (connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g') {
    return 'conservative'; // Cargar solo lo esencial
  }

  return 'balanced'; // Estrategia intermedia
}


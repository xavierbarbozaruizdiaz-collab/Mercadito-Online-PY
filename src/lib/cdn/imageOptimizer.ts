// ============================================
// MERCADITO ONLINE PY - CDN & IMAGE OPTIMIZATION
// Configuración avanzada de CDN y optimización de imágenes
// ============================================

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// CONFIGURACIÓN DE CDN
// ============================================

export const CDN_CONFIG = {
  // URLs de CDN para diferentes tipos de recursos
  IMAGES: process.env.NEXT_PUBLIC_CDN_IMAGES_URL || 'https://hqdatzhliaordlsqtjea.supabase.co/storage/v1/object/public/product-images',
  STATIC_ASSETS: process.env.NEXT_PUBLIC_CDN_STATIC_URL || '/static',
  API_BASE: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://hqdatzhliaordlsqtjea.supabase.co',
  
  // Configuración de caché
  CACHE_TTL: {
    IMAGES: 31536000, // 1 año
    STATIC: 31536000, // 1 año
    API: 300, // 5 minutos
  },
  
  // Formatos soportados
  SUPPORTED_FORMATS: ['webp', 'avif', 'jpeg', 'png'],
  
  // Calidades por dispositivo
  QUALITY: {
    mobile: 75,
    tablet: 85,
    desktop: 95,
  },
  
  // Tamaños de imagen
  SIZES: {
    thumbnail: { width: 150, height: 150 },
    small: { width: 300, height: 300 },
    medium: { width: 600, height: 600 },
    large: { width: 1200, height: 1200 },
    xlarge: { width: 1920, height: 1920 },
  },
};

// ============================================
// CLASE DE OPTIMIZACIÓN DE IMÁGENES
// ============================================

export class ImageOptimizer {
  private static instance: ImageOptimizer;
  
  static getInstance(): ImageOptimizer {
    if (!ImageOptimizer.instance) {
      ImageOptimizer.instance = new ImageOptimizer();
    }
    return ImageOptimizer.instance;
  }

  // ============================================
  // GENERACIÓN DE URLS OPTIMIZADAS
  // ============================================

  /**
   * Genera URL optimizada para imagen con parámetros de CDN
   */
  generateOptimizedUrl(
    imageUrl: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'webp' | 'avif' | 'jpeg' | 'png';
      fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
      device?: 'mobile' | 'tablet' | 'desktop';
    } = {}
  ): string {
    const {
      width,
      height,
      quality,
      format = 'webp',
      fit = 'cover',
      device = 'desktop'
    } = options;

    // Si es una URL de Supabase Storage, usar transformaciones nativas
    if (imageUrl.includes('supabase.co/storage')) {
      return this.generateSupabaseUrl(imageUrl, {
        width,
        height,
        quality: quality || CDN_CONFIG.QUALITY[device],
        format,
        fit
      });
    }

    // Para otras URLs, usar servicio de optimización externo
    return this.generateExternalUrl(imageUrl, {
      width,
      height,
      quality: quality || CDN_CONFIG.QUALITY[device],
      format,
      fit
    });
  }

  /**
   * Genera URL con transformaciones de Supabase Storage
   */
  private generateSupabaseUrl(
    imageUrl: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: string;
      fit?: string;
    }
  ): string {
    const params = new URLSearchParams();
    
    if (options.width) params.set('width', options.width.toString());
    if (options.height) params.set('height', options.height.toString());
    if (options.quality) params.set('quality', options.quality.toString());
    if (options.format) params.set('format', options.format);
    if (options.fit) params.set('resize', options.fit);
    
    const queryString = params.toString();
    return queryString ? `${imageUrl}?${queryString}` : imageUrl;
  }

  /**
   * Genera URL con servicio externo de optimización
   */
  private generateExternalUrl(
    imageUrl: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: string;
      fit?: string;
    }
  ): string {
    // Usar un servicio como Cloudinary, ImageKit, o similar
    const baseUrl = process.env.NEXT_PUBLIC_IMAGE_OPTIMIZATION_URL || 'https://res.cloudinary.com/your-cloud/image/fetch';
    
    const params = new URLSearchParams();
    params.set('url', imageUrl);
    
    if (options.width) params.set('w', options.width.toString());
    if (options.height) params.set('h', options.height.toString());
    if (options.quality) params.set('q', options.quality.toString());
    if (options.format) params.set('f', options.format);
    if (options.fit) params.set('c', options.fit);
    
    return `${baseUrl}?${params.toString()}`;
  }

  // ============================================
  // GENERACIÓN DE SRC SETS
  // ============================================

  /**
   * Genera srcset para responsive images
   */
  generateSrcSet(
    imageUrl: string,
    sizes: Array<{ width: number; device?: string }> = [
      { width: 300, device: 'mobile' },
      { width: 600, device: 'tablet' },
      { width: 1200, device: 'desktop' }
    ]
  ): string {
    return sizes
      .map(({ width, device = 'desktop' }) => {
        const optimizedUrl = this.generateOptimizedUrl(imageUrl, {
          width,
          device: device as 'mobile' | 'tablet' | 'desktop'
        });
        return `${optimizedUrl} ${width}w`;
      })
      .join(', ');
  }

  /**
   * Genera sizes attribute para responsive images
   */
  generateSizes(): string {
    return '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw';
  }

  // ============================================
  // DETECCIÓN DE DISPOSITIVO
  // ============================================

  /**
   * Detecta el tipo de dispositivo basado en User-Agent
   */
  detectDevice(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const tabletRegex = /iPad|Android(?=.*Tablet)|Kindle|Silk/i;
    
    if (tabletRegex.test(userAgent)) return 'tablet';
    if (mobileRegex.test(userAgent)) return 'mobile';
    return 'desktop';
  }

  // ============================================
  // OPTIMIZACIÓN DE CACHÉ
  // ============================================

  /**
   * Genera headers de caché para imágenes
   */
  getImageCacheHeaders(device: 'mobile' | 'tablet' | 'desktop' = 'desktop') {
    return {
      'Cache-Control': `public, max-age=${CDN_CONFIG.CACHE_TTL.IMAGES}, immutable`,
      'CDN-Cache-Control': `max-age=${CDN_CONFIG.CACHE_TTL.IMAGES}`,
      'Vary': 'Accept, User-Agent',
      'Content-Type': 'image/webp',
    };
  }

  /**
   * Genera headers de caché para assets estáticos
   */
  getStaticCacheHeaders() {
    return {
      'Cache-Control': `public, max-age=${CDN_CONFIG.CACHE_TTL.STATIC}, immutable`,
      'CDN-Cache-Control': `max-age=${CDN_CONFIG.CACHE_TTL.STATIC}`,
    };
  }
}

// ============================================
// MIDDLEWARE DE CDN
// ============================================

export function cdnMiddleware(req: NextRequest) {
  const response = NextResponse.next();
  const url = req.nextUrl;
  const userAgent = req.headers.get('user-agent') || '';

  // Detectar dispositivo
  const imageOptimizer = ImageOptimizer.getInstance();
  const device = imageOptimizer.detectDevice(userAgent);

  // Headers para imágenes
  if (url.pathname.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i)) {
    const headers = imageOptimizer.getImageCacheHeaders(device);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  // Headers para assets estáticos
  if (url.pathname.startsWith('/static/') || url.pathname.match(/\.(css|js|woff|woff2)$/i)) {
    const headers = imageOptimizer.getStaticCacheHeaders();
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  // Headers de seguridad
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

// ============================================
// COMPONENTE DE IMAGEN OPTIMIZADA MOVIDO A COMPONENTS
// ============================================

// ============================================
// HOOKS DE REACT
// ============================================

import { useEffect, useState } from 'react';

export function useImageOptimization() {
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const detectDevice = () => {
      const userAgent = navigator.userAgent;
      const imageOptimizer = ImageOptimizer.getInstance();
      setDevice(imageOptimizer.detectDevice(userAgent));
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  const optimizeImageUrl = (
    imageUrl: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'webp' | 'avif' | 'jpeg' | 'png';
      fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    } = {}
  ) => {
    const imageOptimizer = ImageOptimizer.getInstance();
    return imageOptimizer.generateOptimizedUrl(imageUrl, {
      ...options,
      device
    });
  };

  const generateSrcSet = (imageUrl: string) => {
    const imageOptimizer = ImageOptimizer.getInstance();
    return imageOptimizer.generateSrcSet(imageUrl);
  };

  return {
    device,
    optimizeImageUrl,
    generateSrcSet,
  };
}

// ============================================
// UTILIDADES DE CDN
// ============================================

export const cdnUtils = {
  // Generar URL de CDN para imagen
  getImageUrl: (path: string, options?: any) => {
    const imageOptimizer = ImageOptimizer.getInstance();
    return imageOptimizer.generateOptimizedUrl(`${CDN_CONFIG.IMAGES}/${path}`, options);
  },

  // Generar URL de CDN para asset estático
  getStaticUrl: (path: string) => `${CDN_CONFIG.STATIC_ASSETS}/${path}`,

  // Verificar si una URL es de CDN
  isCdnUrl: (url: string) => url.includes(CDN_CONFIG.IMAGES) || url.includes(CDN_CONFIG.STATIC_ASSETS),

  // Preload recursos críticos
  preloadResource: (url: string, type: 'image' | 'script' | 'style' | 'font') => {
    if (typeof window !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;
      link.as = type;
      document.head.appendChild(link);
    }
  },

  // Prefetch recursos
  prefetchResource: (url: string) => {
    if (typeof window !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
    }
  },
};

export default ImageOptimizer;

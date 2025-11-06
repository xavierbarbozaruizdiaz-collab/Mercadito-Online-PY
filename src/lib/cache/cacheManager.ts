// ============================================
// MERCADITO ONLINE PY - ADVANCED CACHE SYSTEM
// Sistema de caché inteligente para optimizar rendimiento
// ============================================

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// CONFIGURACIÓN DE CACHÉ
// ============================================

const CACHE_CONFIG = {
  // Tiempos de caché en segundos
  STATIC_ASSETS: 31536000, // 1 año
  API_RESPONSES: 300, // 5 minutos
  PRODUCTS: 600, // 10 minutos
  CATEGORIES: 3600, // 1 hora
  USER_DATA: 60, // 1 minuto
  SEARCH_RESULTS: 300, // 5 minutos
};

// ============================================
// FUNCIONES DE CACHÉ
// ============================================

export class CacheManager {
  private static instance: CacheManager;
  private cache = new Map<string, { data: any; expires: number }>();

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  // ============================================
  // OPERACIONES BÁSICAS
  // ============================================

  set(key: string, data: any, ttl: number = CACHE_CONFIG.API_RESPONSES): void {
    const expires = Date.now() + (ttl * 1000);
    this.cache.set(key, { data, expires });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // ============================================
  // OPERACIONES ESPECÍFICAS
  // ============================================

  // Caché para productos
  setProduct(productId: string, product: any): void {
    this.set(`product:${productId}`, product, CACHE_CONFIG.PRODUCTS);
  }

  getProduct(productId: string): any | null {
    return this.get(`product:${productId}`);
  }

  // Caché para categorías
  setCategories(categories: any[]): void {
    this.set('categories:all', categories, CACHE_CONFIG.CATEGORIES);
  }

  getCategories(): any[] | null {
    return this.get('categories:all');
  }

  // Caché para resultados de búsqueda
  setSearchResults(query: string, filters: any, results: any): void {
    const key = `search:${query}:${JSON.stringify(filters)}`;
    this.set(key, results, CACHE_CONFIG.SEARCH_RESULTS);
  }

  getSearchResults(query: string, filters: any): any | null {
    const key = `search:${query}:${JSON.stringify(filters)}`;
    return this.get(key);
  }

  // Caché para datos de usuario
  setUserData(userId: string, data: any): void {
    this.set(`user:${userId}`, data, CACHE_CONFIG.USER_DATA);
  }

  getUserData(userId: string): any | null {
    return this.get(`user:${userId}`);
  }

  // ============================================
  // INVALIDACIÓN DE CACHÉ
  // ============================================

  invalidateProduct(productId: string): void {
    this.delete(`product:${productId}`);
    // Invalidar también listas que contengan este producto
    this.invalidatePattern('products:*');
  }

  invalidateCategories(): void {
    this.delete('categories:all');
  }

  invalidateUserData(userId: string): void {
    this.delete(`user:${userId}`);
  }

  invalidateSearchResults(): void {
    this.invalidatePattern('search:*');
  }

  // Invalidar por patrón
  public invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  // ============================================
  // ESTADÍSTICAS DE CACHÉ
  // ============================================

  getStats(): {
    size: number;
    keys: string[];
    hitRate: number;
  } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      hitRate: 0, // Se puede implementar tracking de hits/misses
    };
  }
}

// ============================================
// MIDDLEWARE DE CACHÉ PARA API ROUTES
// ============================================

export function withCache(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: {
    ttl?: number;
    keyGenerator?: (req: NextRequest) => string;
    skipCache?: (req: NextRequest) => boolean;
  } = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const cache = CacheManager.getInstance();
    const { ttl = CACHE_CONFIG.API_RESPONSES, keyGenerator, skipCache } = options;

    // Generar clave de caché
    const cacheKey = keyGenerator 
      ? keyGenerator(req)
      : `${req.method}:${req.url}`;

    // Verificar si debe saltarse el caché
    if (skipCache && skipCache(req)) {
      return handler(req);
    }

    // Intentar obtener del caché
    const cachedResponse = cache.get(cacheKey);
    if (cachedResponse) {
      return new NextResponse(JSON.stringify(cachedResponse), {
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          'Cache-Control': `public, max-age=${ttl}`,
        },
      });
    }

    // Ejecutar handler y cachear respuesta
    const response = await handler(req);
    const responseData = await response.json();

    // Cachear solo si es exitoso
    if (response.status === 200) {
      cache.set(cacheKey, responseData, ttl);
    }

    // Agregar headers de caché
    response.headers.set('X-Cache', 'MISS');
    response.headers.set('Cache-Control', `public, max-age=${ttl}`);

    return response;
  };
}

// ============================================
// HOOKS DE REACT PARA CACHÉ
// ============================================

import { useState, useEffect, useCallback } from 'react';

export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number;
    enabled?: boolean;
    refetchOnMount?: boolean;
  } = {}
) {
  const { ttl = CACHE_CONFIG.API_RESPONSES, enabled = true, refetchOnMount = true } = options;
  const cache = CacheManager.getInstance();
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      // Intentar obtener del caché primero
      const cachedData = cache.get(key);
      if (cachedData && !refetchOnMount) {
        setData(cachedData);
        setLoading(false);
        return;
      }

      // Si no está en caché o se requiere refetch, obtener datos frescos
      const freshData = await fetcher();
      cache.set(key, freshData, ttl);
      setData(freshData);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, ttl, enabled, refetchOnMount, cache]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    cache.delete(key);
    fetchData();
  }, [key, fetchData, cache]);

  const invalidate = useCallback(() => {
    cache.delete(key);
    setData(null);
  }, [key, cache]);

  return {
    data,
    loading,
    error,
    refetch,
    invalidate,
  };
}

// ============================================
// UTILIDADES DE CACHÉ
// ============================================

export const cacheUtils = {
  // Generar clave de caché para productos
  productKey: (id: string) => `product:${id}`,
  
  // Generar clave de caché para búsquedas
  searchKey: (query: string, filters: any) => 
    `search:${query}:${JSON.stringify(filters)}`,
  
  // Generar clave de caché para usuario
  userKey: (id: string) => `user:${id}`,
  
  // Generar clave de caché para categorías
  categoriesKey: () => 'categories:all',
  
  // Limpiar caché por tipo
  clearProductCache: () => {
    const cache = CacheManager.getInstance();
    cache.invalidatePattern('product:*');
  },
  
  clearSearchCache: () => {
    const cache = CacheManager.getInstance();
    cache.invalidateSearchResults();
  },
  
  clearUserCache: () => {
    const cache = CacheManager.getInstance();
    cache.invalidatePattern('user:*');
  },
  
  // Limpiar todo el caché
  clearAllCache: () => {
    const cache = CacheManager.getInstance();
    cache.clear();
  },
};

// ============================================
// CONFIGURACIÓN DE HEADERS DE CACHÉ
// ============================================

export const cacheHeaders = {
  // Para recursos estáticos
  static: {
    'Cache-Control': 'public, max-age=31536000, immutable',
  },
  
  // Para API responses
  api: {
    'Cache-Control': 'public, max-age=300, s-maxage=300',
  },
  
  // Para productos
  products: {
    'Cache-Control': 'public, max-age=600, s-maxage=600',
  },
  
  // Para categorías
  categories: {
    'Cache-Control': 'public, max-age=3600, s-maxage=3600',
  },
  
  // Para datos de usuario
  user: {
    'Cache-Control': 'private, max-age=60',
  },
  
  // Sin caché
  noCache: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
};

export default CacheManager;

// ============================================
// MERCADITO ONLINE PY - SIMPLE CACHE UTILITY
// Caché en memoria con invalidación por evento
// Para producción, migrar a Redis
// ============================================

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutos default

  /**
   * Obtiene un valor del caché
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Verificar si expiró
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Guarda un valor en el caché
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data, expiresAt });
  }

  /**
   * Elimina un valor del caché
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Elimina todas las keys que coinciden con un patrón
   */
  deletePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' 
      ? new RegExp(pattern.replace(/\*/g, '.*'))
      : pattern;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Limpia todo el caché
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Obtiene o ejecuta una función y guarda el resultado
   */
  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    const data = await fn();
    this.set(key, data, ttl);
    
    return data;
  }
}

// Instancia global del caché
export const cache = new SimpleCache();

/**
 * Genera una key de caché para productos
 */
export function getProductsCacheKey(filters?: {
  page?: number;
  limit?: number;
  category_id?: string;
  query?: string;
  sale_type?: string;
  [key: string]: any;
}): string {
  const parts = ['products'];
  
  if (filters) {
    Object.entries(filters)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          parts.push(`${key}:${value}`);
        }
      });
  }

  return parts.join('|');
}

/**
 * Genera una key de caché para una tienda
 */
export function getStoreCacheKey(storeIdOrSlug: string): string {
  return `store:${storeIdOrSlug}`;
}

/**
 * Genera una key de caché para productos de una tienda
 */
export function getStoreProductsCacheKey(
  storeId: string,
  filters?: {
    page?: number;
    limit?: number;
    status?: string;
  }
): string {
  const parts = [`store:${storeId}:products`];
  
  if (filters) {
    Object.entries(filters)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          parts.push(`${key}:${value}`);
        }
      });
  }

  return parts.join('|');
}

/**
 * Invalida el caché relacionado con un producto
 */
export function invalidateProductCache(productId?: string): void {
  // Eliminar caché de productos generales
  cache.deletePattern('products|*');
  
  // Eliminar caché de productos por tienda
  cache.deletePattern('store:*:products|*');
  
  // Si tenemos el productId, también podríamos invalidar caches específicos
  if (productId) {
    cache.delete(`product:${productId}`);
  }
}

/**
 * Invalida el caché relacionado con una tienda
 */
export function invalidateStoreCache(storeIdOrSlug: string): void {
  cache.delete(getStoreCacheKey(storeIdOrSlug));
  cache.deletePattern(`store:${storeIdOrSlug}:*`);
  // También invalidar listados generales que pueden incluir esta tienda
  cache.deletePattern('products|*');
}



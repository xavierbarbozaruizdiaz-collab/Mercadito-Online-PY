// ============================================
// MERCADITO ONLINE PY - RATE LIMITING
// Sistema básico de rate limiting por usuario/tienda
// Para producción, usar Redis para distribuir entre instancias
// ============================================

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // Ventana de tiempo en milisegundos
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
  blockedUntil?: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private configs: Map<string, RateLimitConfig> = new Map();

  /**
   * Configura un límite para un tipo de operación
   */
  setLimit(operation: string, config: RateLimitConfig): void {
    this.configs.set(operation, config);
  }

  /**
   * Verifica si una petición está permitida
   * @param key - Clave única (ej: userId, storeId, etc.)
   * @param operation - Tipo de operación (ej: 'product_create', 'bid_place')
   * @returns true si está permitido, false si excedió el límite
   */
  async checkLimit(key: string, operation: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
  }> {
    const config = this.configs.get(operation);
    
    if (!config) {
      // Si no hay configuración, permitir (sin límite)
      return {
        allowed: true,
        remaining: Infinity,
        resetAt: Date.now() + 60000,
      };
    }

    const limitKey = `${operation}:${key}`;
    const now = Date.now();
    let entry = this.limits.get(limitKey);

    // Limpiar entrada expirada
    if (entry && entry.resetAt <= now) {
      this.limits.delete(limitKey);
      entry = undefined;
    }

    // Si está bloqueado temporalmente
    if (entry?.blockedUntil && entry.blockedUntil > now) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
        retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
      };
    }

    // Crear nueva entrada si no existe
    if (!entry) {
      entry = {
        count: 0,
        resetAt: now + config.windowMs,
      };
    }

    // Incrementar contador
    entry.count++;

    // Verificar límite
    if (entry.count > config.maxRequests) {
      // Bloquear por un tiempo adicional
      entry.blockedUntil = now + config.windowMs;
      this.limits.set(limitKey, entry);

      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
        retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
      };
    }

    // Actualizar entrada
    this.limits.set(limitKey, entry);

    return {
      allowed: true,
      remaining: Math.max(0, config.maxRequests - entry.count),
      resetAt: entry.resetAt,
    };
  }

  /**
   * Limpia entradas expiradas
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (
        entry.resetAt <= now &&
        (!entry.blockedUntil || entry.blockedUntil <= now)
      ) {
        this.limits.delete(key);
      }
    }
  }
}

// Instancia global del rate limiter
export const rateLimiter = new RateLimiter();

/**
 * Configuraciones predefinidas de rate limiting
 */
export const RATE_LIMITS = {
  // Crear productos: 10 por hora
  PRODUCT_CREATE: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hora
  },
  
  // Colocar pujas: 30 por minuto
  BID_PLACE: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minuto
  },
  
  // Subir imágenes: 20 por hora
  IMAGE_UPLOAD: {
    maxRequests: 20,
    windowMs: 60 * 60 * 1000, // 1 hora
  },
  
  // Búsquedas: 100 por minuto
  SEARCH: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minuto
  },
  
  // Llamadas API generales: 200 por minuto
  API_GENERAL: {
    maxRequests: 200,
    windowMs: 60 * 1000, // 1 minuto
  },
} as const;

// Configurar límites por defecto
Object.entries(RATE_LIMITS).forEach(([key, config]) => {
  rateLimiter.setLimit(key, config);
});

// Limpiar entradas expiradas cada 5 minutos
if (typeof window === 'undefined') {
  setInterval(() => {
    rateLimiter.cleanup();
  }, 5 * 60 * 1000);
}



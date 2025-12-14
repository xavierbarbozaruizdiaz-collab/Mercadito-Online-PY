// ============================================
// MERCADITO ONLINE PY - DISTRIBUTED RATE LIMITING WITH REDIS
// Sistema de rate limiting distribuido usando Redis (Upstash)
// Previene abuso de endpoints críticos como pujas
// ============================================

import { getRedis, isRedisAvailable } from './client';
import { logger } from '@/lib/utils/logger';

export interface RateLimitConfig {
  maxRequests: number; // Máximo de requests
  windowSeconds: number; // Ventana de tiempo en segundos
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Timestamp en ms
  retryAfter?: number; // Segundos hasta que se puede intentar de nuevo
}

/**
 * Configuraciones predefinidas de rate limiting
 */
export const RATE_LIMIT_CONFIGS = {
  // OPTIMIZACIÓN: Reducir límite de pujas para prevenir spam y reducir carga
  // Pujas: 10 por minuto por usuario (reducido de 30)
  BID_BY_USER: {
    maxRequests: 10,
    windowSeconds: 60,
  },
  // Pujas: 10 por minuto por IP (aumentado de 5 para evitar bloqueos en redes compartidas)
  BID_BY_IP: {
    maxRequests: 10,
    windowSeconds: 60,
  },
  // API general: 200 por minuto
  API_GENERAL: {
    maxRequests: 200,
    windowSeconds: 60,
  },
} as const;

/**
 * Verifica si una petición está permitida según el rate limit
 * 
 * @param key - Clave única (ej: "user:123" o "ip:192.168.1.1")
 * @param config - Configuración del rate limit
 * @returns Resultado con allowed=true si está permitido
 */
// Rate limiting en memoria como fallback (mínimo y simple)
// Solo se usa cuando Redis falla completamente
const inMemoryRateLimit = new Map<string, { count: number; resetAt: number }>();

/**
 * Limpia entradas expiradas del rate limit en memoria
 */
function cleanupInMemoryRateLimit() {
  const now = Date.now();
  for (const [key, value] of inMemoryRateLimit.entries()) {
    if (value.resetAt < now) {
      inMemoryRateLimit.delete(key);
    }
  }
}

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const redis = getRedis();
  const redisAvailable = isRedisAvailable() && redis;

  // Si Redis está disponible, usarlo (preferido)
  if (redisAvailable) {
    try {
      const now = Date.now();
      const windowMs = config.windowSeconds * 1000;
      const resetAt = now + windowMs;

      // Clave en Redis: "ratelimit:{key}"
      const redisKey = `ratelimit:${key}`;

      // Obtener el contador actual
      const current = await redis.get<number>(redisKey);

      if (current === null) {
        // Primera request en esta ventana
        await redis.set(redisKey, 1, { ex: config.windowSeconds });
        return {
          allowed: true,
          remaining: config.maxRequests - 1,
          resetAt,
        };
      }

      // Verificar si excedió el límite
      if (current >= config.maxRequests) {
        // Obtener TTL para calcular retryAfter
        const ttl = await redis.ttl(redisKey);
        const retryAfter = ttl > 0 ? ttl : config.windowSeconds;

        logger.warn('[Rate Limit] Límite excedido', {
          key,
          current,
          max: config.maxRequests,
          retryAfter,
        });

        return {
          allowed: false,
          remaining: 0,
          resetAt,
          retryAfter,
        };
      }

      // Incrementar contador
      const newCount = await redis.incr(redisKey);
      
      // Si es el primer incremento después de crear, establecer TTL
      if (newCount === 1) {
        await redis.expire(redisKey, config.windowSeconds);
      }

      return {
        allowed: true,
        remaining: Math.max(0, config.maxRequests - newCount),
        resetAt,
      };
    } catch (error) {
      // Si Redis falla durante la operación, caer a fallback en memoria
      logger.error('[Rate Limit] Error verificando rate limit en Redis, usando fallback en memoria', error, { key });
      // Continuar al fallback en memoria (abajo)
    }
  }

  // FALLBACK: Rate limiting en memoria (menos restrictivo cuando Redis falla)
  // Permite más requests cuando Redis no está disponible para no bloquear usuarios legítimos
  logger.warn('[Rate Limit] Redis no disponible, usando fallback en memoria (más permisivo)', { key });
  
  cleanupInMemoryRateLimit(); // Limpiar entradas expiradas
  
  const now = Date.now();
  // Usar la misma ventana de tiempo que la configuración original, pero más permisivo
  const fallbackWindowMs = config.windowSeconds * 1000;
  const fallbackResetAt = now + fallbackWindowMs;
  const fallbackKey = `fallback:${key}`;
  
  const existing = inMemoryRateLimit.get(fallbackKey);
  
  if (!existing || existing.resetAt < now) {
    // Nueva ventana o ventana expirada
    inMemoryRateLimit.set(fallbackKey, { count: 1, resetAt: fallbackResetAt });
    return {
      allowed: true,
      remaining: config.maxRequests - 1, // Aproximación
      resetAt: fallbackResetAt,
    };
  }
  
  // Verificar límite (más permisivo: permite hasta el doble del límite configurado)
  const fallbackMaxRequests = config.maxRequests * 2; // Más permisivo cuando Redis falla
  if (existing.count >= fallbackMaxRequests) {
    logger.warn('[Rate Limit] Fallback en memoria: límite alcanzado', { key, count: existing.count, max: fallbackMaxRequests });
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfter: Math.ceil((existing.resetAt - now) / 1000),
    };
  }
  
  // Incrementar contador
  existing.count += 1;
  inMemoryRateLimit.set(fallbackKey, existing);
  
  return {
    allowed: true,
    remaining: Math.max(0, fallbackMaxRequests - existing.count),
    resetAt: existing.resetAt,
  };
}

/**
 * Verifica rate limit por usuario
 */
export async function checkUserRateLimit(
  userId: string,
  config: RateLimitConfig = RATE_LIMIT_CONFIGS.BID_BY_USER
): Promise<RateLimitResult> {
  return checkRateLimit(`user:${userId}`, config);
}

/**
 * Verifica rate limit por IP
 */
export async function checkIpRateLimit(
  ip: string,
  config: RateLimitConfig = RATE_LIMIT_CONFIGS.BID_BY_IP
): Promise<RateLimitResult> {
  return checkRateLimit(`ip:${ip}`, config);
}

/**
 * Limpia el rate limit de una clave (útil para testing o admin)
 */
export async function clearRateLimit(key: string): Promise<boolean> {
  if (!isRedisAvailable()) {
    return false;
  }

  const redis = getRedis();
  if (!redis) {
    return false;
  }

  try {
    await redis.del(`ratelimit:${key}`);
    return true;
  } catch (error) {
    logger.error('[Rate Limit] Error limpiando rate limit', error, { key });
    return false;
  }
}


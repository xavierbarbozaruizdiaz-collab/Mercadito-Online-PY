// ============================================
// MERCADITO ONLINE PY - REDIS CLIENT (UPSTASH)
// Cliente Redis distribuido para locks y rate limiting
// ============================================

import { Redis } from '@upstash/redis';

// Configuración de Upstash Redis
const getRedisClient = (): Redis | null => {
  // Variables de entorno para Upstash Redis
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Si no hay configuración, retornar null (degradación elegante)
  if (!url || !token) {
    // Solo mostrar warning en desarrollo, no en producción para evitar ruido en consola
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Redis] ⚠️ Variables de entorno de Upstash no configuradas. Locks y rate limiting no funcionarán en producción.');
    }
    return null;
  }

  try {
    return new Redis({
      url,
      token,
    });
  } catch (error) {
    console.error('[Redis] Error inicializando cliente:', error);
    return null;
  }
};

// Cliente singleton
let redisClient: Redis | null = null;

export function getRedis(): Redis | null {
  if (!redisClient) {
    redisClient = getRedisClient();
  }
  return redisClient;
}

// Verificar si Redis está disponible
export function isRedisAvailable(): boolean {
  return getRedis() !== null;
}








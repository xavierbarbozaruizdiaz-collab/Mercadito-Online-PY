// ============================================
// MERCADITO ONLINE PY - DISTRIBUTED LOCKS WITH REDIS
// Sistema de locks distribuidos usando Redis (Upstash)
// Garantiza que solo un proceso pueda procesar una puja a la vez
// ============================================

import { getRedis, isRedisAvailable } from './client';
import { logger } from '@/lib/utils/logger';

export interface LockResult {
  acquired: boolean;
  lockId?: string;
  error?: string;
}

export interface LockOptions {
  ttlSeconds?: number; // Tiempo de vida del lock en segundos (default: 5)
  retryAttempts?: number; // Intentos de adquisición (default: 0 = no retry)
  retryDelayMs?: number; // Delay entre intentos en ms (default: 100)
}

/**
 * Clave para el lock de una subasta
 */
export function getAuctionLockKey(auctionId: string): string {
  return `lock:auction:${auctionId}`;
}

/**
 * Clave para el lock de un producto
 */
export function getProductLockKey(productId: string, operation: string = 'update'): string {
  return `lock:product:${productId}:${operation}`;
}

/**
 * Intenta adquirir un lock distribuido en Redis
 * 
 * @param key - Clave única del lock (ej: "lock:auction:123")
 * @param options - Opciones del lock
 * @returns Resultado con acquired=true si se adquirió, false si ya estaba bloqueado
 */
export async function acquireLock(
  key: string,
  options: LockOptions = {}
): Promise<LockResult> {
  const {
    ttlSeconds = 5, // TTL corto para evitar deadlocks
    retryAttempts = 0,
    retryDelayMs = 100,
  } = options;

  // Si Redis no está disponible, fallar de forma segura
  if (!isRedisAvailable()) {
    logger.warn('[Redis Lock] Redis no disponible, no se puede adquirir lock', { key });
    return {
      acquired: false,
      error: 'Redis no disponible',
    };
  }

  const redis = getRedis();
  if (!redis) {
    return { acquired: false, error: 'Redis no inicializado' };
  }

  const lockId = crypto.randomUUID();
  const lockValue = `${lockId}:${Date.now()}`;

  // Función para intentar adquirir el lock
  const tryAcquire = async (attempt: number): Promise<LockResult> => {
    try {
      // SET con NX (only if Not eXists) y EX (expiration)
      // Esto es atómico: solo se crea si no existe
      const result = await redis.set(key, lockValue, {
        nx: true, // Solo si no existe
        ex: ttlSeconds, // Expira en ttlSeconds segundos
      });

      if (result === 'OK') {
        logger.debug('[Redis Lock] Lock adquirido', { key, lockId, ttlSeconds });
        return { acquired: true, lockId };
      }

      // Lock ya existe
      if (attempt < retryAttempts) {
        // Esperar antes de reintentar
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        return tryAcquire(attempt + 1);
      }

      logger.debug('[Redis Lock] Lock no disponible', { key, attempt });
      return { acquired: false };
    } catch (error) {
      logger.error('[Redis Lock] Error adquiriendo lock', error, { key, attempt });
      return {
        acquired: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  };

  return tryAcquire(0);
}

/**
 * Libera un lock distribuido
 * 
 * @param key - Clave del lock
 * @param lockId - ID del lock a liberar (verificación de ownership)
 * @returns true si se liberó, false si no existía o el lockId no coincide
 */
export async function releaseLock(key: string, lockId: string): Promise<boolean> {
  if (!isRedisAvailable()) {
    logger.warn('[Redis Lock] Redis no disponible, no se puede liberar lock', { key });
    return false;
  }

  const redis = getRedis();
  if (!redis) {
    return false;
  }

  try {
    // Obtener el valor actual del lock
    const currentValue = await redis.get<string>(key);

    if (!currentValue) {
      // Lock ya expiró o no existe
      logger.debug('[Redis Lock] Lock no existe o expiró', { key });
      return false;
    }

    // Verificar que el lockId coincida (ownership check)
    const currentLockId = currentValue.split(':')[0];
    if (currentLockId !== lockId) {
      // El lock fue adquirido por otro proceso
      logger.warn('[Redis Lock] Intento de liberar lock de otro proceso', {
        key,
        expected: lockId,
        actual: currentLockId,
      });
      return false;
    }

    // Eliminar el lock (solo si es nuestro)
    await redis.del(key);
    logger.debug('[Redis Lock] Lock liberado', { key, lockId });
    return true;
  } catch (error) {
    logger.error('[Redis Lock] Error liberando lock', error, { key, lockId });
    return false;
  }
}

/**
 * Renueva un lock existente (extiende el TTL)
 * 
 * @param key - Clave del lock
 * @param lockId - ID del lock
 * @param ttlSeconds - Nuevo TTL en segundos
 * @returns true si se renovó
 */
export async function renewLock(
  key: string,
  lockId: string,
  ttlSeconds: number = 5
): Promise<boolean> {
  if (!isRedisAvailable()) {
    return false;
  }

  const redis = getRedis();
  if (!redis) {
    return false;
  }

  try {
    // Verificar ownership antes de renovar
    const currentValue = await redis.get<string>(key);

    if (!currentValue) {
      return false;
    }

    const currentLockId = currentValue.split(':')[0];
    if (currentLockId !== lockId) {
      return false;
    }

    // Extender el TTL
    await redis.expire(key, ttlSeconds);
    logger.debug('[Redis Lock] Lock renovado', { key, lockId, ttlSeconds });
    return true;
  } catch (error) {
    logger.error('[Redis Lock] Error renovando lock', error, { key, lockId });
    return false;
  }
}

/**
 * Ejecuta una función con un lock distribuido
 * Libera el lock automáticamente al finalizar (éxito o error)
 * 
 * @param key - Clave del lock
 * @param fn - Función a ejecutar dentro del lock
 * @param options - Opciones del lock
 * @returns Resultado de la función o error
 */
export async function withLock<T>(
  key: string,
  fn: () => Promise<T>,
  options: LockOptions = {}
): Promise<{ success: boolean; result?: T; error?: Error }> {
  const { acquired, lockId } = await acquireLock(key, options);

  if (!acquired || !lockId) {
    return {
      success: false,
      error: new Error('No se pudo adquirir el lock'),
    };
  }

  try {
    const result = await fn();
    return { success: true, result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  } finally {
    // Siempre liberar el lock
    await releaseLock(key, lockId);
  }
}








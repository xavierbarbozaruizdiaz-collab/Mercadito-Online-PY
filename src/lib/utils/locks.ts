// ============================================
// MERCADITO ONLINE PY - DISTRIBUTED LOCKS
// Sistema de locks para prevenir condiciones de carrera
// Versión simple en memoria (para producción, migrar a Redis)
// ============================================

/**
 * Lock simple en memoria
 * Para producción con múltiples instancias, usar Redis
 */
class SimpleLock {
  private locks: Map<string, { expiresAt: number; holder: string }> = new Map();
  private lockTimeout: number = 30000; // 30 segundos default

  /**
   * Intenta adquirir un lock
   * @param key - Clave única del lock
   * @param timeout - Tiempo en ms antes de expirar (default: 30s)
   * @param holder - Identificador del holder (default: random UUID)
   * @returns true si se adquirió el lock, false si ya estaba bloqueado
   */
  async acquire(
    key: string,
    timeout: number = this.lockTimeout,
    holder?: string
  ): Promise<{ acquired: boolean; lockId?: string }> {
    // Limpiar locks expirados
    this.cleanExpiredLocks();

    const lockId = holder || crypto.randomUUID();
    const now = Date.now();

    // Verificar si ya existe un lock activo
    const existingLock = this.locks.get(key);
    if (existingLock && existingLock.expiresAt > now) {
      return { acquired: false };
    }

    // Adquirir el lock
    this.locks.set(key, {
      expiresAt: now + timeout,
      holder: lockId,
    });

    return { acquired: true, lockId };
  }

  /**
   * Libera un lock
   * @param key - Clave del lock
   * @param lockId - ID del lock a liberar (verificación de ownership)
   * @returns true si se liberó, false si no existía o el lockId no coincide
   */
  release(key: string, lockId?: string): boolean {
    const lock = this.locks.get(key);
    
    if (!lock) {
      return false;
    }

    // Si se especificó lockId, verificar ownership
    if (lockId && lock.holder !== lockId) {
      return false;
    }

    this.locks.delete(key);
    return true;
  }

  /**
   * Renueva un lock existente
   * @param key - Clave del lock
   * @param lockId - ID del lock
   * @param timeout - Nuevo tiempo de expiración
   * @returns true si se renovó
   */
  renew(key: string, lockId: string, timeout: number = this.lockTimeout): boolean {
    const lock = this.locks.get(key);
    
    if (!lock || lock.holder !== lockId) {
      return false;
    }

    // Verificar si no expiró
    if (lock.expiresAt <= Date.now()) {
      this.locks.delete(key);
      return false;
    }

    // Renovar
    lock.expiresAt = Date.now() + timeout;
    return true;
  }

  /**
   * Limpia locks expirados
   */
  private cleanExpiredLocks(): void {
    const now = Date.now();
    for (const [key, lock] of this.locks.entries()) {
      if (lock.expiresAt <= now) {
        this.locks.delete(key);
      }
    }
  }

  /**
   * Ejecuta una función con un lock
   * @param key - Clave del lock
   * @param fn - Función a ejecutar
   * @param timeout - Tiempo máximo del lock
   * @returns Resultado de la función o null si no se pudo adquirir el lock
   */
  async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    timeout: number = this.lockTimeout
  ): Promise<{ success: boolean; result?: T; error?: Error }> {
    const { acquired, lockId } = await this.acquire(key, timeout);

    if (!acquired || !lockId) {
      return { success: false };
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
      this.release(key, lockId);
    }
  }
}

// Instancia global del lock manager
export const lockManager = new SimpleLock();

/**
 * Helper para crear un lock key para una subasta
 */
export function getAuctionLockKey(productId: string): string {
  return `auction:${productId}`;
}

/**
 * Helper para crear un lock key para un producto
 */
export function getProductLockKey(productId: string, operation: string = 'update'): string {
  return `product:${productId}:${operation}`;
}



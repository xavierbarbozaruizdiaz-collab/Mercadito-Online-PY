// ============================================
// MERCADITO ONLINE PY - MULTI-TAB SYNC
// Utilidades para sincronizar estado entre múltiples pestañas
// ============================================

/**
 * Sincroniza eventos entre múltiples pestañas usando localStorage
 */
export class MultiTabSync {
  private static instance: MultiTabSync | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private storageListener: ((e: StorageEvent) => void) | null = null;

  private constructor() {
    // Escuchar cambios de localStorage desde otras pestañas
    if (typeof window !== 'undefined') {
      this.storageListener = (e: StorageEvent) => {
        if (e.key && e.key.startsWith('__mt_sync__')) {
          const eventName = e.key.replace('__mt_sync__', '');
          const data = e.newValue ? JSON.parse(e.newValue) : null;
          
          if (this.listeners.has(eventName)) {
            this.listeners.get(eventName)!.forEach(callback => {
              try {
                callback(data);
              } catch (err) {
                console.error(`Error in multi-tab sync listener for ${eventName}:`, err);
              }
            });
          }
        }
      };

      window.addEventListener('storage', this.storageListener);
    }
  }

  static getInstance(): MultiTabSync {
    if (!MultiTabSync.instance) {
      MultiTabSync.instance = new MultiTabSync();
    }
    return MultiTabSync.instance;
  }

  /**
   * Emitir un evento a todas las pestañas (excepto la actual)
   */
  emit(eventName: string, data: any): void {
    if (typeof window === 'undefined') return;

    try {
      const key = `__mt_sync__${eventName}`;
      localStorage.setItem(key, JSON.stringify({
        ...data,
        timestamp: Date.now(),
        tabId: this.getTabId(),
      }));
      
      // Remover después de un momento para permitir que se detecte el cambio
      setTimeout(() => {
        try {
          localStorage.removeItem(key);
        } catch (err) {
          // Ignorar errores al limpiar
        }
      }, 100);
    } catch (err) {
      console.warn('Error emitting multi-tab event:', err);
    }
  }

  /**
   * Escuchar eventos de otras pestañas
   */
  on(eventName: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }

    this.listeners.get(eventName)!.add(callback);

    // Retornar función para desuscribirse
    return () => {
      const callbacks = this.listeners.get(eventName);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(eventName);
        }
      }
    };
  }

  /**
   * Obtener un ID único para esta pestaña
   */
  private getTabId(): string {
    if (typeof window === 'undefined') return 'server';
    
    const key = '__mt_tab_id__';
    let tabId = sessionStorage.getItem(key);
    
    if (!tabId) {
      tabId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem(key, tabId);
    }
    
    return tabId;
  }

  /**
   * Limpiar recursos
   */
  destroy(): void {
    if (this.storageListener && typeof window !== 'undefined') {
      window.removeEventListener('storage', this.storageListener);
    }
    this.listeners.clear();
  }
}

// Exportar instancia singleton
export const multiTabSync = MultiTabSync.getInstance();




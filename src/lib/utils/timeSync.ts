// ============================================
// MERCADITO ONLINE PY - TIME SYNCHRONIZATION
// Sincronización de tiempo entre cliente y servidor
// PostgreSQL NOW() es la fuente de verdad única
// ============================================

let cachedServerTime: number | null = null;
let lastSyncTime: number = 0;
let timeOffset: number = 0; // Offset: serverTime - clientTime
const SYNC_INTERVAL = 30000; // Resincronizar cada 30 segundos

/**
 * Obtiene el tiempo del servidor desde PostgreSQL
 * Usa la función NOW() de PostgreSQL como fuente de verdad única
 * Calcula y mantiene un offset entre cliente y servidor
 */
export async function getServerTime(): Promise<number> {
  const clientNow = Date.now();
  
  // Si tenemos un tiempo cacheado reciente, calcular con offset
  if (cachedServerTime !== null && (clientNow - lastSyncTime) < SYNC_INTERVAL) {
    const elapsed = clientNow - lastSyncTime;
    return cachedServerTime + elapsed;
  }
  
  try {
    // Usar Supabase para obtener el tiempo del servidor (PostgreSQL NOW())
    const { supabase } = await import('@/lib/supabaseClient');
    const startRequest = Date.now();
    const { data, error } = await supabase.rpc('get_server_time');
    const requestDuration = Date.now() - startRequest;
    
    if (!error && data) {
      const serverTimestamp = new Date(data).getTime();
      // Compensar la mitad del tiempo de request (latencia aproximada)
      const adjustedTime = serverTimestamp + (requestDuration / 2);
      
      // Calcular y actualizar el offset
      const clientTimeAtSync = Date.now();
      timeOffset = adjustedTime - clientTimeAtSync;
      
      cachedServerTime = adjustedTime;
      lastSyncTime = clientTimeAtSync;
      
      return adjustedTime;
    }
  } catch (error) {
    console.warn('⚠️ Error obteniendo tiempo del servidor, usando tiempo local:', error);
  }
  
  // Fallback: usar tiempo local (sin offset)
  return Date.now();
}

/**
 * Calcula el offset entre el tiempo del cliente y del servidor
 * Se actualiza cada vez que se sincroniza con el servidor
 */
export async function getTimeOffset(): Promise<number> {
  await getServerTime(); // Esto actualiza timeOffset internamente
  return timeOffset;
}

/**
 * Obtiene el tiempo actual sincronizado con el servidor
 * Usa el offset calculado para convertir Date.now() del cliente a tiempo del servidor
 * Esta es la función que deben usar todos los componentes para obtener tiempo "oficial"
 */
export function getSyncedNow(): number {
  // Si no hay offset calculado aún, usar tiempo local
  if (timeOffset === 0 && cachedServerTime === null) {
    return Date.now();
  }
  
  // Tiempo sincronizado = tiempo del cliente + offset
  return Date.now() + timeOffset;
}

/**
 * Fuerza una resincronización inmediata con el servidor
 * Útil cuando se necesita precisión máxima (ej: justo antes de una puja)
 */
export async function forceSync(): Promise<number> {
  cachedServerTime = null;
  lastSyncTime = 0;
  return await getServerTime();
}

// Exportaciones explícitas para asegurar compatibilidad con el build de Vercel
export type { };

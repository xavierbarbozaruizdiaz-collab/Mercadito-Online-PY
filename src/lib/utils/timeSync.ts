// ============================================
// MERCADITO ONLINE PY - TIME SYNCHRONIZATION
// Sincronización de tiempo entre cliente y servidor
// ============================================

let cachedServerTime: number | null = null;
let lastSyncTime: number = 0;
const SYNC_INTERVAL = 30000; // Resincronizar cada 30 segundos

/**
 * Obtiene el tiempo del servidor desde Supabase
 * Usa la función NOW() de PostgreSQL para garantizar consistencia
 */
export async function getServerTime(): Promise<number> {
  const now = Date.now();
  
  // Si tenemos un tiempo cacheado reciente, usarlo con offset calculado
  if (cachedServerTime !== null && (now - lastSyncTime) < SYNC_INTERVAL) {
    const elapsed = now - lastSyncTime;
    return cachedServerTime + elapsed;
  }
  
  try {
    // Usar Supabase para obtener el tiempo del servidor
    const { supabase } = await import('@/lib/supabaseClient');
    const startRequest = Date.now();
    const { data, error } = await supabase.rpc('get_server_time');
    const requestDuration = Date.now() - startRequest;
    
    if (!error && data) {
      const serverTimestamp = new Date(data).getTime();
      // Compensar la mitad del tiempo de request (latencia aproximada)
      const adjustedTime = serverTimestamp + (requestDuration / 2);
      cachedServerTime = adjustedTime;
      lastSyncTime = now;
      return adjustedTime;
    }
  } catch (error) {
    console.warn('⚠️ Error obteniendo tiempo del servidor, usando tiempo local:', error);
  }
  
  // Fallback: usar tiempo local
  return Date.now();
}

/**
 * Calcula el offset entre el tiempo del cliente y del servidor
 */
export async function getTimeOffset(): Promise<number> {
  const serverTime = await getServerTime();
  const clientTime = Date.now();
  return serverTime - clientTime;
}



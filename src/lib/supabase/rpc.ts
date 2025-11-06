// ============================================
// MERCADITO ONLINE PY - SUPABASE RPC UTILITIES
// Utilidades para normalizar respuestas de funciones RPC
// ============================================

/**
 * Tipo que representa el resultado posible de una función RPC de Supabase.
 * Puede ser un objeto único, un array, o null.
 */
export type RpcResult<T> = T | T[] | null;

/**
 * Normaliza el resultado de una función RPC que debería devolver un objeto único.
 * 
 * @param data El resultado de la llamada RPC (puede ser objeto, array, o null)
 * @returns El objeto normalizado o null si no hay datos
 * 
 * @example
 * const { data } = await supabase.rpc('get_user_profile', { user_id: id });
 * const profile = normalizeRpcResult<UserProfile>(data);
 */
export function normalizeRpcResult<T>(data: RpcResult<T>): T | null {
  if (!data) return null;
  return Array.isArray(data) ? (data.length > 0 ? data[0] : null) : data;
}

/**
 * Normaliza el resultado de una función RPC que debería devolver una lista.
 * Siempre retorna un array, incluso si la RPC devuelve un objeto único.
 * 
 * @param data El resultado de la llamada RPC (puede ser objeto, array, o null)
 * @returns Un array con los elementos (siempre un array)
 * 
 * @example
 * const { data } = await supabase.rpc('get_all_products', { store_id: id });
 * const products = normalizeRpcList<Product>(data);
 */
export function normalizeRpcList<T>(data: RpcResult<T>): T[] {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}


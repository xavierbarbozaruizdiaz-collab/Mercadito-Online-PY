// ============================================
// MERCADITO ONLINE PY - SERVICIO DE FAVORITOS DE TIENDAS
// Funciones para gestionar tiendas favoritas
// ============================================

import { supabase } from '@/lib/supabaseClient';

/**
 * Verifica si una tienda está en los favoritos del usuario
 */
export async function isStoreFavorite(storeId: string, userId: string | null): Promise<boolean> {
  if (!userId) return false;

  try {
    const { data, error } = await supabase
      .from('store_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('store_id', storeId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 es "no rows returned", lo cual es esperado si no está en favoritos
      console.error('Error checking favorite:', error);
      return false;
    }

    return !!data;
  } catch (err) {
    console.error('Error checking favorite:', err);
    return false;
  }
}

/**
 * Agrega una tienda a favoritos
 */
export async function addStoreFavorite(storeId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('store_favorites')
      .insert({
        user_id: userId,
        store_id: storeId,
      });

    if (error) {
      // Si ya existe, no es un error crítico
      if (error.code === '23505') {
        // Unique violation - ya está en favoritos
        return true;
      }
      console.error('Error adding favorite:', error);
      throw error;
    }

    return true;
  } catch (err) {
    console.error('Error adding favorite:', err);
    throw err;
  }
}

/**
 * Elimina una tienda de favoritos
 */
export async function removeStoreFavorite(storeId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('store_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('store_id', storeId);

    if (error) {
      console.error('Error removing favorite:', error);
      throw error;
    }

    return true;
  } catch (err) {
    console.error('Error removing favorite:', err);
    throw err;
  }
}

/**
 * Alterna el estado de favorito de una tienda
 */
export async function toggleStoreFavorite(
  storeId: string,
  userId: string | null,
  currentState: boolean
): Promise<boolean> {
  if (!userId) {
    throw new Error('Usuario no autenticado');
  }

  try {
    if (currentState) {
      await removeStoreFavorite(storeId, userId);
      return false;
    } else {
      await addStoreFavorite(storeId, userId);
      return true;
    }
  } catch (err) {
    console.error('Error toggling favorite:', err);
    throw err;
  }
}

/**
 * Obtiene todas las tiendas favoritas de un usuario
 */
export async function getUserFavoriteStores(userId: string) {
  try {
    const { data, error } = await supabase
      .from('store_favorites')
      .select(`
        id,
        created_at,
        stores!inner (
          id,
          name,
          slug,
          description,
          logo_url,
          cover_image_url,
          location,
          is_active
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching favorite stores:', error);
      throw error;
    }

    // Transformar datos para facilitar el uso
    return (data || []).map((item: any) => ({
      id: item.id,
      created_at: item.created_at,
      store: Array.isArray(item.stores) ? item.stores[0] : item.stores,
    }));
  } catch (err) {
    console.error('Error fetching favorite stores:', err);
    throw err;
  }
}


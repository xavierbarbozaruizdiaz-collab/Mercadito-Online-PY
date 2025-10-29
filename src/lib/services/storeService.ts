// ============================================
// MERCADITO ONLINE PY - STORE SERVICE
// Servicio para manejar la lógica de tiendas
// ============================================

import { supabase } from '@/lib/supabase/client';
import { Database } from '@/types/database';

// ============================================
// TIPOS
// ============================================

export type Store = Database['public']['Tables']['stores']['Row'] & {
  profiles: { full_name: string; avatar_url: string | null } | null;
};

export type Product = Database['public']['Tables']['products']['Row'] & {
  category: { name: string } | null;
};

export type Review = {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  buyer: { full_name: string; avatar_url: string | null };
};

export interface StoreStats {
  total_products: number;
  total_sales: number;
  average_rating: number;
  response_rate: number;
}

// ============================================
// FUNCIONES DEL SERVICIO
// ============================================

/**
 * Obtiene una tienda por su slug.
 * @param storeSlug El slug de la tienda.
 * @returns La tienda con su información completa.
 */
export async function getStoreBySlug(storeSlug: string): Promise<Store | null> {
  const { data, error } = await supabase
    .from('stores')
    .select('*, profiles(full_name, avatar_url)')
    .eq('slug', storeSlug)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error fetching store by slug:', error);
    return null;
  }

  return data as Store;
}

/**
 * Obtiene los productos de una tienda.
 * @param storeId El ID de la tienda.
 * @param options Opciones de paginación y filtros.
 * @returns Los productos de la tienda.
 */
export async function getStoreProducts(
  storeId: string,
  options: {
    page?: number;
    limit?: number;
    status?: string;
    category_id?: string;
  } = {}
): Promise<{ products: Product[]; total: number; total_pages: number }> {
  const page = options.page || 1;
  const limit = options.limit || 12;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('products')
    .select('*, category:categories(name)', { count: 'exact' })
    .eq('store_id', storeId);

  if (options.status) {
    query = query.eq('status', options.status);
  }

  if (options.category_id) {
    query = query.eq('category_id', options.category_id);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching store products:', error);
    return { products: [], total: 0, total_pages: 0 };
  }

  const total = count || 0;
  const total_pages = Math.ceil(total / limit);

  return {
    products: data || [],
    total,
    total_pages,
  };
}

/**
 * Obtiene las reseñas de una tienda.
 * @param storeId El ID de la tienda.
 * @param options Opciones de paginación.
 * @returns Las reseñas de la tienda.
 */
export async function getStoreReviews(
  storeId: string,
  options: {
    page?: number;
    limit?: number;
  } = {}
): Promise<{ reviews: Review[]; total: number; total_pages: number }> {
  const page = options.page || 1;
  const limit = options.limit || 10;
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('reviews')
    .select('*, buyer:profiles(full_name, avatar_url)', { count: 'exact' })
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching store reviews:', error);
    return { reviews: [], total: 0, total_pages: 0 };
  }

  const total = count || 0;
  const total_pages = Math.ceil(total / limit);

  return {
    reviews: data || [],
    total,
    total_pages,
  };
}

/**
 * Obtiene las estadísticas de una tienda.
 * @param storeId El ID de la tienda.
 * @returns Las estadísticas de la tienda.
 */
export async function getStoreStats(storeId: string): Promise<StoreStats | null> {
  try {
    // Obtener total de productos
    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('status', 'active');

    // Obtener total de ventas (simulado por ahora)
    const totalSales = Math.floor(Math.random() * 1000) + 100;

    // Obtener calificación promedio
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('rating')
      .eq('store_id', storeId);

    const averageRating = reviewsData && reviewsData.length > 0
      ? reviewsData.reduce((sum, review: any) => sum + review.rating, 0) / reviewsData.length
      : 0;

    // Obtener tasa de respuesta (simulado por ahora)
    const responseRate = Math.floor(Math.random() * 20) + 80;

    return {
      total_products: totalProducts || 0,
      total_sales: totalSales,
      average_rating: averageRating,
      response_rate: responseRate,
    };
  } catch (error) {
    console.error('Error fetching store stats:', error);
    return null;
  }
}

/**
 * Obtiene todas las tiendas con filtros y paginación.
 * @param options Opciones de filtros y paginación.
 * @returns Las tiendas que coinciden con los filtros.
 */
export async function getStores(
  options: {
    page?: number;
    limit?: number;
    search?: string;
    location?: string;
    min_rating?: number;
    verified_only?: boolean;
    active_only?: boolean;
    sort_by?: 'rating' | 'products' | 'sales' | 'created_at' | 'updated_at';
    sort_order?: 'asc' | 'desc';
  } = {}
): Promise<{ stores: Store[]; total: number; total_pages: number }> {
  const page = options.page || 1;
  const limit = options.limit || 12;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('stores')
    .select('*, profiles(full_name, avatar_url)', { count: 'exact' });

  // Aplicar filtros
  if (options.active_only !== false) {
    query = query.eq('is_active', true);
  }

  if (options.verified_only) {
    query = query.eq('is_verified', true);
  }

  if (options.search) {
    query = query.ilike('name', `%${options.search}%`);
  }

  if (options.location) {
    query = query.ilike('location', `%${options.location}%`);
  }

  if (options.min_rating) {
    query = query.gte('rating', options.min_rating);
  }

  // Aplicar ordenamiento
  const sortBy = options.sort_by || 'rating';
  const sortOrder = options.sort_order || 'desc';
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  // Aplicar paginación
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching stores:', error);
    return { stores: [], total: 0, total_pages: 0 };
  }

  const total = count || 0;
  const total_pages = Math.ceil(total / limit);

  return {
    stores: data || [],
    total,
    total_pages,
  };
}

/**
 * Crea una nueva tienda.
 * @param storeData Los datos de la nueva tienda.
 * @returns La tienda creada.
 */
export async function createStore(storeData: {
  owner_id: string;
  name: string;
  description?: string;
  slug: string;
  logo_url?: string;
  cover_image_url?: string;
  location?: string;
  phone?: string;
  email?: string;
  website?: string;
  social_links?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
}): Promise<Store | null> {
  const { data, error } = await (supabase as any)
    .from('stores')
    .insert({
      ...storeData,
      is_active: true,
      is_verified: false,
      rating: 0,
      total_reviews: 0,
      total_products: 0,
      total_sales: 0,
    })
    .select('*, profiles(full_name, avatar_url)')
    .single();

  if (error) {
    console.error('Error creating store:', error);
    throw new Error(error.message);
  }

  return data as Store;
}

/**
 * Actualiza una tienda existente.
 * @param storeId El ID de la tienda a actualizar.
 * @param updates Los campos a actualizar.
 * @returns La tienda actualizada.
 */
export async function updateStore(
  storeId: string,
  updates: Partial<Omit<Store, 'id' | 'owner_id' | 'created_at' | 'updated_at'>>
): Promise<Store | null> {
  const { data, error } = await (supabase as any)
    .from('stores')
    .update(updates)
    .eq('id', storeId)
    .select('*, profiles(full_name, avatar_url)')
    .single();

  if (error) {
    console.error('Error updating store:', error);
    throw new Error(error.message);
  }

  return data as Store;
}

/**
 * Elimina una tienda (soft delete).
 * @param storeId El ID de la tienda a eliminar.
 * @returns True si se eliminó correctamente.
 */
export async function deleteStore(storeId: string): Promise<boolean> {
  const { error } = await (supabase as any)
    .from('stores')
    .update({ is_active: false })
    .eq('id', storeId);

  if (error) {
    console.error('Error deleting store:', error);
    throw new Error(error.message);
  }

  return true;
}

/**
 * Verifica si un slug de tienda está disponible.
 * @param slug El slug a verificar.
 * @param excludeStoreId ID de la tienda a excluir de la verificación (para actualizaciones).
 * @returns True si el slug está disponible.
 */
export async function isStoreSlugAvailable(slug: string, excludeStoreId?: string): Promise<boolean> {
  let query = supabase
    .from('stores')
    .select('id')
    .eq('slug', slug);

  if (excludeStoreId) {
    query = query.neq('id', excludeStoreId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error checking store slug availability:', error);
    return false;
  }

  return data.length === 0;
}

/**
 * Genera un slug único para una tienda.
 * @param name El nombre de la tienda.
 * @param excludeStoreId ID de la tienda a excluir de la verificación.
 * @returns Un slug único.
 */
export async function generateUniqueStoreSlug(name: string, excludeStoreId?: string): Promise<string> {
  // Convertir nombre a slug
  let baseSlug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remover caracteres especiales
    .replace(/\s+/g, '-') // Reemplazar espacios con guiones
    .replace(/-+/g, '-') // Reemplazar múltiples guiones con uno solo
    .trim();

  let slug = baseSlug;
  let counter = 1;

  // Verificar disponibilidad y agregar número si es necesario
  while (!(await isStoreSlugAvailable(slug, excludeStoreId))) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}
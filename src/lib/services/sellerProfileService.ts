// ============================================
// MERCADITO ONLINE PY - SELLER PROFILE SERVICE
// Servicio para manejar la lógica de perfiles de vendedores
// ============================================

import { supabase } from '@/lib/supabase/client';
import { Database } from '@/types/database';

// ============================================
// TIPOS
// ============================================

export type SellerProfile = Database['public']['Tables']['profiles']['Row'] & {
  store: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logo_url: string | null;
    cover_image_url: string | null;
    location: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    rating: number;
    total_reviews: number;
    total_products: number;
    total_sales: number;
    is_verified: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    social_links: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
      linkedin?: string;
    } | null;
  };
};

export type Product = Database['public']['Tables']['products']['Row'] & {
  category: { name: string } | null;
};

export type Review = Database['public']['Tables']['reviews']['Row'] & {
  buyer: { full_name: string; avatar_url: string | null };
};

export interface SellerStats {
  total_products: number;
  total_sales: number;
  average_rating: number;
  response_rate: number;
}

// ============================================
// FUNCIONES DEL SERVICIO
// ============================================

/**
 * Obtiene el perfil completo de un vendedor por su ID.
 * @param sellerId El ID del vendedor.
 * @returns El perfil del vendedor con su tienda.
 */
export async function getSellerProfileById(sellerId: string): Promise<SellerProfile | null> {
  // 1. Obtener el perfil del vendedor
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', sellerId)
    .single();

  if (profileError) {
    console.error('Error fetching seller profile:', profileError);
    return null;
  }

  if (!profileData) {
    return null;
  }

  // 2. Obtener la tienda asociada al vendedor
  const { data: storeData, error: storeError } = await supabase
    .from('stores')
    .select('*')
    .eq('owner_id', sellerId)
    .eq('is_active', true)
    .single();

  if (storeError) {
    console.error('Error fetching store for seller profile:', storeError);
    // El vendedor puede existir sin tienda
  }

  return {
    ...profileData,
    store: storeData || {
      id: '',
      name: 'Sin tienda',
      slug: 'sin-tienda',
      description: null,
      logo_url: null,
      cover_image_url: null,
      location: null,
      phone: null,
      email: null,
      website: null,
      rating: 0,
      total_reviews: 0,
      total_products: 0,
      total_sales: 0,
      is_verified: false,
      is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      social_links: null,
    },
  } as SellerProfile;
}

/**
 * Obtiene los productos de un vendedor.
 * @param sellerId El ID del vendedor.
 * @param options Opciones de paginación y filtros.
 * @returns Los productos del vendedor.
 */
export async function getSellerProducts(
  sellerId: string,
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
    .eq('seller_id', sellerId);

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
    console.error('Error fetching seller products:', error);
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
 * Obtiene las reseñas de un vendedor.
 * @param sellerId El ID del vendedor.
 * @param options Opciones de paginación.
 * @returns Las reseñas del vendedor.
 */
export async function getSellerReviews(
  sellerId: string,
  options: {
    page?: number;
    limit?: number;
  } = {}
): Promise<{ reviews: Review[]; total: number; total_pages: number }> {
  const page = options.page || 1;
  const limit = options.limit || 10;
  const offset = (page - 1) * limit;

  // Obtener reseñas a través de la tienda del vendedor
  const { data: storeData } = await supabase
    .from('stores')
    .select('id')
    .eq('owner_id', sellerId)
    .eq('is_active', true)
    .single();

  if (!storeData) {
    return { reviews: [], total: 0, total_pages: 0 };
  }

  const { data, error, count } = await supabase
    .from('reviews')
    .select('*, buyer:profiles(full_name, avatar_url)', { count: 'exact' })
    .eq('store_id', storeData.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching seller reviews:', error);
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
 * Obtiene las estadísticas de un vendedor.
 * @param sellerId El ID del vendedor.
 * @returns Las estadísticas del vendedor.
 */
export async function getSellerStats(sellerId: string): Promise<SellerStats | null> {
  try {
    // Obtener total de productos
    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', sellerId)
      .eq('status', 'active');

    // Obtener total de ventas (simulado por ahora)
    const totalSales = Math.floor(Math.random() * 1000) + 100;

    // Obtener calificación promedio a través de la tienda
    const { data: storeData } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', sellerId)
      .eq('is_active', true)
      .single();

    let averageRating = 0;
    if (storeData) {
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('rating')
        .eq('store_id', storeData.id);

      averageRating = reviewsData && reviewsData.length > 0
        ? reviewsData.reduce((sum, review) => sum + review.rating, 0) / reviewsData.length
        : 0;
    }

    // Obtener tasa de respuesta (simulado por ahora)
    const responseRate = Math.floor(Math.random() * 20) + 80;

    return {
      total_products: totalProducts || 0,
      total_sales: totalSales,
      average_rating: averageRating,
      response_rate: responseRate,
    };
  } catch (error) {
    console.error('Error fetching seller stats:', error);
    return null;
  }
}

/**
 * Obtiene todos los vendedores con filtros y paginación.
 * @param options Opciones de filtros y paginación.
 * @returns Los vendedores que coinciden con los filtros.
 */
export async function getSellers(
  options: {
    page?: number;
    limit?: number;
    search?: string;
    location?: string;
    min_rating?: number;
    verified_only?: boolean;
    sort_by?: 'rating' | 'products' | 'sales' | 'member_since' | 'last_active';
    sort_order?: 'asc' | 'desc';
  } = {}
): Promise<{ sellers: SellerProfile[]; total: number; total_pages: number }> {
  const page = options.page || 1;
  const limit = options.limit || 12;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('profiles')
    .select('*, store:stores(*)', { count: 'exact' })
    .eq('role', 'seller');

  // Aplicar filtros
  if (options.verified_only) {
    query = query.eq('is_verified', true);
  }

  if (options.search) {
    query = query.ilike('full_name', `%${options.search}%`);
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
    console.error('Error fetching sellers:', error);
    return { sellers: [], total: 0, total_pages: 0 };
  }

  const total = count || 0;
  const total_pages = Math.ceil(total / limit);

  return {
    sellers: data || [],
    total,
    total_pages,
  };
}

/**
 * Actualiza el perfil de un vendedor.
 * @param sellerId El ID del vendedor.
 * @param updates Los campos a actualizar.
 * @returns El perfil actualizado.
 */
export async function updateSellerProfile(
  sellerId: string,
  updates: Partial<Omit<SellerProfile, 'id' | 'created_at' | 'updated_at'>>
): Promise<SellerProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', sellerId)
    .select('*, store:stores(*)')
    .single();

  if (error) {
    console.error('Error updating seller profile:', error);
    throw new Error(error.message);
  }

  return data as SellerProfile;
}

/**
 * Crea una nueva tienda para un vendedor.
 * @param sellerId El ID del vendedor.
 * @param storeData Los datos de la nueva tienda.
 * @returns La tienda creada.
 */
export async function createSellerStore(
  sellerId: string,
  storeData: {
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
  }
): Promise<SellerProfile | null> {
  // Crear la tienda
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .insert({
      owner_id: sellerId,
      ...storeData,
      is_active: true,
      is_verified: false,
      rating: 0,
      total_reviews: 0,
      total_products: 0,
      total_sales: 0,
    })
    .select()
    .single();

  if (storeError) {
    console.error('Error creating seller store:', storeError);
    throw new Error(storeError.message);
  }

  // Obtener el perfil actualizado con la nueva tienda
  return await getSellerProfileById(sellerId);
}
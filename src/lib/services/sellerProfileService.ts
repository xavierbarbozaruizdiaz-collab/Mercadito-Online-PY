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
  try {
    // 1. Obtener el perfil del vendedor
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', sellerId)
      .single();

  if (profileError) {
    // NO loguear errores esperados (400, 401) en producción
    const isExpectedError = 
      profileError.code === 'PGRST116' || 
      profileError.code === '23505' ||
      profileError.message?.includes('400') ||
      profileError.message?.includes('401') ||
      profileError.status === 400 ||
      profileError.status === 401;
    
    if (!isExpectedError && process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Error fetching seller profile (no crítico):', profileError);
    }
    return null;
  }

  if (!profileData) {
    return null;
  }

  // 2. Obtener la tienda asociada al vendedor (incluir inactivas también)
  let storeData = null;
  try {
    const { data, error: storeError } = await supabase
      .from('stores')
      .select('id, name, slug, description, logo_url, cover_image_url, location, phone, email, website, is_active, is_verified, seller_id, created_at, updated_at')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (!storeError && data) {
      storeData = data;
    } else if (storeError) {
      // Solo loguear errores inesperados (no 400, 401, PGRST116)
      const isExpectedError = 
        storeError.code === 'PGRST116' || 
        storeError.code === '23505' ||
        storeError.message?.includes('400') ||
        storeError.message?.includes('401') ||
        storeError.status === 400 ||
        storeError.status === 401;
      
      if (!isExpectedError && process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Error fetching store for seller profile (no crítico):', storeError);
      }
      // El vendedor puede existir sin tienda - continuar sin error
    }
  } catch (err: any) {
    // Error silencioso - el vendedor puede existir sin tienda
    const isExpectedError = 
      err?.code === 'PGRST116' || 
      err?.message?.includes('400') ||
      err?.message?.includes('401') ||
      err?.status === 400 ||
      err?.status === 401;
    
    if (!isExpectedError && process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Excepción al obtener tienda del vendedor (no crítico):', err?.message || err);
    }
  }

    return {
      ...(profileData as any),
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
  } catch (outerErr: any) {
    // Error silencioso - retornar null en lugar de propagar el error
    const isExpectedError = 
      outerErr?.code === 'PGRST116' || 
      outerErr?.code === '23505' ||
      outerErr?.message?.includes('400') ||
      outerErr?.message?.includes('401') ||
      outerErr?.status === 400 ||
      outerErr?.status === 401;
    
    if (!isExpectedError && process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Excepción en getSellerProfileById (no crítico):', outerErr?.message || outerErr);
    }
    return null;
  }
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
    .eq('seller_id', sellerId)
    .neq('status', 'deleted') // Excluir productos eliminados por defecto
    .not('status', 'is', null); // Excluir productos sin status

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

  // Si hay error relacionado con stock_quantity y usamos select('*'), 
  // Supabase debería manejarlo, pero si hay un problema, ignorarlo
  if (error && error.message?.includes('stock_quantity')) {
    console.warn('⚠️ stock_quantity no existe en productos. Continuando sin esa columna.');
    // Con select('*'), esto no debería pasar normalmente
  }

  if (error && !error.message?.includes('stock_quantity')) {
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
  let storeData = null;
  try {
    const { data } = await supabase
      .from('stores')
      .select('id')
      .eq('seller_id', sellerId)
      .eq('is_active', true)
      .maybeSingle();
    storeData = data;
  } catch (err: any) {
    // Error silencioso - continuar sin datos de tienda
    const isExpectedError = 
      err?.code === 'PGRST116' || 
      err?.message?.includes('400') ||
      err?.message?.includes('401') ||
      err?.status === 400 ||
      err?.status === 401;
    
    if (!isExpectedError && process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Error obteniendo tienda para reviews (no crítico):', err?.message || err);
    }
  }

  if (!storeData) {
    return { reviews: [], total: 0, total_pages: 0 };
  }

  const { data, error, count } = await supabase
    .from('reviews')
    .select('*, buyer:profiles(id, first_name, last_name, email, avatar_url)', { count: 'exact' })
    .eq('store_id', (storeData as any).id)
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
    // Obtener total de productos - no filtrar por status porque algunos productos pueden no tenerlo
    // Solo contar productos que no estén explícitamente pausados o archivados si tienen status
    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', sellerId)
      .or('status.is.null,status.eq.active');

    // Obtener total de ventas (simulado por ahora)
    const totalSales = Math.floor(Math.random() * 1000) + 100;

    // Obtener calificación promedio a través de la tienda
    let storeData = null;
    try {
      const { data } = await supabase
        .from('stores')
        .select('id')
        .eq('seller_id', sellerId)
        .eq('is_active', true)
        .maybeSingle();
      storeData = data;
    } catch (err: any) {
      // Error silencioso - continuar sin datos de tienda
      const isExpectedError = 
        err?.code === 'PGRST116' || 
        err?.message?.includes('400') ||
        err?.message?.includes('401') ||
        err?.status === 400 ||
        err?.status === 401;
      
      if (!isExpectedError && process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Error obteniendo tienda para stats (no crítico):', err?.message || err);
      }
    }

    let averageRating = 0;
    if (storeData) {
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('rating')
        .eq('store_id', (storeData as any).id);

      averageRating = reviewsData && reviewsData.length > 0
        ? reviewsData.reduce((sum, review: any) => sum + review.rating, 0) / reviewsData.length
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

  // Proteger contra errores 400 en el join con stores
  // En lugar de hacer join, obtendremos las tiendas por separado si es necesario
  let query = supabase
    .from('profiles')
    .select('id, first_name, last_name, email, phone, avatar_url, cover_url, bio, location, role, is_verified, rating, created_at, updated_at', { count: 'exact' })
    .eq('role', 'seller');

  // Aplicar filtros
  if (options.verified_only) {
    query = query.eq('is_verified', true);
  }

  if (options.search) {
    // full_name no existe como columna, buscar en first_name y last_name
    query = query.or(`first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%`);
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
    // NO loguear errores esperados (400, 401) en producción
    const isExpectedError = 
      error.code === 'PGRST116' || 
      error.message?.includes('400') ||
      error.message?.includes('401') ||
      error.status === 400 ||
      error.status === 401;
    
    if (!isExpectedError && process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Error fetching sellers (no crítico):', error);
    }
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
  updates: Partial<Omit<SellerProfile, 'id' | 'created_at' | 'updated_at' | 'store'>>
): Promise<SellerProfile | null> {
  const { data, error } = await (supabase as any)
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
  const { error: storeError } = await (supabase as any)
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
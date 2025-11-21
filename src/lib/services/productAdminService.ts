// ============================================
// MERCADITO ONLINE PY - PRODUCT ADMIN SERVICE
// Servicio para gestión de productos desde admin
// ============================================

import { supabase } from '@/lib/supabase/client';

// ============================================
// TIPOS
// ============================================

export type ProductApprovalStatus = 'pending' | 'approved' | 'rejected';

export type ProductAdmin = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  cover_url: string | null;
  status: string;
  approval_status: ProductApprovalStatus;
  created_at: string;
  updated_at: string;
  seller: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  store: {
    id: string;
    name: string;
    slug: string;
  } | null;
  category: {
    id: string;
    name: string;
  } | null;
  sales_count?: number;
  views_count?: number;
};

export type ProductFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'active' | 'paused' | 'archived';

export type ProductStats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  active: number;
  paused: number;
  archived: number;
  total_sales: number;
  total_revenue: number;
};

// ============================================
// FUNCIONES DEL SERVICIO
// ============================================

/**
 * Obtiene todos los productos con filtros (admin)
 */
export async function getAllProducts(options: {
  page?: number;
  limit?: number;
  filter?: ProductFilter;
  search?: string;
  category_id?: string;
  seller_id?: string;
}): Promise<{ products: ProductAdmin[]; total: number; total_pages: number }> {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('products')
    .select(`
      id,
      title,
      description,
      price,
      cover_url,
      status,
      approval_status,
      created_at,
      updated_at,
      seller_id,
      store_id,
      category_id
    `, { count: 'exact' });

  // Aplicar filtros
  if (options.filter) {
    switch (options.filter) {
      case 'pending':
        query = query.eq('approval_status', 'pending');
        break;
      case 'approved':
        query = query.eq('approval_status', 'approved');
        break;
      case 'rejected':
        query = query.eq('approval_status', 'rejected');
        break;
      case 'active':
        query = query.eq('status', 'active');
        break;
      case 'paused':
        query = query.eq('status', 'paused');
        break;
      case 'archived':
        query = query.eq('status', 'archived');
        break;
    }
  }

  if (options.category_id) {
    query = query.eq('category_id', options.category_id);
  }

  if (options.seller_id) {
    query = query.eq('seller_id', options.seller_id);
  }

  // Búsqueda
  if (options.search) {
    query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%`);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching products:', error);
    return { products: [], total: 0, total_pages: 0 };
  }

  const total = count || 0;
  const total_pages = Math.ceil(total / limit);

  // Obtener información adicional de sellers, stores y categories
  const enrichedProducts = await Promise.all(
    (data || []).map(async (p: any) => {
      const [sellerRes, storeRes, categoryRes] = await Promise.all([
        p.seller_id ? supabase
          .from('profiles')
          .select('id, email, first_name, last_name')
          .eq('id', p.seller_id)
          .single() : { data: null, error: null },
        p.store_id ? supabase
          .from('stores')
          .select('id, name, slug')
          .eq('id', p.store_id)
          .single() : { data: null, error: null },
        p.category_id ? supabase
          .from('categories')
          .select('id, name')
          .eq('id', p.category_id)
          .single() : { data: null, error: null },
      ]);

      return {
        ...p,
        seller: sellerRes.data,
        store: storeRes.data,
        category: categoryRes.data,
        sales_count: 0, // TODO: calcular desde orders
        views_count: 0, // TODO: calcular desde analytics
      };
    })
  );

  return {
    products: enrichedProducts as ProductAdmin[],
    total,
    total_pages,
  };
}

/**
 * Aprueba un producto
 */
export async function approveProduct(
  productId: string,
  adminId: string
): Promise<void> {
  // Using 'as any' to bypass Supabase strict type constraint for updates
  const { error } = await (supabase as any)
    .from('products')
    .update({
      approval_status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: adminId,
      status: 'active', // Activar automáticamente al aprobar
    })
    .eq('id', productId);

  if (error) {
    console.error('Error approving product:', error);
    throw new Error(error.message);
  }
}

/**
 * Rechaza un producto
 */
export async function rejectProduct(
  productId: string,
  adminId: string,
  reason?: string
): Promise<void> {
  // Using 'as any' to bypass Supabase strict type constraint for updates
  const { error } = await (supabase as any)
    .from('products')
    .update({
      approval_status: 'rejected',
      rejection_reason: reason || null,
      status: 'paused', // Pausar al rechazar
    })
    .eq('id', productId);

  if (error) {
    console.error('Error rejecting product:', error);
    throw new Error(error.message);
  }
}

/**
 * Actualiza un producto (admin)
 */
export async function updateProduct(
  productId: string,
  updates: Partial<{
    title: string;
    description: string;
    price: number;
    status: string;
    approval_status: ProductApprovalStatus;
    category_id: string;
  }>
): Promise<void> {
  // Using 'as any' to bypass Supabase strict type constraint for updates
  const { error } = await (supabase as any)
    .from('products')
    .update(updates)
    .eq('id', productId);

  if (error) {
    console.error('Error updating product:', error);
    throw new Error(error.message);
  }
}

/**
 * Elimina un producto (admin)
 */
export async function deleteProduct(productId: string): Promise<void> {
  // Primero obtener imágenes para eliminarlas del storage
  const { data: images } = await supabase
    .from('product_images')
    .select('url')
    .eq('product_id', productId);

  // Eliminar producto (esto eliminará imágenes por CASCADE)
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);

  if (error) {
    console.error('Error deleting product:', error);
    throw new Error(error.message);
  }

  // Eliminar imágenes del storage si existen
  if (images && images.length > 0) {
    const fileNames = images
      .map((img: { url: string }) => {
        const url = img.url;
        const match = url.match(/products\/([^/]+)\/(.+)$/);
        return match ? `${match[1]}/${match[2]}` : null;
      })
      .filter((fileName): fileName is string => fileName !== null);

    if (fileNames.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('products')
        .remove(fileNames);

      if (storageError) {
        console.warn('Error deleting product images from storage:', storageError);
      }
    }
  }
}

/**
 * Obtiene estadísticas de productos
 */
export async function getProductStats(): Promise<ProductStats> {
  try {
    const [
      totalResult,
      pendingResult,
      approvedResult,
      rejectedResult,
      activeResult,
      pausedResult,
      archivedResult,
    ] = await Promise.all([
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('approval_status', 'pending'),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('approval_status', 'approved'),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('approval_status', 'rejected'),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'paused'),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'archived'),
    ]);

    // Calcular ventas y revenue (simulado por ahora)
    // TODO: calcular desde orders reales
    const total_sales = 0;
    const total_revenue = 0;

    return {
      total: totalResult.count || 0,
      pending: pendingResult.count || 0,
      approved: approvedResult.count || 0,
      rejected: rejectedResult.count || 0,
      active: activeResult.count || 0,
      paused: pausedResult.count || 0,
      archived: archivedResult.count || 0,
      total_sales,
      total_revenue,
    };
  } catch (error) {
    console.error('Error fetching product stats:', error);
    return {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      active: 0,
      paused: 0,
      archived: 0,
      total_sales: 0,
      total_revenue: 0,
    };
  }
}

/**
 * Obtiene productos más vendidos
 */
export async function getTopSellingProducts(limit: number = 10): Promise<ProductAdmin[]> {
  // TODO: Implementar con datos reales de orders
  // Por ahora retornar productos aprobados ordenados por created_at
  // NOTA: No podemos hacer join con profiles porque products.seller_id referencia auth.users, no profiles
  // Obtener solo seller_id y hacer consulta separada si se necesita información del vendedor
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      title,
      price,
      cover_url,
      seller_id
    `)
    .eq('approval_status', 'approved')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching top selling products:', error);
    return [];
  }

  return (data || []) as ProductAdmin[];
}

/**
 * Obtiene productos sin ventas
 */
export async function getProductsWithoutSales(limit: number = 20): Promise<ProductAdmin[]> {
  // TODO: Implementar con datos reales de orders
  // Por ahora retornar productos aprobados activos
  // NOTA: No podemos hacer join con profiles porque products.seller_id referencia auth.users, no profiles
  // Obtener solo seller_id y hacer consulta separada si se necesita información del vendedor
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      title,
      price,
      cover_url,
      created_at,
      seller_id
    `)
    .eq('approval_status', 'approved')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching products without sales:', error);
    return [];
  }

  return (data || []) as ProductAdmin[];
}


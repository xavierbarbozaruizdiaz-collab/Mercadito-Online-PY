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

  // IMPORTANTE: Excluir productos eliminados (soft delete) por defecto
  // Solo mostrarlos si el filtro es explícitamente 'archived' (que muestra eliminados)
  // 'all' también excluye eliminados para mantener consistencia
  // También excluir productos con status NULL (por seguridad)
  if (options.filter !== 'archived') {
    query = query.neq('status', 'deleted').not('status', 'is', null);
  }

  // Aplicar filtros según lógica correcta
  if (options.filter) {
    switch (options.filter) {
      case 'pending':
        // Pendientes: productos que necesitan revisión del admin
        // approval_status = 'pending' AND status != 'deleted'
        query = query.eq('approval_status', 'pending');
        // Ya excluimos 'deleted' arriba si filter !== 'all'
        break;
      case 'approved':
        // Aprobados: approval_status = 'approved' AND status != 'deleted'
        query = query.eq('approval_status', 'approved');
        // Ya excluimos 'deleted' arriba si filter !== 'all'
        break;
      case 'rejected':
        // Rechazados: approval_status = 'rejected' AND status != 'deleted'
        query = query.eq('approval_status', 'rejected');
        // Ya excluimos 'deleted' arriba si filter !== 'all'
        break;
      case 'active':
        // Activos: productos realmente publicados (como en la vitrina pública)
        // status = 'active' AND approval_status = 'approved' AND status != 'deleted'
        query = query
          .eq('status', 'active')
          .eq('approval_status', 'approved');
        // Ya excluimos 'deleted' arriba si filter !== 'all'
        break;
      case 'paused':
        // Pausados: status = 'paused' AND status != 'deleted'
        query = query.eq('status', 'paused');
        // Ya excluimos 'deleted' arriba si filter !== 'all'
        break;
      case 'archived':
        // Archivados/Eliminados: status = 'deleted'
        // Para este filtro, NO excluimos 'deleted', solo mostramos eliminados
        query = query.eq('status', 'deleted');
        break;
      // 'all' muestra todos EXCEPTO eliminados (útil para admin)
      case 'all':
        // Ya excluimos 'deleted' arriba si filter !== 'all'
        // Mostrar todos los productos no eliminados
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

  // Invalidar cache del producto y listados relacionados
  try {
    const { invalidateProductCache } = await import('@/lib/utils/cache');
    invalidateProductCache(productId);
    // Invalidar también listados generales que puedan incluir este producto
    const { cache } = await import('@/lib/utils/cache');
    cache.delete(`products:*`);
    cache.delete(`featured:*`);
    cache.delete(`recent:*`);
  } catch (cacheError) {
    console.warn('Error invalidating cache after approval:', cacheError);
    // No fallar si hay error en cache
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

  // Invalidar cache del producto y listados relacionados
  try {
    const { invalidateProductCache } = await import('@/lib/utils/cache');
    invalidateProductCache(productId);
    // Invalidar también listados generales
    const { cache } = await import('@/lib/utils/cache');
    cache.delete(`products:*`);
    cache.delete(`featured:*`);
    cache.delete(`recent:*`);
  } catch (cacheError) {
    console.warn('Error invalidating cache after rejection:', cacheError);
    // No fallar si hay error en cache
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
 * Elimina un producto (admin) - SOFT DELETE
 * Marca el producto como eliminado (status = 'deleted') en lugar de eliminarlo físicamente
 */
export async function deleteProduct(productId: string): Promise<void> {
  // SOFT DELETE: Marcar producto como eliminado
  const { error } = await supabase
    .from('products')
    .update({ 
      status: 'deleted',
      updated_at: new Date().toISOString()
    })
    .eq('id', productId);

  if (error) {
    console.error('Error marking product as deleted:', error);
    throw new Error(error.message);
  }

  // NOTA: No eliminamos imágenes del storage en soft delete
  // Las imágenes se mantienen por si el producto se restaura en el futuro
  // Si se necesita eliminación física completa, crear una función separada
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
      // Total: excluir productos eliminados (soft delete) y status NULL
      supabase.from('products').select('id', { count: 'exact', head: true }).neq('status', 'deleted').not('status', 'is', null),
      
      // Pendientes: productos que necesitan revisión del admin
      // approval_status = 'pending' AND status != 'deleted'
      supabase.from('products').select('id', { count: 'exact', head: true })
        .eq('approval_status', 'pending')
        .neq('status', 'deleted')
        .not('status', 'is', null),
      
      // Aprobados: approval_status = 'approved' AND status != 'deleted'
      supabase.from('products').select('id', { count: 'exact', head: true })
        .eq('approval_status', 'approved')
        .neq('status', 'deleted')
        .not('status', 'is', null),
      
      // Rechazados: approval_status = 'rejected' AND status != 'deleted'
      supabase.from('products').select('id', { count: 'exact', head: true })
        .eq('approval_status', 'rejected')
        .neq('status', 'deleted')
        .not('status', 'is', null),
      
      // Activos: productos realmente publicados (como en la vitrina pública)
      // status = 'active' AND approval_status = 'approved' AND status != 'deleted'
      supabase.from('products').select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('approval_status', 'approved')
        .neq('status', 'deleted')
        .not('status', 'is', null),
      
      // Pausados: status = 'paused' AND status != 'deleted'
      supabase.from('products').select('id', { count: 'exact', head: true })
        .eq('status', 'paused')
        .neq('status', 'deleted')
        .not('status', 'is', null),
      
      // Archivados/Eliminados: status = 'deleted'
      supabase.from('products').select('id', { count: 'exact', head: true })
        .eq('status', 'deleted'),
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


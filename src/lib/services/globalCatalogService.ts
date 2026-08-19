// ============================================
// MERCADITO ONLINE PY - GLOBAL CATALOG SERVICE
// Servicio para obtener productos del Catálogo General de Mercadito
// ============================================

import { supabase } from '@/lib/supabase/client';
import { Product } from '@/types';

// ============================================
// TIPOS
// ============================================

export interface GlobalCatalogOptions {
  page?: number;
  pageSize?: number;
  excludeProductIds?: string[];
}

export interface GlobalCatalogResponse {
  products: Product[];
  hasMore: boolean;
  total?: number;
  page: number;
  pageSize: number;
}

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================

/**
 * Obtiene productos del Catálogo General de Mercadito para la web
 * 
 * Reglas:
 * - Solo productos con is_in_global_catalog = true
 * - Solo productos con status = 'active'
 * - Validar vigencia (catalog_valid_from y catalog_valid_until)
 * - Excluir productos con exclude_from_store_catalog = true
 * - Repartir por tienda (máx 1-2 productos por store_id por página)
 * - Ordenar por catalog_priority (desc) y luego aleatorio
 */
export async function getGlobalCatalogProductsForWeb(
  options: GlobalCatalogOptions = {}
): Promise<GlobalCatalogResponse> {
  const {
    page = 1,
    pageSize = 24,
    excludeProductIds = [],
  } = options;

  try {
    const now = new Date().toISOString();

    // Construir query base
    let query = supabase
      .from('products')
      .select(`
        id,
        title,
        description,
        price,
        compare_price,
        cover_url,
        condition,
        sale_type,
        category_id,
        store_id,
        seller_id,
        status,
        stock_quantity,
        tags,
        seo_title,
        seo_description,
        is_featured,
        is_in_global_catalog,
        catalog_valid_from,
        catalog_valid_until,
        catalog_priority,
        exclude_from_store_catalog,
        created_at,
        updated_at,
        stores (
          id,
          name,
          slug,
          logo_url,
          is_active
        ),
        categories (
          id,
          name,
          slug
        )
      `, { count: 'exact' })
      // Filtros principales
      .eq('is_in_global_catalog', true)
      .eq('status', 'active')
      .eq('exclude_from_store_catalog', false)
      .eq('stores.is_active', true);

    // Nota: La exclusión de productos se hará en memoria después de la query

    // Ordenar por prioridad (descendente) y luego por random
    // Nota: PostgreSQL no tiene ORDER BY RANDOM() directo en Supabase,
    // así que ordenamos por prioridad y luego aplicamos shuffle en memoria
    query = query.order('catalog_priority', { ascending: false });
    query = query.order('created_at', { ascending: false }); // Orden secundario para consistencia

    // Obtener más productos de los necesarios para poder repartir por tienda
    // Traemos 3x el pageSize para tener margen para el reparto
    const fetchLimit = pageSize * 3;
    const offset = (page - 1) * pageSize;

    query = query.range(offset, offset + fetchLimit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[GlobalCatalogService] Error fetching products:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return {
        products: [],
        hasMore: false,
        total: 0,
        page,
        pageSize,
      };
    }

    // Filtrar por vigencia, tiendas activas y excluir productos específicos en memoria
    const nowDate = new Date();
    const excludeSet = new Set(excludeProductIds);
    const validProducts = data.filter((product: any) => {
      // Excluir productos específicos
      if (excludeSet.has(product.id)) {
        return false;
      }

      // Validar que la tienda esté activa
      const store = Array.isArray(product.stores) ? product.stores[0] : product.stores;
      if (!store || !store.is_active) {
        return false;
      }

      // Validar catalog_valid_from
      if (product.catalog_valid_from) {
        const validFrom = new Date(product.catalog_valid_from);
        if (validFrom > nowDate) {
          return false; // Aún no es válido
        }
      }

      // Validar catalog_valid_until
      if (product.catalog_valid_until) {
        const validUntil = new Date(product.catalog_valid_until);
        if (validUntil < nowDate) {
          return false; // Ya expiró
        }
      }

      return true;
    });

    if (validProducts.length === 0) {
      return {
        products: [],
        hasMore: false,
        total: 0,
        page,
        pageSize,
      };
    }

    // Aplicar shuffle ligero para aleatoriedad dentro de la misma prioridad
    const shuffled = shuffleArray([...validProducts]);

    // Repartir por tienda: máximo 1-2 productos por store_id por página
    const distributedProducts = distributeByStore(shuffled, pageSize);

    // Calcular si hay más páginas
    const hasMore = (count || 0) > offset + distributedProducts.length;

    return {
      products: distributedProducts,
      hasMore,
      total: count || undefined,
      page,
      pageSize,
    };
  } catch (error) {
    console.error('[GlobalCatalogService] Error:', error);
    throw error;
  }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

/**
 * Shuffle ligero de array (Fisher-Yates)
 * Mantiene el orden por prioridad pero añade aleatoriedad
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Distribuye productos por tienda, limitando a máximo 2 productos por store_id
 */
function distributeByStore(products: any[], maxProducts: number): any[] {
  const storeCounts = new Map<string, number>();
  const distributed: any[] = [];
  const maxPerStore = 2; // Máximo de productos por tienda

  for (const product of products) {
    if (distributed.length >= maxProducts) {
      break;
    }

    const storeId = product.store_id || product.stores?.id;
    if (!storeId) {
      // Si no tiene store_id, agregarlo de todas formas
      distributed.push(product);
      continue;
    }

    const currentCount = storeCounts.get(storeId) || 0;
    if (currentCount < maxPerStore) {
      distributed.push(product);
      storeCounts.set(storeId, currentCount + 1);
    }
  }

  return distributed;
}

// ============================================
// FUNCIONES ADICIONALES
// ============================================

/**
 * Obtiene el total de productos activos en el catálogo global
 */
export async function getGlobalCatalogTotal(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, catalog_valid_from, catalog_valid_until', { count: 'exact' })
      .eq('is_in_global_catalog', true)
      .eq('status', 'active')
      .eq('exclude_from_store_catalog', false)
      .eq('stores.is_active', true);

    if (error) {
      console.error('[GlobalCatalogService] Error getting total:', error);
      return 0;
    }

    // Filtrar por vigencia en memoria
    const nowDate = new Date();
    const validCount = (data || []).filter((product: any) => {
      if (product.catalog_valid_from) {
        const validFrom = new Date(product.catalog_valid_from);
        if (validFrom > nowDate) return false;
      }
      if (product.catalog_valid_until) {
        const validUntil = new Date(product.catalog_valid_until);
        if (validUntil < nowDate) return false;
      }
      return true;
    }).length;

    return validCount;
  } catch (error) {
    console.error('[GlobalCatalogService] Error:', error);
    return 0;
  }
}


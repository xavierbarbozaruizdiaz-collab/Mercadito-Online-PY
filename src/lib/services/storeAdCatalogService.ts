// ============================================
// MERCADITO ONLINE PY - STORE AD CATALOG SERVICE
// Servicio para gestionar catálogos de anuncios por tienda
// ============================================

import { supabase } from '@/lib/supabase/client';

// ============================================
// TIPOS
// ============================================

export interface StoreAdCatalog {
  id: string;
  store_id: string;
  slug: string;
  name: string;
  type: string;
  filters: Record<string, any>;
  is_active: boolean;
  last_generated_at: string | null;
  products_count: number;
  created_at: string;
  updated_at: string;
}

export interface StoreAdCatalogProduct {
  id: string;
  catalog_id: string;
  product_id: string;
  created_at: string;
}

export interface CreateCatalogPayload {
  slug: string;
  name: string;
  type?: string;
  filters?: Record<string, any>;
  is_active?: boolean;
}

export interface UpdateCatalogPayload {
  name?: string;
  type?: string;
  filters?: Record<string, any>;
  is_active?: boolean;
}

export interface CatalogWithProducts extends StoreAdCatalog {
  products: Array<{
    id: string;
    product_id: string;
    created_at: string;
    product?: {
      id: string;
      title: string;
      price: number;
      cover_url: string | null;
      status: string;
    };
  }>;
}

// ============================================
// FUNCIONES
// ============================================

/**
 * Obtiene todos los catálogos de una tienda
 */
export async function getStoreAdCatalogs(
  storeId: string,
  options: { includeInactive?: boolean } = {}
): Promise<StoreAdCatalog[]> {
  try {
    let query = supabase
      .from('store_ad_catalogs')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (!options.includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      // Si es error 406, puede ser problema de RLS o headers
      if (error.code === 'PGRST301' || error.message?.includes('406') || error.message?.includes('Not Acceptable')) {
        console.warn('[StoreAdCatalogService] Error 406 al obtener catálogos, intentando sin filtros:', error);
        // Intentar sin filtros de is_active
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('store_ad_catalogs')
          .select('*')
          .eq('store_id', storeId)
          .order('created_at', { ascending: false });
        
        if (fallbackError) {
          console.error('[StoreAdCatalogService] Error en fallback:', fallbackError);
          return []; // Retornar array vacío en lugar de lanzar error
        }
        return (fallbackData || []) as StoreAdCatalog[];
      }
      console.error('[StoreAdCatalogService] Error fetching catalogs:', error);
      throw error;
    }

    return (data || []) as StoreAdCatalog[];
  } catch (error) {
    console.error('[StoreAdCatalogService] Error:', error);
    // En caso de error, retornar array vacío en lugar de lanzar
    return [];
  }
}

/**
 * Obtiene un catálogo por slug y storeId con sus productos (para feeds públicos)
 */
export async function getStoreAdCatalogBySlug(
  catalogSlug: string,
  storeId: string
): Promise<CatalogWithProducts | null> {
  try {
    // Obtener catálogo por slug
    const { data: catalog, error: catalogError } = await supabase
      .from('store_ad_catalogs')
      .select('*')
      .eq('slug', catalogSlug)
      .eq('store_id', storeId)
      .eq('is_active', true) // Solo catálogos activos
      .single();

    if (catalogError || !catalog) {
      console.error('[StoreAdCatalogService] Error fetching catalog by slug:', catalogError);
      return null;
    }

    // Obtener productos del catálogo (solo activos)
    const { data: catalogProducts, error: productsError } = await supabase
      .from('store_ad_catalog_products')
      .select(`
        id,
        product_id,
        created_at,
        product:products!inner(
          id,
          title,
          description,
          price,
          cover_url,
          status,
          condition
        )
      `)
      .eq('catalog_id', catalog.id)
      .eq('product.status', 'active') // Solo productos activos
      .order('created_at', { ascending: false });

    if (productsError) {
      console.error('[StoreAdCatalogService] Error fetching catalog products:', productsError);
    }

    return {
      ...(catalog as StoreAdCatalog),
      products: (catalogProducts || []).map((cp: any) => ({
        id: cp.id,
        product_id: cp.product_id,
        created_at: cp.created_at,
        product: cp.product,
      })),
    };
  } catch (error) {
    console.error('[StoreAdCatalogService] Error:', error);
    return null;
  }
}

/**
 * Obtiene un catálogo por ID con sus productos
 */
export async function getStoreAdCatalogById(
  catalogId: string,
  storeId: string
): Promise<CatalogWithProducts | null> {
  try {
    // Obtener catálogo
    const { data: catalog, error: catalogError } = await supabase
      .from('store_ad_catalogs')
      .select('*')
      .eq('id', catalogId)
      .eq('store_id', storeId)
      .single();

    if (catalogError || !catalog) {
      console.error('[StoreAdCatalogService] Error fetching catalog:', catalogError);
      return null;
    }

    // Obtener productos del catálogo
    const { data: catalogProducts, error: productsError } = await supabase
      .from('store_ad_catalog_products')
      .select(`
        id,
        product_id,
        created_at,
        product:products!inner(
          id,
          title,
          price,
          cover_url,
          status
        )
      `)
      .eq('catalog_id', catalogId)
      .order('created_at', { ascending: false });

    if (productsError) {
      console.error('[StoreAdCatalogService] Error fetching catalog products:', productsError);
    }

    return {
      ...(catalog as StoreAdCatalog),
      products: (catalogProducts || []).map((cp: any) => ({
        id: cp.id,
        product_id: cp.product_id,
        created_at: cp.created_at,
        product: cp.product,
      })),
    };
  } catch (error) {
    console.error('[StoreAdCatalogService] Error:', error);
    return null;
  }
}

/**
 * Crea un nuevo catálogo de anuncios
 */
export async function createStoreAdCatalog(
  storeId: string,
  payload: CreateCatalogPayload
): Promise<StoreAdCatalog> {
  try {
    // Validar slug
    if (!payload.slug || payload.slug.trim().length === 0) {
      throw new Error('El slug es requerido');
    }

    // Normalizar slug (eliminar espacios, convertir a minúsculas, reemplazar espacios con guiones)
    const normalizedSlug = payload.slug
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    if (normalizedSlug.length === 0) {
      throw new Error('El slug debe contener al menos un carácter válido');
    }

    // Verificar que el slug no exista para esta tienda (con mejor manejo de errores)
    const { data: existing, error: checkError } = await supabase
      .from('store_ad_catalogs')
      .select('id, slug')
      .eq('store_id', storeId)
      .eq('slug', normalizedSlug)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 es "no rows returned", que es esperado si no existe
      console.error('[StoreAdCatalogService] Error checking existing catalog:', checkError);
      throw new Error('Error al verificar si el catálogo existe');
    }

    if (existing) {
      throw new Error(`Ya existe un catálogo con el slug "${existing.slug}" para tu tienda. Por favor, usa un slug diferente.`);
    }

    // Intentar crear con el slug normalizado
    // Si hay conflicto de slug, agregar un número al final
    let finalSlug = normalizedSlug;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      try {
        const { data, error } = await supabase
          .from('store_ad_catalogs')
          .insert({
            store_id: storeId,
            slug: finalSlug,
            name: payload.name,
            type: payload.type || 'default',
            filters: payload.filters || {},
            is_active: payload.is_active !== undefined ? payload.is_active : true,
          })
          .select()
          .single();

        if (error) {
          // Si es error de constraint único (slug duplicado), intentar con otro slug
          if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
            attempts++;
            if (attempts < maxAttempts) {
              finalSlug = `${normalizedSlug}-${attempts}`;
              continue; // Intentar de nuevo con nuevo slug
            } else {
              throw new Error(`No se pudo crear el catálogo. El slug "${normalizedSlug}" y sus variantes ya están en uso. Por favor, usa un slug diferente.`);
            }
          }
          // Para otros errores, lanzar directamente
          console.error('[StoreAdCatalogService] Error creating catalog:', error);
          if (error.message?.includes('Ya existe')) {
            throw new Error(error.message);
          }
          throw new Error(error.message || 'Error al crear el catálogo');
        }

        return data as StoreAdCatalog;
      } catch (insertError: any) {
        // Si ya es nuestro error personalizado, relanzarlo
        if (insertError.message && !insertError.code) {
          throw insertError;
        }
        // Si es error de constraint, continuar el loop
        if (insertError.code === '23505' || insertError.message?.includes('duplicate key')) {
          attempts++;
          if (attempts < maxAttempts) {
            finalSlug = `${normalizedSlug}-${attempts}`;
            continue;
          }
        }
        throw insertError;
      }
    }

    throw new Error('No se pudo crear el catálogo después de varios intentos');
  } catch (error: any) {
    console.error('[StoreAdCatalogService] Error creating catalog:', error);
    // Mejorar mensajes de error
    if (error.message) {
      throw error;
    }
    if (error.code === '23505') {
      throw new Error('Ya existe un catálogo con ese slug para tu tienda. Por favor, usa un slug diferente.');
    }
    throw new Error(error.message || 'Error al crear el catálogo');
  }
}

/**
 * Actualiza un catálogo de anuncios
 */
export async function updateStoreAdCatalog(
  catalogId: string,
  storeId: string,
  payload: UpdateCatalogPayload
): Promise<StoreAdCatalog> {
  try {
    const updateData: any = {};

    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.type !== undefined) updateData.type = payload.type;
    if (payload.filters !== undefined) updateData.filters = payload.filters;
    if (payload.is_active !== undefined) updateData.is_active = payload.is_active;

    const { data, error } = await supabase
      .from('store_ad_catalogs')
      .update(updateData)
      .eq('id', catalogId)
      .eq('store_id', storeId) // Verificación de seguridad
      .select()
      .single();

    if (error) {
      console.error('[StoreAdCatalogService] Error updating catalog:', error);
      throw error;
    }

    return data as StoreAdCatalog;
  } catch (error: any) {
    console.error('[StoreAdCatalogService] Error:', error);
    throw error;
  }
}

/**
 * Elimina un catálogo de anuncios
 */
export async function deleteStoreAdCatalog(
  catalogId: string,
  storeId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('store_ad_catalogs')
      .delete()
      .eq('id', catalogId)
      .eq('store_id', storeId); // Verificación de seguridad

    if (error) {
      console.error('[StoreAdCatalogService] Error deleting catalog:', error);
      throw error;
    }
  } catch (error: any) {
    console.error('[StoreAdCatalogService] Error:', error);
    throw error;
  }
}

/**
 * Agrega un producto a un catálogo
 */
export async function addProductToCatalog(
  catalogId: string,
  productId: string,
  storeId: string
): Promise<StoreAdCatalogProduct> {
  try {
    // Verificar que el catálogo pertenece a la tienda
    const { data: catalog } = await supabase
      .from('store_ad_catalogs')
      .select('id')
      .eq('id', catalogId)
      .eq('store_id', storeId)
      .single();

    if (!catalog) {
      throw new Error('No tienes permiso para modificar este catálogo');
    }

    // Verificar que el producto pertenece a la tienda
    // Algunos productos pueden tener store_id, otros solo seller_id
    // Necesitamos verificar ambos casos
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, store_id, seller_id')
      .eq('id', productId)
      .maybeSingle();

    if (productError && productError.code !== 'PGRST116') {
      console.error('[StoreAdCatalogService] Error checking product:', productError);
      // Si es error 406, puede ser problema de RLS o headers
      if (productError.code === 'PGRST301' || productError.message?.includes('406') || productError.message?.includes('Not Acceptable')) {
        throw new Error('Error al verificar el producto. Por favor, verifica que el producto existe y pertenece a tu tienda.');
      }
      throw new Error('Error al verificar el producto');
    }

    if (!product) {
      throw new Error('El producto no existe o no tienes permiso para agregarlo');
    }

    // Verificar que el producto pertenece a la tienda
    // Opción 1: El producto tiene store_id y coincide
    // Opción 2: El producto tiene seller_id y la tienda tiene ese seller_id
    if (product.store_id && product.store_id !== storeId) {
      throw new Error('Este producto pertenece a otra tienda');
    }

    // Si no tiene store_id, verificar por seller_id
    if (!product.store_id && product.seller_id) {
      const { data: store } = await supabase
        .from('stores')
        .select('seller_id')
        .eq('id', storeId)
        .single();

      if (!store || store.seller_id !== product.seller_id) {
        throw new Error('Este producto no pertenece a tu tienda');
      }
    }

    // Verificar que no esté duplicado (usar maybeSingle para evitar error si no existe)
    const { data: existing, error: checkError } = await supabase
      .from('store_ad_catalog_products')
      .select('id')
      .eq('catalog_id', catalogId)
      .eq('product_id', productId)
      .maybeSingle();

    // Si hay error diferente a "no rows returned", lanzarlo
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[StoreAdCatalogService] Error checking duplicate product:', checkError);
      throw new Error('Error al verificar si el producto ya está en el catálogo');
    }

    if (existing) {
      throw new Error('El producto ya está en este catálogo');
    }

    // Intentar insertar con manejo mejorado de errores
    const { data, error } = await supabase
      .from('store_ad_catalog_products')
      .insert({
        catalog_id: catalogId,
        product_id: productId,
      })
      .select()
      .single();

    if (error) {
      console.error('[StoreAdCatalogService] Error adding product:', error);
      
      // Manejar error 406 (Not Acceptable) - puede ser problema de RLS o headers
      if (error.code === 'PGRST301' || 
          error.status === 406 || 
          error.message?.includes('406') || 
          error.message?.includes('Not Acceptable')) {
        // Verificar si es un problema de permisos RLS
        throw new Error('No tienes permiso para agregar este producto. Verifica que el producto pertenece a tu tienda y que el catálogo es tuyo.');
      }
      
      // Manejar errores específicos de constraint único (duplicado)
      if (error.code === '23505' || 
          error.message?.includes('duplicate key') || 
          error.message?.includes('unique constraint') ||
          error.message?.includes('already exists')) {
        throw new Error('El producto ya está en este catálogo');
      }
      
      // Manejar errores de permisos (403)
      if (error.status === 403 || error.code === '42501') {
        throw new Error('No tienes permiso para agregar productos a este catálogo');
      }
      
      // Para otros errores, lanzar el error original pero con mensaje más claro
      if (error.message) {
        throw new Error(`Error al agregar el producto: ${error.message}`);
      }
      
      throw new Error('Error al agregar el producto al catálogo. Por favor, intenta nuevamente.');
    }

    // Actualizar contador de productos
    await updateCatalogProductsCount(catalogId);

    return data as StoreAdCatalogProduct;
  } catch (error: any) {
    console.error('[StoreAdCatalogService] Error:', error);
    throw error;
  }
}

/**
 * Remueve un producto de un catálogo
 */
export async function removeProductFromCatalog(
  catalogId: string,
  productId: string,
  storeId: string
): Promise<void> {
  try {
    // Verificar que el catálogo pertenece a la tienda
    const { data: catalog } = await supabase
      .from('store_ad_catalogs')
      .select('id')
      .eq('id', catalogId)
      .eq('store_id', storeId)
      .single();

    if (!catalog) {
      throw new Error('No tienes permiso para modificar este catálogo');
    }

    const { error } = await supabase
      .from('store_ad_catalog_products')
      .delete()
      .eq('catalog_id', catalogId)
      .eq('product_id', productId);

    if (error) {
      console.error('[StoreAdCatalogService] Error removing product:', error);
      throw error;
    }

    // Actualizar contador de productos
    await updateCatalogProductsCount(catalogId);
  } catch (error: any) {
    console.error('[StoreAdCatalogService] Error:', error);
    throw error;
  }
}

/**
 * Obtiene los productos disponibles de una tienda (no incluidos en el catálogo)
 */
export async function getAvailableProductsForCatalog(
  storeId: string,
  catalogId: string,
  options: { page?: number; limit?: number; search?: string } = {}
): Promise<{ products: any[]; total: number }> {
  try {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    // Obtener IDs de productos ya en el catálogo
    // Si falla esta consulta (error 406), continuamos sin excluir productos
    let excludedProductIds: string[] = [];
    try {
      const { data: catalogProducts, error: catalogError } = await supabase
        .from('store_ad_catalog_products')
        .select('product_id')
        .eq('catalog_id', catalogId);

      if (catalogError) {
        // Error 406 u otro error: loguear pero continuar
        console.warn('[StoreAdCatalogService] No se pudieron obtener productos del catálogo (continuando sin excluir):', catalogError.message);
      } else {
        excludedProductIds = (catalogProducts || []).map((cp) => cp.product_id);
      }
    } catch (err) {
      // Si hay cualquier error, continuar sin excluir
      console.warn('[StoreAdCatalogService] Error al obtener productos del catálogo (continuando sin excluir):', err);
    }

    // Construir query sin count para evitar error 406
    let query = supabase
      .from('products')
      .select('id, title, price, cover_url, status')
      .eq('store_id', storeId)
      .eq('status', 'active');

    // Búsqueda
    if (options.search) {
      query = query.ilike('title', `%${options.search}%`);
    }

    query = query.order('created_at', { ascending: false });

    // Obtener más productos de los necesarios para compensar los que se filtrarán
    const fetchLimit = excludedProductIds.length > 0 ? Math.min(limit * 3, 100) : limit;
    query = query.range(offset, offset + fetchLimit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('[StoreAdCatalogService] Error fetching available products:', error);
      throw error;
    }

    // Filtrar productos excluidos en memoria (por si acaso o si hay muchos)
    const excludedSet = new Set(excludedProductIds);
    const filteredProducts = (data || []).filter((p) => !excludedSet.has(p.id));

    // Aplicar paginación en memoria si fue necesario obtener más
    const paginatedProducts = filteredProducts.slice(0, limit);

    return {
      products: paginatedProducts,
      total: filteredProducts.length,
    };
  } catch (error: any) {
    console.error('[StoreAdCatalogService] Error:', error);
    throw error;
  }
}

/**
 * Actualiza el contador de productos de un catálogo
 */
async function updateCatalogProductsCount(catalogId: string): Promise<void> {
  try {
    const { count } = await supabase
      .from('store_ad_catalog_products')
      .select('*', { count: 'exact', head: true })
      .eq('catalog_id', catalogId);

    await supabase
      .from('store_ad_catalogs')
      .update({ products_count: count || 0 })
      .eq('id', catalogId);
  } catch (error) {
    console.error('[StoreAdCatalogService] Error updating products count:', error);
    // No lanzar error, es una operación secundaria
  }
}

/**
 * Regenera el catálogo basado en los filtros configurados
 */
export async function regenerateCatalogFromFilters(
  catalogId: string,
  storeId: string
): Promise<void> {
  try {
    // Verificar que el catálogo pertenece a la tienda
    const { data: catalog } = await supabase
      .from('store_ad_catalogs')
      .select('filters')
      .eq('id', catalogId)
      .eq('store_id', storeId)
      .single();

    if (!catalog) {
      throw new Error('No tienes permiso para modificar este catálogo');
    }

    // Limpiar productos actuales del catálogo
    await supabase
      .from('store_ad_catalog_products')
      .delete()
      .eq('catalog_id', catalogId);

    // Aplicar filtros y agregar productos que coincidan
    // Esta lógica se puede expandir según los filtros configurados
    const filters = catalog.filters || {};
    
    let productsQuery = supabase
      .from('products')
      .select('id')
      .eq('store_id', storeId)
      .eq('status', 'active');

    // Aplicar filtros (ejemplo básico)
    if (filters.categories && Array.isArray(filters.categories) && filters.categories.length > 0) {
      productsQuery = productsQuery.in('category_id', filters.categories);
    }

    if (filters.min_price) {
      productsQuery = productsQuery.gte('price', filters.min_price);
    }

    if (filters.max_price) {
      productsQuery = productsQuery.lte('price', filters.max_price);
    }

    if (filters.min_stock !== undefined) {
      productsQuery = productsQuery.gte('stock', filters.min_stock);
    }

    const { data: products } = await productsQuery;

    // Agregar productos al catálogo
    if (products && products.length > 0) {
      const catalogProducts = products.map((p) => ({
        catalog_id: catalogId,
        product_id: p.id,
      }));

      await supabase.from('store_ad_catalog_products').insert(catalogProducts);
    }

    // Actualizar contador y fecha de regeneración
    await supabase
      .from('store_ad_catalogs')
      .update({
        products_count: products?.length || 0,
        last_generated_at: new Date().toISOString(),
      })
      .eq('id', catalogId);
  } catch (error: any) {
    console.error('[StoreAdCatalogService] Error regenerating catalog:', error);
    throw error;
  }
}


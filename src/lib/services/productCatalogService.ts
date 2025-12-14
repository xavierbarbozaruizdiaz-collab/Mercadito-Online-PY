// ============================================
// PRODUCT CATALOG SERVICE
// Sincronización de productos con Meta, TikTok, etc.
// ============================================

import { supabase } from '@/lib/supabase/client';

export type CatalogPlatform = 'meta' | 'tiktok' | 'instagram' | 'google';

export interface CatalogProduct {
  retailer_id: string;
  name: string;
  description: string;
  availability: 'in stock' | 'out of stock' | 'preorder';
  condition: 'new' | 'refurbished' | 'used';
  price: string;
  currency: string;
  image_url: string;
  category?: string;
  brand?: string;
  url: string;
  store?: {
    name: string;
    url: string;
  };
}

export interface SyncResult {
  success: boolean;
  externalId?: string;
  error?: string;
}

// ============================================
// TIPOS PARA CATÁLOGO MERCADITO
// ============================================

export interface ProductCatalogInfo {
  id: string;
  title: string;
  description: string | null;
  price: number;
  cover_url: string | null;
  status: string;
  is_in_global_catalog: boolean;
  catalog_valid_from: string | null;
  catalog_valid_until: string | null;
  catalog_priority: number;
  exclude_from_store_catalog: boolean;
  store_id: string;
  seller_id: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// FUNCIONES PARA CATÁLOGO MERCADITO
// ============================================

/**
 * Obtiene los productos de una tienda para el catálogo Mercadito
 */
export async function getStoreProductsForCatalog(
  storeId: string,
  options: {
    page?: number;
    pageSize?: number;
  } = {}
): Promise<{
  products: ProductCatalogInfo[];
  total: number;
  hasMore: boolean;
}> {
  try {
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const { data, error, count } = await supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('store_id', storeId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('[ProductCatalogService] Error fetching store products:', error);
      throw error;
    }

    return {
      products: (data || []) as ProductCatalogInfo[],
      total: count || 0,
      hasMore: (count || 0) > offset + (data?.length || 0),
    };
  } catch (error) {
    console.error('[ProductCatalogService] Error:', error);
    throw error;
  }
}

/**
 * Cuenta los productos activos en el catálogo global de una tienda
 */
export async function countActiveCatalogProducts(storeId: string): Promise<number> {
  try {
    const now = new Date().toISOString();

    const { data, error, count } = await supabase
      .from('products')
      .select('id, catalog_valid_from, catalog_valid_until', { count: 'exact' })
      .eq('store_id', storeId)
      .eq('is_in_global_catalog', true)
      .eq('status', 'active');

    if (error) {
      console.error('[ProductCatalogService] Error counting active catalog products:', error);
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
    console.error('[ProductCatalogService] Error:', error);
    return 0;
  }
}

/**
 * Verifica que un producto pertenezca a una tienda
 */
export async function verifyProductOwnership(
  productId: string,
  storeId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, store_id')
      .eq('id', productId)
      .eq('store_id', storeId)
      .single();

    if (error || !data) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('[ProductCatalogService] Error verifying ownership:', error);
    return false;
  }
}

/**
 * Actualiza la configuración del catálogo global de un producto
 * Valida que no se exceda el límite de 2 productos activos por tienda
 */
export async function updateProductGlobalCatalogSettings(
  productId: string,
  storeId: string,
  settings: {
    is_in_global_catalog?: boolean;
    catalog_valid_from?: string | null;
    catalog_valid_until?: string | null;
    catalog_priority?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar propiedad del producto
    const isOwner = await verifyProductOwnership(productId, storeId);
    if (!isOwner) {
      return {
        success: false,
        error: 'No tienes permiso para modificar este producto',
      };
    }

    // Si se está activando el catálogo, verificar límite de 2 productos
    if (settings.is_in_global_catalog === true) {
      const activeCount = await countActiveCatalogProducts(storeId);

      // Si el producto ya está activo, no contar este producto
      const { data: currentProduct } = await supabase
        .from('products')
        .select('is_in_global_catalog, catalog_valid_from, catalog_valid_until')
        .eq('id', productId)
        .single();

      const isCurrentlyActive =
        currentProduct?.is_in_global_catalog === true &&
        (!currentProduct.catalog_valid_from ||
          new Date(currentProduct.catalog_valid_from) <= new Date()) &&
        (!currentProduct.catalog_valid_until ||
          new Date(currentProduct.catalog_valid_until) >= new Date());

      const countToCheck = isCurrentlyActive ? activeCount - 1 : activeCount;

      if (countToCheck >= 2) {
        return {
          success: false,
          error: 'Ya tienes 2 productos activos en el Catálogo Mercadito. Desactiva uno antes de activar otro.',
        };
      }
    }

    // Actualizar producto
    const { error: updateError } = await supabase
      .from('products')
      .update({
        is_in_global_catalog: settings.is_in_global_catalog,
        catalog_valid_from: settings.catalog_valid_from || null,
        catalog_valid_until: settings.catalog_valid_until || null,
        catalog_priority: settings.catalog_priority ?? 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId);

    if (updateError) {
      console.error('[ProductCatalogService] Error updating product:', updateError);
      return {
        success: false,
        error: updateError.message || 'Error al actualizar el producto',
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[ProductCatalogService] Error:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido',
    };
  }
}

// ============================================
// CLASE ORIGINAL (MANTENER PARA COMPATIBILIDAD)
// ============================================

class ProductCatalogService {
  /**
   * Sincroniza un producto a una plataforma específica
   */
  async syncProduct(
    productId: string,
    platform: CatalogPlatform
  ): Promise<SyncResult> {
    try {
      // Obtener producto con datos completos
      const { data: product, error: productError } = await supabase
        .from('products')
        .select(`
          id,
          title,
          description,
          price,
          cover_url,
          status,
          condition,
          store_id,
          stores!inner(name, slug)
        `)
        .eq('id', productId)
        .single();

      if (productError || !product) {
        return {
          success: false,
          error: `Producto no encontrado: ${productError?.message}`,
        };
      }

      // Actualizar estado a 'syncing'
      await this.updateSyncStatus(productId, platform, 'syncing');

      // Formatear producto según plataforma
      const catalogProduct = this.formatProductForCatalog(product, platform);

      // Sincronizar según plataforma
      let result: SyncResult;
      switch (platform) {
        case 'meta':
          result = await this.syncToMeta(catalogProduct);
          break;
        case 'tiktok':
          result = await this.syncToTikTok(catalogProduct);
          break;
        case 'instagram':
          result = await this.syncToInstagram(catalogProduct);
          break;
        case 'google':
          result = await this.syncToGoogle(catalogProduct);
          break;
        default:
          result = {
            success: false,
            error: `Plataforma no soportada: ${platform}`,
          };
      }

      // Actualizar estado en base de datos
      if (result.success) {
        await this.updateSyncStatus(
          productId,
          platform,
          'synced',
          result.externalId,
          result.error
        );
      } else {
        await this.updateSyncStatus(
          productId,
          platform,
          'error',
          undefined,
          result.error
        );
      }

      return result;
    } catch (error: any) {
      console.error('Error sincronizando producto:', error);
      await this.updateSyncStatus(
        productId,
        platform,
        'error',
        undefined,
        error.message
      );
      return {
        success: false,
        error: error.message || 'Error desconocido',
      };
    }
  }

  /**
   * Sincroniza múltiples productos
   */
  async syncMultipleProducts(
    productIds: string[],
    platform: CatalogPlatform
  ): Promise<Array<{ productId: string; result: SyncResult }>> {
    const results = await Promise.allSettled(
      productIds.map(productId => this.syncProduct(productId, platform))
    );

    return results.map((result, index) => ({
      productId: productIds[index],
      result:
        result.status === 'fulfilled'
          ? result.value
          : {
              success: false,
              error: result.reason?.message || 'Error desconocido',
            },
    }));
  }

  /**
   * Formatea producto para catálogo
   */
  private formatProductForCatalog(
    product: any,
    _platform: CatalogPlatform
  ): CatalogProduct {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mercaditopy.com';
    const store = product.stores || {};

    return {
      retailer_id: product.id,
      name: product.title,
      description: product.description || product.title,
      availability: product.status === 'active' ? 'in stock' : 'out of stock',
      condition: product.condition === 'nuevo' ? 'new' : 'used',
      price: `${product.price} PYG`,
      currency: 'PYG',
      image_url: product.cover_url || '',
      url: `${baseUrl}/products/${product.id}`,
      store: store.name
        ? {
            name: store.name,
            url: `${baseUrl}/store/${store.slug}`,
          }
        : undefined,
    };
  }

  /**
   * Sincroniza a Meta Catalog
   */
  private async syncToMeta(product: CatalogProduct): Promise<SyncResult> {
    // TODO: Implementar llamada a Meta Catalog API
    // Requiere: META_APP_ID, META_APP_SECRET, META_CATALOG_ID
    const catalogId = process.env.META_CATALOG_ID;
    const accessToken = process.env.META_ACCESS_TOKEN;

    if (!catalogId || !accessToken) {
      return {
        success: false,
        error: 'Meta Catalog no está configurado',
      };
    }

    try {
      // Aquí iría la llamada real a Meta API
      // const response = await fetch(`https://graph.facebook.com/v21.0/${catalogId}/products`, { ... });
      
      // Por ahora retornamos éxito simulado
      return {
        success: true,
        externalId: `meta_${product.retailer_id}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Sincroniza a TikTok Shop
   */
  private async syncToTikTok(_product: CatalogProduct): Promise<SyncResult> {
    // TODO: Implementar llamada a TikTok Shop API
    return {
      success: false,
      error: 'TikTok Shop API no implementado aún',
    };
  }

  /**
   * Sincroniza a Instagram Shop
   */
  private async syncToInstagram(product: CatalogProduct): Promise<SyncResult> {
    // Instagram Shop usa el mismo catálogo que Meta
    return this.syncToMeta(product);
  }

  /**
   * Sincroniza a Google Shopping
   */
  private async syncToGoogle(_product: CatalogProduct): Promise<SyncResult> {
    // TODO: Implementar Google Merchant Center API
    return {
      success: false,
      error: 'Google Shopping API no implementado aún',
    };
  }

  /**
   * Actualiza estado de sincronización en base de datos
   */
  private async updateSyncStatus(
    productId: string,
    platform: CatalogPlatform,
    status: 'pending' | 'syncing' | 'synced' | 'error',
    externalId?: string,
    errorMessage?: string
  ): Promise<void> {
    const updateData: any = {
      sync_status: status,
      last_synced_at: status === 'synced' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    if (externalId) {
      updateData.external_id = externalId;
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    // Upsert en product_catalog_sync
    const { error } = await supabase.from('product_catalog_sync').upsert({
      product_id: productId,
      platform,
      ...updateData,
    });

    if (error) {
      console.error('Error actualizando estado de sincronización:', error);
    }
  }

  /**
   * Obtiene estado de sincronización de un producto
   */
  async getSyncStatus(
    productId: string,
    platform?: CatalogPlatform
  ): Promise<any[]> {
    let query = supabase
      .from('product_catalog_sync')
      .select('*')
      .eq('product_id', productId);

    if (platform) {
      query = query.eq('platform', platform);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error obteniendo estado de sincronización:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Obtiene productos pendientes de sincronizar
   */
  async getPendingSyncs(platform: CatalogPlatform): Promise<any[]> {
    const { data, error } = await supabase
      .from('product_catalog_sync')
      .select('*')
      .eq('platform', platform)
      .eq('sync_status', 'pending');

    if (error) {
      console.error('Error obteniendo productos pendientes:', error);
      return [];
    }

    return data || [];
  }
}

// Exportar instancia singleton
export const productCatalog = new ProductCatalogService();

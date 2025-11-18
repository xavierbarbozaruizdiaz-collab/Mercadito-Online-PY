// ============================================
// MERCADITO ONLINE PY - PRODUCT CRUD SERVICE
// Servicio para operaciones CRUD de productos
// ============================================

import { supabase } from '@/lib/supabase/client';
import { 
  Product, 
  ProductWithDetails, 
  ProductVariant, 
  ProductImage, 
  CreateProductForm, 
  UpdateProductForm,
  SearchFilters,
  PaginatedResponse 
} from '@/types';
import { validatePageLimit, validatePageNumber, calculateOffset } from '@/lib/utils/pagination';
import { cache, getProductsCacheKey, invalidateProductCache } from '@/lib/utils/cache';

// ============================================
// FUNCIONES DE PRODUCTOS
// ============================================

export interface ProductService {
  // Operaciones básicas
  createProduct(data: CreateProductForm): Promise<Product>;
  updateProduct(id: string, data: UpdateProductForm): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  getProduct(id: string): Promise<ProductWithDetails | null>;
  
  // Listados y búsquedas
  getProducts(filters?: SearchFilters): Promise<PaginatedResponse<Product>>;
  getProductsByStore(storeId: string, filters?: SearchFilters): Promise<PaginatedResponse<Product>>;
  getFeaturedProducts(limit?: number): Promise<Product[]>;
  getRecentProducts(limit?: number): Promise<Product[]>;
  
  // Operaciones de estado
  updateProductStatus(id: string, status: string): Promise<Product>;
  toggleProductFeatured(id: string): Promise<Product>;
  
  // Operaciones de stock
  updateStock(id: string, quantity: number): Promise<Product>;
  decreaseStock(id: string, quantity: number): Promise<Product>;
  
  // Operaciones de imágenes
  uploadProductImages(productId: string, files: File[]): Promise<ProductImage[]>;
  deleteProductImage(imageId: string): Promise<void>;
  updateImageOrder(productId: string, imageIds: string[]): Promise<void>;
  
  // Operaciones de variantes
  createProductVariant(productId: string, variantData: any): Promise<ProductVariant>;
  updateProductVariant(variantId: string, variantData: any): Promise<ProductVariant>;
  deleteProductVariant(variantId: string): Promise<void>;
  
  // Analytics
  getProductAnalytics(productId: string): Promise<any>;
  trackProductView(productId: string): Promise<void>;
}

// ============================================
// IMPLEMENTACIÓN DEL SERVICIO
// ============================================

class ProductServiceImpl implements ProductService {
  
  // Crear producto
  async createProduct(data: CreateProductForm): Promise<Product> {
    try {
      // Obtener el usuario actual y su tienda
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Usuario no autenticado');

      // Rate limiting para crear productos
      try {
        const { rateLimiter } = await import('@/lib/utils/rateLimit');
        const limitCheck = await rateLimiter.checkLimit(user.id, 'PRODUCT_CREATE');
        
        if (!limitCheck.allowed) {
          throw new Error(
            `Has alcanzado el límite de creación de productos. Intenta de nuevo en ${limitCheck.retryAfter || 60} segundos.`
          );
        }
      } catch (rateLimitError: any) {
        // Si el rate limiter falla, loguear pero continuar (degradación elegante)
        const { logger } = await import('@/lib/utils/logger');
        logger.warn('Rate limiter no disponible, continuando sin limitación', rateLimitError);
      }

      // Verificar límites de publicación (membresía o tienda)
      const { checkCanPublishProduct } = await import('@/lib/services/membershipService');
      
      // Determinar precio base según tipo de producto
      let priceBase = data.price;
      if (data.sale_type === 'auction' && (data as any).auction_starting_price) {
        priceBase = (data as any).auction_starting_price;
      }
      
      // Validar si puede publicar
      const canPublish = await checkCanPublishProduct(user.id, priceBase);
      
      if (!canPublish.can_publish) {
        // Construir mensaje de error detallado
        let errorMessage = canPublish.reason;
        
        if (canPublish.suggested_plan_level) {
          errorMessage += ` Actualiza a ${canPublish.suggested_plan_name || canPublish.suggested_plan_level} para continuar.`;
        }
        
        // Agregar contexto adicional
        if (canPublish.price_exceeds_limit) {
          errorMessage += ` Precio actual: ${priceBase.toLocaleString('es-PY')} Gs. Límite: ${canPublish.max_price_base?.toLocaleString('es-PY') || 'N/A'} Gs.`;
        }
        
        if (!canPublish.can_publish_more_products) {
          errorMessage += ` Productos actuales: ${canPublish.current_products}/${canPublish.max_products || '∞'}`;
        }
        
        throw new Error(errorMessage);
      }

      // Verificar si tiene tienda (necesaria para almacenar productos)
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('id')
        .eq('seller_id', user.id)
        .single();

      // Si no tiene tienda, crearla automáticamente para usuarios con membresía
      // (Las tiendas son necesarias para la estructura actual del sistema)
      let storeId: string;
      if (storeError || !store) {
        // Intentar crear tienda automáticamente
        const { createStore } = await import('@/lib/services/storeService');
        try {
          const newStore = await createStore({
            owner_id: user.id,
            name: `Tienda de ${user.email?.split('@')[0] || 'Usuario'}`,
            slug: `tienda-${user.id.slice(0, 8)}`,
            description: 'Tienda creada automáticamente',
          });
          if (!newStore) throw new Error('No se pudo crear la tienda');
          storeId = newStore.id;
        } catch {
          throw new Error('No se pudo crear o encontrar tu tienda. Contacta al administrador.');
        }
      } else {
        storeId = (store as any).id;
      }

      // Para productos directos: calcular precio con comisión incluida
      let finalPrice = data.price;
      let basePrice = data.price;
      let commissionPercent = 0;

      if (data.sale_type === 'fixed') {
        try {
          const { getCommissionForDirectSale, calculatePriceWithCommission } = await import('@/lib/services/commissionService');
          commissionPercent = await getCommissionForDirectSale(user.id, (store as any).id);
          basePrice = data.price; // Precio base ingresado por el vendedor
          finalPrice = calculatePriceWithCommission(basePrice, commissionPercent); // Precio con comisión incluida
        } catch (commissionError: any) {
          const { logger } = await import('@/lib/utils/logger');
          logger.warn('Error calculating commission, using base price', commissionError);
          // En caso de error, usar precio base sin comisión
          basePrice = data.price;
          finalPrice = data.price;
          commissionPercent = 0;
        }
      }

      // Crear el producto
      const { data: product, error: productError } = await (supabase as any)
        .from('products')
        .insert({
          store_id: storeId,
          title: data.title,
          description: data.description,
          price: finalPrice, // Precio mostrado (con comisión si es fixed)
          base_price: data.sale_type === 'fixed' ? basePrice : null, // Solo para productos fixed
          commission_percent_applied: data.sale_type === 'fixed' ? commissionPercent : null,
          compare_price: data.compare_price,
          sku: data.sku,
          barcode: data.barcode,
          category_id: data.category_id,
          condition: data.condition,
          sale_type: data.sale_type,
          stock_quantity: data.stock_quantity,
          stock_management_enabled: data.sale_type === 'fixed', // Solo validar stock para productos fixed
          weight: data.weight,
          dimensions: data.dimensions,
          tags: data.tags,
          seo_title: data.seo_title,
          seo_description: data.seo_description,
          is_featured: data.is_featured,
        })
        .select()
        .single();

      if (productError) throw productError;

      // Invalidar cache de productos después de crear
      invalidateProductCache(product.id);

      // Crear variantes si existen
      if (data.variants && data.variants.length > 0) {
        const variants = data.variants.map(variant => ({
          product_id: product.id,
          title: variant.title,
          sku: variant.sku,
          price: variant.price,
          compare_price: variant.compare_price,
          stock_quantity: variant.stock_quantity,
          attributes: variant.attributes,
          image_url: variant.image_url,
          is_default: variant.is_default,
        }));

        const { error: variantsError } = await (supabase as any)
          .from('product_variants')
          .insert(variants);

        if (variantsError) {
          const { logger } = await import('@/lib/utils/logger');
          logger.error('Error creating variants', variantsError, { productId: product.id });
        }
      }

      // Subir imágenes si existen
      if (data.images && data.images.length > 0) {
        await this.uploadProductImages(product.id, data.images);
      }

      return product;
    } catch (error) {
      const { logger } = await import('@/lib/utils/logger');
      logger.error('Error creating product', error);
      throw error;
    }
  }

  // Actualizar producto
  async updateProduct(id: string, data: UpdateProductForm): Promise<Product> {
    try {
      // Obtener el usuario actual
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Usuario no autenticado');

      // Si se está actualizando el precio, validar límites
      if (data.price !== undefined) {
        const { checkCanPublishProduct } = await import('@/lib/services/membershipService');
        
        // Determinar precio base según tipo
        let priceBase = data.price;
        if (data.sale_type === 'auction' && (data as any).auction_starting_price) {
          priceBase = (data as any).auction_starting_price;
        }
        
        // Validar si puede publicar con el nuevo precio
        const canPublish = await checkCanPublishProduct(user.id, priceBase);
        
        if (!canPublish.can_publish) {
          let errorMessage = canPublish.reason;
          
          if (canPublish.suggested_plan_level) {
            errorMessage += ` Actualiza a ${canPublish.suggested_plan_name || canPublish.suggested_plan_level} para continuar.`;
          }
          
          if (canPublish.price_exceeds_limit) {
            errorMessage += ` Precio actual: ${priceBase.toLocaleString('es-PY')} Gs. Límite: ${canPublish.max_price_base?.toLocaleString('es-PY') || 'N/A'} Gs.`;
          }
          
          throw new Error(errorMessage);
        }
      }

      const { data: product, error } = await (supabase as any)
        .from('products')
        .update({
          title: data.title,
          description: data.description,
          price: data.price,
          compare_price: data.compare_price,
          sku: data.sku,
          barcode: data.barcode,
          category_id: data.category_id,
          condition: data.condition,
          sale_type: data.sale_type,
          stock_quantity: data.stock_quantity,
          weight: data.weight,
          dimensions: data.dimensions,
          tags: data.tags,
          seo_title: data.seo_title,
          seo_description: data.seo_description,
          is_featured: data.is_featured,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Invalidar cache después de actualizar
      invalidateProductCache(product.id);
      cache.delete(`product:${id}`);
      
      return product;
    } catch (error) {
      const { logger } = await import('@/lib/utils/logger');
      logger.error('Error updating product', error, { productId: id });
      throw error;
    }
  }

  // Eliminar producto
  async deleteProduct(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Invalidar cache después de eliminar
      invalidateProductCache(id);
      cache.delete(`product:${id}`);
    } catch (error) {
      const { logger } = await import('@/lib/utils/logger');
      logger.error('Error deleting product', error, { productId: id });
      throw error;
    }
  }

  // Obtener producto con detalles
  async getProduct(id: string): Promise<ProductWithDetails | null> {
    try {
      const cacheKey = `product:${id}`;
      const cached = cache.get<ProductWithDetails>(cacheKey);
      if (cached) return cached;

      const { data: product, error } = await supabase
        .from('products')
        .select(`
          *,
          image_url:cover_url,
          store:stores(*),
          category:categories(*),
          variants:product_variants(*),
          images:product_images(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      const result = product as ProductWithDetails;
      // Cache por 5 minutos para productos individuales
      cache.set(cacheKey, result, 5 * 60 * 1000);
      return result;
    } catch (error) {
      const { logger } = await import('@/lib/utils/logger');
      logger.error('Error getting product', error, { productId: id });
      throw error;
    }
  }

  // Obtener productos con filtros
  async getProducts(filters?: SearchFilters): Promise<PaginatedResponse<Product>> {
    try {
      // Validar paginación con límite máximo (mantener default de 20)
      const page = validatePageNumber(filters?.page);
      const limit = validatePageLimit(filters?.limit || 20, 60); // Default 20, max 60
      const offset = calculateOffset(page, limit);

      // Generar key de cache
      const cacheKey = getProductsCacheKey({ ...filters, page, limit });
      const cached = cache.get<PaginatedResponse<Product>>(cacheKey);
      if (cached) return cached;

      let query = supabase
        .from('products')
        .select(`
          *,
          image_url:cover_url,
          store:stores(*),
          category:categories(*),
          images:product_images(*)
        `, { count: 'exact' });

      // Aplicar filtros
      if (filters?.query) {
        query = query.or(`title.ilike.%${filters.query}%,description.ilike.%${filters.query}%`);
      }

      if (filters?.category_id) {
        query = query.eq('category_id', filters.category_id);
      }

      if (filters?.min_price) {
        query = query.gte('price', filters.min_price);
      }

      if (filters?.max_price) {
        query = query.lte('price', filters.max_price);
      }

      if (filters?.condition) {
        query = query.eq('condition', filters.condition);
      }

      if (filters?.sale_type) {
        query = query.eq('sale_type', filters.sale_type);
      }

      if (filters?.location) {
        query = query.eq('store.location', filters.location);
      }

      if (filters?.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      // Aplicar ordenamiento
      const sortBy = filters?.sort_by || 'created_at';
      const sortOrder = filters?.sort_order || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Aplicar paginación
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      // Si hay error relacionado con stock_quantity, continuar sin esa columna
      if (error && error.message?.includes('stock_quantity')) {
        const { logger } = await import('@/lib/utils/logger');
        logger.warn('stock_quantity no existe en productos. Continuando sin esa columna.', undefined, { filters });
      }

      if (error && !error.message?.includes('stock_quantity')) {
        throw error;
      }

      const result = {
        data: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limit),
        },
      };

      // Cache por 2 minutos para listados (más corto porque cambian frecuentemente)
      cache.set(cacheKey, result, 2 * 60 * 1000);
      return result;
    } catch (error) {
      const { logger } = await import('@/lib/utils/logger');
      logger.error('Error getting products', error, { filters });
      throw error;
    }
  }

  // Obtener productos por tienda
  async getProductsByStore(storeId: string, filters?: SearchFilters): Promise<PaginatedResponse<Product>> {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('products')
        .select(`
          *,
          image_url:cover_url,
          category:categories(*),
          images:product_images(*)
        `, { count: 'exact' })
        .eq('store_id', storeId);

      // Aplicar filtros adicionales

      if (filters?.query) {
        query = query.or(`title.ilike.%${filters.query}%,description.ilike.%${filters.query}%`);
      }

      // Aplicar ordenamiento
      const sortBy = filters?.sort_by || 'created_at';
      const sortOrder = filters?.sort_order || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Aplicar paginación
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limit),
        },
      };
    } catch (error) {
      console.error('Error getting products by store:', error);
      throw error;
    }
  }

  // Obtener productos destacados
  async getFeaturedProducts(limit: number = 10): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          image_url:cover_url,
          store:stores(*),
          category:categories(*),
          images:product_images(*)
        `)
        .eq('is_featured', true)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting featured products:', error);
      throw error;
    }
  }

  // Obtener productos recientes
  async getRecentProducts(limit: number = 10): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          image_url:cover_url,
          store:stores(*),
          category:categories(*),
          images:product_images(*)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting recent products:', error);
      throw error;
    }
  }

  // Actualizar estado del producto
  async updateProductStatus(id: string, status: string): Promise<Product> {
    try {
      const { data, error } = await (supabase as any)
        .from('products')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating product status:', error);
      throw error;
    }
  }

  // Alternar producto destacado
  async toggleProductFeatured(id: string): Promise<Product> {
    try {
      // Primero obtener el estado actual
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('is_featured')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Actualizar al estado opuesto
      const { data, error } = await (supabase as any)
        .from('products')
        .update({ is_featured: !(product as any).is_featured })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error toggling product featured:', error);
      throw error;
    }
  }

  // Actualizar stock
  async updateStock(id: string, quantity: number): Promise<Product> {
    try {
      const { data, error } = await (supabase as any)
        .from('products')
        .update({ stock_quantity: quantity })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      const { logger } = await import('@/lib/utils/logger');
      logger.error('Error updating stock', error);
      throw error;
    }
  }

  // Disminuir stock (ahora usa función SQL con registro de movimientos)
  async decreaseStock(id: string, quantity: number, orderId?: string, notes?: string): Promise<Product> {
    try {
      const { decreaseStock: decreaseStockFn } = await import('@/lib/services/inventoryService');
      
      // Obtener seller_id para el parámetro created_by
      const { data: productInfo } = await supabase
        .from('products')
        .select('seller_id')
        .eq('id', id)
        .single();
      
      const success = await decreaseStockFn(
        id, 
        quantity, 
        orderId || undefined, 
        notes || undefined,
        (productInfo as any)?.seller_id
      );
      
      if (!success) {
        throw new Error('No se pudo reducir el stock');
      }

      // Obtener producto actualizado
      const { data, error } = await (supabase as any)
        .from('products')
        .select()
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      const { logger } = await import('@/lib/utils/logger');
      logger.error('Error decreasing stock', error, { productId: id, quantity });
      throw error;
    }
  }

  // Subir imágenes del producto con generación de thumbnails
  async uploadProductImages(productId: string, files: File[]): Promise<ProductImage[]> {
    try {
      const uploadedImages: ProductImage[] = [];
      const { logger } = await import('@/lib/utils/logger');

      // Intentar usar la API de thumbnails si está disponible (server-side)
      // Si estamos en el cliente, usar método directo (fallback)
      const isServer = typeof window === 'undefined';
      
      if (isServer) {
        // Server-side: usar API de thumbnails
        logger.debug('Uploading images via thumbnails API', { productId, fileCount: files.length });
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const formData = new FormData();
          formData.append('productId', productId);
          formData.append('file', file);

          try {
            const response = await fetch('/api/products/upload-images', {
              method: 'POST',
              body: formData,
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
              throw new Error(errorData.error || 'Error uploading image');
            }

            const result = await response.json();
            if (result.image) {
              uploadedImages.push({
                ...result.image,
                sort_order: i,
                is_cover: i === 0,
              });
              logger.debug('Image uploaded with thumbnails', { productId, imageId: result.image.id });
            }
          } catch (apiError: any) {
            logger.warn('Thumbnails API failed, using direct upload', apiError);
            // Fallback al método directo
            const directUpload = await this.directImageUpload(productId, file, i);
            uploadedImages.push(directUpload);
          }
        }
      } else {
        // Client-side: usar método directo (sin thumbnails por ahora)
        logger.debug('Uploading images directly (client-side)', { productId, fileCount: files.length });
        
        for (let i = 0; i < files.length; i++) {
          const directUpload = await this.directImageUpload(productId, files[i], i);
          uploadedImages.push(directUpload);
        }
      }

      return uploadedImages;
    } catch (error) {
      const { logger } = await import('@/lib/utils/logger');
      logger.error('Error uploading product images', error, { productId });
      throw error;
    }
  }

  // Método helper para subida directa (sin thumbnails)
  private async directImageUpload(
    productId: string,
    file: File,
    sortOrder: number
  ): Promise<ProductImage> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${productId}-${Date.now()}-${sortOrder}.${fileExt}`;
    const filePath = `products/${productId}/${fileName}`;

    // Subir archivo a Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    // Crear registro en la base de datos
    const { data: imageData, error: imageError } = await (supabase as any)
      .from('product_images')
      .insert({
        product_id: productId,
        url: urlData.publicUrl,
        thumbnail_url: urlData.publicUrl, // Fallback: usar misma URL si no hay thumbnail
        alt_text: file.name,
        sort_order: sortOrder,
        is_cover: sortOrder === 0,
      })
      .select()
      .single();

    if (imageError) throw imageError;
    return imageData;
  }

  // Eliminar imagen del producto
  async deleteProductImage(imageId: string): Promise<void> {
    try {
      // Primero obtener la información de la imagen
      const { data: image, error: fetchError } = await supabase
        .from('product_images')
        .select('url')
        .eq('id', imageId)
        .single();

      if (fetchError) throw fetchError;

      // Extraer el path del archivo de la URL
      const url = new URL((image as any).url);
      const filePath = url.pathname.split('/').slice(-3).join('/'); // products/productId/filename

      // Eliminar archivo del storage
      const { error: storageError } = await supabase.storage
        .from('product-images')
        .remove([filePath]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
      }

      // Eliminar registro de la base de datos
      const { error: dbError } = await supabase
        .from('product_images')
        .delete()
        .eq('id', imageId);

      if (dbError) throw dbError;
    } catch (error) {
      console.error('Error deleting product image:', error);
      throw error;
    }
  }

  // Actualizar orden de imágenes
  async updateImageOrder(productId: string, imageIds: string[]): Promise<void> {
    try {
      const updates = imageIds.map((imageId, index) => ({
        id: imageId,
        sort_order: index,
        is_cover: index === 0,
      }));

      for (const update of updates) {
        const { error } = await (supabase as any)
          .from('product_images')
          .update({
            sort_order: update.sort_order,
            is_cover: update.is_cover,
          })
          .eq('id', update.id);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error updating image order:', error);
      throw error;
    }
  }

  // Crear variante de producto
  async createProductVariant(productId: string, variantData: any): Promise<ProductVariant> {
    try {
      const { data, error } = await supabase
        .from('product_variants')
        .insert({
          product_id: productId,
          ...variantData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating product variant:', error);
      throw error;
    }
  }

  // Actualizar variante de producto
  async updateProductVariant(variantId: string, variantData: any): Promise<ProductVariant> {
    try {
      const { data, error } = await (supabase as any)
        .from('product_variants')
        .update(variantData)
        .eq('id', variantId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating product variant:', error);
      throw error;
    }
  }

  // Eliminar variante de producto
  async deleteProductVariant(variantId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('product_variants')
        .delete()
        .eq('id', variantId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting product variant:', error);
      throw error;
    }
  }

  // Obtener analytics del producto
  async getProductAnalytics(productId: string): Promise<any> {
    try {
      // Obtener vistas del producto
      const { data: views, error: viewsError } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('event_type', 'product_view')
        .eq('event_data->product_id', productId);

      if (viewsError) throw viewsError;

      // Obtener órdenes que incluyen este producto
      const { data: orders, error: ordersError } = await supabase
        .from('order_items')
        .select(`
          *,
          order:orders(*)
        `)
        .eq('product_id', productId);

      if (ordersError) throw ordersError;

      // Calcular métricas
      const totalViews = views?.length || 0;
      const totalOrders = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, item) => sum + (item as any).total_price, 0) || 0;
      const conversionRate = totalViews > 0 ? (totalOrders / totalViews) * 100 : 0;

      return {
        totalViews,
        totalOrders,
        totalRevenue,
        conversionRate,
        views: views || [],
        orders: orders || [],
      };
    } catch (error) {
      console.error('Error getting product analytics:', error);
      throw error;
    }
  }

  // Registrar vista del producto
  async trackProductView(productId: string): Promise<void> {
    try {
      await (supabase as any)
        .from('analytics_events')
        .insert({
          event_type: 'product_view',
          event_data: { product_id: productId },
          page_url: typeof window !== 'undefined' ? window.location.href : undefined,
        });
    } catch (error) {
      console.error('Error tracking product view:', error);
      // No lanzar error para no interrumpir la experiencia del usuario
    }
  }
}

// ============================================
// INSTANCIA DEL SERVICIO
// ============================================

export const productService = new ProductServiceImpl();

// ============================================
// EXPORTACIONES
// ============================================

export default productService;

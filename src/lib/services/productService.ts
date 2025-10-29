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
  CreateProductFormData, 
  UpdateProductFormData,
  SearchFiltersFormData,
  PaginatedResponse 
} from '@/types';

// ============================================
// FUNCIONES DE PRODUCTOS
// ============================================

export interface ProductService {
  // Operaciones básicas
  createProduct(data: CreateProductFormData): Promise<Product>;
  updateProduct(id: string, data: UpdateProductFormData): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  getProduct(id: string): Promise<ProductWithDetails | null>;
  
  // Listados y búsquedas
  getProducts(filters?: SearchFiltersFormData): Promise<PaginatedResponse<Product>>;
  getProductsByStore(storeId: string, filters?: SearchFiltersFormData): Promise<PaginatedResponse<Product>>;
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
  async createProduct(data: CreateProductFormData): Promise<Product> {
    try {
      // Obtener el usuario actual y su tienda
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Usuario no autenticado');

      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('id')
        .eq('seller_id', user.id)
        .single();

      if (storeError || !store) throw new Error('Tienda no encontrada');

      // Crear el producto
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          store_id: store.id,
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
        .select()
        .single();

      if (productError) throw productError;

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

        const { error: variantsError } = await supabase
          .from('product_variants')
          .insert(variants);

        if (variantsError) {
          console.error('Error creating variants:', variantsError);
        }
      }

      // Subir imágenes si existen
      if (data.images && data.images.length > 0) {
        await this.uploadProductImages(product.id, data.images);
      }

      return product;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  // Actualizar producto
  async updateProduct(id: string, data: UpdateProductFormData): Promise<Product> {
    try {
      const { data: product, error } = await supabase
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
      return product;
    } catch (error) {
      console.error('Error updating product:', error);
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
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  // Obtener producto con detalles
  async getProduct(id: string): Promise<ProductWithDetails | null> {
    try {
      const { data: product, error } = await supabase
        .from('products')
        .select(`
          *,
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

      return product as ProductWithDetails;
    } catch (error) {
      console.error('Error getting product:', error);
      throw error;
    }
  }

  // Obtener productos con filtros
  async getProducts(filters?: SearchFiltersFormData): Promise<PaginatedResponse<Product>> {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('products')
        .select(`
          *,
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
      console.error('Error getting products:', error);
      throw error;
    }
  }

  // Obtener productos por tienda
  async getProductsByStore(storeId: string, filters?: SearchFiltersFormData): Promise<PaginatedResponse<Product>> {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          images:product_images(*)
        `, { count: 'exact' })
        .eq('store_id', storeId);

      // Aplicar filtros adicionales
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

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
      const { data, error } = await supabase
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
      const { data, error } = await supabase
        .from('products')
        .update({ is_featured: !product.is_featured })
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
      const { data, error } = await supabase
        .from('products')
        .update({ stock_quantity: quantity })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating stock:', error);
      throw error;
    }
  }

  // Disminuir stock
  async decreaseStock(id: string, quantity: number): Promise<Product> {
    try {
      // Primero obtener el stock actual
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const newQuantity = Math.max(0, product.stock_quantity - quantity);

      const { data, error } = await supabase
        .from('products')
        .update({ stock_quantity: newQuantity })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error decreasing stock:', error);
      throw error;
    }
  }

  // Subir imágenes del producto
  async uploadProductImages(productId: string, files: File[]): Promise<ProductImage[]> {
    try {
      const uploadedImages: ProductImage[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${productId}-${Date.now()}-${i}.${fileExt}`;
        const filePath = `products/${productId}/${fileName}`;

        // Subir archivo a Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Obtener URL pública
        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        // Crear registro en la base de datos
        const { data: imageData, error: imageError } = await supabase
          .from('product_images')
          .insert({
            product_id: productId,
            url: urlData.publicUrl,
            alt_text: file.name,
            sort_order: i,
            is_cover: i === 0, // La primera imagen es la portada
          })
          .select()
          .single();

        if (imageError) throw imageError;
        uploadedImages.push(imageData);
      }

      return uploadedImages;
    } catch (error) {
      console.error('Error uploading product images:', error);
      throw error;
    }
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
      const url = new URL(image.url);
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
        const { error } = await supabase
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
      const { data, error } = await supabase
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
      const totalRevenue = orders?.reduce((sum, item) => sum + item.total_price, 0) || 0;
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
      await supabase
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

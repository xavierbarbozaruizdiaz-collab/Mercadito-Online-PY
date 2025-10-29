// ============================================
// MERCADITO ONLINE PY - SEARCH SERVICE
// Servicio para manejar búsquedas avanzadas
// ============================================

import { supabase } from '@/lib/supabase/client';

// ============================================
// TIPOS
// ============================================

export interface SearchFilters {
  query?: string;
  category_id?: string;
  min_price?: number;
  max_price?: number;
  condition?: string;
  sale_type?: string;
  location?: string;
  tags?: string[];
  sort_by?: 'price' | 'created_at' | 'title' | 'popularity';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface SearchResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ProductSearchResult {
  id: string;
  title: string;
  price: number;
  compare_price?: number;
  condition: string;
  sale_type: string;
  cover_url?: string;
  created_at: string;
  store: {
    id: string;
    name: string;
    slug: string;
    location?: string;
  };
  category?: {
    id: string;
    name: string;
  };
}

export interface StoreSearchResult {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  cover_image_url?: string;
  location?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product_count?: number;
  rating?: number;
}

export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'product' | 'category' | 'store' | 'location';
  count?: number;
  category?: string;
  location?: string;
}

// ============================================
// SERVICIO DE BÚSQUEDA
// ============================================

export class SearchService {
  // Buscar productos
  static async searchProducts(filters: SearchFilters): Promise<SearchResult<ProductSearchResult>> {
    try {
      let query = supabase
        .from('products')
        .select(`
          id,
          title,
          price,
          compare_price,
          condition,
          sale_type,
          cover_url,
          created_at,
          store:stores!inner(
            id,
            name,
            slug,
            location
          ),
          category:categories(
            id,
            name
          )
        `)
        .eq('status', 'active');

      // Aplicar filtros
      if (filters.query) {
        query = query.or(`title.ilike.%${filters.query}%,description.ilike.%${filters.query}%`);
      }

      if (filters.category_id) {
        query = query.eq('category_id', filters.category_id);
      }

      if (filters.min_price) {
        query = query.gte('price', filters.min_price);
      }

      if (filters.max_price) {
        query = query.lte('price', filters.max_price);
      }

      if (filters.condition) {
        query = query.eq('condition', filters.condition);
      }

      if (filters.sale_type) {
        query = query.eq('sale_type', filters.sale_type);
      }

      if (filters.location) {
        query = query.ilike('store.location', `%${filters.location}%`);
      }

      if (filters.tags && filters.tags.length > 0) {
        query = query.or(filters.tags.map(tag => `title.ilike.%${tag}%`).join(','));
      }

      // Aplicar ordenamiento
      const sortBy = filters.sort_by || 'created_at';
      const sortOrder = filters.sort_order || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Aplicar paginación
      const page = filters.page || 1;
      const limit = filters.limit || 12;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total,
          total_pages: totalPages,
        },
      };
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }

  // Buscar tiendas
  static async searchStores(filters: SearchFilters): Promise<SearchResult<StoreSearchResult>> {
    try {
      let query = supabase
        .from('stores')
        .select(`
          id,
          name,
          slug,
          description,
          logo_url,
          cover_image_url,
          location,
          is_active,
          created_at,
          updated_at
        `)
        .eq('is_active', true);

      // Aplicar filtros
      if (filters.query) {
        query = query.or(`name.ilike.%${filters.query}%,description.ilike.%${filters.query}%`);
      }

      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }

      // Aplicar ordenamiento
      const sortBy = filters.sort_by || 'created_at';
      const sortOrder = filters.sort_order || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Aplicar paginación
      const page = filters.page || 1;
      const limit = filters.limit || 12;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total,
          total_pages: totalPages,
        },
      };
    } catch (error) {
      console.error('Error searching stores:', error);
      throw error;
    }
  }

  // Obtener sugerencias de búsqueda
  static async getSearchSuggestions(query: string): Promise<SearchSuggestion[]> {
    try {
      if (query.length < 2) return [];

      // Buscar productos que coincidan
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('title, category:categories(name)')
        .ilike('title', `%${query}%`)
        .eq('status', 'active')
        .limit(5);

      if (productsError) throw productsError;

      // Buscar categorías que coincidan
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name')
        .ilike('name', `%${query}%`)
        .eq('is_active', true)
        .limit(3);

      if (categoriesError) throw categoriesError;

      // Buscar tiendas que coincidan
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('name, location')
        .ilike('name', `%${query}%`)
        .eq('is_active', true)
        .limit(3);

      if (storesError) throw storesError;

      const suggestions: SearchSuggestion[] = [];

      // Agregar productos
      products?.forEach((product, index) => {
        suggestions.push({
          id: `product-${index}`,
          text: product.title,
          type: 'product',
          category: product.category?.name,
        });
      });

      // Agregar categorías
      categories?.forEach((category, index) => {
        suggestions.push({
          id: `category-${index}`,
          text: category.name,
          type: 'category',
        });
      });

      // Agregar tiendas
      stores?.forEach((store, index) => {
        suggestions.push({
          id: `store-${index}`,
          text: store.name,
          type: 'store',
          location: store.location,
        });
      });

      return suggestions.slice(0, 8); // Limitar a 8 sugerencias
    } catch (error) {
      console.error('Error getting search suggestions:', error);
      return [];
    }
  }

  // Obtener tendencias de búsqueda
  static async getTrendingSearches(): Promise<SearchSuggestion[]> {
    try {
      // Simular tendencias (en una implementación real, esto vendría de analytics)
      const trending: SearchSuggestion[] = [
        {
          id: 'trend-1',
          text: 'iPhone 15 Pro Max',
          type: 'product',
          count: 156,
          category: 'Electrónicos',
        },
        {
          id: 'trend-2',
          text: 'Samsung Galaxy S24',
          type: 'product',
          count: 134,
          category: 'Electrónicos',
        },
        {
          id: 'trend-3',
          text: 'MacBook Air M3',
          type: 'product',
          count: 98,
          category: 'Computadoras',
        },
        {
          id: 'trend-4',
          text: 'PlayStation 5 Slim',
          type: 'product',
          count: 87,
          category: 'Gaming',
        },
        {
          id: 'trend-5',
          text: 'AirPods Pro 2',
          type: 'product',
          count: 76,
          category: 'Accesorios',
        },
      ];

      return trending;
    } catch (error) {
      console.error('Error getting trending searches:', error);
      return [];
    }
  }

  // Obtener búsquedas recientes del usuario
  static async getRecentSearches(userId: string): Promise<SearchSuggestion[]> {
    try {
      // En una implementación real, esto vendría de una tabla de búsquedas del usuario
      const recent: SearchSuggestion[] = [
        {
          id: 'recent-1',
          text: 'iPhone 14',
          type: 'product',
          count: 23,
          category: 'Electrónicos',
        },
        {
          id: 'recent-2',
          text: 'Laptop Gaming',
          type: 'product',
          count: 45,
          category: 'Computadoras',
        },
        {
          id: 'recent-3',
          text: 'Zapatos Nike',
          type: 'product',
          count: 67,
          category: 'Calzado',
        },
        {
          id: 'recent-4',
          text: 'Mochila',
          type: 'product',
          count: 34,
          category: 'Accesorios',
        },
        {
          id: 'recent-5',
          text: 'Cámara Canon',
          type: 'product',
          count: 19,
          category: 'Fotografía',
        },
      ];

      return recent;
    } catch (error) {
      console.error('Error getting recent searches:', error);
      return [];
    }
  }

  // Guardar búsqueda del usuario
  static async saveUserSearch(userId: string, query: string, filters: SearchFilters): Promise<void> {
    try {
      // En una implementación real, esto guardaría en una tabla de búsquedas del usuario
      console.log('Saving user search:', { userId, query, filters });
    } catch (error) {
      console.error('Error saving user search:', error);
    }
  }

  // Obtener estadísticas de búsqueda
  static async getSearchStats(): Promise<{
    totalProducts: number;
    totalStores: number;
    totalCategories: number;
    popularCategories: Array<{ name: string; count: number }>;
  }> {
    try {
      // Obtener conteos
      const [productsResult, storesResult, categoriesResult] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact' }).eq('status', 'active'),
        supabase.from('stores').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('categories').select('id', { count: 'exact' }).eq('is_active', true),
      ]);

      const totalProducts = productsResult.count || 0;
      const totalStores = storesResult.count || 0;
      const totalCategories = categoriesResult.count || 0;

      // Obtener categorías populares
      const { data: popularCategories } = await supabase
        .from('products')
        .select('category:categories(name)')
        .eq('status', 'active');

      const categoryCounts = popularCategories?.reduce((acc, item) => {
        const categoryName = item.category?.name || 'Sin categoría';
        acc[categoryName] = (acc[categoryName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const popularCategoriesList = Object.entries(categoryCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalProducts,
        totalStores,
        totalCategories,
        popularCategories: popularCategoriesList,
      };
    } catch (error) {
      console.error('Error getting search stats:', error);
      return {
        totalProducts: 0,
        totalStores: 0,
        totalCategories: 0,
        popularCategories: [],
      };
    }
  }
}

// ============================================
// EXPORTACIONES
// ============================================

export const searchService = SearchService;

// src/lib/services/recommendationService.ts
// Sistema de recomendaciones inteligentes de productos

import { supabase } from '@/lib/supabase/client';
import { Product } from '@/types';

interface RecommendationOptions {
  userId?: string;
  productId?: string;
  categoryId?: string;
  limit?: number;
}

export class RecommendationService {
  /**
   * Obtiene productos similares a uno dado
   */
  static async getSimilarProducts(
    productId: string,
    limit: number = 8
  ): Promise<Product[]> {
    try {
      // Obtener el producto actual
      const { data: currentProduct, error: productError } = await supabase
        .from('products')
        .select('category_id, tags, price')
        .eq('id', productId)
        .single();

      if (productError || !currentProduct) {
        return [];
      }

      // Buscar productos similares en la misma categoría
      const { data: similarProducts, error } = await supabase
        .from('products')
        .select('*')
        .eq('category_id', (currentProduct as any).category_id)
        .eq('status', 'active')
        .neq('id', productId)
        .limit(limit);

      if (error) {
        console.error('Error getting similar products:', error);
        return [];
      }

      // Ordenar por relevancia (mismo precio, tags similares)
      const sortedProducts = (similarProducts || []).sort((a: any, b: any) => {
        // Priorizar productos con precio similar
        const priceDiffA = Math.abs((a as any).price - (currentProduct as any).price);
        const priceDiffB = Math.abs((b as any).price - (currentProduct as any).price);
        return priceDiffA - priceDiffB;
      });

      return sortedProducts as Product[];
    } catch (error) {
      console.error('Error in getSimilarProducts:', error);
      return [];
    }
  }

  /**
   * Obtiene productos recomendados para un usuario basado en su historial
   */
  static async getPersonalizedRecommendations(
    userId: string,
    limit: number = 12
  ): Promise<Product[]> {
    try {
      // Obtener categorías de productos que el usuario ha visto/comprado
      const { data: userActivity } = await supabase
        .from('analytics_events')
        .select('properties')
        .eq('user_id', userId)
        .in('event_name', ['product_view', 'add_to_cart', 'purchase'])
        .limit(50);

      if (!userActivity || userActivity.length === 0) {
        // Si no hay historial, retornar trending
        return this.getTrendingProducts(limit);
      }

      // Extraer categorías más frecuentes
      const categoryCounts: Record<string, number> = {};
      userActivity.forEach((event: any) => {
        const category = event.properties?.category_id;
        if (category) {
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        }
      });

      const topCategories = Object.keys(categoryCounts)
        .sort((a, b) => categoryCounts[b] - categoryCounts[a])
        .slice(0, 3);

      // Buscar productos en esas categorías
      const { data: recommended, error } = await supabase
        .from('products')
        .select('*')
        .in('category_id', topCategories)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting personalized recommendations:', error);
        return this.getTrendingProducts(limit);
      }

      return (recommended || []) as Product[];
    } catch (error) {
      console.error('Error in getPersonalizedRecommendations:', error);
      return this.getTrendingProducts(limit);
    }
  }

  /**
   * Obtiene productos trending (más vistos/compartidos)
   */
  static async getTrendingProducts(limit: number = 12): Promise<Product[]> {
    try {
      // Productos más vistos en la última semana
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .order('views', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting trending products:', error);
        return [];
      }

      return (data || []) as Product[];
    } catch (error) {
      console.error('Error in getTrendingProducts:', error);
      return [];
    }
  }

  /**
   * Obtiene productos recomendados basados en búsquedas del usuario
   */
  static async getSearchBasedRecommendations(
    userId: string,
    limit: number = 8
  ): Promise<Product[]> {
    try {
      // Obtener términos de búsqueda del usuario
      const { data: searchHistory } = await supabase
        .from('search_history')
        .select('query')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!searchHistory || searchHistory.length === 0) {
        return [];
      }

      // Buscar productos basados en esos términos
      const searchTerms = (searchHistory as any[]).map((item: any) => item.query).join(' ');

      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .textSearch('title', searchTerms, { type: 'websearch' })
        .eq('status', 'active')
        .limit(limit);

      if (error) {
        console.error('Error getting search-based recommendations:', error);
        return [];
      }

      return (products || []) as Product[];
    } catch (error) {
      console.error('Error in getSearchBasedRecommendations:', error);
      return [];
    }
  }

  /**
   * Obtiene productos "You may also like"
   */
  static async getYouMayAlsoLike(
    options: RecommendationOptions
  ): Promise<Product[]> {
    const { userId, productId, categoryId, limit = 8 } = options;

    if (productId) {
      return this.getSimilarProducts(productId, limit);
    }

    if (userId) {
      return this.getPersonalizedRecommendations(userId, limit);
    }

    if (categoryId) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category_id', categoryId)
        .eq('status', 'active')
        .order('views', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting category recommendations:', error);
        return [];
      }

      return (data || []) as Product[];
    }

    return this.getTrendingProducts(limit);
  }
}


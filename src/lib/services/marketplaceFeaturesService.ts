// src/lib/services/marketplaceFeaturesService.ts
// Servicio para features avanzadas del marketplace

import { supabase } from '@/lib/supabaseClient';

export interface ProductQuestion {
  id: string;
  product_id: string;
  user_id: string;
  question_text: string;
  answer_text?: string | null;
  answered_by?: string | null;
  answered_at?: string | null;
  is_public: boolean;
  upvotes: number;
  created_at: string;
  updated_at: string;
  asker?: {
    id: string;
    full_name: string;
  };
}

export interface PriceAlert {
  id: string;
  user_id: string;
  product_id: string;
  target_price: number;
  current_price: number;
  is_active: boolean;
  notified: boolean;
  created_at: string;
  updated_at: string;
  product?: {
    id: string;
    title: string;
    cover_url?: string | null;
  };
}

export interface SavedSearch {
  id: string;
  user_id: string;
  search_query: string;
  filters?: Record<string, any>;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface PriceHistory {
  price: number;
  recorded_at: string;
  days_ago: number;
}

export class MarketplaceFeaturesService {
  /**
   * Crea una pregunta sobre un producto
   */
  static async createProductQuestion(
    productId: string,
    userId: string,
    questionText: string
  ): Promise<ProductQuestion | null> {
    try {
      const { data, error } = await supabase
        .from('product_questions')
        .insert({
          product_id: productId,
          user_id: userId,
          question_text: questionText,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data as ProductQuestion;
    } catch (error: any) {
      console.error('Error creating question:', error);
      throw error;
    }
  }

  /**
   * Responde a una pregunta
   */
  static async answerQuestion(
    questionId: string,
    sellerId: string,
    answerText: string
  ): Promise<ProductQuestion | null> {
    try {
      const { data, error } = await supabase
        .from('product_questions')
        .update({
          answer_text: answerText,
          answered_by: sellerId,
          answered_at: new Date().toISOString(),
        } as any)
        .eq('id', questionId)
        .select()
        .single();

      if (error) throw error;
      return data as ProductQuestion;
    } catch (error: any) {
      console.error('Error answering question:', error);
      throw error;
    }
  }

  /**
   * Obtiene las preguntas de un producto
   */
  static async getProductQuestions(
    productId: string,
    options: {
      limit?: number;
      answeredOnly?: boolean;
    } = {}
  ): Promise<ProductQuestion[]> {
    try {
      let query = supabase
        .from('product_questions')
        .select(`
          *,
          asker:profiles!product_questions_user_id_fkey(id, first_name, last_name, email)
        `)
        .eq('product_id', productId)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (options.answeredOnly) {
        query = query.not('answer_text', 'is', null);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as ProductQuestion[];
    } catch (error) {
      console.error('Error getting questions:', error);
      return [];
    }
  }

  /**
   * Vota útil a una pregunta
   */
  static async upvoteQuestion(questionId: string): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('increment_question_upvotes', {
        question_id: questionId,
      } as any);

      // Si la función no existe, actualizar manualmente
      if (error && error.code !== '42883') {
        const { data: question } = await supabase
          .from('product_questions')
          .select('upvotes')
          .eq('id', questionId)
          .single();

        if (question) {
          await supabase
            .from('product_questions')
            .update({ upvotes: (question as any).upvotes + 1 } as any)
            .eq('id', questionId);
        }
      }

      return true;
    } catch (error) {
      console.error('Error upvoting question:', error);
      return false;
    }
  }

  /**
   * Crea una alerta de precio
   */
  static async createPriceAlert(
    userId: string,
    productId: string,
    targetPrice: number
  ): Promise<PriceAlert | null> {
    try {
      // Obtener precio actual
      const { data: product } = await supabase
        .from('products')
        .select('price')
        .eq('id', productId)
        .single();

      if (!product) {
        throw new Error('Producto no encontrado');
      }

      const { data, error } = await supabase
        .from('price_alerts')
        .insert({
          user_id: userId,
          product_id: productId,
          target_price: targetPrice,
          current_price: (product as any).price,
        } as any)
        .select()
        .single();

      if (error) {
        // Si ya existe, actualizar
        if (error.code === '23505') {
          const { data: updated } = await supabase
            .from('price_alerts')
            .update({
              target_price: targetPrice,
              is_active: true,
              notified: false,
            } as any)
            .eq('user_id', userId)
            .eq('product_id', productId)
            .select()
            .single();

          return updated as PriceAlert;
        }
        throw error;
      }

      return data as PriceAlert;
    } catch (error: any) {
      console.error('Error creating price alert:', error);
      throw error;
    }
  }

  /**
   * Obtiene las alertas de precio de un usuario
   */
  static async getUserPriceAlerts(userId: string): Promise<PriceAlert[]> {
    try {
      const { data, error } = await supabase
        .from('price_alerts')
        .select(`
          *,
          product:products(id, title, cover_url)
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as PriceAlert[];
    } catch (error) {
      console.error('Error getting price alerts:', error);
      return [];
    }
  }

  /**
   * Elimina una alerta de precio
   */
  static async deletePriceAlert(alertId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('price_alerts')
        .delete()
        .eq('id', alertId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting price alert:', error);
      return false;
    }
  }

  /**
   * Guarda una búsqueda
   */
  static async saveSearch(
    userId: string,
    searchQuery: string,
    filters?: Record<string, any>,
    notificationsEnabled: boolean = false
  ): Promise<SavedSearch | null> {
    try {
      const { data, error } = await supabase
        .from('saved_searches')
        .insert({
          user_id: userId,
          search_query: searchQuery,
          filters: filters || null,
          notifications_enabled: notificationsEnabled,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data as SavedSearch;
    } catch (error: any) {
      console.error('Error saving search:', error);
      throw error;
    }
  }

  /**
   * Obtiene las búsquedas guardadas de un usuario
   */
  static async getUserSavedSearches(userId: string): Promise<SavedSearch[]> {
    try {
      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as SavedSearch[];
    } catch (error) {
      console.error('Error getting saved searches:', error);
      return [];
    }
  }

  /**
   * Elimina una búsqueda guardada
   */
  static async deleteSavedSearch(searchId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', searchId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting saved search:', error);
      return false;
    }
  }

  /**
   * Obtiene el historial de precios de un producto
   */
  static async getPriceHistory(
    productId: string,
    daysBack: number = 30
  ): Promise<PriceHistory[]> {
    try {
      const { data, error } = await supabase.rpc('get_price_history', {
        product_id_param: productId,
        days_back: daysBack,
      } as any);

      if (error) throw error;
      return (data || []) as PriceHistory[];
    } catch (error) {
      console.error('Error getting price history:', error);
      return [];
    }
  }
}


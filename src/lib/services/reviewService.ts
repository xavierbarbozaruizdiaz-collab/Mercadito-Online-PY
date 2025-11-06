// src/lib/services/reviewService.ts
// Servicio mejorado para gestión de reviews y ratings

import { supabase } from '@/lib/supabaseClient';
import { normalizeRpcResult } from '@/lib/supabase/rpc';

export interface Review {
  id: string;
  product_id: string | null;
  store_id: string | null;
  buyer_id: string;
  seller_id: string | null;
  order_id: string | null;
  rating: number; // 1-5
  title?: string | null;
  comment?: string | null;
  is_verified_purchase: boolean;
  is_edited: boolean;
  helpful_count: number;
  status: 'pending' | 'published' | 'hidden' | 'reported';
  created_at: string;
  updated_at: string;
  buyer?: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
  };
  images?: ReviewImage[];
  response?: ReviewResponse;
  is_helpful?: boolean; // Si el usuario actual marcó como útil
}

export interface ReviewImage {
  id: string;
  review_id: string;
  image_url: string;
  order_index: number;
}

export interface ReviewResponse {
  id: string;
  review_id: string;
  seller_id: string;
  response_text: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewStats {
  average_rating: number;
  total_reviews: number;
  rating_distribution: {
    '5': number;
    '4': number;
    '3': number;
    '2': number;
    '1': number;
  };
}

export interface CreateReviewInput {
  product_id: string;
  store_id?: string;
  order_id?: string;
  rating: number;
  title?: string;
  comment?: string;
  images?: string[]; // URLs de imágenes
}

export class ReviewService {
  /**
   * Verifica si un usuario puede reseñar un producto (debe haber comprado)
   */
  static async canUserReviewProduct(
    userId: string,
    productId: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('can_user_review_product', {
        user_id_param: userId,
        product_id_param: productId,
      } as any);

      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error('Error checking if user can review:', error);
      return false;
    }
  }

  /**
   * Crea una nueva reseña
   */
  static async createReview(
    userId: string,
    input: CreateReviewInput
  ): Promise<Review | null> {
    try {
      // Verificar que puede reseñar
      const canReview = await this.canUserReviewProduct(userId, input.product_id);
      if (!canReview) {
        throw new Error('Debes haber comprado este producto para poder reseñarlo');
      }

      // Obtener seller_id del producto
      const { data: product } = await supabase
        .from('products')
        .select('seller_id, store_id')
        .eq('id', input.product_id)
        .single();

      if (!product) {
        throw new Error('Producto no encontrado');
      }

      // Crear la reseña
      const { data: review, error: reviewError } = await supabase
        .from('reviews')
        .insert({
          product_id: input.product_id,
          store_id: input.store_id || (product as any).store_id,
          buyer_id: userId,
          seller_id: (product as any).seller_id,
          order_id: input.order_id || null,
          rating: input.rating,
          title: input.title || null,
          comment: input.comment || null,
          is_verified_purchase: true, // Si pasó la verificación, es compra verificada
          status: 'published', // O 'pending' para moderación
        } as any)
        .select()
        .single();

      if (reviewError) {
        // Si ya existe, obtener el ID y actualizar
        if (reviewError.code === '23505') {
          const { data: existingReview } = await supabase
            .from('reviews')
            .select('id')
            .eq('buyer_id', userId)
            .eq('product_id', input.product_id)
            .single();
          
          if (existingReview) {
            return await this.updateReview(
              userId,
              (existingReview as any).id,
              input
            );
          }
        }
        throw reviewError;
      }

      // Subir imágenes si las hay
      if (input.images && input.images.length > 0 && review) {
        await this.addReviewImages((review as any).id, input.images);
      }

      return await this.getReviewById((review as any).id, userId);
    } catch (error: any) {
      console.error('Error creating review:', error);
      throw error;
    }
  }

  /**
   * Actualiza una reseña existente
   */
  static async updateReview(
    userId: string,
    reviewId: string,
    input: Partial<CreateReviewInput>
  ): Promise<Review | null> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (input.rating !== undefined) updateData.rating = input.rating;
      if (input.title !== undefined) updateData.title = input.title;
      if (input.comment !== undefined) updateData.comment = input.comment;

      const { data, error } = await (supabase as any)
        .from('reviews')
        .update(updateData)
        .eq('id', reviewId)
        .eq('buyer_id', userId) // Solo el dueño puede actualizar
        .select()
        .single();

      if (error) throw error;

      // Actualizar imágenes si se proporcionan
      if (input.images !== undefined && data) {
        // Eliminar imágenes existentes
        await (supabase as any).from('review_images').delete().eq('review_id', reviewId);
        // Agregar nuevas
        if (input.images.length > 0) {
          await this.addReviewImages(reviewId, input.images);
        }
      }

      return await this.getReviewById(reviewId, userId);
    } catch (error: any) {
      console.error('Error updating review:', error);
      throw error;
    }
  }

  /**
   * Agrega imágenes a una reseña
   */
  static async addReviewImages(
    reviewId: string,
    imageUrls: string[]
  ): Promise<void> {
    try {
      const images = imageUrls.map((url, index) => ({
        review_id: reviewId,
        image_url: url,
        order_index: index,
      }));

      const { error } = await (supabase as any).from('review_images').insert(images as any);
      if (error) throw error;
    } catch (error) {
      console.error('Error adding review images:', error);
      throw error;
    }
  }

  /**
   * Obtiene una reseña por ID
   */
  static async getReviewById(
    reviewId: string,
    currentUserId?: string
  ): Promise<Review | null> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          images:review_images(*),
          response:review_responses(*)
        `)
        .eq('id', reviewId)
        .single();

      if (error) throw error;
      if (!data) return null;

      // Obtener información del buyer (profile) por separado
      let buyer = null;
      if ((data as any).buyer_id) {
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, avatar_url')
            .eq('id', (data as any).buyer_id)
            .single();
          
          if (profileData) {
            buyer = profileData;
          }
        } catch (err) {
          console.warn('Error loading buyer profile:', err);
        }
      }

      // Combinar datos
      const reviewWithBuyer = {
        ...(data as any),
        buyer: buyer || {
          id: (data as any).buyer_id,
          first_name: null,
          last_name: null,
          email: null,
          avatar_url: null,
        },
      };

      // Verificar si el usuario actual marcó como útil
      if (currentUserId && reviewWithBuyer) {
        const { data: helpful } = await supabase
          .from('review_helpful')
          .select('id')
          .eq('review_id', reviewId)
          .eq('user_id', currentUserId)
          .single();

        reviewWithBuyer.is_helpful = !!helpful;
      }

      return reviewWithBuyer as Review;
    } catch (error) {
      console.error('Error getting review:', error);
      return null;
    }
  }

  /**
   * Obtiene reseñas de un producto
   */
  static async getProductReviews(
    productId: string,
    options: {
      page?: number;
      limit?: number;
      sortBy?: 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';
      currentUserId?: string;
    } = {}
  ): Promise<{ reviews: Review[]; total: number; total_pages: number }> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 10;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('reviews')
        .select(
          `
          *,
          images:review_images(*),
          response:review_responses(*)
        `,
          { count: 'exact' }
        )
        .eq('product_id', productId)
        .eq('status', 'published');

      // Ordenamiento
      switch (options.sortBy) {
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'highest':
          query = query.order('rating', { ascending: false });
          break;
        case 'lowest':
          query = query.order('rating', { ascending: true });
          break;
        case 'helpful':
          query = query.order('helpful_count', { ascending: false });
          break;
        default: // newest
          query = query.order('created_at', { ascending: false });
      }

      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      // Agregar is_helpful si hay usuario actual
      if (options.currentUserId && data) {
        const reviewIds = (data as any[]).map((r) => r.id);
        const { data: helpfulData } = await supabase
          .from('review_helpful')
          .select('review_id')
          .in('review_id', reviewIds)
          .eq('user_id', options.currentUserId);

        const helpfulIds = new Set(
          (helpfulData || []).map((h: any) => h.review_id)
        );

        (data as any[]).forEach((review) => {
          review.is_helpful = helpfulIds.has(review.id);
        });
      }

      const total = count || 0;
      const total_pages = Math.ceil(total / limit);

      // Obtener información de buyers (profiles) por separado
      const buyerIds = [...new Set((data || []).map((r: any) => r.buyer_id).filter(Boolean))];
      const buyersMap: Record<string, any> = {};
      
      if (buyerIds.length > 0) {
        try {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, avatar_url')
            .in('id', buyerIds);
          
          if (!profilesError && profilesData) {
            profilesData.forEach((profile: any) => {
              buyersMap[profile.id] = profile;
            });
          }
        } catch (err) {
          console.warn('Error loading buyer profiles:', err);
        }
      }

      // Combinar datos de reviews con buyer info
      const reviewsWithBuyers = (data || []).map((review: any) => ({
        ...review,
        buyer: buyersMap[review.buyer_id] || {
          id: review.buyer_id,
          first_name: null,
          last_name: null,
          email: null,
          avatar_url: null,
        },
      }));

      return {
        reviews: reviewsWithBuyers as Review[],
        total,
        total_pages,
      };
    } catch (error) {
      console.error('Error getting product reviews:', error);
      return { reviews: [], total: 0, total_pages: 0 };
    }
  }

  /**
   * Obtiene estadísticas de rating de un producto
   */
  static async getProductRatingStats(
    productId: string
  ): Promise<ReviewStats | null> {
    try {
      const { data, error } = await supabase.rpc('get_product_rating_stats', {
        product_id_param: productId,
      } as any);

      if (error) throw error;
      return normalizeRpcResult<ReviewStats>(data);
    } catch (error) {
      console.error('Error getting product rating stats:', error);
      return null;
    }
  }

  /**
   * Obtiene estadísticas de rating de una tienda
   */
  static async getStoreRatingStats(
    storeId: string
  ): Promise<ReviewStats | null> {
    try {
      const { data, error } = await supabase.rpc('get_store_rating_stats', {
        store_id_param: storeId,
      } as any);

      if (error) throw error;
      return normalizeRpcResult<ReviewStats>(data);
    } catch (error) {
      console.error('Error getting store rating stats:', error);
      return null;
    }
  }

  /**
   * Marca una reseña como útil
   */
  static async markAsHelpful(
    reviewId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase.from('review_helpful').insert({
        review_id: reviewId,
        user_id: userId,
      } as any);

      if (error) {
        // Si ya existe, eliminar (toggle)
        if (error.code === '23505') {
          await this.unmarkAsHelpful(reviewId, userId);
          return false;
        }
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error marking review as helpful:', error);
      return false;
    }
  }

  /**
   * Quita el voto de útil
   */
  static async unmarkAsHelpful(
    reviewId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('review_helpful')
        .delete()
        .eq('review_id', reviewId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error unmarking review as helpful:', error);
      return false;
    }
  }

  /**
   * Agrega una respuesta del vendedor
   */
  static async addResponse(
    reviewId: string,
    sellerId: string,
    responseText: string
  ): Promise<ReviewResponse | null> {
    try {
      const { data, error } = await supabase
        .from('review_responses')
        .insert({
          review_id: reviewId,
          seller_id: sellerId,
          response_text: responseText,
        } as any)
        .select()
        .single();

      if (error) {
        // Si ya existe, actualizar
        if (error.code === '23505') {
          const { data: updated } = await (supabase as any)
            .from('review_responses')
            .update({ response_text: responseText } as any)
            .eq('review_id', reviewId)
            .eq('seller_id', sellerId)
            .select()
            .single();

          return (updated || null) as ReviewResponse | null;
        }
        throw error;
      }

      return (data || null) as ReviewResponse | null;
    } catch (error) {
      console.error('Error adding review response:', error);
      return null;
    }
  }

  /**
   * Elimina una reseña
   */
  static async deleteReview(
    reviewId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId)
        .eq('buyer_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting review:', error);
      return false;
    }
  }
}


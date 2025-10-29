// src/lib/services/wishlistService.ts
// Servicio para gestionar wishlists/favoritos

import { supabase } from '@/lib/supabase/client';
import { Product } from '@/types';

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
}

export class WishlistService {
  /**
   * Obtiene todos los productos en el wishlist del usuario
   */
  static async getUserWishlist(userId: string): Promise<WishlistItem[]> {
    try {
      const { data, error } = await supabase
        .from('wishlists')
        .select(`
          *,
          product:products(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []) as WishlistItem[];
    } catch (error) {
      console.error('Error getting wishlist:', error);
      return [];
    }
  }

  /**
   * Agrega un producto al wishlist
   */
  static async addToWishlist(
    userId: string,
    productId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase.from('wishlists').insert({
        user_id: userId,
        product_id: productId,
      });

      if (error) {
        // Si ya existe, no es un error
        if (error.code === '23505') {
          return true;
        }
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      return false;
    }
  }

  /**
   * Remueve un producto del wishlist
   */
  static async removeFromWishlist(
    userId: string,
    productId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      return false;
    }
  }

  /**
   * Verifica si un producto está en el wishlist
   */
  static async isInWishlist(
    userId: string,
    productId: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 es "no rows returned", lo cual es OK
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking wishlist:', error);
      return false;
    }
  }

  /**
   * Obtiene el conteo de usuarios que tienen un producto en wishlist
   */
  static async getWishlistCount(productId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('wishlists')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', productId);

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('Error getting wishlist count:', error);
      return 0;
    }
  }

  /**
   * Toggle: Agrega si no está, remueve si está
   */
  static async toggleWishlist(
    userId: string,
    productId: string
  ): Promise<boolean> {
    const isInWishlist = await this.isInWishlist(userId, productId);

    if (isInWishlist) {
      return this.removeFromWishlist(userId, productId);
    } else {
      return this.addToWishlist(userId, productId);
    }
  }
}


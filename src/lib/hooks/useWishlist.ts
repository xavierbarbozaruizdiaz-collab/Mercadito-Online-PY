// src/lib/hooks/useWishlist.ts
// Hook personalizado para gestionar wishlist

import { useState, useEffect, useCallback } from 'react';
import { WishlistService, WishlistItem } from '@/lib/services/wishlistService';
import { useAuth } from './useAuth';
import { Product } from '@/types';

export function useWishlist() {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [wishlistProductIds, setWishlistProductIds] = useState<Set<string>>(
    new Set()
  );

  // Cargar wishlist
  const loadWishlist = useCallback(async () => {
    if (!user?.id) {
      setWishlist([]);
      setWishlistProductIds(new Set());
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const items = await WishlistService.getUserWishlist(user.id);
      setWishlist(items);
      setWishlistProductIds(
        new Set(items.map((item) => item.product_id))
      );
    } catch (error) {
      console.error('Error loading wishlist:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  // Agregar a wishlist
  const addToWishlist = useCallback(
    async (productId: string) => {
      if (!user?.id) return false;

      const success = await WishlistService.addToWishlist(
        user.id,
        productId
      );
      if (success) {
        setWishlistProductIds((prev) => new Set(prev).add(productId));
        await loadWishlist(); // Recargar para obtener el producto completo
      }
      return success;
    },
    [user?.id, loadWishlist]
  );

  // Remover de wishlist
  const removeFromWishlist = useCallback(
    async (productId: string) => {
      if (!user?.id) return false;

      const success = await WishlistService.removeFromWishlist(
        user.id,
        productId
      );
      if (success) {
        setWishlistProductIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
        setWishlist((prev) =>
          prev.filter((item) => item.product_id !== productId)
        );
      }
      return success;
    },
    [user?.id]
  );

  // Toggle wishlist
  const toggleWishlist = useCallback(
    async (productId: string) => {
      if (!user?.id) return false;

      const isInWishlist = wishlistProductIds.has(productId);
      if (isInWishlist) {
        return removeFromWishlist(productId);
      } else {
        return addToWishlist(productId);
      }
    },
    [user?.id, wishlistProductIds, addToWishlist, removeFromWishlist]
  );

  // Verificar si está en wishlist
  const isInWishlist = useCallback(
    (productId: string) => {
      return wishlistProductIds.has(productId);
    },
    [wishlistProductIds]
  );

  // Obtener productos del wishlist
  const getProducts = useCallback((): Product[] => {
    return wishlist
      .map((item) => item.product)
      .filter((product): product is Product => product !== undefined);
  }, [wishlist]);

  return {
    wishlist,
    products: getProducts(),
    loading,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    isInWishlist,
    refresh: loadWishlist,
    count: wishlist.length,
  };
}


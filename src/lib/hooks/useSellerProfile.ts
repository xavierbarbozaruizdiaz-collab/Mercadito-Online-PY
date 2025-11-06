// ============================================
// MERCADITO ONLINE PY - USE SELLER PROFILE HOOK
// Hook personalizado para manejar la lógica de perfiles de vendedores
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { getSellerProfileById, getSellerProducts, SellerProfile, Review, SellerStats } from '@/lib/services/sellerProfileService';
import { Product } from '@/types';

// ============================================
// TIPOS
// ============================================

interface UseSellerProfileOptions {
  sellerId?: string;
  autoLoad?: boolean;
}

interface UseSellerProfileResult {
  profile: SellerProfile | null;
  products: Product[];
  reviews: Review[];
  stats: SellerStats | null;
  loading: boolean;
  error: string | null;
  productsPagination: {
    page: number;
    total_pages: number;
    total: number;
    per_page: number;
  };
  reviewsPagination: {
    page: number;
    total_pages: number;
    total: number;
    per_page: number;
  };
  loadProducts: (options?: { page?: number; limit?: number }) => Promise<void>;
  loadReviews: (options?: { page?: number; limit?: number }) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ============================================
// HOOK
// ============================================

export function useSellerProfile(options?: UseSellerProfileOptions): UseSellerProfileResult {
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productsPagination, setProductsPagination] = useState({
    page: 1,
    total_pages: 1,
    total: 0,
    per_page: 12,
  });
  const [reviewsPagination, setReviewsPagination] = useState({
    page: 1,
    total_pages: 1,
    total: 0,
    per_page: 10,
  });

  // Cargar datos del perfil del vendedor
  const loadProfile = useCallback(async (sellerId: string) => {
    setLoading(true);
    setError(null);
    try {
      const profileData = await getSellerProfileById(sellerId);
      setProfile(profileData);
      
      if (profileData) {
        // Cargar productos directamente con sellerId
        try {
          const result = await getSellerProducts(sellerId, {
            page: 1,
            limit: 12,
            status: 'active',
          });
          setProducts(result.products || []);
          setProductsPagination({
            page: 1,
            total_pages: result.total_pages,
            total: result.total,
            per_page: 12,
          });
        } catch (productsErr) {
          console.error('Error loading products:', productsErr);
          setProducts([]);
        }
        
        // Cargar reseñas iniciales (mantener mock por ahora si no hay servicio)
        // await loadReviews({ page: 1 });
      }
    } catch (err) {
      console.error('Error loading seller profile:', err);
      setError('No se pudo cargar la información del vendedor.');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar productos
  const loadProducts = useCallback(async (options: { page?: number; limit?: number } = {}) => {
    if (!profile) return;
    
    const page = options.page || 1;
    const limit = options.limit || 12;
    
    try {
      // Cargar productos reales desde la base de datos
      const result = await getSellerProducts(profile.id, {
        page,
        limit,
        status: 'active',
      });

      setProducts(result.products || []);
      setProductsPagination({
        page,
        total_pages: result.total_pages,
        total: result.total,
        per_page: limit,
      });
      
    } catch (err) {
      console.error('Error loading products:', err);
      setProducts([]);
      setProductsPagination({
        page: 1,
        total_pages: 0,
        total: 0,
        per_page: limit,
      });
    }
  }, [profile]);

  // Cargar reseñas
  const loadReviews = useCallback(async (options: { page?: number; limit?: number } = {}) => {
    if (!profile) return;
    
    const page = options.page || 1;
    const limit = options.limit || 10;
    
    try {
      // Simular llamada a la API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Datos simulados de reseñas
      const mockReviews: Review[] = [
        {
          id: '1',
          product_id: '1',
          buyer_id: 'buyer1',
          seller_id: profile.id,
          rating: 5,
          comment: 'Excelente producto, muy buena calidad y entrega rápida.',
          created_at: '2024-01-25',
          updated_at: '2024-01-25',
          buyer: {
            full_name: 'Juan Pérez',
            avatar_url: null,
          },
        },
        {
          id: '2',
          product_id: '2',
          buyer_id: 'buyer2',
          seller_id: profile.id,
          rating: 4,
          comment: 'Buen producto, cumple con las expectativas.',
          created_at: '2024-01-23',
          updated_at: '2024-01-23',
          buyer: {
            full_name: 'María González',
            avatar_url: null,
          },
        },
        {
          id: '3',
          product_id: '3',
          buyer_id: 'buyer3',
          seller_id: profile.id,
          rating: 5,
          comment: 'Increíble laptop, muy rápida y eficiente.',
          created_at: '2024-01-20',
          updated_at: '2024-01-20',
          buyer: {
            full_name: 'Carlos Rodríguez',
            avatar_url: null,
          },
        },
        {
          id: '4',
          product_id: '4',
          buyer_id: 'buyer4',
          seller_id: profile.id,
          rating: 4,
          comment: 'Muy buenos auriculares, buena calidad de sonido.',
          created_at: '2024-01-18',
          updated_at: '2024-01-18',
          buyer: {
            full_name: 'Ana Martínez',
            avatar_url: null,
          },
        },
        {
          id: '5',
          product_id: '5',
          buyer_id: 'buyer5',
          seller_id: profile.id,
          rating: 5,
          comment: 'Excelente consola, juegos increíbles.',
          created_at: '2024-01-15',
          updated_at: '2024-01-15',
          buyer: {
            full_name: 'Roberto Silva',
            avatar_url: null,
          },
        },
      ];

      // Aplicar paginación
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedReviews = mockReviews.slice(startIndex, endIndex);

      setReviews(paginatedReviews);
      setReviewsPagination({
        page,
        total_pages: Math.ceil(mockReviews.length / limit),
        total: mockReviews.length,
        per_page: limit,
      });
      
    } catch (err) {
      console.error('Error loading reviews:', err);
    }
  }, [profile]);

  // Refrescar datos del perfil
  const refreshProfile = useCallback(async () => {
    if (options?.sellerId) {
      await loadProfile(options.sellerId);
    }
  }, [options?.sellerId, loadProfile]);

  // Cargar datos iniciales
  useEffect(() => {
    if (options?.sellerId && options?.autoLoad !== false) {
      loadProfile(options.sellerId);
    } else if (options?.autoLoad === false) {
      setLoading(false);
    }
  }, [options?.sellerId, options?.autoLoad, loadProfile]);

  // Nota: Los productos ya se cargan en loadProfile, no necesitamos cargarlos de nuevo aquí

  // Calcular estadísticas
  useEffect(() => {
    if (profile && products.length > 0 && reviews.length > 0) {
      const totalProducts = products.length;
      const totalSales = Math.floor(Math.random() * 1000) + 100; // Simulado
      const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
      const responseRate = Math.floor(Math.random() * 20) + 80; // Simulado

      setStats({
        total_products: totalProducts,
        total_sales: totalSales,
        average_rating: averageRating,
        response_rate: responseRate,
      });
    }
  }, [profile, products, reviews]);

  return {
    profile,
    products,
    reviews,
    stats,
    loading,
    error,
    productsPagination,
    reviewsPagination,
    loadProducts,
    loadReviews,
    refreshProfile,
  };
}
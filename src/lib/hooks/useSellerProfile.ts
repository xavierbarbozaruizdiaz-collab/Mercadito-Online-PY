// ============================================
// MERCADITO ONLINE PY - USE SELLER PROFILE HOOK
// Hook personalizado para manejar la lógica de perfiles de vendedores
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { getSellerProfileById, SellerProfile, Product, Review, SellerStats } from '@/lib/services/sellerProfileService';

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
        // Cargar productos y reseñas iniciales
        await Promise.all([
          loadProducts({ page: 1 }),
          loadReviews({ page: 1 }),
        ]);
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
      // Simular llamada a la API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Datos simulados de productos
      const mockProducts: Product[] = [
        {
          id: '1',
          title: 'iPhone 15 Pro Max',
          description: 'El iPhone más avanzado con cámara de 48MP y chip A17 Pro.',
          price: 4500000,
          cover_url: '/placeholder-product.png',
          condition: 'nuevo',
          sale_type: 'venta',
          category_id: '1',
          store_id: profile.store.id,
          seller_id: profile.store.owner_id,
          status: 'active',
          created_at: '2024-01-20',
          updated_at: '2024-01-20',
        },
        {
          id: '2',
          title: 'Samsung Galaxy S24 Ultra',
          description: 'Smartphone premium con S Pen y cámara de 200MP.',
          price: 4200000,
          cover_url: '/placeholder-product.png',
          condition: 'nuevo',
          sale_type: 'venta',
          category_id: '1',
          store_id: profile.store.id,
          seller_id: profile.store.owner_id,
          status: 'active',
          created_at: '2024-01-18',
          updated_at: '2024-01-18',
        },
        {
          id: '3',
          title: 'MacBook Air M3',
          description: 'Laptop ultradelgada con chip M3 y pantalla de 13 pulgadas.',
          price: 5500000,
          cover_url: '/placeholder-product.png',
          condition: 'nuevo',
          sale_type: 'venta',
          category_id: '2',
          store_id: profile.store.id,
          seller_id: profile.store.owner_id,
          status: 'active',
          created_at: '2024-01-15',
          updated_at: '2024-01-15',
        },
        {
          id: '4',
          title: 'AirPods Pro 2',
          description: 'Auriculares inalámbricos con cancelación de ruido activa.',
          price: 850000,
          cover_url: '/placeholder-product.png',
          condition: 'nuevo',
          sale_type: 'venta',
          category_id: '3',
          store_id: profile.store.id,
          seller_id: profile.store.owner_id,
          status: 'active',
          created_at: '2024-01-12',
          updated_at: '2024-01-12',
        },
        {
          id: '5',
          title: 'PlayStation 5 Slim',
          description: 'Consola de videojuegos de nueva generación.',
          price: 3200000,
          cover_url: '/placeholder-product.png',
          condition: 'nuevo',
          sale_type: 'venta',
          category_id: '4',
          store_id: profile.store.id,
          seller_id: profile.store.owner_id,
          status: 'active',
          created_at: '2024-01-10',
          updated_at: '2024-01-10',
        },
        {
          id: '6',
          title: 'iPad Pro 12.9"',
          description: 'Tablet profesional con chip M2 y pantalla Liquid Retina XDR.',
          price: 4800000,
          cover_url: '/placeholder-product.png',
          condition: 'nuevo',
          sale_type: 'venta',
          category_id: '2',
          store_id: profile.store.id,
          seller_id: profile.store.owner_id,
          status: 'active',
          created_at: '2024-01-08',
          updated_at: '2024-01-08',
        },
      ];

      // Aplicar paginación
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedProducts = mockProducts.slice(startIndex, endIndex);

      setProducts(paginatedProducts);
      setProductsPagination({
        page,
        total_pages: Math.ceil(mockProducts.length / limit),
        total: mockProducts.length,
        per_page: limit,
      });
      
    } catch (err) {
      console.error('Error loading products:', err);
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
          store_id: profile.store.id,
          rating: 5,
          comment: 'Excelente producto, muy buena calidad y entrega rápida.',
          created_at: '2024-01-25',
          updated_at: '2024-01-25',
          buyer: {
            id: 'buyer1',
            full_name: 'Juan Pérez',
            avatar_url: null,
          },
        },
        {
          id: '2',
          product_id: '2',
          buyer_id: 'buyer2',
          store_id: profile.store.id,
          rating: 4,
          comment: 'Buen producto, cumple con las expectativas.',
          created_at: '2024-01-23',
          updated_at: '2024-01-23',
          buyer: {
            id: 'buyer2',
            full_name: 'María González',
            avatar_url: null,
          },
        },
        {
          id: '3',
          product_id: '3',
          buyer_id: 'buyer3',
          store_id: profile.store.id,
          rating: 5,
          comment: 'Increíble laptop, muy rápida y eficiente.',
          created_at: '2024-01-20',
          updated_at: '2024-01-20',
          buyer: {
            id: 'buyer3',
            full_name: 'Carlos Rodríguez',
            avatar_url: null,
          },
        },
        {
          id: '4',
          product_id: '4',
          buyer_id: 'buyer4',
          store_id: profile.store.id,
          rating: 4,
          comment: 'Muy buenos auriculares, buena calidad de sonido.',
          created_at: '2024-01-18',
          updated_at: '2024-01-18',
          buyer: {
            id: 'buyer4',
            full_name: 'Ana Martínez',
            avatar_url: null,
          },
        },
        {
          id: '5',
          product_id: '5',
          buyer_id: 'buyer5',
          store_id: profile.store.id,
          rating: 5,
          comment: 'Excelente consola, juegos increíbles.',
          created_at: '2024-01-15',
          updated_at: '2024-01-15',
          buyer: {
            id: 'buyer5',
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
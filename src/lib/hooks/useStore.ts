// ============================================
// MERCADITO ONLINE PY - USE STORE HOOK
// Hook personalizado para manejar la lógica de tiendas
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { getStoreBySlug, Store, Product, Review, StoreStats } from '@/lib/services/storeService';

// ============================================
// TIPOS
// ============================================

interface UseStoreOptions {
  storeSlug?: string;
  autoLoad?: boolean;
}

interface UseStoreResult {
  store: Store | null;
  products: Product[];
  reviews: Review[];
  stats: StoreStats | null;
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
  refreshStore: () => Promise<void>;
}

// ============================================
// HOOK
// ============================================

export function useStore(options?: UseStoreOptions): UseStoreResult {
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<StoreStats | null>(null);
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

  // Cargar datos de la tienda
  const loadStore = useCallback(async (slug: string) => {
    setLoading(true);
    setError(null);
    try {
      const storeData = await getStoreBySlug(slug);
      setStore(storeData);
      
      if (storeData) {
        // Cargar productos y reseñas iniciales
        await Promise.all([
          loadProducts({ page: 1 }),
          loadReviews({ page: 1 }),
        ]);
      }
    } catch (err) {
      console.error('Error loading store:', err);
      setError('No se pudo cargar la información de la tienda.');
      setStore(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar productos
  const loadProducts = useCallback(async (options: { page?: number; limit?: number } = {}) => {
    if (!store) return;
    
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
          store_id: store.id,
          seller_id: store.owner_id,
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
          store_id: store.id,
          seller_id: store.owner_id,
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
          store_id: store.id,
          seller_id: store.owner_id,
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
          store_id: store.id,
          seller_id: store.owner_id,
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
          store_id: store.id,
          seller_id: store.owner_id,
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
          store_id: store.id,
          seller_id: store.owner_id,
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
  }, [store]);

  // Cargar reseñas
  const loadReviews = useCallback(async (options: { page?: number; limit?: number } = {}) => {
    if (!store) return;
    
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
          store_id: store.id,
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
          store_id: store.id,
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
          store_id: store.id,
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
          store_id: store.id,
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
          store_id: store.id,
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
  }, [store]);

  // Refrescar datos de la tienda
  const refreshStore = useCallback(async () => {
    if (options?.storeSlug) {
      await loadStore(options.storeSlug);
    }
  }, [options?.storeSlug, loadStore]);

  // Cargar datos iniciales
  useEffect(() => {
    if (options?.storeSlug && options?.autoLoad !== false) {
      loadStore(options.storeSlug);
    } else if (options?.autoLoad === false) {
      setLoading(false);
    }
  }, [options?.storeSlug, options?.autoLoad, loadStore]);

  // Calcular estadísticas
  useEffect(() => {
    if (store && products.length > 0 && reviews.length > 0) {
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
  }, [store, products, reviews]);

  return {
    store,
    products,
    reviews,
    stats,
    loading,
    error,
    productsPagination,
    reviewsPagination,
    loadProducts,
    loadReviews,
    refreshStore,
  };
}
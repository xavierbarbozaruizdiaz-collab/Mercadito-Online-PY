// ============================================
// MERCADITO ONLINE PY - USE SEARCH HOOK
// Hook personalizado para manejar búsquedas
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  SearchService, 
  SearchFilters, 
  SearchSuggestion,
  ProductSearchResult,
  StoreSearchResult 
} from '@/lib/services/searchService';

// ============================================
// TIPOS
// ============================================

interface UseSearchOptions {
  initialFilters?: Partial<SearchFilters>;
  autoSearch?: boolean;
  debounceMs?: number;
}

interface UseSearchReturn {
  // Estado
  products: ProductSearchResult[];
  stores: StoreSearchResult[];
  suggestions: SearchSuggestion[];
  trending: SearchSuggestion[];
  recent: SearchSuggestion[];
  loading: boolean;
  error: string | null;
  
  // Filtros
  filters: SearchFilters;
  setFilters: (filters: Partial<SearchFilters>) => void;
  
  // Paginación
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  
  // Funciones
  search: () => Promise<void>;
  searchProducts: () => Promise<void>;
  searchStores: () => Promise<void>;
  loadSuggestions: (query: string) => Promise<void>;
  loadTrending: () => Promise<void>;
  loadRecent: () => Promise<void>;
  clearFilters: () => void;
  resetSearch: () => void;
  
  // Estadísticas
  stats: {
    totalProducts: number;
    totalStores: number;
    totalCategories: number;
    popularCategories: Array<{ name: string; count: number }>;
  };
}

// ============================================
// HOOK
// ============================================

export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const {
    initialFilters = {},
    autoSearch = true,
    debounceMs = 300,
  } = options;

  // Estado
  const [products, setProducts] = useState<ProductSearchResult[]>([]);
  const [stores, setStores] = useState<StoreSearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [trending, setTrending] = useState<SearchSuggestion[]>([]);
  const [recent, setRecent] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [filters, setFiltersState] = useState<SearchFilters>({
    query: searchParams.get('q') || '',
    category_id: searchParams.get('category') || '',
    min_price: searchParams.get('min_price') ? Number(searchParams.get('min_price')) : undefined,
    max_price: searchParams.get('max_price') ? Number(searchParams.get('max_price')) : undefined,
    condition: searchParams.get('condition') || '',
    sale_type: searchParams.get('sale_type') || '',
    location: searchParams.get('location') || '',
    sort_by: 'created_at',
    sort_order: 'desc',
    page: 1,
    limit: 12,
    ...initialFilters,
  });
  
  // Paginación
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    total_pages: 0,
  });
  
  // Estadísticas
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalStores: 0,
    totalCategories: 0,
    popularCategories: [] as Array<{ name: string; count: number }>,
  });

  // Debounce para búsquedas
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Actualizar filtros
  const setFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  // Actualizar URL cuando cambien los filtros
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (filters.query) params.set('q', filters.query);
    if (filters.category_id) params.set('category', filters.category_id);
    if (filters.min_price) params.set('min_price', filters.min_price.toString());
    if (filters.max_price) params.set('max_price', filters.max_price.toString());
    if (filters.condition) params.set('condition', filters.condition);
    if (filters.sale_type) params.set('sale_type', filters.sale_type);
    if (filters.location) params.set('location', filters.location);
    if (filters.sort_by) params.set('sort_by', filters.sort_by);
    if (filters.sort_order) params.set('sort_order', filters.sort_order);
    if (pagination.page > 1) params.set('page', pagination.page.toString());

    const newUrl = params.toString() ? `?${params.toString()}` : '';
    router.replace(`/search${newUrl}`, { scroll: false });
  }, [filters, pagination.page, router]);

  // Búsqueda de productos
  const searchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await SearchService.searchProducts({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      });

      setProducts(result.data);
      setPagination(prev => ({
        ...prev,
        total: result.pagination.total,
        total_pages: result.pagination.total_pages,
      }));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al buscar productos');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  // Búsqueda de tiendas
  const searchStores = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await SearchService.searchStores({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      });

      setStores(result.data);
      setPagination(prev => ({
        ...prev,
        total: result.pagination.total,
        total_pages: result.pagination.total_pages,
      }));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al buscar tiendas');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  // Búsqueda general
  const search = useCallback(async () => {
    await Promise.all([searchProducts(), searchStores()]);
  }, [searchProducts, searchStores]);

  // Cargar sugerencias
  const loadSuggestions = useCallback(async (query: string) => {
    try {
      const suggestions = await SearchService.getSearchSuggestions(query);
      setSuggestions(suggestions);
    } catch (err) {
      console.error('Error loading suggestions:', err);
    }
  }, []);

  // Cargar tendencias
  const loadTrending = useCallback(async () => {
    try {
      const trending = await SearchService.getTrendingSearches();
      setTrending(trending);
    } catch (err) {
      console.error('Error loading trending:', err);
    }
  }, []);

  // Cargar recientes
  const loadRecent = useCallback(async () => {
    try {
      // En una implementación real, esto usaría el ID del usuario autenticado
      const recent = await SearchService.getRecentSearches('current-user');
      setRecent(recent);
    } catch (err) {
      console.error('Error loading recent:', err);
    }
  }, []);

  // Cargar estadísticas
  const loadStats = useCallback(async () => {
    try {
      const stats = await SearchService.getSearchStats();
      setStats(stats);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }, []);

  // Limpiar filtros
  const clearFilters = useCallback(() => {
    setFilters({
      query: '',
      category_id: '',
      min_price: undefined,
      max_price: undefined,
      condition: '',
      sale_type: '',
      location: '',
      tags: [],
      sort_by: 'created_at',
      sort_order: 'desc',
      page: 1,
      limit: 12,
    });
  }, [setFilters]);

  // Resetear búsqueda
  const resetSearch = useCallback(() => {
    setProducts([]);
    setStores([]);
    setSuggestions([]);
    setError(null);
    setPagination({
      page: 1,
      limit: 12,
      total: 0,
      total_pages: 0,
    });
  }, []);

  // Efecto para búsqueda automática
  useEffect(() => {
    if (autoSearch && filters.query) {
      // Limpiar timer anterior
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // Crear nuevo timer
      const timer = setTimeout(() => {
        search();
      }, debounceMs);

      setDebounceTimer(timer);

      return () => {
        if (timer) {
          clearTimeout(timer);
        }
      };
    }
  }, [filters, autoSearch, debounceMs, search]);

  // Cargar datos iniciales
  useEffect(() => {
    loadTrending();
    loadRecent();
    loadStats();
  }, [loadTrending, loadRecent, loadStats]);

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return {
    // Estado
    products,
    stores,
    suggestions,
    trending,
    recent,
    loading,
    error,
    
    // Filtros
    filters,
    setFilters,
    
    // Paginación
    pagination,
    
    // Funciones
    search,
    searchProducts,
    searchStores,
    loadSuggestions,
    loadTrending,
    loadRecent,
    clearFilters,
    resetSearch,
    
    // Estadísticas
    stats,
  };
}

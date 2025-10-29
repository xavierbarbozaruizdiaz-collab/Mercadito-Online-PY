// ============================================
// MERCADITO ONLINE PY - ADVANCED SEARCH
// Componente de búsqueda avanzada completa
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  SearchBar,
  SearchFilters,
  SearchResults,
  SearchSuggestions,
  LoadingSpinner,
  EmptyState,
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui';
import { useSearch } from '@/lib/hooks/useSearch';
import { SearchSuggestion } from '@/lib/services/searchService';
import { 
  Search, 
  Filter,
  Grid,
  List,
  SortAsc,
  SortDesc,
  TrendingUp,
  Clock,
  Package,
  Store
} from 'lucide-react';

// ============================================
// TIPOS
// ============================================

interface AdvancedSearchProps {
  initialQuery?: string;
  initialFilters?: any;
  className?: string;
  showFilters?: boolean;
  showSuggestions?: boolean;
  showTrending?: boolean;
  showRecent?: boolean;
  maxSuggestions?: number;
}

// ============================================
// COMPONENTE
// ============================================

export default function AdvancedSearch({
  initialQuery = '',
  initialFilters = {},
  className = '',
  showFilters = true,
  showSuggestions = true,
  showTrending = true,
  showRecent = true,
  maxSuggestions = 8,
}: AdvancedSearchProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'products' | 'stores'>('products');

  // Usar el hook de búsqueda
  const {
    products,
    stores,
    suggestions,
    trending,
    recent,
    loading,
    error,
    filters,
    setFilters,
    pagination,
    search,
    searchProducts,
    searchStores,
    loadSuggestions,
    loadTrending,
    loadRecent,
    clearFilters,
    resetSearch,
    stats,
  } = useSearch({
    initialFilters: {
      query: initialQuery,
      ...initialFilters,
    },
    autoSearch: true,
  });

  // Cargar datos iniciales
  useEffect(() => {
    loadTrending();
    loadRecent();
  }, [loadTrending, loadRecent]);

  // Manejar cambio de query
  const handleQueryChange = (value: string) => {
    setSearchQuery(value);
    setFilters({ query: value });
  };

  // Manejar búsqueda
  const handleSearch = () => {
    setFilters({ query: searchQuery });
    search();
  };

  // Manejar clic en sugerencia
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setSearchQuery(suggestion.text);
    setFilters({ query: suggestion.text });
    
    // Navegar según el tipo de sugerencia
    switch (suggestion.type) {
      case 'product':
        setActiveTab('products');
        break;
      case 'store':
        setActiveTab('stores');
        break;
      case 'category':
        setFilters({ category_id: suggestion.id });
        break;
      case 'location':
        setFilters({ location: suggestion.text });
        break;
    }
  };

  // Manejar clic en trending
  const handleTrendingClick = (trend: string) => {
    setSearchQuery(trend);
    setFilters({ query: trend });
    setActiveTab('products');
  };

  // Manejar cambio de filtros
  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters);
  };

  // Manejar cambio de página
  const handlePageChange = (page: number) => {
    setFilters({ page });
  };

  // Manejar clic en producto
  const handleProductClick = (productId: string) => {
    router.push(`/products/${productId}`);
  };

  // Manejar clic en tienda
  const handleStoreClick = (storeId: string) => {
    router.push(`/store/${storeId}`);
  };

  // Obtener filtros activos
  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.query) count++;
    if (filters.category_id) count++;
    if (filters.min_price) count++;
    if (filters.max_price) count++;
    if (filters.condition) count++;
    if (filters.sale_type) count++;
    if (filters.location) count++;
    if (filters.tags && filters.tags.length > 0) count++;
    return count;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header de búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="w-5 h-5 mr-2" />
            Búsqueda Avanzada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Barra de búsqueda principal */}
            <SearchBar
              placeholder="Buscar productos, marcas, categorías..."
              onSearch={handleSearch}
              size="lg"
              className="w-full"
            />

            {/* Filtros activos */}
            {getActiveFiltersCount() > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Filtros activos:</span>
                {filters.query && (
                  <Badge variant="info" size="sm">
                    "{filters.query}"
                  </Badge>
                )}
                {filters.category_id && (
                  <Badge variant="info" size="sm">
                    Categoría
                  </Badge>
                )}
                {filters.condition && (
                  <Badge variant="info" size="sm">
                    {filters.condition}
                  </Badge>
                )}
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Limpiar todo
                </Button>
              </div>
            )}

            {/* Controles */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros ({getActiveFiltersCount()})
                </Button>
                
                <div className="flex border border-gray-300 rounded-md">
                  <Button
                    variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-r-none"
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-l-none"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                {pagination.total > 0 ? `${pagination.total} resultados encontrados` : 'No hay resultados'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Panel de filtros */}
      {showFilters && showFiltersPanel && (
        <SearchFilters
          filters={filters}
          categories={[]} // En una implementación real, esto vendría de un hook
          onFiltersChange={handleFiltersChange}
          onSearch={handleSearch}
        />
      )}

      {/* Sugerencias */}
      {showSuggestions && searchQuery.length > 2 && (
        <SearchSuggestions
          query={searchQuery}
          onSuggestionClick={handleSuggestionClick as any}
          onTrendingClick={handleTrendingClick}
          showTrending={showTrending}
          showRecent={showRecent}
          maxSuggestions={maxSuggestions}
        />
      )}

      {/* Resultados */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" text="Buscando..." />
        </div>
      ) : error ? (
        <EmptyState
          title="Error en la búsqueda"
          description={error}
          action={{
            label: 'Reintentar',
            onClick: search,
          }}
          icon={<Search className="w-16 h-16" />}
        />
      ) : (
        <SearchResults
          products={products}
          stores={stores}
          loading={loading}
          error={error}
          totalProducts={pagination.total}
          totalStores={0} // En una implementación real, esto vendría del hook
          onProductClick={handleProductClick}
          onStoreClick={handleStoreClick}
          onLoadMore={() => handlePageChange(pagination.page + 1)}
          hasMore={pagination.page < pagination.total_pages}
        />
      )}

      {/* Estadísticas */}
      {stats.totalProducts > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Estadísticas del Marketplace
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalProducts}</div>
                <div className="text-sm text-gray-600">Productos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.totalStores}</div>
                <div className="text-sm text-gray-600">Tiendas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.totalCategories}</div>
                <div className="text-sm text-gray-600">Categorías</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

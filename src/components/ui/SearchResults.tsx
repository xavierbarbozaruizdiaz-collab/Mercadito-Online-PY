// ============================================
// MERCADITO ONLINE PY - SEARCH RESULTS
// Componente de resultados de búsqueda
// ============================================

'use client';

import { useState } from 'react';
import { 
  ProductCard, 
  StoreCard, 
  LoadingSpinner, 
  EmptyState,
  Button,
  Badge
} from '@/components/ui';
import { 
  Package, 
  Store, 
  Filter,
  Grid,
  List,
  SortAsc,
  SortDesc,
  TrendingUp,
  Clock,
  Star
} from 'lucide-react';

// ============================================
// TIPOS
// ============================================

interface Product {
  id: string;
  title: string;
  price: number;
  compare_price?: number;
  condition: string;
  sale_type: string;
  cover_url?: string;
  created_at: string;
  store: {
    name: string;
    slug: string;
  };
  category?: {
    name: string;
  };
}

interface Store {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  cover_image_url?: string;
  location?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SearchResultsProps {
  products: Product[];
  stores: Store[];
  loading: boolean;
  error: string | null;
  totalProducts: number;
  totalStores: number;
  onProductClick?: (productId: string) => void;
  onStoreClick?: (storeId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  className?: string;
}

// ============================================
// COMPONENTE
// ============================================

export default function SearchResults({
  products,
  stores,
  loading,
  error,
  totalProducts,
  totalStores,
  onProductClick,
  onStoreClick,
  onLoadMore,
  hasMore = false,
  className = '',
}: SearchResultsProps) {
  const [activeTab, setActiveTab] = useState<'products' | 'stores'>('products');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Manejar clic en producto
  const handleProductClick = (productId: string) => {
    if (onProductClick) {
      onProductClick(productId);
    }
  };

  // Manejar clic en tienda
  const handleStoreClick = (storeId: string) => {
    if (onStoreClick) {
      onStoreClick(storeId);
    }
  };

  // Manejar cargar más
  const handleLoadMore = () => {
    if (onLoadMore) {
      onLoadMore();
    }
  };

  // Obtener estadísticas
  const getStats = () => {
    const total = totalProducts + totalStores;
    const productPercentage = total > 0 ? Math.round((totalProducts / total) * 100) : 0;
    const storePercentage = total > 0 ? Math.round((totalStores / total) * 100) : 0;

    return {
      total,
      productPercentage,
      storePercentage,
    };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <LoadingSpinner size="lg" text="Buscando..." />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Error en la búsqueda"
        description={error}
        action={{
          label: 'Reintentar',
          onClick: () => window.location.reload(),
        }}
        icon={<Package className="w-16 h-16" />}
      />
    );
  }

  if (stats.total === 0) {
    return (
      <EmptyState
        title="No se encontraron resultados"
        description="Intenta ajustar tus filtros de búsqueda o explorar diferentes categorías."
        action={{
          label: 'Limpiar filtros',
          onClick: () => window.location.href = '/search',
        }}
        icon={<Package className="w-16 h-16" />}
      />
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Estadísticas */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{stats.total}</span> resultados encontrados
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="info" size="sm">
                <Package className="w-3 h-3 mr-1" />
                {totalProducts} productos ({stats.productPercentage}%)
              </Badge>
              <Badge variant="success" size="sm">
                <Store className="w-3 h-3 mr-1" />
                {totalStores} tiendas ({stats.storePercentage}%)
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'products'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Package className="w-4 h-4 inline mr-2" />
          Productos ({totalProducts})
        </button>
        <button
          onClick={() => setActiveTab('stores')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'stores'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Store className="w-4 h-4 inline mr-2" />
          Tiendas ({totalStores})
        </button>
      </div>

      {/* Resultados de productos */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {products.length > 0 ? (
            <>
              <div className={`grid gap-6 ${
                viewMode === 'grid' 
                  ? 'grid-cols-3 lg:grid-cols-9' 
                  : 'grid-cols-1'
              }`}>
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onClick={() => handleProductClick(product.id)}
                  />
                ))}
              </div>

              {/* Botón de cargar más */}
              {hasMore && (
                <div className="text-center">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    className="px-8"
                  >
                    Cargar más productos
                  </Button>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              title="No se encontraron productos"
              description="Intenta ajustar tus filtros de búsqueda."
              icon={<Package className="w-16 h-16" />}
            />
          )}
        </div>
      )}

      {/* Resultados de tiendas */}
      {activeTab === 'stores' && (
        <div className="space-y-4">
          {stores.length > 0 ? (
            <>
              <div className={`grid gap-6 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
                  : 'grid-cols-1'
              }`}>
                {stores.map((store) => (
                  <StoreCard
                    key={store.id}
                    store={store}
                    onClick={() => handleStoreClick(store.id)}
                  />
                ))}
              </div>

              {/* Botón de cargar más */}
              {hasMore && (
                <div className="text-center">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    className="px-8"
                  >
                    Cargar más tiendas
                  </Button>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              title="No se encontraron tiendas"
              description="Intenta ajustar tus filtros de búsqueda."
              icon={<Store className="w-16 h-16" />}
            />
          )}
        </div>
      )}
    </div>
  );
}

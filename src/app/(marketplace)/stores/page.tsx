// ============================================
// MERCADITO ONLINE PY - STORES LIST PAGE
// Página de lista de tiendas
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Avatar,
  Input,
  Select,
  LoadingSpinner,
  EmptyState,
  Pagination
} from '@/components/ui';
import { 
  Search,
  Star,
  MapPin,
  Store,
  TrendingUp,
  Award,
  Filter,
  Grid,
  List,
  SortAsc,
  SortDesc,
  Package,
  Users,
  Calendar
} from 'lucide-react';

// ============================================
// TIPOS
// ============================================

interface Store {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  location: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  rating: number;
  total_reviews: number;
  total_products: number;
  total_sales: number;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  social_links: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  } | null;
}

interface StoresFilters {
  search?: string;
  location?: string;
  min_rating?: number;
  verified_only?: boolean;
  active_only?: boolean;
  sort_by?: 'rating' | 'products' | 'sales' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

interface StoresPagination {
  page: number;
  total_pages: number;
  total: number;
  per_page: number;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function StoresListPage() {
  const router = useRouter();
  
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<StoresFilters>({
    sort_by: 'rating',
    sort_order: 'desc',
    active_only: true,
  });
  const [pagination, setPagination] = useState<StoresPagination>({
    page: 1,
    total_pages: 1,
    total: 0,
    per_page: 12,
  });

  // Cargar tiendas
  const loadStores = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simular llamada a la API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Datos simulados
      const mockStores: Store[] = [
        {
          id: '1',
          name: 'TechStore Paraguay',
          slug: 'techstore-paraguay',
          description: 'Especialistas en tecnología y electrónicos. Productos de calidad garantizada.',
          logo_url: null,
          cover_image_url: null,
          location: 'Asunción, Paraguay',
          phone: '+595 21 123-4567',
          email: 'info@techstore.com.py',
          website: 'https://techstore.com.py',
          rating: 4.8,
          total_reviews: 156,
          total_products: 45,
          total_sales: 234,
          is_verified: true,
          is_active: true,
          created_at: '2023-01-15',
          updated_at: '2024-01-28',
          social_links: {
            facebook: 'https://facebook.com/techstore',
            instagram: 'https://instagram.com/techstore',
            twitter: 'https://twitter.com/techstore',
          },
        },
        {
          id: '2',
          name: 'Moda Elegante',
          slug: 'moda-elegante',
          description: 'Tienda de moda y accesorios para toda la familia. Estilo y calidad.',
          logo_url: null,
          cover_image_url: null,
          location: 'Ciudad del Este, Paraguay',
          phone: '+595 61 234-5678',
          email: 'contacto@modaelegante.com.py',
          website: 'https://modaelegante.com.py',
          rating: 4.6,
          total_reviews: 89,
          total_products: 32,
          total_sales: 178,
          is_verified: true,
          is_active: true,
          created_at: '2023-03-22',
          updated_at: '2024-01-27',
          social_links: {
            instagram: 'https://instagram.com/modaelegante',
            facebook: 'https://facebook.com/modaelegante',
          },
        },
        {
          id: '3',
          name: 'Hogar y Jardín',
          slug: 'hogar-y-jardin',
          description: 'Productos para el hogar y jardín. Calidad y precio justo.',
          logo_url: null,
          cover_image_url: null,
          location: 'Encarnación, Paraguay',
          phone: '+595 71 345-6789',
          email: 'ventas@hogaryjardin.com.py',
          website: null,
          rating: 4.7,
          total_reviews: 203,
          total_products: 67,
          total_sales: 312,
          is_verified: false,
          is_active: true,
          created_at: '2022-11-08',
          updated_at: '2024-01-28',
          social_links: null,
        },
        {
          id: '4',
          name: 'Deportes Max',
          slug: 'deportes-max',
          description: 'Productos deportivos y fitness para todos los niveles.',
          logo_url: null,
          cover_image_url: null,
          location: 'Fernando de la Mora, Paraguay',
          phone: '+595 21 456-7890',
          email: 'info@deportesmax.com.py',
          website: 'https://deportesmax.com.py',
          rating: 4.5,
          total_reviews: 67,
          total_products: 28,
          total_sales: 145,
          is_verified: false,
          is_active: true,
          created_at: '2023-06-10',
          updated_at: '2024-01-26',
          social_links: {
            instagram: 'https://instagram.com/deportesmax',
          },
        },
        {
          id: '5',
          name: 'Belleza Natural',
          slug: 'belleza-natural',
          description: 'Especialista en productos de belleza y cuidado personal.',
          logo_url: null,
          cover_image_url: null,
          location: 'Lambaré, Paraguay',
          phone: '+595 21 567-8901',
          email: 'contacto@bellezanatural.com.py',
          website: 'https://bellezanatural.com.py',
          rating: 4.9,
          total_reviews: 134,
          total_products: 41,
          total_sales: 267,
          is_verified: true,
          is_active: true,
          created_at: '2022-09-15',
          updated_at: '2024-01-28',
          social_links: {
            facebook: 'https://facebook.com/bellezanatural',
            instagram: 'https://instagram.com/bellezanatural',
            twitter: 'https://twitter.com/bellezanatural',
          },
        },
        {
          id: '6',
          name: 'Artesanías del Paraguay',
          slug: 'artesanias-del-paraguay',
          description: 'Productos artesanales únicos y tradicionales del Paraguay.',
          logo_url: null,
          cover_image_url: null,
          location: 'San Lorenzo, Paraguay',
          phone: '+595 21 678-9012',
          email: 'info@artesanias.com.py',
          website: null,
          rating: 4.4,
          total_reviews: 78,
          total_products: 35,
          total_sales: 189,
          is_verified: false,
          is_active: true,
          created_at: '2023-04-18',
          updated_at: '2024-01-25',
          social_links: {
            facebook: 'https://facebook.com/artesanias',
          },
        },
      ];

      // Aplicar filtros
      let filteredStores = [...mockStores];
      
      if (filters.search) {
        filteredStores = filteredStores.filter(store =>
          store.name.toLowerCase().includes(filters.search!.toLowerCase()) ||
          (store.description && store.description.toLowerCase().includes(filters.search!.toLowerCase()))
        );
      }
      
      if (filters.location) {
        filteredStores = filteredStores.filter(store =>
          store.location?.toLowerCase().includes(filters.location!.toLowerCase())
        );
      }
      
      if (filters.min_rating) {
        filteredStores = filteredStores.filter(store =>
          store.rating >= filters.min_rating!
        );
      }
      
      if (filters.verified_only) {
        filteredStores = filteredStores.filter(store => store.is_verified);
      }
      
      if (filters.active_only) {
        filteredStores = filteredStores.filter(store => store.is_active);
      }

      // Aplicar ordenamiento
      filteredStores.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (filters.sort_by) {
          case 'rating':
            aValue = a.rating;
            bValue = b.rating;
            break;
          case 'products':
            aValue = a.total_products;
            bValue = b.total_products;
            break;
          case 'sales':
            aValue = a.total_sales;
            bValue = b.total_sales;
            break;
          case 'created_at':
            aValue = new Date(a.created_at);
            bValue = new Date(b.created_at);
            break;
          case 'updated_at':
            aValue = new Date(a.updated_at);
            bValue = new Date(b.updated_at);
            break;
          default:
            aValue = a.rating;
            bValue = b.rating;
        }
        
        if (filters.sort_order === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      // Aplicar paginación
      const startIndex = (page - 1) * pagination.per_page;
      const endIndex = startIndex + pagination.per_page;
      const paginatedStores = filteredStores.slice(startIndex, endIndex);

      setStores(paginatedStores);
      setPagination({
        page,
        total_pages: Math.ceil(filteredStores.length / pagination.per_page),
        total: filteredStores.length,
        per_page: pagination.per_page,
      });
      
    } catch (err) {
      console.error('Error loading stores:', err);
      setError('Error al cargar la lista de tiendas.');
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    loadStores(1);
  }, [filters]);

  // Manejar cambio de página
  const handlePageChange = (page: number) => {
    loadStores(page);
  };

  // Manejar cambio de filtros
  const handleFiltersChange = (newFilters: Partial<StoresFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Manejar clic en tienda
  const handleStoreClick = (storeSlug: string) => {
    router.push(`/store/${storeSlug}`);
  };

  // Renderizar tarjeta de tienda en modo grid
  const renderStoreCard = (store: Store) => (
    <Card
      key={store.id}
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => handleStoreClick(store.slug)}
    >
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Logo */}
          <div className="relative">
            <Avatar
              src={store.logo_url || undefined}
              fallback={store.name.charAt(0).toUpperCase()}
              size="xl"
              className="border-4 border-white shadow-lg"
            />
            {store.is_verified && (
              <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white rounded-full p-1">
                <Award className="w-5 h-5" />
              </div>
            )}
          </div>

          {/* Información */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center justify-center">
              {store.name}
              {store.is_verified && (
                <Badge variant="success" size="sm" className="ml-2">
                  Verificada
                </Badge>
              )}
            </h3>
            
            {store.location && (
              <div className="flex items-center justify-center text-gray-600">
                <MapPin className="w-4 h-4 mr-1" />
                <span className="text-sm">{store.location}</span>
              </div>
            )}

            <div className="flex items-center justify-center">
              <Star className="w-4 h-4 text-yellow-500 mr-1" />
              <span className="font-medium">{store.rating.toFixed(1)}</span>
              <span className="text-sm text-gray-600 ml-1">({store.total_reviews})</span>
            </div>

            {store.description && (
              <p className="text-sm text-gray-600 line-clamp-2">{store.description}</p>
            )}

            {/* Estadísticas */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-semibold text-gray-900">{store.total_products}</div>
                <div className="text-xs text-gray-600">Productos</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">{store.total_sales}</div>
                <div className="text-xs text-gray-600">Ventas</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {new Date(store.created_at).getFullYear()}
                </div>
                <div className="text-xs text-gray-600">Desde</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Renderizar tarjeta de tienda en modo lista
  const renderStoreListItem = (store: Store) => (
    <Card
      key={store.id}
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => handleStoreClick(store.slug)}
    >
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          {/* Logo */}
          <div className="relative">
            <Avatar
              src={store.logo_url || undefined}
              fallback={store.name.charAt(0).toUpperCase()}
              size="lg"
              className="border-2 border-white shadow-md"
            />
            {store.is_verified && (
              <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white rounded-full p-1">
                <Award className="w-3 h-3" />
              </div>
            )}
          </div>

          {/* Información principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {store.name}
              </h3>
              {store.is_verified && (
                <Badge variant="success" size="sm">
                  Verificada
                </Badge>
              )}
            </div>
            
            {store.location && (
              <div className="flex items-center text-gray-600 mb-2">
                <MapPin className="w-4 h-4 mr-1" />
                <span className="text-sm">{store.location}</span>
              </div>
            )}

            {store.description && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">{store.description}</p>
            )}

            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center">
                <Star className="w-4 h-4 text-yellow-500 mr-1" />
                <span className="font-medium">{store.rating.toFixed(1)}</span>
                <span className="ml-1">({store.total_reviews} reseñas)</span>
              </div>
              <div>{store.total_products} productos</div>
              <div>{store.total_sales} ventas</div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {new Date(store.created_at).getFullYear()}
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex flex-col space-y-2">
            <Button size="sm" variant="outline">
              Ver Tienda
            </Button>
            <Button size="sm">
              Contactar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading && stores.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando tiendas..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <EmptyState
          title="Error al cargar tiendas"
          description={error}
          action={{
            label: 'Reintentar',
            onClick: () => loadStores(1),
          }}
          icon={<Store className="w-16 h-16" />}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Tiendas
          </h1>
          <p className="text-gray-600">
            Descubre tiendas confiables y sus productos
          </p>
        </div>

        {/* Filtros y controles */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
            {/* Búsqueda */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar tiendas..."
                  value={filters.search || ''}
                  onChange={(e) => handleFiltersChange({ search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap items-center space-x-4">
              <Select
                value={filters.location || ''}
                onChange={(e) => handleFiltersChange({ location: e.target.value || undefined })}
                options={[
                  { value: '', label: 'Todas las ubicaciones' },
                  { value: 'asuncion', label: 'Asunción' },
                  { value: 'ciudad-del-este', label: 'Ciudad del Este' },
                  { value: 'encarnacion', label: 'Encarnación' },
                  { value: 'fernando-de-la-mora', label: 'Fernando de la Mora' },
                  { value: 'lambare', label: 'Lambaré' },
                  { value: 'san-lorenzo', label: 'San Lorenzo' },
                ]}
              />

              <Select
                value={filters.min_rating?.toString() || ''}
                onChange={(value) => handleFiltersChange({ min_rating: value ? Number(value) : undefined })}
                options={[
                  { value: '', label: 'Cualquier calificación' },
                  { value: '4.5', label: '4.5+ estrellas' },
                  { value: '4.0', label: '4.0+ estrellas' },
                  { value: '3.5', label: '3.5+ estrellas' },
                  { value: '3.0', label: '3.0+ estrellas' },
                ]}
              />

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.verified_only || false}
                  onChange={(e) => handleFiltersChange({ verified_only: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">Solo verificadas</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.active_only || false}
                  onChange={(e) => handleFiltersChange({ active_only: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">Solo activas</span>
              </label>
            </div>
          </div>

          {/* Ordenamiento y vista */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Ordenar por:</span>
              <Select
                value={filters.sort_by || 'rating'}
                onChange={(e) => handleFiltersChange({ sort_by: e.target.value as StoresFilters['sort_by'] })}
                options={[
                  { value: 'rating', label: 'Calificación' },
                  { value: 'products', label: 'Productos' },
                  { value: 'sales', label: 'Ventas' },
                  { value: 'created_at', label: 'Fecha de creación' },
                  { value: 'updated_at', label: 'Última actualización' },
                ]}
              />
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFiltersChange({ 
                  sort_order: filters.sort_order === 'asc' ? 'desc' : 'asc' 
                })}
              >
                {filters.sort_order === 'asc' ? (
                  <SortAsc className="w-4 h-4" />
                ) : (
                  <SortDesc className="w-4 h-4" />
                )}
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Vista:</span>
              <Button
                variant={viewMode === 'grid' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Resultados */}
        {stores.length > 0 ? (
          <>
            <div className="mb-6">
              <p className="text-gray-600">
                Mostrando {stores.length} de {pagination.total} tiendas
              </p>
            </div>

            {/* Lista de tiendas */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {stores.map(renderStoreCard)}
              </div>
            ) : (
              <div className="space-y-4 mb-8">
                {stores.map(renderStoreListItem)}
              </div>
            )}

            {/* Paginación */}
            {pagination.total_pages > 1 && (
              <div className="flex justify-center">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.total_pages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        ) : (
          <EmptyState
            title="No se encontraron tiendas"
            description="No hay tiendas que coincidan con los filtros seleccionados."
            action={{
              label: 'Limpiar filtros',
              onClick: () => {
                setFilters({
                  sort_by: 'rating',
                  sort_order: 'desc',
                  active_only: true,
                });
              },
            }}
            icon={<Store className="w-16 h-16" />}
          />
        )}
      </div>
    </div>
  );
}
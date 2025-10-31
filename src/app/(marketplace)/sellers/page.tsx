// ============================================
// MERCADITO ONLINE PY - SELLERS LIST PAGE
// Página de lista de vendedores
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
  Users,
  TrendingUp,
  Award,
  Filter,
  Grid,
  List,
  SortAsc,
  SortDesc,
  Package,
  Calendar
} from 'lucide-react';

// ============================================
// TIPOS
// ============================================

interface Seller {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  rating: number;
  total_reviews: number;
  total_products: number;
  total_sales: number;
  is_verified: boolean;
  member_since: string;
  last_active: string;
  response_rate: number;
  average_rating: number;
}

interface SellersFilters {
  search?: string;
  location?: string;
  min_rating?: number;
  verified_only?: boolean;
  sort_by?: 'rating' | 'products' | 'sales' | 'member_since' | 'last_active';
  sort_order?: 'asc' | 'desc';
}

interface SellersPagination {
  page: number;
  total_pages: number;
  total: number;
  per_page: number;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function SellersListPage() {
  const router = useRouter();
  
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<SellersFilters>({
    sort_by: 'rating',
    sort_order: 'desc',
  });
  const [pagination, setPagination] = useState<SellersPagination>({
    page: 1,
    total_pages: 1,
    total: 0,
    per_page: 12,
  });

  // Cargar vendedores
  const loadSellers = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simular llamada a la API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Datos simulados
      const mockSellers: Seller[] = [
        {
          id: '1',
          full_name: 'María González',
          avatar_url: null,
          bio: 'Vendedora especializada en productos artesanales y decoración del hogar.',
          location: 'Asunción, Paraguay',
          rating: 4.8,
          total_reviews: 156,
          total_products: 45,
          total_sales: 234,
          is_verified: true,
          member_since: '2023-01-15',
          last_active: '2024-01-28',
          response_rate: 95,
          average_rating: 4.8,
        },
        {
          id: '2',
          full_name: 'Carlos Rodríguez',
          avatar_url: null,
          bio: 'Especialista en electrónicos y tecnología. Productos de calidad garantizada.',
          location: 'Ciudad del Este, Paraguay',
          rating: 4.6,
          total_reviews: 89,
          total_products: 32,
          total_sales: 178,
          is_verified: true,
          member_since: '2023-03-22',
          last_active: '2024-01-27',
          response_rate: 88,
          average_rating: 4.6,
        },
        {
          id: '3',
          full_name: 'Ana Martínez',
          avatar_url: null,
          bio: 'Tienda de moda y accesorios para toda la familia.',
          location: 'Encarnación, Paraguay',
          rating: 4.7,
          total_reviews: 203,
          total_products: 67,
          total_sales: 312,
          is_verified: false,
          member_since: '2022-11-08',
          last_active: '2024-01-28',
          response_rate: 92,
          average_rating: 4.7,
        },
        {
          id: '4',
          full_name: 'Roberto Silva',
          avatar_url: null,
          bio: 'Productos para el hogar y jardín. Calidad y precio justo.',
          location: 'Fernando de la Mora, Paraguay',
          rating: 4.5,
          total_reviews: 67,
          total_products: 28,
          total_sales: 145,
          is_verified: false,
          member_since: '2023-06-10',
          last_active: '2024-01-26',
          response_rate: 85,
          average_rating: 4.5,
        },
        {
          id: '5',
          full_name: 'Laura Fernández',
          avatar_url: null,
          bio: 'Especialista en productos de belleza y cuidado personal.',
          location: 'Lambaré, Paraguay',
          rating: 4.9,
          total_reviews: 134,
          total_products: 41,
          total_sales: 267,
          is_verified: true,
          member_since: '2022-09-15',
          last_active: '2024-01-28',
          response_rate: 98,
          average_rating: 4.9,
        },
        {
          id: '6',
          full_name: 'Diego Herrera',
          avatar_url: null,
          bio: 'Productos deportivos y fitness para todos los niveles.',
          location: 'San Lorenzo, Paraguay',
          rating: 4.4,
          total_reviews: 78,
          total_products: 35,
          total_sales: 189,
          is_verified: false,
          member_since: '2023-04-18',
          last_active: '2024-01-25',
          response_rate: 82,
          average_rating: 4.4,
        },
      ];

      // Aplicar filtros
      let filteredSellers = [...mockSellers];
      
      if (filters.search) {
        filteredSellers = filteredSellers.filter(seller =>
          seller.full_name.toLowerCase().includes(filters.search!.toLowerCase()) ||
          (seller.bio && seller.bio.toLowerCase().includes(filters.search!.toLowerCase()))
        );
      }
      
      if (filters.location) {
        filteredSellers = filteredSellers.filter(seller =>
          seller.location?.toLowerCase().includes(filters.location!.toLowerCase())
        );
      }
      
      if (filters.min_rating) {
        filteredSellers = filteredSellers.filter(seller =>
          seller.rating >= filters.min_rating!
        );
      }
      
      if (filters.verified_only) {
        filteredSellers = filteredSellers.filter(seller => seller.is_verified);
      }

      // Aplicar ordenamiento
      filteredSellers.sort((a, b) => {
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
          case 'member_since':
            aValue = new Date(a.member_since);
            bValue = new Date(b.member_since);
            break;
          case 'last_active':
            aValue = new Date(a.last_active);
            bValue = new Date(b.last_active);
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
      const paginatedSellers = filteredSellers.slice(startIndex, endIndex);

      setSellers(paginatedSellers);
      setPagination({
        page,
        total_pages: Math.ceil(filteredSellers.length / pagination.per_page),
        total: filteredSellers.length,
        per_page: pagination.per_page,
      });
      
    } catch (err) {
      console.error('Error loading sellers:', err);
      setError('Error al cargar la lista de vendedores.');
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    loadSellers(1);
  }, [filters]);

  // Manejar cambio de página
  const handlePageChange = (page: number) => {
    loadSellers(page);
  };

  // Manejar cambio de filtros
  const handleFiltersChange = (newFilters: Partial<SellersFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Manejar clic en vendedor
  const handleSellerClick = (sellerId: string) => {
    router.push(`/seller/${sellerId}`);
  };

  // Renderizar tarjeta de vendedor en modo grid
  const renderSellerCard = (seller: Seller) => (
    <Card
      key={seller.id}
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => handleSellerClick(seller.id)}
    >
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Avatar */}
          <div className="relative">
            <Avatar
              src={seller.avatar_url || undefined}
              fallback={seller.full_name.charAt(0).toUpperCase()}
              size="xl"
              className="border-4 border-white shadow-lg"
            />
            {seller.is_verified && (
              <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white rounded-full p-1">
                <Award className="w-5 h-5" />
              </div>
            )}
          </div>

          {/* Información */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center justify-center">
              {seller.full_name}
              {seller.is_verified && (
                <Badge variant="success" size="sm" className="ml-2">
                  Verificado
                </Badge>
              )}
            </h3>
            
            {seller.location && (
              <div className="flex items-center justify-center text-gray-600">
                <MapPin className="w-4 h-4 mr-1" />
                <span className="text-sm">{seller.location}</span>
              </div>
            )}

            <div className="flex items-center justify-center">
              <Star className="w-4 h-4 text-yellow-500 mr-1" />
              <span className="font-medium">{seller.rating.toFixed(1)}</span>
              <span className="text-sm text-gray-600 ml-1">({seller.total_reviews})</span>
            </div>

            {seller.bio && (
              <p className="text-sm text-gray-600 line-clamp-2">{seller.bio}</p>
            )}

            {/* Estadísticas */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-semibold text-gray-900">{seller.total_products}</div>
                <div className="text-xs text-gray-600">Productos</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">{seller.total_sales}</div>
                <div className="text-xs text-gray-600">Ventas</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">{seller.response_rate}%</div>
                <div className="text-xs text-gray-600">Respuesta</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Renderizar tarjeta de vendedor en modo lista
  const renderSellerListItem = (seller: Seller) => (
    <Card
      key={seller.id}
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => handleSellerClick(seller.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          {/* Avatar */}
          <div className="relative">
            <Avatar
              src={seller.avatar_url || undefined}
              fallback={seller.full_name.charAt(0).toUpperCase()}
              size="lg"
              className="border-2 border-white shadow-md"
            />
            {seller.is_verified && (
              <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white rounded-full p-1">
                <Award className="w-3 h-3" />
              </div>
            )}
          </div>

          {/* Información principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {seller.full_name}
              </h3>
              {seller.is_verified && (
                <Badge variant="success" size="sm">
                  Verificado
                </Badge>
              )}
            </div>
            
            {seller.location && (
              <div className="flex items-center text-gray-600 mb-2">
                <MapPin className="w-4 h-4 mr-1" />
                <span className="text-sm">{seller.location}</span>
              </div>
            )}

            {seller.bio && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">{seller.bio}</p>
            )}

            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center">
                <Star className="w-4 h-4 text-yellow-500 mr-1" />
                <span className="font-medium">{seller.rating.toFixed(1)}</span>
                <span className="ml-1">({seller.total_reviews} reseñas)</span>
              </div>
              <div>{seller.total_products} productos</div>
              <div>{seller.total_sales} ventas</div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {new Date(seller.member_since).getFullYear()}
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex flex-col space-y-2">
            <Button size="sm" variant="outline">
              Ver Perfil
            </Button>
            <Button size="sm">
              Contactar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading && sellers.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando vendedores..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <EmptyState
          title="Error al cargar vendedores"
          description={error}
          action={{
            label: 'Reintentar',
            onClick: () => loadSellers(1),
          }}
          icon={<Users className="w-16 h-16" />}
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
            Vendedores
          </h1>
          <p className="text-gray-600">
            Descubre vendedores confiables y sus productos
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
                  placeholder="Buscar vendedores..."
                  value={filters.search || ''}
                  onChange={(e) => handleFiltersChange({ search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap items-center space-x-4">
              <select
                value={filters.location || ''}
                onChange={(e) => handleFiltersChange({ location: e.target.value || undefined })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas las ubicaciones</option>
                <option value="asuncion">Asunción</option>
                <option value="ciudad-del-este">Ciudad del Este</option>
                <option value="encarnacion">Encarnación</option>
                <option value="fernando-de-la-mora">Fernando de la Mora</option>
                <option value="lambare">Lambaré</option>
                <option value="san-lorenzo">San Lorenzo</option>
              </select>

              <select
                value={filters.min_rating?.toString() || ''}
                onChange={(e) => handleFiltersChange({ min_rating: e.target.value ? Number(e.target.value) : undefined })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Cualquier calificación</option>
                <option value="4.5">4.5+ estrellas</option>
                <option value="4.0">4.0+ estrellas</option>
                <option value="3.5">3.5+ estrellas</option>
                <option value="3.0">3.0+ estrellas</option>
              </select>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.verified_only || false}
                  onChange={(e) => handleFiltersChange({ verified_only: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">Solo verificados</span>
              </label>
            </div>
          </div>

          {/* Ordenamiento y vista */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Ordenar por:</span>
              <select
                value={filters.sort_by || 'rating'}
                onChange={(e) => handleFiltersChange({ sort_by: e.target.value as SellersFilters['sort_by'] })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="rating">Calificación</option>
                <option value="products">Productos</option>
                <option value="sales">Ventas</option>
                <option value="member_since">Miembro desde</option>
                <option value="last_active">Última actividad</option>
              </select>
              
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
        {sellers.length > 0 ? (
          <>
            <div className="mb-6">
              <p className="text-gray-600">
                Mostrando {sellers.length} de {pagination.total} vendedores
              </p>
            </div>

            {/* Lista de vendedores */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {sellers.map(renderSellerCard)}
              </div>
            ) : (
              <div className="space-y-4 mb-8">
                {sellers.map(renderSellerListItem)}
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
            title="No se encontraron vendedores"
            description="No hay vendedores que coincidan con los filtros seleccionados."
            action={{
              label: 'Limpiar filtros',
              onClick: () => {
                setFilters({
                  sort_by: 'rating',
                  sort_order: 'desc',
                });
              },
            }}
            icon={<Users className="w-16 h-16" />}
          />
        )}
      </div>
    </div>
  );
}
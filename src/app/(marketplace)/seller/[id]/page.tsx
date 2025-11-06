// ============================================
// MERCADITO ONLINE PY - SELLER PROFILE PAGE
// Página de perfil público de vendedor estilo Facebook Marketplace
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { formatPhoneForWhatsApp } from '@/lib/utils';
import { 
  Star,
  MapPin,
  Search,
  Filter,
  MessageCircle,
  Calendar,
  CheckCircle,
  Package,
  TrendingUp,
  Award,
  ArrowLeft,
  Home
} from 'lucide-react';

interface Profile {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  bio?: string | null;
  location?: string | null;
  phone?: string | null;
  verified: boolean;
  created_at: string;
  email?: string;
  full_name?: string | null; // Puede existir si se calcula
}

interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number;
  cover_url: string | null;
  condition: string;
  sale_type: string;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
}

export default function SellerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const sellerId = params.id as string;
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para búsqueda y filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    minPrice: '',
    maxPrice: '',
    condition: '',
    saleType: '',
    availability: '', // Disponible/No disponible
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState('date_desc');
  const [rating, setRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [followers, setFollowers] = useState(0);


  // Cargar perfil del vendedor
  useEffect(() => {
    loadProfile();
  }, [sellerId]);

  // Cargar productos cuando cambian los filtros
  useEffect(() => {
    console.log('🔄 useEffect triggered - profile:', !!profile, 'sellerId:', sellerId);
    if (profile && sellerId) {
      console.log('✅ Calling loadProducts...');
      loadProducts();
    } else {
      console.log('⏳ Waiting for profile or sellerId...');
    }
  }, [sellerId, filters, searchQuery, sortBy, profile]);

  // Cargar categorías
  useEffect(() => {
    loadCategories();
  }, []);

  async function loadProfile() {
    setLoading(true);
    setError(null);

    try {
      // Obtener perfil del vendedor
      // Usar select('*') para obtener todos los campos disponibles y evitar errores con campos que no existen
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sellerId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        // Si es un error de RLS o perfil no encontrado, mostrar mensaje amigable
        if (profileError.code === 'PGRST116' || profileError.message?.includes('No rows')) {
          throw new Error('Vendedor no encontrado');
        }
        throw new Error(`Error al cargar el perfil: ${profileError.message}`);
      }

      if (!profileData) {
        throw new Error('Vendedor no encontrado');
      }

      setProfile(profileData as Profile);

      // Calcular calificación promedio
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('rating')
        .eq('seller_id', sellerId);

      if (reviewsData && reviewsData.length > 0) {
        const reviewsArray = reviewsData as Array<{ rating?: number }>;
        const ratings = reviewsArray.map((r: { rating?: number }): number => r.rating || 0).filter((r: number): boolean => r > 0);
        if (ratings.length > 0) {
          const avgRating = ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length;
          setRating(avgRating);
          setTotalReviews(ratings.length);
        }
      }

      // Contar productos - incluir productos sin status o con status activo
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', sellerId)
        .or('status.is.null,status.eq.active');
      
      setTotalProducts(count || 0);
    } catch (err: unknown) {
      console.error('Error loading profile:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar el perfil del vendedor');
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const { data } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');
      
      if (data) {
        setCategories(data);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  }

  async function loadProducts() {
    if (!sellerId) {
      console.error('❌ No sellerId provided to loadProducts');
      setProducts([]);
      return;
    }
    
    try {
      console.log('🛒 Loading products for seller:', sellerId);
      
      // Primero intentar sin filtro de status para ver todos los productos
      let query = supabase
        .from('products')
        .select('id, title, description, price, cover_url, condition, sale_type, created_at, seller_id, status')
        .eq('seller_id', sellerId);
      
      console.log('📊 Query configured for seller:', sellerId);

      // Aplicar búsqueda
      if (searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      // Aplicar filtros
      if (filters.category) {
        query = query.eq('category_id', filters.category);
      }

      if (filters.minPrice) {
        query = query.gte('price', parseFloat(filters.minPrice));
      }

      if (filters.maxPrice) {
        query = query.lte('price', parseFloat(filters.maxPrice));
      }

      if (filters.condition) {
        query = query.eq('condition', filters.condition);
      }

      if (filters.saleType) {
        query = query.eq('sale_type', filters.saleType);
      }

      // Verificar si hay búsqueda o filtros activos
      const hasActiveSearch = searchQuery.trim() !== '' ||
        filters.minPrice !== '' ||
        filters.maxPrice !== '' ||
        filters.condition !== '' ||
        filters.saleType !== '' ||
        filters.category !== '';

      // Aplicar ordenamiento o aleatoriedad
      const shouldRandomize = !hasActiveSearch && sortBy === 'date_desc';
      
      let productsData: any[] = [];
      
      if (shouldRandomize) {
        // Si es aleatorio, obtener sin orden y mezclar después
        const { data: data, error: productsError } = await query;
        
        if (productsError) {
          console.error('❌ Error loading products:', productsError);
          throw productsError;
        }
        
        productsData = data || [];
        
        // Algoritmo Fisher-Yates para mezclar aleatoriamente
        for (let i = productsData.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [productsData[i], productsData[j]] = [productsData[j], productsData[i]];
        }
      } else {
        // Aplicar ordenamiento en la query
        let orderColumn = 'created_at';
        let ascending = false;
        
        switch (sortBy) {
          case 'price_asc':
            orderColumn = 'price';
            ascending = true;
            break;
          case 'price_desc':
            orderColumn = 'price';
            ascending = false;
            break;
          case 'date_asc':
            orderColumn = 'created_at';
            ascending = true;
            break;
          case 'date_desc':
          default:
            orderColumn = 'created_at';
            ascending = false;
            break;
        }

        const { data: data, error: productsError } = await query
          .order(orderColumn, { ascending });

        if (productsError) {
          console.error('❌ Error loading products:', productsError);
          throw productsError;
        }
        
        productsData = data || [];
      }

      console.log('✅ Products loaded:', productsData.length, 'products');
      setProducts(productsData);
    } catch (err: unknown) {
      console.error('❌ Error loading products:', err);
    }
  }

  function updateFilter(key: string, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters({
      category: '',
      minPrice: '',
      maxPrice: '',
      condition: '',
      saleType: '',
      availability: '',
    });
    setSearchQuery('');
    setSortBy('date_desc');
  }

  function getWhatsAppLink() {
    if (!profile?.phone) return '#';
    const formattedPhone = formatPhoneForWhatsApp(profile.phone);
    if (!formattedPhone) return '#';
    return `https://wa.me/${formattedPhone}`;
  }

  const hasActiveFilters = Object.values(filters).some(v => v !== '') || searchQuery.trim() !== '';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando perfil del vendedor...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-xl font-medium text-gray-600 mb-2">Vendedor no encontrado</h2>
          <p className="text-gray-500 mb-4">{error || 'El perfil que buscas no existe'}</p>
          <Link
            href="/"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  // Construir nombre del vendedor usando los campos disponibles
  const sellerName = profile.full_name 
    || (profile.first_name || profile.last_name
      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
      : profile.email?.split('@')[0] || 'Vendedor');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header mínimo - solo botón de volver */}
      <div className="bg-white border-b px-4 py-2 flex items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <Home className="w-5 h-5" />
        </Link>
        <div className="flex-1"></div>
      </div>

      {/* Foto de Portada - Estilo Facebook */}
      <div className="relative h-64 sm:h-80 bg-gradient-to-br from-purple-400 to-blue-500">
        {profile.cover_url ? (
          <img
            src={profile.cover_url}
            alt={sellerName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-blue-500">
            <div className="text-white text-center opacity-50">
              <Package className="w-16 h-16 mx-auto mb-2" />
              <p className="text-lg">Foto de Portada</p>
            </div>
          </div>
        )}
        
        {/* Avatar superpuesto - Estilo Facebook */}
        <div className="absolute -bottom-12 sm:-bottom-16 left-4 sm:left-8">
          <div className="relative">
            <img
              src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(sellerName)}&background=6366f1&color=fff`}
              alt={sellerName}
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-lg object-cover bg-white"
            />
            {profile.verified && (
              <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white rounded-full p-1.5 shadow-lg">
                <CheckCircle className="w-6 h-6" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Información del vendedor - Estilo Facebook */}
      <div className="bg-white border-b pt-16 sm:pt-20 pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                {sellerName}
                {profile.verified && (
                  <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    Verificado
                  </span>
                )}
              </h1>
              
              {/* Información adicional */}
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600">
                {profile.location && (
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span>Vive en {profile.location}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <Package className="w-4 h-4 mr-1" />
                  <span>{totalProducts}+ publicaciones activas</span>
                </div>
                {followers > 0 && (
                  <div className="flex items-center">
                    <span>{followers} seguidores</span>
                  </div>
                )}
              </div>
              
              {/* Calificación y reseñas */}
              {rating > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <span className="font-semibold ml-1">{rating.toFixed(1)}</span>
                  </div>
                  {totalReviews > 0 && (
                    <span className="text-sm text-gray-600">({totalReviews} reseñas)</span>
                  )}
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div className="flex items-center gap-2">
              {profile.phone && (
                <a
                  href={getWhatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Enviar mensaje</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Buscador y Filtros - Estilo Facebook */}
      <div className="bg-white border-b py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            {/* Buscador */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Busca publicaciones"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Filtros rápidos */}
            <div className="flex gap-2 flex-wrap">
              <select
                value={filters.availability}
                onChange={(e) => updateFilter('availability', e.target.value)}
                className="px-3 py-2 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Disponible</option>
                <option value="active">Activos</option>
                <option value="sold">Vendidos</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="date_desc">Ordenar por</option>
                <option value="date_desc">Más recientes</option>
                <option value="date_asc">Más antiguos</option>
                <option value="price_asc">Precio: menor a mayor</option>
                <option value="price_desc">Precio: mayor a menor</option>
              </select>

              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
              >
                <Filter className="w-4 h-4" />
                <span>Filtros</span>
                {hasActiveFilters && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                    {Object.values(filters).filter(v => v !== '').length}
                  </span>
                )}
              </button>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Filtros expandidos */}
          {filtersOpen && (
            <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Categoría
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => updateFilter('category', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Todas</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Precio Mín.
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={filters.minPrice}
                  onChange={(e) => updateFilter('minPrice', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Precio Máx.
                </label>
                <input
                  type="number"
                  placeholder="Sin límite"
                  value={filters.maxPrice}
                  onChange={(e) => updateFilter('maxPrice', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Condición
                </label>
                <select
                  value={filters.condition}
                  onChange={(e) => updateFilter('condition', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Todas</option>
                  <option value="nuevo">Nuevo</option>
                  <option value="usado_como_nuevo">Usado como nuevo</option>
                  <option value="usado">Usado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Tipo
                </label>
                <select
                  value={filters.saleType}
                  onChange={(e) => updateFilter('saleType', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Todos</option>
                  <option value="direct">Directa</option>
                  <option value="auction">Subasta</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Productos - Grid estilo Facebook */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {products.length > 0 ? (
          <div className="grid grid-cols-3 lg:grid-cols-9 gap-2 sm:gap-3 lg:gap-4">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="bg-white rounded-lg overflow-hidden border hover:shadow-lg transition-shadow"
              >
                <div className="relative h-24 bg-gray-100">
                  {product.cover_url ? (
                    <img
                      src={product.cover_url}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">
                      📦
                    </div>
                  )}
                </div>

                <div className="p-1.5 sm:p-2">
                  <p className="text-xs font-semibold text-gray-900 mb-0.5">
                    {product.price.toLocaleString('es-PY')} G
                  </p>
                  {profile.location && (
                    <p className="text-[10px] text-gray-500 line-clamp-1">{profile.location}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-xl font-medium text-gray-600 mb-2">
              No se encontraron productos
            </h2>
            <p className="text-gray-500">
              {hasActiveFilters
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Este vendedor aún no ha publicado productos'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// MERCADITO ONLINE PY - SELLER PROFILE PAGE
// Página de perfil público de vendedor estilo Facebook Marketplace
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { 
  Star,
  MapPin,
  Search,
  Filter,
  MessageCircle,
  Phone,
  Calendar,
  CheckCircle,
  Package,
  ShoppingBag,
  TrendingUp,
  Award,
  X
} from 'lucide-react';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  location: string | null;
  phone: string | null;
  verified: boolean;
  created_at: string;
  email?: string;
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
  const [allProducts, setAllProducts] = useState<Product[]>([]);
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
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  // Cargar perfil del vendedor
  useEffect(() => {
    loadProfile();
  }, [sellerId]);

  // Cargar productos cuando cambian los filtros
  useEffect(() => {
    if (profile) {
      loadProducts();
    }
  }, [sellerId, filters, searchQuery]);

  // Cargar categorías
  useEffect(() => {
    loadCategories();
  }, []);

  async function loadProfile() {
    setLoading(true);
    setError(null);

    try {
      // Obtener perfil del vendedor
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username, avatar_url, cover_url, bio, location, phone, verified, created_at, email')
        .eq('id', sellerId)
        .single();

      if (profileError) {
        throw profileError;
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
        const ratings = reviewsData.map((r: any) => r.rating || 0).filter((r: number) => r > 0);
        if (ratings.length > 0) {
          const avgRating = ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length;
          setRating(avgRating);
          setTotalReviews(ratings.length);
        }
      }
    } catch (err: any) {
      console.error('Error loading profile:', err);
      setError(err.message || 'Error al cargar el perfil del vendedor');
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
    try {
      let query = supabase
        .from('products')
        .select('id, title, description, price, cover_url, condition, sale_type, created_at')
        .eq('seller_id', sellerId)
        .eq('status', 'active');

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

      const { data: productsData, error: productsError } = await query
        .order('created_at', { ascending: false });

      if (productsError) {
        throw productsError;
      }

      setProducts(productsData || []);
      setAllProducts(productsData || []);
    } catch (err: any) {
      console.error('Error loading products:', err);
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
    });
    setSearchQuery('');
  }

  function getWhatsAppLink() {
    if (!profile?.phone) return '#';
    // Formatear número para WhatsApp (remover espacios, guiones, etc.)
    const phone = profile.phone.replace(/\D/g, '');
    return `https://wa.me/${phone}`;
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

  const sellerName = profile.first_name || profile.last_name
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    : profile.username || 'Vendedor';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Foto de Portada */}
      <div className="relative h-64 sm:h-80 bg-gradient-to-br from-purple-400 to-blue-500">
        {profile.cover_url ? (
          <img
            src={profile.cover_url}
            alt={sellerName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-white text-center">
              <Package className="w-16 h-16 mx-auto mb-2 opacity-50" />
              <p className="text-lg opacity-75">Foto de Portada</p>
            </div>
          </div>
        )}
        
        {/* Avatar y nombre superpuesto */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 sm:p-6">
          <div className="max-w-7xl mx-auto flex items-end space-x-4">
            <div className="relative">
              <img
                src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(sellerName)}&background=6366f1&color=fff`}
                alt={sellerName}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white shadow-lg object-cover bg-white"
              />
              {profile.verified && (
                <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white rounded-full p-1">
                  <CheckCircle className="w-5 h-5" />
                </div>
              )}
            </div>
            <div className="flex-1 text-white pb-2">
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                {sellerName}
                {profile.verified && (
                  <span className="text-xs bg-blue-600 px-2 py-1 rounded-full flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    Verificado
                  </span>
                )}
              </h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                {rating > 0 && (
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 mr-1" />
                    <span className="font-medium">{rating.toFixed(1)}</span>
                    {totalReviews > 0 && (
                      <span className="ml-1 opacity-90">({totalReviews})</span>
                    )}
                  </div>
                )}
                {profile.location && (
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span>{profile.location}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>Miembro desde {new Date(profile.created_at).getFullYear()}</span>
                </div>
              </div>
            </div>
            <div className="pb-2">
              {profile.phone && (
                <a
                  href={getWhatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Buscador y Filtros */}
        <div className="bg-white rounded-lg border shadow-sm p-4 sm:p-6 mb-6">
          {/* Buscador */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar productos de este vendedor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filtros - Acordeón */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
              >
                <Filter className="w-4 h-4" />
                <span>Filtros</span>
                {hasActiveFilters && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                    {Object.values(filters).filter(v => v !== '').length + (searchQuery ? 1 : 0)}
                  </span>
                )}
              </button>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Limpiar
                </button>
              )}
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 transition-all duration-300 overflow-hidden ${
              filtersOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 hidden'
            }`}>
              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => updateFilter('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Todas</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Precio Mínimo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio Mín.
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={filters.minPrice}
                  onChange={(e) => updateFilter('minPrice', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Precio Máximo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio Máx.
                </label>
                <input
                  type="number"
                  placeholder="Sin límite"
                  value={filters.maxPrice}
                  onChange={(e) => updateFilter('maxPrice', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Condición */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condición
                </label>
                <select
                  value={filters.condition}
                  onChange={(e) => updateFilter('condition', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Todas</option>
                  <option value="nuevo">Nuevo</option>
                  <option value="usado_como_nuevo">Usado como nuevo</option>
                  <option value="usado">Usado</option>
                </select>
              </div>

              {/* Tipo de Venta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo
                </label>
                <select
                  value={filters.saleType}
                  onChange={(e) => updateFilter('saleType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Todos</option>
                  <option value="direct">Directa</option>
                  <option value="auction">Subasta</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Estadísticas Rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4 text-center">
            <Package className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{products.length}</div>
            <div className="text-sm text-gray-600">Productos</div>
          </div>
          <div className="bg-white rounded-lg border p-4 text-center">
            <Star className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{rating > 0 ? rating.toFixed(1) : '0.0'}</div>
            <div className="text-sm text-gray-600">Calificación</div>
          </div>
          <div className="bg-white rounded-lg border p-4 text-center">
            <TrendingUp className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{totalReviews}</div>
            <div className="text-sm text-gray-600">Reseñas</div>
          </div>
          <div className="bg-white rounded-lg border p-4 text-center">
            <CheckCircle className="w-6 h-6 text-purple-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{profile.verified ? 'Sí' : 'No'}</div>
            <div className="text-sm text-gray-600">Verificado</div>
          </div>
        </div>

        {/* Productos */}
        {products.length > 0 ? (
          <>
            <div className="mb-4">
              <p className="text-gray-600">
                {products.length} producto{products.length !== 1 ? 's' : ''} encontrado{products.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="relative h-48 bg-gray-100">
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
                    <div className="absolute top-2 left-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        product.condition === 'nuevo' 
                          ? 'bg-green-100 text-green-800' 
                          : product.condition === 'usado_como_nuevo'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {product.condition === 'nuevo' ? 'Nuevo' : 
                         product.condition === 'usado_como_nuevo' ? 'Usado como nuevo' : 'Usado'}
                      </span>
                    </div>
                    <div className="absolute top-2 right-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        product.sale_type === 'auction' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {product.sale_type === 'auction' ? 'Subasta' : 'Directa'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2 text-gray-900">
                      {product.title}
                    </h3>
                    {product.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                    <div className="flex justify-between items-center">
                      <p className="text-xl font-bold text-green-600">
                        {product.price.toLocaleString('es-PY')} Gs.
                      </p>
                      <span className="text-sm text-gray-500">
                        Ver →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
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

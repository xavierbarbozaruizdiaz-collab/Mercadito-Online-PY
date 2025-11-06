// ============================================
// MERCADITO ONLINE PY - STORE PROFILE PAGE
// Página de perfil público de tienda estilo Facebook Marketplace
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { getStoreBySlug, getStoreProducts } from '@/lib/services/storeService';
import { isStoreFavorite, toggleStoreFavorite } from '@/lib/services/storeFavoriteService';
import { formatPhoneForWhatsApp } from '@/lib/utils';
import Breadcrumbs from '@/components/Breadcrumbs';
import { 
  Star,
  MapPin,
  Search,
  Filter,
  MessageCircle,
  CheckCircle,
  Package,
  Award,
  ArrowLeft,
  Home,
  Phone,
  Mail,
  Share2,
  Heart,
  Gavel,
  Users
} from 'lucide-react';

interface Store {
  id: string;
  seller_id: string;
  name: string;
  slug: string;
  description?: string | null;
  cover_image_url?: string | null;
  logo_url?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  department?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  address_note?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_active: boolean;
  is_verified?: boolean;
  rating?: number;
  total_reviews?: number;
  created_at: string;
  updated_at: string;
}

interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
  condition: string;
  sale_type: string;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
}

export default function StoreProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const storeSlug = params.slug as string;
  const isAdminView = searchParams.get('admin') === 'true';
  const affiliateCode = searchParams.get('ref') || null;
  
  const [store, setStore] = useState<Store | null>(null);
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
    availability: '',
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState('date_desc');
  const [totalProducts, setTotalProducts] = useState(0);
  const [hasAuctions, setHasAuctions] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [vehicleFields, setVehicleFields] = useState({
    marca: '',
    modelo: '',
    año: '',
    kilometraje: '',
    color: '',
    documentacion: ''
  });

  // Guardar código de afiliado si existe en la URL
  useEffect(() => {
    if (affiliateCode && typeof window !== 'undefined') {
      localStorage.setItem('affiliate_code', affiliateCode);
      // Guardar también el store_id para validación posterior
      if (store) {
        localStorage.setItem('affiliate_store_id', store.id);
      }
    }
  }, [affiliateCode, store]);

  // Cargar usuario actual
  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      setCurrentUserId(session?.session?.user?.id || null);
    })();
  }, []);

  // Cargar estado de favorito cuando se carga la tienda
  useEffect(() => {
    if (store && currentUserId) {
      (async () => {
        try {
          const favorite = await isStoreFavorite(store.id, currentUserId);
          setIsFavorited(favorite);
        } catch (err) {
          console.error('Error loading favorite status:', err);
        }
      })();
    } else if (!currentUserId) {
      setIsFavorited(false);
    }
  }, [store, currentUserId]);

  // Cargar tienda y productos
  useEffect(() => {
    loadStore();
  }, [storeSlug, isAdminView]);

  // Cargar productos cuando cambian los filtros o campos de vehículos
  useEffect(() => {
    if (store) {
      loadProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, filters, searchQuery, sortBy, vehicleFields]);

  // Cargar categorías
  useEffect(() => {
    loadCategories();
  }, []);

  async function loadStore() {
    setLoading(true);
    setError(null);

    try {
      const storeData = await getStoreBySlug(storeSlug, isAdminView);
      
      if (!storeData) {
        throw new Error('Tienda no encontrada');
      }

      setStore(storeData as Store);

      // Contar productos
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', storeData.seller_id)
        .or('status.is.null,status.eq.active');
      
      setTotalProducts(count || 0);
    } catch (err: any) {
      setError(err.message || 'Error al cargar la tienda');
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const { data } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      if (data) {
        setCategories(data);
      }
    } catch (err) {
      // Error loading categories
    }
  }

  async function loadProducts() {
    if (!store) return;
    
    try {
      const options: any = {
        page: 1,
        limit: 100,
        sellerId: store.seller_id,
      };
      
      if (filters.category) {
        options.category_id = filters.category;
      }

      const result = await getStoreProducts(store.id, options);
      const allProducts = result.products || [];
      let filteredProducts = [...allProducts];

      // Verificar si hay productos en subasta ACTIVOS (ANTES de aplicar filtros)
      const hasAuctionProducts = allProducts.some((p: any) => 
        p.sale_type === 'auction' && 
        (p.auction_status === 'active' || p.auction_status === 'scheduled') &&
        (p.status === 'active' || !p.status)
      );
      setHasAuctions(hasAuctionProducts);

      // Filtrar productos anómalos o inválidos
      filteredProducts = filteredProducts.filter((p: any) => {
        // Excluir productos que no tengan estructura válida
        if (!p.id || !p.title) return false;
        // Excluir cualquier producto cuyo título o descripción contenga "Resumen" o métricas del dashboard
        const title = (p.title || '').toLowerCase();
        const description = (p.description || '').toLowerCase();
        if (title.includes('resumen') || 
            title.includes('solicitudes') || 
            title.includes('firebase studio') ||
            description.includes('resumen') ||
            description.includes('solicitudes') ||
            description.includes('firebase studio')) {
          return false;
        }
        return true;
      });

      // Aplicar búsqueda
      if (searchQuery.trim()) {
        filteredProducts = filteredProducts.filter((p: any) => 
          p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Aplicar filtros
      if (filters.minPrice) {
        filteredProducts = filteredProducts.filter((p: any) => 
          p.price >= parseFloat(filters.minPrice)
        );
      }

      if (filters.maxPrice) {
        filteredProducts = filteredProducts.filter((p: any) => 
          p.price <= parseFloat(filters.maxPrice)
        );
      }

      if (filters.condition) {
        filteredProducts = filteredProducts.filter((p: any) => 
          p.condition === filters.condition
        );
      }

      if (filters.saleType) {
        filteredProducts = filteredProducts.filter((p: any) => 
          p.sale_type === filters.saleType
        );
      }

      // Filtros específicos para vehículos/motos
      if (vehicleFields.marca) {
        filteredProducts = filteredProducts.filter((p: any) => {
          const attrs = p.attributes || {};
          return attrs.marca && attrs.marca.toLowerCase().includes(vehicleFields.marca.toLowerCase());
        });
      }
      if (vehicleFields.modelo) {
        filteredProducts = filteredProducts.filter((p: any) => {
          const attrs = p.attributes || {};
          return attrs.modelo && attrs.modelo.toLowerCase().includes(vehicleFields.modelo.toLowerCase());
        });
      }
      if (vehicleFields.año) {
        filteredProducts = filteredProducts.filter((p: any) => {
          const attrs = p.attributes || {};
          return attrs.año && attrs.año.toString() === vehicleFields.año;
        });
      }
      if (vehicleFields.kilometraje) {
        const km = parseFloat(vehicleFields.kilometraje);
        if (!isNaN(km)) {
          filteredProducts = filteredProducts.filter((p: any) => {
            const attrs = p.attributes || {};
            const productKm = parseFloat(attrs.kilometraje || '0');
            // Permitir un rango de ±10% para el kilometraje
            return productKm >= km * 0.9 && productKm <= km * 1.1;
          });
        }
      }
      if (vehicleFields.color) {
        filteredProducts = filteredProducts.filter((p: any) => {
          const attrs = p.attributes || {};
          return attrs.color && attrs.color.toLowerCase().includes(vehicleFields.color.toLowerCase());
        });
      }
      if (vehicleFields.documentacion) {
        filteredProducts = filteredProducts.filter((p: any) => {
          const attrs = p.attributes || {};
          return attrs.documentacion === vehicleFields.documentacion;
        });
      }

      // Verificar si hay búsqueda o filtros activos
      const hasActiveSearch = searchQuery.trim() !== '' ||
        filters.minPrice !== '' ||
        filters.maxPrice !== '' ||
        filters.condition !== '' ||
        filters.saleType !== '' ||
        filters.category !== '' ||
        vehicleFields.marca !== '' ||
        vehicleFields.modelo !== '' ||
        vehicleFields.año !== '' ||
        vehicleFields.kilometraje !== '' ||
        vehicleFields.color !== '' ||
        vehicleFields.documentacion !== '';

      // Aplicar ordenamiento o aleatoriedad
      const shouldRandomize = !hasActiveSearch && sortBy === 'date_desc';
      
      if (shouldRandomize) {
        // Algoritmo Fisher-Yates para mezclar aleatoriamente
        for (let i = filteredProducts.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [filteredProducts[i], filteredProducts[j]] = [filteredProducts[j], filteredProducts[i]];
        }
      } else {
        // Aplicar ordenamiento solo si no es aleatorio
        switch (sortBy) {
          case 'price_asc':
            filteredProducts.sort((a: any, b: any) => a.price - b.price);
            break;
          case 'price_desc':
            filteredProducts.sort((a: any, b: any) => b.price - a.price);
            break;
          case 'date_asc':
            filteredProducts.sort((a: any, b: any) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            break;
          case 'date_desc':
          default:
            filteredProducts.sort((a: any, b: any) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            break;
        }
      }

      // Mapear productos para asegurar que tienen image_url
      const mappedProducts: Product[] = filteredProducts.map((p: any) => ({
        ...p,
        image_url: p.image_url ?? null,
      }));
      setProducts(mappedProducts);
    } catch (err: any) {
      // Error loading products
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

  function getWhatsAppLink(): string | undefined {
    const phone = String(store?.contact_phone ?? '').trim();
    const waDigits = formatPhoneForWhatsApp(phone);
    
    // Log temporal para depuración (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      console.debug('[WA] fuente:', store?.contact_phone, 'normalizado:', waDigits);
    }
    
    // Si devuelve null, deshabilitar botón
    if (!waDigits) {
      console.warn('[WA] Número inválido, deshabilitando botón:', phone);
      return undefined;
    }
    
    return `https://wa.me/${waDigits}`;
  }

  function getLocationDisplay() {
    if (!store) return '';
    
    if (store.city && store.department) {
      return `${store.city}, ${store.department}`;
    } else if (store.department) {
      return store.department;
    } else if (store.city) {
      return store.city;
    }
    return '';
  }

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  const handleFavorite = async () => {
    if (!currentUserId) {
      alert('Debes iniciar sesión para agregar tiendas a favoritos');
      return;
    }

    if (!store) return;

    setFavoriteLoading(true);
    try {
      const newState = await toggleStoreFavorite(store.id, currentUserId, isFavorited);
      setIsFavorited(newState);
    } catch (err: any) {
      console.error('Error toggling favorite:', err);
      alert('Error al actualizar favoritos: ' + (err.message || 'Error desconocido'));
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('Enlace copiado al portapapeles');
    } catch (err) {
      // Error copying link
    }
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '') || searchQuery.trim() !== '';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1A1A1A] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando perfil de la tienda...</p>
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1A1A1A] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-xl font-medium text-gray-900 dark:text-gray-300 mb-2">Tienda no encontrada</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error || 'La tienda que buscas no existe'}</p>
          <Link
            href="/"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1A1A1A]">
      {/* Header con breadcrumbs */}
      <div className="bg-white dark:bg-[#252525] border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <Breadcrumbs
          items={[
            { label: 'Tiendas', href: '/stores' },
            { label: store.name }
          ]}
          className="dark:text-gray-300"
        />
      </div>

      {/* Foto de Portada - Estilo Facebook */}
      <div className="relative h-64 sm:h-80 bg-gradient-to-br from-purple-400 to-blue-500">
        {store.cover_image_url ? (
          <img
            src={store.cover_image_url}
            alt={store.name}
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
        
        {/* Logo superpuesto - Estilo Facebook */}
        <div className="absolute -bottom-12 sm:-bottom-16 left-4 sm:left-8">
          <div className="relative">
            <img
              src={store.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(store.name)}&background=6366f1&color=fff`}
              alt={store.name}
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-lg object-cover bg-white"
            />
            {store.is_verified && (
              <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white rounded-full p-1.5 shadow-lg">
                <CheckCircle className="w-6 h-6" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Información de la tienda - Estilo Facebook */}
      <div className="bg-white dark:bg-[#252525] border-b border-gray-200 dark:border-gray-700 pt-16 sm:pt-20 pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-200 flex items-center gap-2">
                {store.name}
                {store.is_verified && (
                  <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    Verificada
                  </span>
                )}
              </h1>
              
              {/* Información adicional */}
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                {getLocationDisplay() && (
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span>{getLocationDisplay()}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <Package className="w-4 h-4 mr-1" />
                  <span>{totalProducts}+ publicaciones activas</span>
                </div>
              </div>
              
              {/* Calificación y reseñas */}
              {store.rating && store.rating > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <span className="font-semibold ml-1">{store.rating.toFixed(1)}</span>
                  </div>
                  {store.total_reviews && store.total_reviews > 0 && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">({store.total_reviews} reseñas)</span>
                  )}
                </div>
              )}
            </div>

            {/* Botones de acción - Siempre los mismos (solo iconos) para sincronizar vistas */}
            <div className="flex items-center gap-2 flex-wrap">
              {store.contact_phone && (() => {
                const waHref = getWhatsAppLink();
                return waHref ? (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    title="Enviar mensaje por WhatsApp"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </a>
                ) : (
                  <button
                    disabled
                    className="flex items-center justify-center w-10 h-10 bg-gray-400 text-white rounded-lg cursor-not-allowed"
                    title="Número inválido"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </button>
                );
              })()}
              
              {store.contact_phone && (
                <a
                  href={`tel:${store.contact_phone}`}
                  className="flex items-center justify-center w-10 h-10 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  title="Llamar"
                >
                  <Phone className="w-5 h-5" />
                </a>
              )}
              
              {store.contact_email && (
                <a
                  href={`mailto:${store.contact_email}`}
                  className="flex items-center justify-center w-10 h-10 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  title="Email"
                >
                  <Mail className="w-5 h-5" />
                </a>
              )}
              
              {(getLocationDisplay() || (store.latitude && store.longitude)) && (
                <button
                  onClick={() => {
                    let mapsUrl = '';
                    
                    if (store.latitude && store.longitude) {
                      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${store.latitude},${store.longitude}`;
                    } else if (getLocationDisplay()) {
                      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getLocationDisplay() + ', Paraguay')}`;
                    }
                    
                    if (mapsUrl) {
                      window.open(mapsUrl, '_blank');
                    }
                  }}
                  className="flex items-center justify-center w-10 h-10 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                  title="Ubicación"
                >
                  <MapPin className="w-5 h-5" />
                </button>
              )}
              
              {/* Icono de subastas - Solo visible si hay productos en subasta activos */}
              {hasAuctions && (
                <Link
                  href={`/auctions?seller_id=${store.seller_id}`}
                  className="flex items-center justify-center w-10 h-10 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                  title="Ver subastas de esta tienda"
                >
                  <Gavel className="w-5 h-5" />
                </Link>
              )}
              
              <button
                onClick={handleFollow}
                className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                  isFollowing 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 dark:bg-gray-600 text-gray-300 hover:bg-gray-600 dark:hover:bg-gray-500'
                }`}
                title={isFollowing ? 'Siguiendo' : 'Seguir'}
              >
                {isFollowing ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <Users className="w-5 h-5" />
                )}
              </button>
              
              <button
                onClick={handleFavorite}
                disabled={favoriteLoading || !currentUserId}
                className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isFavorited 
                    ? 'bg-red-900/30 text-red-400 hover:bg-red-900/40 border border-red-600' 
                    : 'bg-gray-700 dark:bg-gray-600 text-gray-300 hover:bg-gray-600 dark:hover:bg-gray-500'
                }`}
                title={!currentUserId ? 'Inicia sesión para agregar a favoritos' : isFavorited ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              >
                {favoriteLoading ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
                )}
              </button>
              
              <button
                onClick={handleShare}
                className="flex items-center justify-center w-10 h-10 bg-gray-700 dark:bg-gray-600 hover:bg-gray-600 dark:hover:bg-gray-500 text-gray-300 rounded-lg transition-colors"
                title="Compartir"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Buscador y Filtros - Estilo Facebook */}
      <div className="bg-white dark:bg-[#252525] border-b border-gray-200 dark:border-gray-700 py-3">
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
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-500"
              />
            </div>

            {/* Filtros rápidos */}
            <div className="flex gap-2 flex-wrap">
              <select
                value={filters.availability}
                onChange={(e) => updateFilter('availability', e.target.value)}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-gray-200"
              >
                <option value="">Disponible</option>
                <option value="active">Activos</option>
                <option value="sold">Vendidos</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-gray-200"
              >
                <option value="date_desc">Ordenar por</option>
                <option value="date_desc">Más recientes</option>
                <option value="date_asc">Más antiguos</option>
                <option value="price_asc">Precio: menor a mayor</option>
                <option value="price_desc">Precio: mayor a menor</option>
              </select>

              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm text-gray-900 dark:text-gray-200"
              >
                <Filter className="w-4 h-4" />
                <span>Filtros</span>
                {hasActiveFilters && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                    {Object.values(filters).filter(v => v !== '').length}
                  </span>
                )}
              </button>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Filtros expandidos */}
          {filtersOpen && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Categoría
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) => updateFilter('category', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-gray-200"
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
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Precio Mín.
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={filters.minPrice}
                  onChange={(e) => updateFilter('minPrice', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-gray-200"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Precio Máx.
                </label>
                <input
                  type="number"
                  placeholder="Sin límite"
                  value={filters.maxPrice}
                  onChange={(e) => updateFilter('maxPrice', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-gray-200"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Condición
                </label>
                <select
                  value={filters.condition}
                  onChange={(e) => updateFilter('condition', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-gray-200"
                >
                  <option value="">Todas</option>
                  <option value="nuevo">Nuevo</option>
                  <option value="usado_como_nuevo">Usado como nuevo</option>
                  <option value="usado">Usado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo
                </label>
                <select
                  value={filters.saleType}
                  onChange={(e) => updateFilter('saleType', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-gray-200"
                >
                  <option value="">Todos</option>
                  <option value="direct">Directa</option>
                  <option value="auction">Subasta</option>
                </select>
              </div>
              </div>
              
              {/* Campos específicos para vehículos/motos */}
              {(() => {
                const selectedCategory = categories.find(cat => cat.id === filters.category);
                const selectedCategoryName = selectedCategory?.name?.toLowerCase() || '';
                const isVehicleCategory = selectedCategoryName === 'vehiculos' || selectedCategoryName === 'motos';
                
                if (!isVehicleCategory) return null;
                
                return (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 space-y-4">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3 text-sm">
                      {selectedCategoryName === 'vehiculos' ? '🚗 Información del Vehículo' : '🏍️ Información de la Moto'}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Marca</label>
                        <input
                          type="text"
                          placeholder={selectedCategoryName === 'vehiculos' ? 'Ej: Ford, Toyota...' : 'Ej: Honda, Yamaha...'}
                          value={vehicleFields.marca}
                          onChange={(e) => setVehicleFields(prev => ({ ...prev, marca: e.target.value }))}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-gray-200"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Modelo</label>
                        <input
                          type="text"
                          placeholder={selectedCategoryName === 'vehiculos' ? 'Ej: Fiesta, Corolla...' : 'Ej: CG 150, XTZ 250...'}
                          value={vehicleFields.modelo}
                          onChange={(e) => setVehicleFields(prev => ({ ...prev, modelo: e.target.value }))}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-gray-200"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Año</label>
                        <input
                          type="number"
                          placeholder="Ej: 2020"
                          min="1900"
                          max={new Date().getFullYear() + 1}
                          value={vehicleFields.año}
                          onChange={(e) => setVehicleFields(prev => ({ ...prev, año: e.target.value }))}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-gray-200"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Kilometraje</label>
                        <input
                          type="number"
                          placeholder="Ej: 50000"
                          min="0"
                          value={vehicleFields.kilometraje}
                          onChange={(e) => setVehicleFields(prev => ({ ...prev, kilometraje: e.target.value }))}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-gray-200"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                        <input
                          type="text"
                          placeholder="Ej: Blanco, Negro..."
                          value={vehicleFields.color}
                          onChange={(e) => setVehicleFields(prev => ({ ...prev, color: e.target.value }))}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-gray-200"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Documentación</label>
                        <select
                          value={vehicleFields.documentacion}
                          onChange={(e) => setVehicleFields(prev => ({ ...prev, documentacion: e.target.value }))}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-gray-200"
                        >
                          <option value="">— Selecciona —</option>
                          <option value="al_dia">Al día</option>
                          <option value="solo_titulo">Solo título</option>
                          <option value="solo_cedula_verde">Solo cédula verde</option>
                          <option value="titulo_y_cedula_verde">Título y cédula verde</option>
                          <option value="ninguna">Ninguna de las anteriores</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })()}
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
                className="bg-white dark:bg-[#252525] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg transition-shadow"
              >
                <div className="relative h-24 bg-gray-100 dark:bg-gray-800">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
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
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-200 mb-0.5">
                    {product.price.toLocaleString('es-PY')} G
                  </p>
                  {getLocationDisplay() && (
                    <p className="text-[10px] text-gray-600 dark:text-gray-400 line-clamp-1">{getLocationDisplay()}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-[#252525] rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-xl font-medium text-gray-900 dark:text-gray-300 mb-2">
              No se encontraron productos
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {hasActiveFilters
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Esta tienda aún no ha publicado productos'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

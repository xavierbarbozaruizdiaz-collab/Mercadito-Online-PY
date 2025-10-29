// ============================================
// MERCADITO ONLINE PY - STORE PROFILE PAGE
// Página de perfil público de tienda
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  LoadingSpinner,
  EmptyState,
  Pagination
} from '@/components/ui';
import { useSellerProfile } from '@/lib/hooks/useSellerProfile';
import { getStoreBySlug, getStoreProducts } from '@/lib/services/storeService';
import { 
  Star,
  MapPin,
  Phone,
  Globe,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Package,
  TrendingUp,
  Users,
  MessageCircle,
  Heart,
  Share2,
  Calendar,
  Award,
  Clock,
  CheckCircle,
  XCircle,
  Store,
  ShoppingBag,
  Truck,
  Shield,
  CreditCard
} from 'lucide-react';

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function StoreProfilePage() {
  const params = useParams();
  const router = useRouter();
  const storeSlug = params.slug as string;
  
  const [activeTab, setActiveTab] = useState<'products' | 'reviews' | 'about' | 'policies'>('products');
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [store, setStore] = useState<any>(null);
  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [storeLoading, setStoreLoading] = useState(true);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [productsPagination, setProductsPagination] = useState({
    page: 1,
    total_pages: 1,
    total: 0,
    per_page: 12,
  });

  // Función para cargar productos de la tienda
  const loadStoreProducts = async (currentStoreId: string, page: number = 1, currentSellerId?: string) => {
    try {
      console.log('🛒 Loading products for store:', currentStoreId, 'seller:', currentSellerId);
      
      // Priorizar sellerId si está disponible
      if (!currentSellerId && !currentStoreId) {
        console.error('❌ No storeId or sellerId provided');
        setStoreProducts([]);
        return;
      }
      
      // No filtrar por status para incluir productos sin ese campo
      const result = await getStoreProducts(currentStoreId || '', {
        page,
        limit: 12,
        // No pasar status: 'active' - algunos productos pueden no tener ese campo
        sellerId: currentSellerId,
      });
      
      console.log('✅ Loaded products:', result.products?.length, 'total:', result.total);
      console.log('📦 Products data:', result.products);
      
      setStoreProducts(result.products || []);
      setProductsPagination({
        page,
        total_pages: result.total_pages,
        total: result.total,
        per_page: 12,
      });
    } catch (err) {
      console.error('❌ Error loading store products:', err);
      setStoreProducts([]);
    }
  };

  // Obtener el storeId y sellerId desde el storeSlug
  useEffect(() => {
    async function loadStoreAndGetIds() {
      setStoreLoading(true);
      setStoreError(null);
      try {
        const storeData = await getStoreBySlug(storeSlug);
        console.log('Store data loaded:', storeData);
        if (storeData) {
          setStore(storeData);
          if (storeData.id) {
            setStoreId(storeData.id);
          }
          if (storeData.seller_id) {
            setSellerId(storeData.seller_id);
            // Cargar productos usando seller_id (más confiable que store_id)
            // Pasar storeId también pero seller_id tiene prioridad en la query
            await loadStoreProducts(storeData.id || storeData.seller_id, 1, storeData.seller_id);
          } else if (storeData.id) {
            // Si no hay seller_id, intentar solo con store_id
            console.warn('Store has no seller_id, trying with store_id only');
            await loadStoreProducts(storeData.id, 1);
          } else {
            console.error('Store has no id or seller_id');
            setStoreError('Tienda sin datos válidos');
          }
        } else {
          setStoreError('Tienda no encontrada');
        }
      } catch (err) {
        console.error('Error loading store:', err);
        setStoreError('No se pudo cargar la información de la tienda.');
      } finally {
        setStoreLoading(false);
      }
    }

    if (storeSlug) {
      loadStoreAndGetIds();
    }
  }, [storeSlug]);

  const { 
    profile, 
    reviews,
    stats,
    loading: profileLoading, 
    error: profileError,
    reviewsPagination,
    loadReviews,
  } = useSellerProfile({
    sellerId: sellerId || undefined,
    autoLoad: !!sellerId,
  });

  // Usar productos de la tienda en lugar de productos del seller
  const products = storeProducts;
  
  const loading = storeLoading || profileLoading;
  const error = storeError || profileError;

  // Manejar cambio de página de productos
  const handleProductsPageChange = (page: number) => {
    if (storeId) {
      loadStoreProducts(storeId, page);
    }
  };

  // Manejar cambio de página de reseñas
  const handleReviewsPageChange = (page: number) => {
    loadReviews({ page });
  };

  // Manejar clic en producto
  const handleProductClick = (productId: string) => {
    router.push(`/products/${productId}`);
  };

  // Manejar seguir tienda
  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    // En una implementación real, esto haría una llamada a la API
  };

  // Manejar agregar a favoritos
  const handleFavorite = () => {
    setIsFavorited(!isFavorited);
    // En una implementación real, esto haría una llamada a la API
  };

  // Manejar compartir perfil
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Tienda ${store?.name}`,
        text: `Mira la tienda ${store?.name} en Mercadito Online PY`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      // Mostrar notificación de copiado
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando perfil de la tienda..." />
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <EmptyState
          title="Tienda no encontrada"
          description="La tienda que buscas no existe o ha sido eliminada."
          action={{
            label: 'Volver al inicio',
            onClick: () => router.push('/'),
          }}
          icon={<Store className="w-16 h-16" />}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header del perfil */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
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
                  <CheckCircle className="w-5 h-5" />
                </div>
              )}
            </div>

            {/* Información principal */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                    {store.name}
                    {store.is_verified && (
                      <Badge variant="success" size="sm" className="ml-2">
                        <Award className="w-3 h-3 mr-1" />
                        Verificada
                      </Badge>
                    )}
                  </h1>
                  
                  <div className="flex items-center space-x-4 mt-2 text-gray-600">
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-500 mr-1" />
                      <span className="font-medium">{store.rating.toFixed(1)}</span>
                      <span className="text-sm ml-1">({store.total_reviews} reseñas)</span>
                    </div>
                    
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      <span className="text-sm">Tienda desde {new Date(store.created_at).getFullYear()}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      <span className="text-sm">Activa {new Date(store.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {store.location && (
                    <div className="flex items-center mt-2 text-gray-600">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span>{store.location}</span>
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex items-center space-x-2 mt-4 md:mt-0">
                  <Button
                    variant="outline"
                    onClick={handleFollow}
                    className={isFollowing ? 'bg-blue-600 text-white' : ''}
                  >
                    {isFollowing ? 'Siguiendo' : 'Seguir'}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={handleFavorite}
                    className={isFavorited ? 'text-red-500' : ''}
                  >
                    <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                  </Button>
                  
                  <Button variant="outline" onClick={handleShare}>
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Estadísticas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Estadísticas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Productos</span>
                      <span className="font-medium">{stats.total_products}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ventas</span>
                      <span className="font-medium">{stats.total_sales}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Calificación</span>
                      <span className="font-medium">{stats.average_rating.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Respuesta</span>
                      <span className="font-medium">{stats.response_rate}%</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Información de contacto */}
            <Card>
              <CardHeader>
                <CardTitle>Información de Contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {store.phone && (
                  <div className="flex items-center text-gray-600">
                    <Phone className="w-4 h-4 mr-2" />
                    <span>{store.phone}</span>
                  </div>
                )}
                
                {store.email && (
                  <div className="flex items-center text-gray-600">
                    <Globe className="w-4 h-4 mr-2" />
                    <a href={`mailto:${store.email}`} className="hover:text-blue-600">
                      {store.email}
                    </a>
                  </div>
                )}

                {store.website && (
                  <div className="flex items-center text-gray-600">
                    <Globe className="w-4 h-4 mr-2" />
                    <a href={store.website} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                      Sitio web
                    </a>
                  </div>
                )}

                {store.social_links && (
                  <div className="flex items-center space-x-2">
                    {store.social_links.facebook && (
                      <a href={store.social_links.facebook} target="_blank" rel="noopener noreferrer">
                        <Facebook className="w-5 h-5 text-blue-600 hover:text-blue-700" />
                      </a>
                    )}
                    {store.social_links.instagram && (
                      <a href={store.social_links.instagram} target="_blank" rel="noopener noreferrer">
                        <Instagram className="w-5 h-5 text-pink-600 hover:text-pink-700" />
                      </a>
                    )}
                    {store.social_links.twitter && (
                      <a href={store.social_links.twitter} target="_blank" rel="noopener noreferrer">
                        <Twitter className="w-5 h-5 text-blue-400 hover:text-blue-500" />
                      </a>
                    )}
                    {store.social_links.linkedin && (
                      <a href={store.social_links.linkedin} target="_blank" rel="noopener noreferrer">
                        <Linkedin className="w-5 h-5 text-blue-700 hover:text-blue-800" />
                      </a>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Botón de contacto */}
            <Button className="w-full" size="lg">
              <MessageCircle className="w-4 h-4 mr-2" />
              Contactar Tienda
            </Button>
          </div>

          {/* Contenido principal */}
          <div className="lg:col-span-3">
            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
              <button
                onClick={() => setActiveTab('products')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'products'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Package className="w-4 h-4 inline mr-2" />
                Productos ({productsPagination.total})
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'reviews'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Star className="w-4 h-4 inline mr-2" />
                Reseñas ({reviewsPagination.total})
              </button>
              <button
                onClick={() => setActiveTab('about')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'about'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Store className="w-4 h-4 inline mr-2" />
                Acerca de
              </button>
              <button
                onClick={() => setActiveTab('policies')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'policies'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Shield className="w-4 h-4 inline mr-2" />
                Políticas
              </button>
            </div>

            {/* Contenido de las tabs */}
            {activeTab === 'products' && (
              <div className="space-y-6">
                {/* Buscador y Filtros estilo Facebook Marketplace */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
                  {/* Buscador */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar en esta tienda..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  
                  {/* Filtros rápidos */}
                  <div className="flex flex-wrap gap-2">
                    <select className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                      <option>Todas las categorías</option>
                    </select>
                    <select className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                      <option>Precio</option>
                      <option>Menor a mayor</option>
                      <option>Mayor a menor</option>
                    </select>
                    <select className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                      <option>Condición</option>
                      <option>Nuevo</option>
                      <option>Usado</option>
                    </select>
                  </div>
                </div>

                {products.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {products.map((product: any) => (
                        <Card
                          key={product.id}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => handleProductClick(product.id)}
                        >
                          <div className="relative w-full h-48">
                            <Image
                              src={product.cover_url || '/placeholder-product.png'}
                              alt={product.title}
                              fill
                              className="object-cover rounded-t-lg"
                            />
                            <div className="absolute top-2 left-2">
                              <Badge variant="info" size="sm">
                                {product.condition}
                              </Badge>
                            </div>
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">
                              {product.title}
                            </h3>
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-bold text-gray-900">
                                Gs. {product.price.toLocaleString('es-PY')}
                              </span>
                              <Badge variant="default" size="sm">
                                {product.sale_type}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Paginación de productos */}
                    {productsPagination.total_pages > 1 && (
                      <div className="flex justify-center">
                        <Pagination
                          currentPage={productsPagination.page}
                          totalPages={productsPagination.total_pages}
                          onPageChange={handleProductsPageChange}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <EmptyState
                    title="No hay productos"
                    description="Esta tienda aún no ha publicado productos."
                    icon={<Package className="w-16 h-16" />}
                  />
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6">
                {reviews.length > 0 ? (
                  <>
                    <div className="space-y-4">
                      {reviews.map((review: any) => (
                        <Card key={review.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start space-x-3">
                              <Avatar
                                src={review.buyer.avatar_url}
                                fallback={((review.buyer.first_name || review.buyer.last_name 
                                  ? `${review.buyer.first_name || ''} ${review.buyer.last_name || ''}`.trim()
                                  : review.buyer.email?.split('@')[0] || 'U').charAt(0).toUpperCase()}
                                size="md"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-medium text-gray-900">
                                    {(review.buyer.first_name || review.buyer.last_name 
                                      ? `${review.buyer.first_name || ''} ${review.buyer.last_name || ''}`.trim()
                                      : review.buyer.email?.split('@')[0] || 'Usuario')}
                                  </h4>
                                  <div className="flex items-center">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`w-4 h-4 ${
                                          i < review.rating
                                            ? 'text-yellow-500 fill-current'
                                            : 'text-gray-300'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                                {review.comment && (
                                  <p className="text-gray-600 mb-2">{review.comment}</p>
                                )}
                                <p className="text-sm text-gray-500">
                                  {new Date(review.created_at).toLocaleDateString('es-PY')}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Paginación de reseñas */}
                    {reviewsPagination.total_pages > 1 && (
                      <div className="flex justify-center">
                        <Pagination
                          currentPage={reviewsPagination.page}
                          totalPages={reviewsPagination.total_pages}
                          onPageChange={handleReviewsPageChange}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <EmptyState
                    title="No hay reseñas"
                    description="Esta tienda aún no tiene reseñas de compradores."
                    icon={<Star className="w-16 h-16" />}
                  />
                )}
              </div>
            )}

            {activeTab === 'about' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Acerca de {store.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {store.description ? (
                      <p className="text-gray-600 leading-relaxed">{store.description}</p>
                    ) : (
                      <p className="text-gray-500 italic">
                        Esta tienda aún no ha agregado una descripción.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Información adicional */}
                <Card>
                  <CardHeader>
                    <CardTitle>Información de la Tienda</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Creada</span>
                      <span className="font-medium">
                        {new Date(store.created_at).toLocaleDateString('es-PY')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Última actualización</span>
                      <span className="font-medium">
                        {new Date(store.updated_at).toLocaleDateString('es-PY')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estado</span>
                      <Badge variant="success" size="sm">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Activa
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'policies' && (
              <div className="space-y-6">
                {/* Política de envío */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Truck className="w-5 h-5 mr-2" />
                      Política de Envío
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Costo de envío</span>
                        <span className="font-medium">Gs. 15,000 - 25,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tiempo de entrega</span>
                        <span className="font-medium">2-5 días hábiles</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Envío gratuito</span>
                        <span className="font-medium">Compras mayores a Gs. 100,000</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Política de devoluciones */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <ShoppingBag className="w-5 h-5 mr-2" />
                      Política de Devoluciones
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Período de devolución</span>
                        <span className="font-medium">30 días</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Condición</span>
                        <span className="font-medium">Producto sin usar</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Costo de devolución</span>
                        <span className="font-medium">A cargo del comprador</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Política de pagos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CreditCard className="w-5 h-5 mr-2" />
                      Métodos de Pago
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Transferencia bancaria</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Efectivo contra entrega</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Tarjeta de crédito</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Billetera digital</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
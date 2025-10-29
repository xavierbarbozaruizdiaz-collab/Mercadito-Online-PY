// ============================================
// MERCADITO ONLINE PY - SELLER PROFILE PAGE
// Página de perfil público de vendedor
// ============================================

'use client';

import { useState } from 'react';
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
  XCircle
} from 'lucide-react';

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function SellerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const sellerId = params.id as string;
  
  const [activeTab, setActiveTab] = useState<'products' | 'reviews' | 'about'>('products');
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  const {
    profile,
    stats,
    products,
    reviews,
    loading,
    error,
    productsPagination,
    reviewsPagination,
    loadProducts,
    loadReviews,
  } = useSellerProfile({
    sellerId,
    autoLoad: true,
  });

  // Manejar cambio de página de productos
  const handleProductsPageChange = (page: number) => {
    loadProducts({ page });
  };

  // Manejar cambio de página de reseñas
  const handleReviewsPageChange = (page: number) => {
    loadReviews({ page });
  };

  // Manejar clic en producto
  const handleProductClick = (productId: string) => {
    router.push(`/products/${productId}`);
  };

  // Manejar seguir vendedor
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
        title: `Perfil de ${(profile as any)?.store_name || 'Vendedor'}`,
        text: `Mira el perfil de ${(profile as any)?.store_name || 'este vendedor'} en Mercadito Online PY`,
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
        <LoadingSpinner size="lg" text="Cargando perfil del vendedor..." />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <EmptyState
          title="Vendedor no encontrado"
          description="El perfil del vendedor que buscas no existe o ha sido eliminado."
          action={{
            label: 'Volver al inicio',
            onClick: () => router.push('/'),
          }}
          icon={<Users className="w-16 h-16" />}
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
            {/* Avatar */}
            <div className="relative">
              <Avatar
                src={profile.avatar_url}
                fallback={(profile as any)?.full_name?.charAt(0)?.toUpperCase() || 'V'}
                size="xl"
                className="border-4 border-white shadow-lg"
              />
              {(profile as any)?.verified && (
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
                    {(profile as any)?.full_name || 'Vendedor'}
                    {(profile as any)?.verified && (
                      <Badge variant="success" size="sm" className="ml-2">
                        <Award className="w-3 h-3 mr-1" />
                        Verificado
                      </Badge>
                    )}
                  </h1>
                  
                  <div className="flex items-center space-x-4 mt-2 text-gray-600">
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-500 mr-1" />
                      <span className="font-medium">{(profile as any)?.rating?.toFixed(1) || '0.0'}</span>
                      <span className="text-sm ml-1">({(profile as any)?.total_reviews || 0} reseñas)</span>
                    </div>
                    
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      <span className="text-sm">Miembro desde {new Date((profile as any)?.member_since || Date.now()).getFullYear()}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      <span className="text-sm">Activo {new Date((profile as any)?.last_active || Date.now()).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {profile.location && (
                    <div className="flex items-center mt-2 text-gray-600">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span>{profile.location}</span>
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
                {profile.phone && (
                  <div className="flex items-center text-gray-600">
                    <Phone className="w-4 h-4 mr-2" />
                    <span>{profile.phone}</span>
                  </div>
                )}
                
                {(profile as any)?.website && (
                  <div className="flex items-center text-gray-600">
                    <Globe className="w-4 h-4 mr-2" />
                    <a href={(profile as any)?.website} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                      Sitio web
                    </a>
                  </div>
                )}

                {(profile as any)?.social_links && (
                  <div className="flex items-center space-x-2">
                    {(profile as any)?.social_links?.facebook && (
                      <a href={(profile as any)?.social_links?.facebook} target="_blank" rel="noopener noreferrer">
                        <Facebook className="w-5 h-5 text-blue-600 hover:text-blue-700" />
                      </a>
                    )}
                    {(profile as any)?.social_links?.instagram && (
                      <a href={(profile as any)?.social_links?.instagram} target="_blank" rel="noopener noreferrer">
                        <Instagram className="w-5 h-5 text-pink-600 hover:text-pink-700" />
                      </a>
                    )}
                    {(profile as any)?.social_links?.twitter && (
                      <a href={(profile as any)?.social_links?.twitter} target="_blank" rel="noopener noreferrer">
                        <Twitter className="w-5 h-5 text-blue-400 hover:text-blue-500" />
                      </a>
                    )}
                    {(profile as any)?.social_links?.linkedin && (
                      <a href={(profile as any)?.social_links?.linkedin} target="_blank" rel="noopener noreferrer">
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
              Contactar Vendedor
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
                <Users className="w-4 h-4 inline mr-2" />
                Acerca de
              </button>
            </div>

            {/* Contenido de las tabs */}
            {activeTab === 'products' && (
              <div className="space-y-6">
                {products.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {products.map((product) => (
                        <Card
                          key={product.id}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => handleProductClick(product.id)}
                        >
                          <div className="relative w-full h-48">
                            <Image
                              src={(product as any)?.cover_url || '/placeholder-product.png'}
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
                    description="Este vendedor aún no ha publicado productos."
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
                      {reviews.map((review) => (
                        <Card key={review.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start space-x-3">
                              <Avatar
                                src={review.buyer.avatar_url || undefined}
                                fallback={review.buyer.full_name.charAt(0).toUpperCase()}
                                size="md"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-medium text-gray-900">
                                    {review.buyer.full_name}
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
                    description="Este vendedor aún no tiene reseñas de compradores."
                    icon={<Star className="w-16 h-16" />}
                  />
                )}
              </div>
            )}

            {activeTab === 'about' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Acerca de {(profile as any)?.full_name || 'este vendedor'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {profile.bio ? (
                      <p className="text-gray-600 leading-relaxed">{profile.bio}</p>
                    ) : (
                      <p className="text-gray-500 italic">
                        Este vendedor aún no ha agregado una biografía.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Información adicional */}
                <Card>
                  <CardHeader>
                    <CardTitle>Información del Vendedor</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Miembro desde</span>
                      <span className="font-medium">
                        {new Date((profile as any)?.member_since || Date.now()).toLocaleDateString('es-PY')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Última actividad</span>
                      <span className="font-medium">
                        {new Date((profile as any)?.last_active || Date.now()).toLocaleDateString('es-PY')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estado</span>
                      <Badge variant="success" size="sm">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Activo
                      </Badge>
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
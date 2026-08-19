// ============================================
// MERCADITO ONLINE PY - PRODUCT CARD
// Componente de tarjeta de producto
// ============================================

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Button, 
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui';
import { 
  Heart, 
  ShoppingCart, 
  Eye, 
  MapPin, 
  Star,
  Clock,
  TrendingUp,
  Package,
  User
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useWishlist } from '@/lib/hooks/useWishlist';
import { supabase } from '@/lib/supabaseClient';
import { useFacebookPixel } from '@/lib/services/facebookPixelService';
import { useGoogleAnalytics } from '@/lib/services/googleAnalyticsService';

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
  image_url?: string;
  thumbnail_url?: string; // [IMAGES LEVEL2] Thumbnail optimizado para listados
  created_at: string;
  seller_id?: string; // ID del vendedor
  stock_quantity?: number | null;
  stock_management_enabled?: boolean;
  low_stock_threshold?: number | null;
  wholesale_enabled?: boolean;
  wholesale_min_quantity?: number | null;
  wholesale_discount_percent?: number | null;
  store: {
    name: string;
    slug: string;
    location?: string;
  };
  category?: {
    name: string;
  };
}

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
  showStore?: boolean;
  showCategory?: boolean;
  showActions?: boolean;
  variant?: 'grid' | 'list';
  className?: string;
}

// ============================================
// COMPONENTE
// ============================================

export default function ProductCard({
  product,
  onClick,
  showStore = true,
  showCategory = true,
  showActions = true,
  variant = 'grid',
  className = '',
}: ProductCardProps) {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isOwnProduct, setIsOwnProduct] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const isLiked = isInWishlist(product.id);
  const facebookPixel = useFacebookPixel();
  const googleAnalytics = useGoogleAnalytics();
  
  // Calcular estado de stock
  const stockInfo = product.stock_management_enabled && product.stock_quantity !== null && product.stock_quantity !== undefined
    ? {
        quantity: product.stock_quantity,
        isLow: product.low_stock_threshold ? product.stock_quantity <= product.low_stock_threshold : false,
        isOutOfStock: product.stock_quantity <= 0,
        threshold: product.low_stock_threshold || 5
      }
    : null;

  // Log cuando se montan los botones Card CTA
  useEffect(() => {
    if (showActions) {
      console.log('[BTN] Card CTA buttons mounted');
    }
  }, [showActions]);

  // Verificar si el producto pertenece al usuario actual
  useEffect(() => {
    const checkOwnership = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        const userId = session?.session?.user?.id || null;
        setCurrentUserId(userId);
        
        // Si el producto tiene seller_id, compararlo con el usuario actual
        if (product.seller_id && userId) {
          setIsOwnProduct(product.seller_id === userId);
        } else if (!product.seller_id && userId) {
          // Si no tiene seller_id en el objeto, obtenerlo del producto
          const { data: productData } = await (supabase as any)
            .from('products')
            .select('seller_id')
            .eq('id', product.id)
            .single();
          
          if (productData?.seller_id === userId) {
            setIsOwnProduct(true);
          }
        }
      } catch (err) {
        console.error('Error checking product ownership:', err);
      }
    };
    
    checkOwnership();
  }, [product.id, product.seller_id]);

  // Track view content cuando se monta el componente
  useEffect(() => {
    facebookPixel.trackViewContent({
      id: product.id,
      title: product.title,
      price: product.price,
      category: product.category?.name,
      currency: 'PYG',
    });

    googleAnalytics.trackViewItem({
      id: product.id,
      name: product.title,
      category: product.category?.name,
      price: product.price,
      currency: 'PYG',
    });
  }, [product.id, product.title, product.price, product.category?.name, facebookPixel, googleAnalytics]);

  // Manejar clic en la tarjeta
  const handleCardClick = () => {
    if (onClick) {
      onClick();
    }
  };

  // Manejar clic en botón de acción (evitar propagación)
  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  // Manejar agregar a favoritos
  const handleAddToFavorites = async () => {
    await toggleWishlist(product.id);
  };

  // Manejar agregar al carrito
  const handleAddToCart = async () => {
    // Validar que no sea su propio producto
    if (isOwnProduct) {
      alert('No puedes agregar tus propios productos al carrito');
      return;
    }

    // Track add to cart
    facebookPixel.trackAddToCart({
      id: product.id,
      title: product.title,
      price: product.price,
      quantity: 1,
      category: product.category?.name,
      currency: 'PYG',
    });

    googleAnalytics.trackAddToCart({
      id: product.id,
      name: product.title,
      category: product.category?.name,
      price: product.price,
      quantity: 1,
      currency: 'PYG',
    });

    setIsAddingToCart(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        alert('Debes iniciar sesión para agregar productos al carrito');
        return;
      }

      // Verificar nuevamente que no sea su producto (doble validación)
      const sellerId = product.seller_id;
      if (sellerId && sellerId === session.session.user.id) {
        alert('No puedes agregar tus propios productos al carrito');
        return;
      }

      // Agregar al carrito usando el servicio
      const { error } = await (supabase as any)
        .from('cart_items')
        .insert({
          user_id: session.session.user.id,
          product_id: product.id,
          quantity: 1
        });

      if (error) {
        // Si ya existe, actualizar cantidad
        if (error.code === '23505') {
          const { data: existing } = await (supabase as any)
            .from('cart_items')
            .select('id, quantity')
            .eq('user_id', session.session.user.id)
            .eq('product_id', product.id)
            .single();

          if (existing) {
            await (supabase as any)
              .from('cart_items')
              .update({ quantity: existing.quantity + 1 })
              .eq('id', existing.id);
          }
        } else {
          throw error;
        }
      }

      // toast.success('Producto agregado al carrito');
    } catch (err: any) {
      console.error('Error adding to cart:', err);
      // toast.error(err.message || 'Error al agregar al carrito');
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Obtener color del badge según la condición
  const getConditionBadgeColor = (condition: string) => {
    switch (condition) {
      case 'nuevo':
        return 'success';
      case 'usado_como_nuevo':
        return 'warning';
      case 'usado':
        return 'info';
      default:
        return 'default';
    }
  };

  // Obtener color del badge según el tipo de venta
  const getSaleTypeBadgeColor = (saleType: string) => {
    switch (saleType) {
      case 'venta':
        return 'default';
      case 'subasta':
        return 'warning';
      case 'intercambio':
        return 'info';
      default:
        return 'default';
    }
  };

  // Calcular descuento
  const discount = product.compare_price 
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
    : 0;

  if (variant === 'list') {
    return (
      <Card 
        className={`hover:shadow-md transition-shadow cursor-pointer ${className}`}
        onClick={handleCardClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            {/* Imagen del producto */}
            <div className="relative w-24 h-24 flex-shrink-0">
              {/* [IMAGES LEVEL2] Usar thumbnail_url en listados cuando esté disponible */}
              <Image
                src={product.thumbnail_url ?? product.image_url ?? '/placeholder-product.png'}
                alt={product.title}
                fill
                sizes="96px"
                className="object-cover rounded-md"
                loading="lazy"
              />
              {discount > 0 && (
                <Badge 
                  variant="error" 
                  size="sm" 
                  className="absolute -top-2 -right-2"
                >
                  -{discount}%
                </Badge>
              )}
            </div>

            {/* Información del producto */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                    {product.title}
                  </h3>
                  
                  {/* Badges - OCULTOS */}
                  {/* <div className="flex items-center space-x-2 mt-1">
                    <Badge 
                      variant={getConditionBadgeColor(product.condition)}
                      size="sm"
                    >
                      {product.condition}
                    </Badge>
                    <Badge 
                      variant={getSaleTypeBadgeColor(product.sale_type)}
                      size="sm"
                    >
                      {product.sale_type}
                    </Badge>
                  </div> */}

                  {showCategory && product.category && (
                    <p className="text-sm sm:text-base text-gray-700 sm:text-gray-600 mt-1 font-medium">
                      {product.category.name}
                    </p>
                  )}

                  {showStore && (
                    <div className="flex items-center text-sm sm:text-base text-gray-700 sm:text-gray-600 mt-1 font-medium">
                      <User className="w-4 h-4 mr-1" />
                      <Link 
                        href={`/store/${product.store.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-blue-600"
                      >
                        {product.store.name}
                      </Link>
                      {product.store.location && (
                        <>
                          <span className="mx-1">•</span>
                          <MapPin className="w-4 h-4 mr-1" />
                          {product.store.location}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Precio y acciones */}
                <div className="text-right ml-4">
                  <div className="flex items-center space-x-2">
                    {product.compare_price && (
                      <span className="text-sm sm:text-base text-gray-500 line-through">
                        {formatCurrency(product.compare_price)}
                      </span>
                    )}
                    <span className="text-xl sm:text-2xl font-bold text-gray-900">
                      {formatCurrency(product.price)}
                    </span>
                  </div>
                  
                  <div className="flex items-center text-sm sm:text-base text-gray-600 sm:text-gray-500 mt-1 font-medium">
                    <Clock className="w-4 h-4 mr-1" />
                    {formatDate(product.created_at)}
                  </div>

                  {true && showActions && (
                    <div className="flex items-center space-x-2 mt-2">
                      {true && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleActionClick(e, handleAddToFavorites)}
                          className={isLiked ? 'text-red-500' : 'text-gray-400'}
                          data-testid="primary-btn"
                        >
                          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                        </Button>
                      )}
                      {true && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleActionClick(e, handleAddToCart)}
                          disabled={isAddingToCart || isOwnProduct}
                          title={isOwnProduct ? 'No puedes agregar tus propios productos al carrito' : ''}
                          data-testid="primary-btn"
                        >
                          <ShoppingCart className="w-4 h-4 mr-1" />
                          {isAddingToCart ? 'Agregando...' : isOwnProduct ? 'Tu producto' : 'Agregar'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Variante grid (por defecto)
  return (
    <Card 
      className={`hover:shadow-md transition-shadow cursor-pointer ${className}`}
      onClick={handleCardClick}
    >
      <CardHeader className="p-0">
        <div className="relative w-full h-48">
          {/* [IMAGES LEVEL2] Usar thumbnail_url en listados cuando esté disponible */}
          <Image
            src={product.thumbnail_url ?? product.image_url ?? '/placeholder-product.png'}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover rounded-t-md"
            loading="lazy"
          />
          
          {/* Badges - OCULTOS */}
          {/* <div className="absolute top-2 left-2 flex flex-col space-y-1">
            <Badge 
              variant={getConditionBadgeColor(product.condition)}
              size="sm"
            >
              {product.condition}
            </Badge>
            <Badge 
              variant={getSaleTypeBadgeColor(product.sale_type)}
              size="sm"
            >
              {product.sale_type}
            </Badge>
          </div> */}

          {discount > 0 && (
            <Badge 
              variant="error" 
              size="sm" 
              className="absolute top-2 right-2"
            >
              -{discount}%
            </Badge>
          )}

          {/* Badge de precio mayorista */}
          {product.wholesale_enabled && product.wholesale_min_quantity && (
            <Badge 
              variant="success" 
              size="sm" 
              className="absolute top-2 left-2 bg-green-500 text-white"
            >
              💰 Mayorista {product.wholesale_min_quantity}+
            </Badge>
          )}

          {/* Badge de stock */}
          {stockInfo && (
            <div className="absolute bottom-2 left-2">
              {stockInfo.isOutOfStock ? (
                <Badge variant="error" size="sm">
                  Sin stock
                </Badge>
              ) : stockInfo.isLow ? (
                <Badge variant="warning" size="sm">
                  Últimas {stockInfo.quantity} unidades
                </Badge>
              ) : (
                <Badge variant="info" size="sm" className="bg-blue-500/80 text-white">
                  Stock: {stockInfo.quantity}
                </Badge>
              )}
            </div>
          )}

          {/* Botón de favoritos */}
          {true && showActions && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => handleActionClick(e, handleAddToFavorites)}
              className={`absolute top-2 right-2 ${
                isLiked ? 'text-red-500' : 'text-gray-400'
              }`}
              data-testid="primary-btn"
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <CardTitle className="text-base sm:text-lg font-bold text-gray-900 line-clamp-2 mb-2">
          {product.title}
        </CardTitle>

        {showCategory && product.category && (
          <p className="text-sm sm:text-base text-gray-700 sm:text-gray-600 mb-2 font-medium">
            {product.category.name}
          </p>
        )}

        {showStore && (
          <div className="flex items-center text-sm sm:text-base text-gray-700 sm:text-gray-600 mb-2 font-medium">
            <User className="w-4 h-4 mr-1" />
            <Link 
              href={`/store/${product.store.slug}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:text-blue-600 truncate"
            >
              {product.store.name}
            </Link>
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {product.compare_price && (
              <span className="text-sm sm:text-base text-gray-500 line-through">
                {formatCurrency(product.compare_price)}
              </span>
            )}
            <span className="text-xl sm:text-2xl font-bold text-gray-900">
              {formatCurrency(product.price)}
            </span>
          </div>
        </div>

        <div className="flex items-center text-sm sm:text-base text-gray-600 sm:text-gray-500 font-medium">
          <Clock className="w-4 h-4 mr-1" />
          {formatDate(product.created_at)}
        </div>
      </CardContent>

      {true && showActions && (
        <CardFooter className="p-4 pt-0">
          <div className="flex items-center space-x-2 w-full">
                      {true && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleActionClick(e, handleAddToCart)}
                          disabled={isAddingToCart || isOwnProduct || (stockInfo?.isOutOfStock === true)}
                          className="flex-1"
                          title={
                            isOwnProduct 
                              ? 'No puedes agregar tus propios productos al carrito'
                              : stockInfo?.isOutOfStock === true
                              ? 'Producto sin stock disponible'
                              : ''
                          }
                          data-testid="primary-btn"
                        >
                          <ShoppingCart className="w-4 h-4 mr-1" />
                          {isAddingToCart 
                            ? 'Agregando...' 
                            : isOwnProduct 
                            ? 'Tu producto' 
                            : stockInfo?.isOutOfStock === true
                            ? 'Sin stock'
                            : 'Agregar'}
                        </Button>
                      )}
            {true && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => handleActionClick(e, handleAddToFavorites)}
                className={isLiked ? 'text-red-500' : 'text-gray-400'}
                data-testid="primary-btn"
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              </Button>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

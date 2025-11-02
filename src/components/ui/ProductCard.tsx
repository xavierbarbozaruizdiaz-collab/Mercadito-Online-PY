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
  created_at: string;
  seller_id?: string; // ID del vendedor
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

      alert('Producto agregado al carrito');
    } catch (err: any) {
      console.error('Error adding to cart:', err);
      alert(err.message || 'Error al agregar al carrito');
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
              <Image
                src={product.image_url || '/placeholder-product.png'}
                alt={product.title}
                fill
                className="object-cover rounded-md"
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
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
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
                    <p className="text-sm text-gray-600 mt-1">
                      {product.category.name}
                    </p>
                  )}

                  {showStore && (
                    <div className="flex items-center text-sm text-gray-600 mt-1">
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
                      <span className="text-sm text-gray-500 line-through">
                        {formatCurrency(product.compare_price)}
                      </span>
                    )}
                    <span className="text-xl font-bold text-gray-900">
                      {formatCurrency(product.price)}
                    </span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <Clock className="w-4 h-4 mr-1" />
                    {formatDate(product.created_at)}
                  </div>

                  {showActions && (
                    <div className="flex items-center space-x-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleActionClick(e, handleAddToFavorites)}
                        className={isLiked ? 'text-red-500' : 'text-gray-400'}
                      >
                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleActionClick(e, handleAddToCart)}
                        disabled={isAddingToCart || isOwnProduct}
                        title={isOwnProduct ? 'No puedes agregar tus propios productos al carrito' : ''}
                      >
                        <ShoppingCart className="w-4 h-4 mr-1" />
                        {isAddingToCart ? 'Agregando...' : isOwnProduct ? 'Tu producto' : 'Agregar'}
                      </Button>
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
          <Image
            src={product.image_url || '/placeholder-product.png'}
            alt={product.title}
            fill
            className="object-cover rounded-t-md"
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

          {/* Botón de favoritos */}
          {showActions && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => handleActionClick(e, handleAddToFavorites)}
              className={`absolute top-2 right-2 ${
                isLiked ? 'text-red-500' : 'text-gray-400'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2 mb-2">
          {product.title}
        </CardTitle>

        {showCategory && product.category && (
          <p className="text-sm text-gray-600 mb-2">
            {product.category.name}
          </p>
        )}

        {showStore && (
          <div className="flex items-center text-sm text-gray-600 mb-2">
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
              <span className="text-sm text-gray-500 line-through">
                {formatCurrency(product.compare_price)}
              </span>
            )}
            <span className="text-xl font-bold text-gray-900">
              {formatCurrency(product.price)}
            </span>
          </div>
        </div>

        <div className="flex items-center text-sm text-gray-500">
          <Clock className="w-4 h-4 mr-1" />
          {formatDate(product.created_at)}
        </div>
      </CardContent>

      {showActions && (
        <CardFooter className="p-4 pt-0">
          <div className="flex items-center space-x-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => handleActionClick(e, handleAddToCart)}
              disabled={isAddingToCart || isOwnProduct}
              className="flex-1"
              title={isOwnProduct ? 'No puedes agregar tus propios productos al carrito' : ''}
            >
              <ShoppingCart className="w-4 h-4 mr-1" />
              {isAddingToCart ? 'Agregando...' : isOwnProduct ? 'Tu producto' : 'Agregar'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => handleActionClick(e, handleAddToFavorites)}
              className={isLiked ? 'text-red-500' : 'text-gray-400'}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

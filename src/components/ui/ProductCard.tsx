// ============================================
// MERCADITO ONLINE PY - PRODUCT CARD
// Componente de tarjeta de producto
// ============================================

'use client';

import { useState } from 'react';
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
  const [isLiked, setIsLiked] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

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
  const handleAddToFavorites = () => {
    setIsLiked(!isLiked);
    // Aquí iría la lógica para agregar/quitar de favoritos
  };

  // Manejar agregar al carrito
  const handleAddToCart = async () => {
    setIsAddingToCart(true);
    try {
      // Aquí iría la lógica para agregar al carrito
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simular API call
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
                src={product.cover_url || '/placeholder-product.png'}
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
                  
                  <div className="flex items-center space-x-2 mt-1">
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
                  </div>

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
                        disabled={isAddingToCart}
                      >
                        <ShoppingCart className="w-4 h-4 mr-1" />
                        {isAddingToCart ? 'Agregando...' : 'Agregar'}
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
            src={product.cover_url || '/placeholder-product.png'}
            alt={product.title}
            fill
            className="object-cover rounded-t-md"
          />
          
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col space-y-1">
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
          </div>

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
              disabled={isAddingToCart}
              className="flex-1"
            >
              <ShoppingCart className="w-4 h-4 mr-1" />
              {isAddingToCart ? 'Agregando...' : 'Agregar'}
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

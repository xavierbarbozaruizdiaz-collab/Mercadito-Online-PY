// ============================================
// MERCADITO ONLINE PY - STORE CARD
// Componente de tarjeta de tienda
// ============================================

'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Button, 
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  Avatar
} from '@/components/ui';
import { MapPin, Package, Star, TrendingUp } from 'lucide-react';

// ============================================
// TIPOS
// ============================================

interface Store {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  cover_image_url?: string;
  location?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface StoreCardProps {
  store: Store;
  productCount?: number;
  rating?: number;
  onClick?: () => void;
  variant?: 'default' | 'compact' | 'featured';
  className?: string;
}

// ============================================
// COMPONENTE
// ============================================

export default function StoreCard({
  store,
  productCount = 0,
  rating,
  onClick,
  variant = 'default',
  className = '',
}: StoreCardProps) {
  // Manejar clic en la tarjeta
  const handleCardClick = () => {
    if (onClick) {
      onClick();
    }
  };

  // Manejar clic en botón de acción (evitar propagación)
  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (variant === 'compact') {
    return (
      <Card 
        className={`hover:shadow-md transition-shadow cursor-pointer ${className}`}
        onClick={handleCardClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Avatar
              src={store.logo_url}
              fallback={store.name.charAt(0).toUpperCase()}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">
                {store.name}
              </h3>
              {store.location && (
                <p className="text-sm text-gray-600 truncate">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  {store.location}
                </p>
              )}
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="info" size="sm">
                  <Package className="w-3 h-3 mr-1" />
                  {productCount} productos
                </Badge>
                {rating && (
                  <Badge variant="warning" size="sm">
                    <Star className="w-3 h-3 mr-1" />
                    {rating.toFixed(1)}
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleActionClick}
            >
              Ver
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'featured') {
    return (
      <Card 
        className={`hover:shadow-lg transition-shadow cursor-pointer ${className}`}
        onClick={handleCardClick}
      >
        <CardHeader className="p-0">
          <div className="relative h-48 w-full">
            <Image
              src={store.cover_image_url || '/placeholder-store-cover.png'}
              alt={`${store.name} cover`}
              fill
              className="object-cover rounded-t-lg"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-center space-x-3">
                <Avatar
                  src={store.logo_url}
                  fallback={store.name.charAt(0).toUpperCase()}
                  size="lg"
                  className="border-2 border-white"
                />
                <div className="text-white">
                  <h3 className="font-bold text-xl">{store.name}</h3>
                  {store.location && (
                    <p className="text-sm opacity-90">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      {store.location}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="absolute top-4 right-4">
              <Badge variant="success" size="sm">
                <TrendingUp className="w-3 h-3 mr-1" />
                Destacada
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-4">
          {store.description && (
            <p className="text-gray-600 text-sm line-clamp-2 mb-3">
              {store.description}
            </p>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge variant="info" size="sm">
                <Package className="w-3 h-3 mr-1" />
                {productCount} productos
              </Badge>
              {rating && (
                <Badge variant="warning" size="sm">
                  <Star className="w-3 h-3 mr-1" />
                  {rating.toFixed(1)}
                </Badge>
              )}
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleActionClick}
            >
              Visitar Tienda
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Variante por defecto
  return (
    <Card 
      className={`hover:shadow-md transition-shadow cursor-pointer ${className}`}
      onClick={handleCardClick}
    >
      <CardHeader className="p-0">
        <div className="relative h-32 w-full">
          <Image
            src={store.cover_image_url || '/placeholder-store-cover.png'}
            alt={`${store.name} cover`}
            fill
            className="object-cover rounded-t-lg"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
            <div className="flex items-center space-x-3">
              <Avatar
                src={store.logo_url}
                fallback={store.name.charAt(0).toUpperCase()}
                size="md"
                className="border-2 border-white"
              />
              <div className="text-white">
                <h3 className="font-semibold text-lg">{store.name}</h3>
                {store.location && (
                  <p className="text-sm opacity-90">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    {store.location}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        {store.description && (
          <p className="text-gray-600 text-sm line-clamp-2 mb-3">
            {store.description}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge variant="info" size="sm">
              <Package className="w-3 h-3 mr-1" />
              {productCount} productos
            </Badge>
            {rating && (
              <Badge variant="warning" size="sm">
                <Star className="w-3 h-3 mr-1" />
                {rating.toFixed(1)}
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleActionClick}
          >
            Ver Tienda
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// src/components/WishlistButton.tsx
// Componente para agregar/quitar productos del wishlist

'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useWishlist } from '@/lib/hooks/useWishlist';
import { useAuth } from '@/lib/hooks/useAuth';
import { Button } from './ui/Button';
import { cn } from '@/lib/utils';

interface WishlistButtonProps {
  productId: string;
  variant?: 'icon' | 'button' | 'badge';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

export default function WishlistButton({
  productId,
  variant = 'icon',
  size = 'md',
  className,
  showLabel = false,
}: WishlistButtonProps) {
  const { user } = useAuth();
  const { isInWishlist, toggleWishlist, loading } = useWishlist();
  const [isToggling, setIsToggling] = useState(false);

  const inWishlist = isInWishlist(productId);

  const handleToggle = async () => {
    if (!user) {
      // Redirigir a login o mostrar mensaje
      return;
    }

    setIsToggling(true);
    try {
      await toggleWishlist(productId);
    } catch (error) {
      console.error('Error toggling wishlist:', error);
    } finally {
      setIsToggling(false);
    }
  };

  if (!user) {
    return null;
  }

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleToggle}
        disabled={isToggling || loading}
        className={cn(
          'p-2 rounded-full transition-all hover:bg-gray-100',
          inWishlist && 'bg-red-50 hover:bg-red-100',
          className
        )}
        aria-label={inWishlist ? 'Remover de favoritos' : 'Agregar a favoritos'}
      >
        <Heart
          className={cn(
            sizeClasses[size],
            inWishlist
              ? 'fill-red-500 text-red-500'
              : 'text-gray-400 hover:text-red-500'
          )}
        />
      </button>
    );
  }

  if (variant === 'button') {
    return (
      <Button
        onClick={handleToggle}
        disabled={isToggling || loading}
        variant={inWishlist ? 'destructive' : 'outline'}
        size={size}
        className={className}
      >
        <Heart
          className={cn(
            'mr-2',
            size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6',
            inWishlist && 'fill-current'
          )}
        />
        {showLabel && (inWishlist ? 'En Favoritos' : 'Agregar a Favoritos')}
      </Button>
    );
  }

  // variant === 'badge'
  return (
    <button
      onClick={handleToggle}
      disabled={isToggling || loading}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all',
        inWishlist
          ? 'bg-red-100 text-red-700 hover:bg-red-200'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
        className
      )}
    >
      <Heart
        className={cn(
          'w-3 h-3',
          inWishlist && 'fill-red-500 text-red-500'
        )}
      />
      {inWishlist ? 'Favorito' : 'Agregar'}
    </button>
  );
}


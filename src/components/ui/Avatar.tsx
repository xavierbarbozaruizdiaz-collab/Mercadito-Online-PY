// ============================================
// MERCADITO ONLINE PY - AVATAR
// Componente de avatar
// ============================================

'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';

// ============================================
// TIPOS
// ============================================

interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// ============================================
// COMPONENTE
// ============================================

export default function Avatar({
  src,
  alt,
  fallback,
  size = 'md',
  className = '',
}: AvatarProps) {
  // Clases de tamaño
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-600 font-medium overflow-hidden',
        sizeClasses[size],
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt || 'Avatar'}
          fill
          className="object-cover"
        />
      ) : (
        <span>{fallback}</span>
      )}
    </div>
  );
}

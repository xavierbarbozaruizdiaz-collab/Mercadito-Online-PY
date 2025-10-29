// ============================================
// MERCADITO ONLINE PY - SKELETON
// Componente de skeleton/placeholder
// ============================================

'use client';

import { cn } from '@/lib/utils';

// ============================================
// TIPOS
// ============================================

interface SkeletonProps {
  variant?: 'text' | 'rectangular' | 'circular';
  className?: string;
}

// ============================================
// COMPONENTE
// ============================================

export default function Skeleton({
  variant = 'rectangular',
  className = '',
}: SkeletonProps) {
  // Clases de variante
  const variantClasses = {
    text: 'h-4 w-full',
    rectangular: 'h-32 w-full',
    circular: 'h-10 w-10 rounded-full',
  };

  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200 rounded',
        variantClasses[variant],
        className
      )}
    />
  );
}

// ============================================
// MERCADITO ONLINE PY - SEPARATOR
// Componente de separador
// ============================================

'use client';

import { cn } from '@/lib/utils';

// ============================================
// TIPOS
// ============================================

interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

// ============================================
// COMPONENTE
// ============================================

export default function Separator({ 
  orientation = 'horizontal', 
  className = '' 
}: SeparatorProps) {
  return (
    <div
      className={cn(
        'bg-gray-200',
        orientation === 'horizontal' ? 'h-px w-full' : 'w-px h-full',
        className
      )}
    />
  );
}

// ============================================
// MERCADITO ONLINE PY - BUTTON
// Componente de botón
// ============================================

'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// ============================================
// TIPOS
// ============================================

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

// ============================================
// COMPONENTE
// ============================================

export default function Button({
  className = '',
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  // Clases base
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  // Clases de variante
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
    destructive: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };

  // Clases de tamaño (con mínimos táctiles para móvil)
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm min-h-[36px] sm:min-h-0',
    md: 'px-4 py-2 text-sm min-h-[44px] sm:min-h-0', // 44px mínimo para móvil (WCAG)
    lg: 'px-6 py-3 text-base min-h-[48px] sm:min-h-0',
  };

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      )}
      {children}
    </button>
  );
}

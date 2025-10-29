// ============================================
// MERCADITO ONLINE PY - LOADING SPINNER
// Componente de spinner de carga
// ============================================

'use client';

import { Loader2 } from 'lucide-react';

// ============================================
// TIPOS
// ============================================

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  className?: string;
  variant?: 'default' | 'primary' | 'secondary';
}

// ============================================
// COMPONENTE
// ============================================

export default function LoadingSpinner({
  size = 'md',
  text,
  className = '',
  variant = 'default',
}: LoadingSpinnerProps) {
  // Obtener clases de tamaño
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'md':
        return 'w-6 h-6';
      case 'lg':
        return 'w-8 h-8';
      case 'xl':
        return 'w-12 h-12';
      default:
        return 'w-6 h-6';
    }
  };

  // Obtener clases de color
  const getColorClasses = () => {
    switch (variant) {
      case 'primary':
        return 'text-blue-600';
      case 'secondary':
        return 'text-gray-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <Loader2 
        className={`animate-spin ${getSizeClasses()} ${getColorClasses()}`} 
      />
      {text && (
        <p className={`mt-2 text-sm ${getColorClasses()}`}>
          {text}
        </p>
      )}
    </div>
  );
}

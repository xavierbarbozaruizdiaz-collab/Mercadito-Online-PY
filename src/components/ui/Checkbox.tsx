// ============================================
// MERCADITO ONLINE PY - CHECKBOX
// Componente de checkbox
// ============================================

'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

// ============================================
// TIPOS
// ============================================

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

// ============================================
// COMPONENTE
// ============================================

export default function Checkbox({
  checked,
  onChange,
  label,
  size = 'md',
  disabled = false,
  className = '',
}: CheckboxProps) {
  // Clases de tamaño
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  // Clases de icono
  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <label className={cn('flex items-center space-x-2 cursor-pointer', className)}>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <div
          className={cn(
            'border-2 rounded border-gray-300 flex items-center justify-center transition-colors',
            sizeClasses[size],
            checked && 'bg-blue-600 border-blue-600',
            disabled && 'opacity-50 cursor-not-allowed',
            !disabled && 'hover:border-blue-400'
          )}
        >
          {checked && (
            <Check 
              className={cn(
                'text-white',
                iconSizeClasses[size]
              )} 
            />
          )}
        </div>
      </div>
      {label && (
        <span className={cn(
          'text-sm text-gray-700',
          disabled && 'text-gray-400'
        )}>
          {label}
        </span>
      )}
    </label>
  );
}

// ============================================
// MERCADITO ONLINE PY - EMPTY STATE
// Componente para estados vacíos
// ============================================

import React from 'react';

import { Button } from '@/components/ui';
import { LucideIcon } from 'lucide-react';

// ============================================
// TIPOS
// ============================================

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon | React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
  };
  className?: string;
}

// ============================================
// COMPONENTE
// ============================================

export default function EmptyState({
  title,
  description,
  icon,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      {/* Icono */}
      {icon && (
        <div className="mb-4 text-gray-400">
          {typeof icon === 'function' ? (
            React.createElement(icon, { className: "w-16 h-16" })
          ) : (
            icon
          )}
        </div>
      )}

      {/* Título */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
        {title}
      </h3>

      {/* Descripción */}
      {description && (
        <p className="text-gray-600 text-center mb-6 max-w-md">
          {description}
        </p>
      )}

      {/* Acción */}
      {action && (
        <Button
          variant={action.variant || 'primary'}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

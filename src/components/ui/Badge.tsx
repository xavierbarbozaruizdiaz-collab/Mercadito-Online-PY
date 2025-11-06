// ============================================
// MERCADITO ONLINE PY - BADGE COMPONENT
// Componente reutilizable para badges/etiquetas
// ============================================

import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Badge({ 
  children, 
  variant = 'success', 
  size = 'sm', 
  className = '' 
}: BadgeProps) {
  const variantClasses = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  };
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };
  
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
      {children}
    </span>
  );
}


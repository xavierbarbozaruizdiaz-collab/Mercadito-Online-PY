// ============================================
// MERCADITO ONLINE PY - UI COMPONENTS INDEX
// Exporta todos los componentes UI reutilizables
// ============================================

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

// Componentes externos
export { default as SearchBar } from './SearchBar';
export { default as SearchResults } from './SearchResults';
export { default as SearchSuggestions } from './SearchSuggestions';

// ============================================
// COMPONENTES BASE
// ============================================

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  loading = false,
  children, 
  disabled,
  ...props 
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
    destructive: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={cn(baseClasses, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
      )}
      {children}
    </button>
  );
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated';
}

export function Card({ className, variant = 'default', children, ...props }: CardProps) {
  const variants = {
    default: 'bg-white rounded-lg shadow-sm border',
    outlined: 'bg-white rounded-lg border border-gray-200',
    elevated: 'bg-white rounded-lg shadow-lg',
  };

  return (
    <div className={cn(variants[variant], className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-6 pb-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-lg font-semibold text-gray-900', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-6 pt-0', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-6 pt-4 border-t', className)} {...props}>
      {children}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({ className, label, error, helperText, ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        className={cn(
          'w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          error && 'border-red-300 focus:ring-red-500 focus:border-red-500',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string; disabled?: boolean }[];
}

export function Select({ className, label, error, options, ...props }: SelectProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <select
        className={cn(
          'w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          error && 'border-red-300 focus:ring-red-500 focus:border-red-500',
          className
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
}

export function Badge({ className, variant = 'default', size = 'md', children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  };
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Avatar({ className, src, alt, fallback, size = 'md', ...props }: AvatarProps) {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-600 font-medium overflow-hidden',
        sizes[size],
        className
      )}
      {...props}
    >
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <span>{fallback}</span>
      )}
    </div>
  );
}

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rectangular' | 'circular';
}

export function Skeleton({ className, variant = 'rectangular', ...props }: SkeletonProps) {
  const variants = {
    text: 'h-4 w-full',
    rectangular: 'h-32 w-full',
    circular: 'h-10 w-10 rounded-full',
  };

  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200 rounded',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

// ============================================
// COMPONENTES ESPECÍFICOS DEL MARKETPLACE
// ============================================

interface ProductCardProps {
  product: {
    id: string;
    title: string;
    price: number;
    compare_price?: number;
    condition: string;
    sale_type: string;
    cover_url?: string;
    store: {
      name: string;
      slug: string;
    };
    created_at: string;
  };
  onClick?: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const conditionLabels = {
    new: 'Nuevo',
    like_new: 'Como nuevo',
    used: 'Usado',
    refurbished: 'Reacondicionado',
  };

  const saleTypeLabels = {
    fixed: 'Precio fijo',
    auction: 'Subasta',
    negotiable: 'Negociable',
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="aspect-square relative overflow-hidden rounded-t-lg">
        <img
          src={product.cover_url || 'https://placehold.co/400x400?text=Producto'}
          alt={product.title}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
        />
        <div className="absolute top-2 left-2">
          <Badge variant="info" size="sm">
            {conditionLabels[product.condition as keyof typeof conditionLabels]}
          </Badge>
        </div>
        <div className="absolute top-2 right-2">
          <Badge variant="warning" size="sm">
            {saleTypeLabels[product.sale_type as keyof typeof saleTypeLabels]}
          </Badge>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">
          {product.title}
        </h3>
        
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold text-gray-900">
              Gs. {product.price.toLocaleString('es-PY')}
            </span>
            {product.compare_price && (
              <span className="text-sm text-gray-500 line-through">
                Gs. {product.compare_price.toLocaleString('es-PY')}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{product.store.name}</span>
          <span>{new Date(product.created_at).toLocaleDateString('es-PY')}</span>
        </div>
      </div>
    </Card>
  );
}

interface StoreCardProps {
  store: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    logo_url?: string;
    cover_image_url?: string;
    location?: string;
    is_active: boolean;
  };
  productCount?: number;
  onClick?: () => void;
}

export function StoreCard({ store, productCount, onClick }: StoreCardProps) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="relative h-32 overflow-hidden rounded-t-lg">
        <img
          src={store.cover_image_url || 'https://placehold.co/600x200?text=Tienda'}
          alt={store.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
          <div className="flex items-center space-x-3">
            <Avatar
              src={store.logo_url}
              fallback={store.name.charAt(0).toUpperCase()}
              size="lg"
              className="border-2 border-white"
            />
            <div className="text-white">
              <h3 className="font-semibold text-lg">{store.name}</h3>
              {store.location && (
                <p className="text-sm opacity-90">{store.location}</p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        {store.description && (
          <p className="text-gray-600 text-sm line-clamp-2 mb-3">
            {store.description}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <Badge variant="success" size="sm">
            {productCount || 0} productos
          </Badge>
          <Button variant="outline" size="sm">
            Ver Tienda
          </Button>
        </div>
      </div>
    </Card>
  );
}

interface SearchFiltersProps {
  filters: {
    query?: string;
    category_id?: string;
    min_price?: number;
    max_price?: number;
    condition?: string;
    sale_type?: string;
    location?: string;
  };
  categories: { id: string; name: string }[];
  onFiltersChange: (filters: any) => void;
  onSearch: () => void;
}

export function SearchFilters({ filters, categories, onFiltersChange, onSearch }: SearchFiltersProps) {
  const conditions = [
    { value: 'new', label: 'Nuevo' },
    { value: 'like_new', label: 'Como nuevo' },
    { value: 'used', label: 'Usado' },
    { value: 'refurbished', label: 'Reacondicionado' },
  ];

  const saleTypes = [
    { value: 'fixed', label: 'Precio fijo' },
    { value: 'auction', label: 'Subasta' },
    { value: 'negotiable', label: 'Negociable' },
  ];

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Buscar productos"
            placeholder="Ej: iPhone, laptop, zapatos..."
            value={filters.query || ''}
            onChange={(e) => onFiltersChange({ ...filters, query: e.target.value })}
          />
          
          <Select
            label="Categoría"
            value={filters.category_id || ''}
            onChange={(e) => onFiltersChange({ ...filters, category_id: e.target.value })}
            options={[
              { value: '', label: 'Todas las categorías' },
              ...categories.map(cat => ({ value: cat.id, label: cat.name }))
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Precio mínimo"
            type="number"
            placeholder="0"
            value={filters.min_price || ''}
            onChange={(e) => onFiltersChange({ ...filters, min_price: Number(e.target.value) || undefined })}
          />
          
          <Input
            label="Precio máximo"
            type="number"
            placeholder="1000000"
            value={filters.max_price || ''}
            onChange={(e) => onFiltersChange({ ...filters, max_price: Number(e.target.value) || undefined })}
          />
          
          <Input
            label="Ubicación"
            placeholder="Ciudad, departamento"
            value={filters.location || ''}
            onChange={(e) => onFiltersChange({ ...filters, location: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Condición"
            value={filters.condition || ''}
            onChange={(e) => onFiltersChange({ ...filters, condition: e.target.value })}
            options={[
              { value: '', label: 'Todas las condiciones' },
              ...conditions.map(cond => ({ value: cond.value, label: cond.label }))
            ]}
          />
          
          <Select
            label="Tipo de venta"
            value={filters.sale_type || ''}
            onChange={(e) => onFiltersChange({ ...filters, sale_type: e.target.value })}
            options={[
              { value: '', label: 'Todos los tipos' },
              ...saleTypes.map(type => ({ value: type.value, label: type.label }))
            ]}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={onSearch} className="w-full md:w-auto">
            Buscar Productos
          </Button>
        </div>
      </div>
    </Card>
  );
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Anterior
      </Button>
      
      {getVisiblePages().map((page, index) => (
        <React.Fragment key={index}>
          {page === '...' ? (
            <span className="px-3 py-2 text-gray-500">...</span>
          ) : (
            <Button
              variant={currentPage === page ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onPageChange(page as number)}
            >
              {page}
            </Button>
          )}
        </React.Fragment>
      ))}
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Siguiente
      </Button>
    </div>
  );
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizes[size]}`} />
      {text && <p className="text-sm text-gray-600">{text}</p>}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      {icon && (
        <div className="mx-auto w-16 h-16 text-gray-300 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6">{description}</p>
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}


// ============================================
// MERCADITO ONLINE PY - ALERT
// Componente de alerta/notificación
// ============================================

'use client';

import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'destructive';
  children: React.ReactNode;
}

export function Alert({ variant = 'default', className, children, ...props }: AlertProps) {
  const variants = {
    default: 'bg-blue-50 text-blue-800 border-blue-200',
    success: 'bg-green-50 text-green-800 border-green-200',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
    destructive: 'bg-red-50 text-red-800 border-red-200', // Alias de error
  };

  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    default: Info,
    success: CheckCircle,
    warning: AlertCircle,
    error: XCircle,
    info: Info,
    destructive: XCircle, // Mismo icono que error
  };

  // Asegurar que Icon siempre esté definido
  const Icon = icons[variant] || Info;

  return (
    <div
      className={cn(
        'rounded-lg border p-4 flex items-start gap-3',
        variants[variant],
        className
      )}
      {...props}
    >
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">{children}</div>
    </div>
  );
}

interface AlertDescriptionProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function AlertDescription({ className, children, ...props }: AlertDescriptionProps) {
  return (
    <div
      className={cn('text-sm', className)}
      {...props}
    >
      {children}
    </div>
  );
}


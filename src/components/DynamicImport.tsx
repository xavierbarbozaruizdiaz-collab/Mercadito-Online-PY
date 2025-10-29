// src/components/DynamicImport.tsx
// Componente para carga dinámica de módulos con code splitting

'use client';

import { ComponentType, lazy, Suspense, ReactNode } from 'react';
import LoadingSpinner from './ui/LoadingSpinner';

interface DynamicImportProps {
  component: () => Promise<{ default: ComponentType<any> }>;
  fallback?: ReactNode;
  ssr?: boolean;
}

/**
 * Componente para cargar componentes dinámicamente con code splitting
 */
export default function DynamicImport({
  component,
  fallback,
  ssr = false,
}: DynamicImportProps) {
  const LazyComponent = lazy(component);

  return (
    <Suspense
      fallback={
        fallback || (
          <div className="flex justify-center items-center p-8">
            <LoadingSpinner />
          </div>
        )
      }
    >
      <LazyComponent />
    </Suspense>
  );
}

/**
 * Helper para crear imports dinámicos tipados
 */
export function createDynamicImport<T = any>(
  importFn: () => Promise<{ default: ComponentType<T> }>
): ComponentType<T> {
  return lazy(importFn) as any;
}


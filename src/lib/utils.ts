import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Función helper para combinar clases de Tailwind
 * Combina clsx y tailwind-merge para manejar conflictos de clases
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-exportar todas las utilidades desde utils/index.ts
export * from './utils/index';

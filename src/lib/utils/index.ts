/* eslint-disable no-useless-escape */
// ============================================
// MERCADITO ONLINE PY - UTILIDADES
// Funciones de utilidad para el e-commerce
// ============================================

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ============================================
// UTILIDADES DE CLASES CSS
// ============================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================
// FORMATEO DE DATOS
// ============================================

export function formatCurrency(amount: number, currency: string = 'PYG'): string {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(number: number): string {
  return new Intl.NumberFormat('es-PY').format(number);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-PY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('es-PY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const targetDate = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000);

  if (diffInSeconds < 60) return 'hace un momento';
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `hace ${hours} hora${hours > 1 ? 's' : ''}`;
  }
  if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `hace ${days} día${days > 1 ? 's' : ''}`;
  }
  return formatDate(date);
}

// ============================================
// VALIDACIONES
// ============================================

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[+]?[\d\s()-]{10,}$/;
  return phoneRegex.test(phone);
}

/**
 * Formatea un número de teléfono de Paraguay para usar en enlaces de WhatsApp.
 * Convierte números locales (098...) a formato internacional (59598...).
 *
 * @param phone - Número de teléfono en cualquier formato (0981234567, +595981234567, etc.)
 * @returns URL completa de WhatsApp (https://wa.me/595981234567) o null si es inválido
 *
 * @example
 * formatPhoneForWhatsApp('0981988714') // 'https://wa.me/595981988714'
 * formatPhoneForWhatsApp('+595981988714') // 'https://wa.me/595981988714'
 * formatPhoneForWhatsApp('595981988714') // 'https://wa.me/595981988714'
 */
export function formatPhoneForWhatsApp(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const digits = raw.replace(/\D+/g, '');

  // Ya incluye prefijo país
  if (digits.startsWith('595')) {
    const local = digits.slice(3);
    if (local.length < 9) return null;
    return `https://wa.me/${digits}`;
  }

  // Número local con cero inicial
  if (digits.startsWith('0')) {
    const local = digits.slice(1);
    if (local.length < 9) return null;
    return `https://wa.me/595${local}`;
  }

  // Número local sin cero inicial
  if (digits.length >= 9) {
    return `https://wa.me/595${digits}`;
  }

  return null;
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}

// ============================================
// MANIPULACIÓN DE STRINGS
// ============================================

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export function capitalizeWords(text: string): string {
  return text.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

// ============================================
// MANIPULACIÓN DE ARCHIVOS
// ============================================

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function isImageFile(filename: string): boolean {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  return imageExtensions.includes(getFileExtension(filename));
}

// ============================================
// MANIPULACIÓN DE ARRAYS
// ============================================

export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const group = String(item[key]);
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

export function sortBy<T>(array: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

export function uniqueBy<T>(array: T[], key: keyof T): T[] {
  const seen = new Set();
  return array.filter((item) => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

// ============================================
// MANIPULACIÓN DE OBJETOS
// ============================================

export function omit<T extends Record<string, any>, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result;
}

export function pick<T extends Record<string, any>, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (source[key] !== undefined) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        result[key] = deepMerge((result[key] || {}) as any, source[key] as any);
      } else {
        result[key] = source[key] as any;
      }
    }
  }

  return result;
}

// ============================================
// GENERADORES DE ID
// ============================================

export function generateId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${year}${month}${day}-${random}`;
}

// ============================================
// CONSTANTES
// ============================================

export const CONSTANTS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  PAGINATION_LIMIT: 20,
  SEARCH_DEBOUNCE_MS: 300,
  CACHE_DURATION_MS: 5 * 60 * 1000, // 5 minutes
} as const;

export const ROUTES = {
  HOME: '/',
  AUTH: {
    SIGN_IN: '/auth/sign-in',
    SIGN_UP: '/auth/sign-up',
    FORGOT_PASSWORD: '/auth/forgot-password',
  },
  DASHBOARD: {
    SELLER: '/dashboard/seller',
    BUYER: '/dashboard/buyer',
    ADMIN: '/dashboard/admin',
  },
  MARKETPLACE: {
    STORE: '/store',
    PRODUCT: '/product',
    AUCTION: '/auction',
    SEARCH: '/search',
  },
  API: {
    AUTH: '/api/auth',
    PRODUCTS: '/api/products',
    AUCTIONS: '/api/auctions',
    PAYMENTS: '/api/payments',
    SHIPPING: '/api/shipping',
    WEBHOOKS: '/api/webhooks',
  },
} as const;

export const STATUS_COLORS = {
  active: 'green',
  pending: 'yellow',
  completed: 'blue',
  cancelled: 'red',
  failed: 'red',
  paused: 'orange',
  archived: 'gray',
} as const;

export const STATUS_LABELS = {
  active: 'Activo',
  pending: 'Pendiente',
  completed: 'Completado',
  cancelled: 'Cancelado',
  failed: 'Fallido',
  paused: 'Pausado',
  archived: 'Archivado',
} as const;

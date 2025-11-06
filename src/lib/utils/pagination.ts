// ============================================
// MERCADITO ONLINE PY - PAGINATION UTILITIES
// Utilidades para manejar paginación de forma segura y escalable
// ============================================

/**
 * Máximo de items permitidos por página (hard limit)
 */
export const MAX_PAGE_SIZE = 60;

/**
 * Default de items por página
 */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Valida y normaliza el límite de paginación
 * @param requestedLimit - Límite solicitado
 * @param maxLimit - Límite máximo (default: 60)
 * @returns Límite validado
 */
export function validatePageLimit(
  requestedLimit?: number | null,
  maxLimit: number = MAX_PAGE_SIZE
): number {
  // Si no se especifica, usar default
  if (!requestedLimit || requestedLimit <= 0) {
    return DEFAULT_PAGE_SIZE;
  }

  // Si es mayor al máximo, usar el máximo
  if (requestedLimit > maxLimit) {
    console.warn(
      `⚠️ Límite de paginación ${requestedLimit} excede el máximo permitido (${maxLimit}). Usando ${maxLimit}.`
    );
    return maxLimit;
  }

  return requestedLimit;
}

/**
 * Valida y normaliza el número de página
 * @param requestedPage - Página solicitada
 * @returns Página validada (mínimo 1)
 */
export function validatePageNumber(requestedPage?: number | null): number {
  if (!requestedPage || requestedPage < 1) {
    return 1;
  }
  return requestedPage;
}

/**
 * Calcula el offset para paginación
 * @param page - Número de página
 * @param limit - Límite de items por página
 * @returns Offset calculado
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Interfaz para opciones de paginación
 */
export interface PaginationOptions {
  page?: number | null;
  limit?: number | null;
  maxLimit?: number;
}

/**
 * Normaliza opciones de paginación
 * @param options - Opciones de paginación
 * @returns Opciones normalizadas con valores válidos
 */
export function normalizePagination(options?: PaginationOptions): {
  page: number;
  limit: number;
  offset: number;
} {
  const page = validatePageNumber(options?.page);
  const limit = validatePageLimit(options?.limit, options?.maxLimit);
  const offset = calculateOffset(page, limit);

  return { page, limit, offset };
}

/**
 * Interfaz para respuesta de paginación
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

/**
 * Crea metadata de paginación
 * @param page - Página actual
 * @param limit - Límite de items
 * @param total - Total de items
 * @returns Metadata de paginación
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const total_pages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    total_pages,
    has_next: page < total_pages,
    has_prev: page > 1,
  };
}



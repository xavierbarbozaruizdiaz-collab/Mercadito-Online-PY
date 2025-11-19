// ============================================
// MERCADITO ONLINE PY - SITE CONFIGURATION
// Configuración centralizada de URL del sitio
// ============================================

/**
 * URL base del sitio web
 * 
 * Reglas:
 * - En producción: usa https://mercaditonlinepy.com
 * - En otros entornos: usa NEXT_PUBLIC_SITE_URL si existe, sino fallback a localhost
 * 
 * IMPORTANTE: Para sitemap y SEO, siempre debe apuntar al dominio real de producción.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === "production"
    ? "https://mercaditonlinepy.com"
    : "http://localhost:3000");


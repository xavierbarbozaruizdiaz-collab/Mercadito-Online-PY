// ============================================
// MERCADITO ONLINE PY - SITE CONFIGURATION
// Configuración centralizada de URL del sitio
// ============================================

const PRODUCTION_APP_URL = "https://mercadito-online-py-swart.vercel.app";

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * URL pública del sitio.
 * Prioridad: NEXT_PUBLIC_SITE_URL → NEXT_PUBLIC_APP_URL → URL de producción o localhost.
 */
export const SITE_URL = normalizeUrl(
  process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === "production"
      ? PRODUCTION_APP_URL
      : "http://localhost:3000")
);

/** Alias para emails, OAuth y links de catálogo. */
export function getPublicAppUrl(): string {
  return SITE_URL;
}

-- ============================================
-- [IMAGES LEVEL2] Agregar soporte para thumbnails en products
-- Optimización de imágenes para reducir tráfico y mejorar performance
-- ============================================

-- Agregar columna thumbnail_url a products para acceso rápido a thumbnails
-- Si no existe thumbnail_url, se usa cover_url como fallback (backward compatible)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Índice para búsquedas rápidas por thumbnail_url
CREATE INDEX IF NOT EXISTS idx_products_thumbnail_url 
ON public.products(thumbnail_url) 
WHERE thumbnail_url IS NOT NULL;

-- Comentario para documentación
COMMENT ON COLUMN public.products.thumbnail_url IS '[IMAGES LEVEL2] URL del thumbnail optimizado para listados. Si es NULL, usar cover_url como fallback.';









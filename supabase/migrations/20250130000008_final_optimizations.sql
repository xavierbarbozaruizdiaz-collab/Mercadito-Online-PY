-- ============================================
-- MERCADITO ONLINE PY - OPTIMIZACIONES FINALES
-- Mejoras adicionales para escalabilidad
-- ============================================

-- ============================================
-- 1. AGREGAR COLUMNA thumbnail_url A product_images
-- ============================================

ALTER TABLE public.product_images
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Índice para búsquedas por thumbnail_url
CREATE INDEX IF NOT EXISTS idx_product_images_thumbnail_url 
ON public.product_images(thumbnail_url) 
WHERE thumbnail_url IS NOT NULL;

-- ============================================
-- 2. FUNCIÓN PARA OBTENER COLUMNAS MÍNIMAS (OPTIMIZACIÓN)
-- ============================================

-- Función helper para listados optimizados de productos
CREATE OR REPLACE FUNCTION public.get_products_list(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_category_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT 'active'
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  price DECIMAL(10,2),
  cover_url TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ,
  sale_type TEXT,
  condition TEXT,
  store_id UUID,
  seller_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.price,
    p.cover_url,
    COALESCE(
      (SELECT thumbnail_url FROM public.product_images 
       WHERE product_id = p.id AND is_cover = true 
       LIMIT 1),
      p.cover_url
    ) as thumbnail_url,
    p.created_at,
    p.sale_type,
    p.condition,
    p.store_id,
    p.seller_id
  FROM public.products p
  WHERE 
    (p_category_id IS NULL OR p.category_id = p_category_id)
    AND (p.status = p_status OR p_status IS NULL)
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 3. MEJORAS ADICIONALES EN ÍNDICES
-- ============================================

-- Índice para búsquedas por status y created_at (muy común)
CREATE INDEX IF NOT EXISTS idx_products_status_created 
ON public.products(status, created_at DESC) 
WHERE status IN ('active', 'paused');

-- Índice para productos por tienda y status
CREATE INDEX IF NOT EXISTS idx_products_store_status 
ON public.products(store_id, status) 
WHERE store_id IS NOT NULL AND status = 'active';

-- ============================================
-- 4. COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================

COMMENT ON COLUMN public.product_images.thumbnail_url IS 'URL del thumbnail optimizado de la imagen';
COMMENT ON FUNCTION public.get_products_list IS 'Función optimizada para obtener listados de productos con solo las columnas necesarias';



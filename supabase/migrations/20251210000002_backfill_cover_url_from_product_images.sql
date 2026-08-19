-- ============================================
-- BACKFILL: Actualizar cover_url de productos antiguos desde product_images
-- ============================================
-- Problema: Productos creados antes de la optimización tienen cover_url = NULL
-- Solución: Actualizar cover_url desde la primera imagen en product_images

UPDATE public.products p
SET 
  cover_url = COALESCE(
    -- Prioridad 1: Imagen marcada como cover
    (SELECT url FROM public.product_images 
     WHERE product_id = p.id AND is_cover = true 
     ORDER BY sort_order ASC, created_at ASC 
     LIMIT 1),
    -- Prioridad 2: Primera imagen por sort_order
    (SELECT url FROM public.product_images 
     WHERE product_id = p.id 
     ORDER BY sort_order ASC, created_at ASC 
     LIMIT 1),
    -- Prioridad 3: Cualquier imagen del producto
    (SELECT url FROM public.product_images 
     WHERE product_id = p.id 
     LIMIT 1)
  ),
  thumbnail_url = COALESCE(
    -- Prioridad 1: Thumbnail de imagen cover
    (SELECT thumbnail_url FROM public.product_images 
     WHERE product_id = p.id AND is_cover = true 
     ORDER BY sort_order ASC, created_at ASC 
     LIMIT 1),
    -- Prioridad 2: Thumbnail de primera imagen
    (SELECT thumbnail_url FROM public.product_images 
     WHERE product_id = p.id 
     ORDER BY sort_order ASC, created_at ASC 
     LIMIT 1),
    -- Prioridad 3: Cualquier thumbnail
    (SELECT thumbnail_url FROM public.product_images 
     WHERE product_id = p.id 
     LIMIT 1)
  )
WHERE 
  -- Solo actualizar productos que NO tienen cover_url
  (p.cover_url IS NULL OR p.cover_url = '')
  -- Y que SÍ tienen imágenes en product_images
  AND EXISTS (
    SELECT 1 FROM public.product_images 
    WHERE product_id = p.id AND url IS NOT NULL
  );

-- Log de resultados
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Productos actualizados con cover_url: %', updated_count;
END $$;





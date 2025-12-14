-- ============================================
-- DIAGNÓSTICO: Verificar estado de cover_url y product_images
-- ============================================

-- 1. Productos sin cover_url
SELECT 
  COUNT(*) as productos_sin_cover_url,
  COUNT(DISTINCT p.id) as productos_unicos
FROM public.products p
WHERE (p.cover_url IS NULL OR p.cover_url = '');

-- 2. Productos sin cover_url PERO con imágenes en product_images
SELECT 
  p.id,
  p.title,
  p.cover_url,
  COUNT(pi.id) as total_imagenes,
  COUNT(CASE WHEN pi.is_cover = true THEN 1 END) as imagenes_cover,
  STRING_AGG(pi.url, ', ') as urls_imagenes
FROM public.products p
LEFT JOIN public.product_images pi ON pi.product_id = p.id
WHERE (p.cover_url IS NULL OR p.cover_url = '')
GROUP BY p.id, p.title, p.cover_url
HAVING COUNT(pi.id) > 0
LIMIT 10;

-- 3. Verificar estructura de product_images
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'product_images' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Verificar si hay productos con imágenes pero sin cover_url (muestra primeros 5)
SELECT 
  p.id,
  p.title,
  p.cover_url,
  pi.url as primera_imagen_url,
  pi.thumbnail_url as primera_imagen_thumbnail,
  pi.is_cover,
  pi.sort_order
FROM public.products p
INNER JOIN public.product_images pi ON pi.product_id = p.id
WHERE (p.cover_url IS NULL OR p.cover_url = '')
ORDER BY pi.is_cover DESC, pi.sort_order ASC, pi.created_at ASC
LIMIT 5;





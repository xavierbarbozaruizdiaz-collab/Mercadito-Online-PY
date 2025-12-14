-- ============================================
-- Función para insertar product_images bypassing RLS
-- ============================================
-- Esta función usa SECURITY DEFINER para bypassear RLS
-- y permite insertar imágenes desde el backend con service_role

CREATE OR REPLACE FUNCTION public.insert_product_image(
  p_product_id UUID,
  p_url TEXT,
  p_thumbnail_url TEXT,
  p_alt_text TEXT DEFAULT '',
  p_sort_order INTEGER DEFAULT 0,
  p_is_cover BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  product_id UUID,
  url TEXT,
  thumbnail_url TEXT,
  alt_text TEXT,
  sort_order INTEGER,
  is_cover BOOLEAN,
  created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER -- CRÍTICO: Esto bypassea RLS
SET search_path = public
AS $$
DECLARE
  v_result RECORD;
BEGIN
  -- [LPMS FIX] Insertar la imagen (RLS está deshabilitado por SECURITY DEFINER)
  -- El trigger limit_product_images también se ejecutará pero con permisos de SECURITY DEFINER
  INSERT INTO public.product_images (
    product_id,
    url,
    thumbnail_url,
    alt_text,
    sort_order,
    is_cover
  )
  VALUES (
    p_product_id,
    p_url,
    p_thumbnail_url,
    COALESCE(p_alt_text, ''),
    COALESCE(p_sort_order, 0),
    COALESCE(p_is_cover, FALSE)
  )
  RETURNING 
    product_images.id,
    product_images.product_id,
    product_images.url,
    product_images.thumbnail_url,
    product_images.alt_text,
    product_images.sort_order,
    product_images.is_cover,
    product_images.created_at
  INTO v_result;

  -- Retornar el registro insertado directamente
  RETURN QUERY SELECT 
    v_result.id,
    v_result.product_id,
    v_result.url,
    v_result.thumbnail_url,
    v_result.alt_text,
    v_result.sort_order,
    v_result.is_cover,
    v_result.created_at;
END;
$$;

-- Comentario
COMMENT ON FUNCTION public.insert_product_image IS 
  'Inserta una imagen de producto bypassing RLS. Usar desde backend con service_role.';


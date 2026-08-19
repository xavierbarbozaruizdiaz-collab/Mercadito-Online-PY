-- ============================================
-- [LPMS CRÍTICO] Verificar esquema y arreglar trigger
-- ============================================

-- 1. Verificar tipos de datos de product_id
DO $$
DECLARE
    v_products_id_type TEXT;
    v_product_images_product_id_type TEXT;
BEGIN
    SELECT data_type INTO v_products_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'products'
    AND column_name = 'id';
    
    SELECT data_type INTO v_product_images_product_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'product_images'
    AND column_name = 'product_id';
    
    RAISE NOTICE 'products.id type: %', v_products_id_type;
    RAISE NOTICE 'product_images.product_id type: %', v_product_images_product_id_type;
    
    IF v_products_id_type != v_product_images_product_id_type THEN
        RAISE EXCEPTION 'CONFLICTO DE TIPOS: products.id es % pero product_images.product_id es %', 
            v_products_id_type, v_product_images_product_id_type;
    END IF;
END $$;

-- 2. Hacer el trigger SECURITY DEFINER para que bypasse RLS
CREATE OR REPLACE FUNCTION public.check_max_images_per_product()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Contar imágenes actuales del producto (con SECURITY DEFINER, esto bypassea RLS)
  SELECT COUNT(*) INTO current_count
  FROM public.product_images
  WHERE product_id = NEW.product_id;

  -- Si ya hay 10 o más imágenes, lanzar error
  IF current_count >= 10 THEN
    RAISE EXCEPTION 'Un producto no puede tener más de 10 imágenes (actual: %)', current_count;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- CRÍTICO: Esto bypassea RLS

-- 3. Verificar que el trigger existe y está configurado
DO $$
DECLARE
    v_trigger_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'limit_product_images'
        AND tgrelid = 'public.product_images'::regclass
    ) INTO v_trigger_exists;
    
    IF v_trigger_exists THEN
        RAISE NOTICE 'Trigger limit_product_images existe';
    ELSE
        RAISE NOTICE 'Trigger limit_product_images NO existe';
    END IF;
END $$;







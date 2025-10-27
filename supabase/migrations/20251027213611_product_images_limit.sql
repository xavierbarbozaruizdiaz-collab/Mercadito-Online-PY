-- ============================================
-- Trigger para limitar a 10 imágenes por producto
-- ============================================

-- Función que valida que no haya más de 10 imágenes por producto
CREATE OR REPLACE FUNCTION public.check_max_images_per_product()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Contar imágenes actuales del producto
  SELECT COUNT(*) INTO current_count
  FROM public.product_images
  WHERE product_id = NEW.product_id;

  -- Si ya hay 10 o más imágenes, lanzar error
  IF current_count >= 10 THEN
    RAISE EXCEPTION 'Un producto no puede tener más de 10 imágenes (actual: %)', current_count;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger que se ejecuta antes de INSERT
DROP TRIGGER IF EXISTS limit_product_images ON public.product_images;
CREATE TRIGGER limit_product_images
  BEFORE INSERT ON public.product_images
  FOR EACH ROW
  EXECUTE FUNCTION public.check_max_images_per_product();

-- Comentario
COMMENT ON FUNCTION public.check_max_images_per_product() IS 
  'Valida que un producto no exceda el límite de 10 imágenes';


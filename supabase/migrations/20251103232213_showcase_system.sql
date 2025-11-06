-- ============================================
-- MERCADITO ONLINE PY - SISTEMA DE VITRINA DE OFERTAS
-- Permite a las tiendas destacar máximo 2 productos en la vitrina
-- ============================================

-- ============================================
-- 1. AGREGAR CAMPOS A PRODUCTS
-- ============================================

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS in_showcase BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS showcase_position INTEGER CHECK (showcase_position IN (1, 2));

-- Comentarios
COMMENT ON COLUMN public.products.in_showcase IS 'Indica si el producto está en la vitrina de ofertas';
COMMENT ON COLUMN public.products.showcase_position IS 'Posición en la vitrina (1 o 2). Solo válido si in_showcase = true';

-- ============================================
-- 2. CREAR ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_products_in_showcase ON public.products(in_showcase) WHERE in_showcase = true;
CREATE INDEX IF NOT EXISTS idx_products_showcase_store ON public.products(store_id, in_showcase) WHERE in_showcase = true;

-- ============================================
-- 3. FUNCIÓN PARA VALIDAR MÁXIMO 2 PRODUCTOS POR TIENDA
-- ============================================

CREATE OR REPLACE FUNCTION public.validate_showcase_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  product_store_id UUID;
BEGIN
  -- Si se está desactivando de la vitrina, no validar
  IF (TG_OP = 'UPDATE' AND OLD.in_showcase = true AND NEW.in_showcase = false) THEN
    -- Limpiar posición al quitar de vitrina
    NEW.showcase_position = NULL;
    RETURN NEW;
  END IF;

  -- Si no se está agregando a la vitrina, no validar
  IF (TG_OP = 'INSERT' AND (NEW.in_showcase IS NULL OR NEW.in_showcase = false)) THEN
    RETURN NEW;
  END IF;

  IF (TG_OP = 'UPDATE' AND (NEW.in_showcase IS NULL OR NEW.in_showcase = false)) THEN
    -- Si se desactiva, limpiar posición
    NEW.showcase_position = NULL;
    RETURN NEW;
  END IF;

  -- Obtener store_id del producto
  IF NEW.store_id IS NULL THEN
    -- Si no tiene store_id, obtenerlo del seller_id
    SELECT s.id INTO product_store_id
    FROM public.stores s
    WHERE s.seller_id = NEW.seller_id
    LIMIT 1;
  ELSE
    product_store_id := NEW.store_id;
  END IF;

  -- Si no tiene tienda asociada, no permitir agregar a vitrina
  IF product_store_id IS NULL THEN
    RAISE EXCEPTION 'El producto debe estar asociado a una tienda para estar en la vitrina';
  END IF;

  -- Contar productos actuales en vitrina de esta tienda (excluyendo el actual si es UPDATE)
  SELECT COUNT(*) INTO current_count
  FROM public.products
  WHERE store_id = product_store_id
    AND in_showcase = true
    AND status = 'active'
    AND (TG_OP = 'INSERT' OR id != NEW.id);

  -- Si ya hay 2 productos en vitrina, no permitir agregar más
  IF current_count >= 2 THEN
    RAISE EXCEPTION 'Cada tienda puede tener máximo 2 productos en la vitrina de ofertas. Actualmente tienes % productos destacados.', current_count;
  END IF;

  -- Si se está agregando sin posición, asignar automáticamente
  IF NEW.in_showcase = true AND NEW.showcase_position IS NULL THEN
    NEW.showcase_position := current_count + 1;
  END IF;

  -- Validar que la posición sea válida (1 o 2)
  IF NEW.showcase_position IS NOT NULL AND NEW.showcase_position NOT IN (1, 2) THEN
    RAISE EXCEPTION 'La posición en la vitrina debe ser 1 o 2';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. CREAR TRIGGER
-- ============================================

DROP TRIGGER IF EXISTS validate_showcase_limit_trigger ON public.products;
CREATE TRIGGER validate_showcase_limit_trigger
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_showcase_limit();

-- ============================================
-- 5. FUNCIÓN PARA REMOVER AUTOMÁTICAMENTE SI SE DESACTIVA PRODUCTO
-- ============================================

CREATE OR REPLACE FUNCTION public.remove_from_showcase_on_deactivate()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el producto se desactiva, pausa o se marca como vendido, remover de vitrina
  IF (NEW.status != 'active' AND OLD.in_showcase = true) THEN
    NEW.in_showcase = false;
    NEW.showcase_position = NULL;
  END IF;

  -- Si el producto se elimina o se marca como vendido, remover de vitrina
  IF (NEW.status IN ('archived', 'sold') AND OLD.in_showcase = true) THEN
    NEW.in_showcase = false;
    NEW.showcase_position = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para remover de vitrina cuando se desactiva
DROP TRIGGER IF EXISTS remove_from_showcase_on_deactivate_trigger ON public.products;
CREATE TRIGGER remove_from_showcase_on_deactivate_trigger
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  WHEN (OLD.status = 'active' AND NEW.status != 'active')
  EXECUTE FUNCTION public.remove_from_showcase_on_deactivate();

-- ============================================
-- 6. FUNCIÓN PARA REORDENAR POSICIONES AL QUITAR UN PRODUCTO
-- ============================================

CREATE OR REPLACE FUNCTION public.reorder_showcase_positions()
RETURNS TRIGGER AS $$
DECLARE
  product_store_id UUID;
BEGIN
  -- Si se quita de la vitrina, reordenar posiciones de otros productos
  IF (TG_OP = 'UPDATE' AND OLD.in_showcase = true AND NEW.in_showcase = false) THEN
    -- Obtener store_id
    IF OLD.store_id IS NULL THEN
      SELECT s.id INTO product_store_id
      FROM public.stores s
      WHERE s.seller_id = OLD.seller_id
      LIMIT 1;
    ELSE
      product_store_id := OLD.store_id;
    END IF;

    -- Reordenar: si había posición 2 y se quita, la posición 1 se mantiene
    -- Si había posición 1 y se quita, la posición 2 pasa a ser 1
    UPDATE public.products
    SET showcase_position = CASE 
      WHEN showcase_position = 2 AND OLD.showcase_position = 1 THEN 1
      WHEN showcase_position > OLD.showcase_position THEN showcase_position - 1
      ELSE showcase_position
    END
    WHERE store_id = product_store_id
      AND in_showcase = true
      AND id != NEW.id
      AND status = 'active';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para reordenar posiciones
DROP TRIGGER IF EXISTS reorder_showcase_positions_trigger ON public.products;
CREATE TRIGGER reorder_showcase_positions_trigger
  AFTER UPDATE ON public.products
  FOR EACH ROW
  WHEN (OLD.in_showcase = true AND NEW.in_showcase = false)
  EXECUTE FUNCTION public.reorder_showcase_positions();

-- ============================================
-- 7. COMENTARIOS
-- ============================================

COMMENT ON FUNCTION public.validate_showcase_limit() IS 
  'Valida que cada tienda no tenga más de 2 productos en la vitrina de ofertas';

COMMENT ON FUNCTION public.remove_from_showcase_on_deactivate() IS 
  'Remueve automáticamente productos de la vitrina cuando se desactivan';

COMMENT ON FUNCTION public.reorder_showcase_positions() IS 
  'Reordena las posiciones en la vitrina cuando se quita un producto';


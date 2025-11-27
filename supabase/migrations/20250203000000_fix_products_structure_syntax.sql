-- ============================================
-- Corrección de Sintaxis - Migración fix_products_structure
-- ============================================
-- Esta migración corrige los errores de sintaxis en las políticas RLS
-- y asegura que image_url esté eliminada y cover_url exista

DO $$
BEGIN
  -- Verificar y corregir cover_url
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'cover_url' AND table_schema = 'public') THEN
    ALTER TABLE public.products ADD COLUMN cover_url TEXT;
  END IF;

  -- Si image_url todavía existe, migrar datos y eliminarla
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'image_url' AND table_schema = 'public') THEN
    -- Copiar datos de image_url a cover_url si cover_url está vacío
    UPDATE public.products SET cover_url = image_url WHERE cover_url IS NULL AND image_url IS NOT NULL;
    -- Eliminar columna image_url
    ALTER TABLE public.products DROP COLUMN image_url;
    RAISE NOTICE 'Columna image_url eliminada y datos migrados a cover_url';
  ELSE
    RAISE NOTICE 'Columna image_url no existe (ya fue eliminada anteriormente)';
  END IF;
END $$;

-- ============================================
-- CORREGIR POLÍTICAS RLS (con punto y coma)
-- ============================================

DROP POLICY IF EXISTS "products_select_public" ON public.products;
CREATE POLICY "products_select_public" ON public.products FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "products_insert_authenticated" ON public.products;
CREATE POLICY "products_insert_authenticated" ON public.products FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "products_update_owner" ON public.products;
CREATE POLICY "products_update_owner" ON public.products FOR UPDATE
TO authenticated
USING (auth.uid() = seller_id)
WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "products_delete_owner" ON public.products;
CREATE POLICY "products_delete_owner" ON public.products FOR DELETE
TO authenticated
USING (auth.uid() = seller_id);

-- ============================================
-- FORZAR REFRESCO DEL SCHEMA DE POSTGREST
-- ============================================

NOTIFY pgrst, 'reload schema';

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

DO $$
DECLARE
  image_url_exists BOOLEAN;
  cover_url_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'image_url' 
    AND table_schema = 'public'
  ) INTO image_url_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'cover_url' 
    AND table_schema = 'public'
  ) INTO cover_url_exists;
  
  IF image_url_exists THEN
    RAISE WARNING '⚠️ image_url todavía existe después de la migración';
  ELSE
    RAISE NOTICE '✅ image_url no existe (correcto)';
  END IF;
  
  IF cover_url_exists THEN
    RAISE NOTICE '✅ cover_url existe (correcto)';
  ELSE
    RAISE WARNING '⚠️ cover_url no existe';
  END IF;
END $$;













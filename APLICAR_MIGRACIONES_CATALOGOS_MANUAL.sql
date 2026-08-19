-- ============================================
-- APLICAR MIGRACIONES DE CATÁLOGOS MANUALMENTE
-- Ejecutar este archivo completo en Supabase SQL Editor
-- ============================================
-- 
-- INSTRUCCIONES:
-- 1. Abrir Supabase Dashboard → SQL Editor
-- 2. Copiar y pegar TODO este archivo
-- 3. Ejecutar (Run)
-- 4. Verificar que no haya errores
-- ============================================

-- ============================================
-- MIGRACIÓN 1: Campos de catálogo en products
-- ============================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_in_global_catalog BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS catalog_valid_from TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS catalog_valid_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS catalog_priority INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS exclude_from_store_catalog BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_products_global_catalog_active
  ON public.products (is_in_global_catalog, catalog_valid_from, catalog_valid_until)
  WHERE is_in_global_catalog = TRUE;

CREATE INDEX IF NOT EXISTS idx_products_catalog_priority
  ON public.products (catalog_priority DESC)
  WHERE is_in_global_catalog = TRUE;

COMMENT ON COLUMN public.products.is_in_global_catalog IS 
  'Indica si el producto participa en el Catálogo General de Mercadito para publicidad/feeds. Diferente de is_featured (que es para UI/UX).';

COMMENT ON COLUMN public.products.catalog_valid_from IS 
  'Fecha desde la cual el producto es válido en el catálogo global. NULL significa sin fecha de inicio.';

COMMENT ON COLUMN public.products.catalog_valid_until IS 
  'Fecha hasta la cual el producto es válido en el catálogo global. NULL significa sin fecha de expiración.';

COMMENT ON COLUMN public.products.catalog_priority IS 
  'Prioridad para ordenar productos en el feed del catálogo. Mayor número = mayor prioridad. Se combinará con membresía, calidad, etc.';

COMMENT ON COLUMN public.products.exclude_from_store_catalog IS 
  'Si es TRUE, el producto queda excluido de los catálogos individuales de tienda, solo apareciendo en catálogo global.';

-- ============================================
-- MIGRACIÓN 2: Tablas de catálogos por tienda
-- ============================================

CREATE TABLE IF NOT EXISTS public.store_ad_catalogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'default',
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_generated_at TIMESTAMPTZ,
  products_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.store_ad_catalog_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id UUID NOT NULL REFERENCES public.store_ad_catalogs(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_ad_catalogs_store
  ON public.store_ad_catalogs (store_id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_store_ad_catalogs_store_slug
  ON public.store_ad_catalogs (store_id, slug);

CREATE INDEX IF NOT EXISTS idx_store_ad_catalog_products_catalog
  ON public.store_ad_catalog_products (catalog_id);

CREATE INDEX IF NOT EXISTS idx_store_ad_catalog_products_product
  ON public.store_ad_catalog_products (product_id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_store_ad_catalog_products_unique
  ON public.store_ad_catalog_products (catalog_id, product_id);

DROP TRIGGER IF EXISTS set_updated_at_store_ad_catalogs ON public.store_ad_catalogs;

CREATE TRIGGER set_updated_at_store_ad_catalogs
  BEFORE UPDATE ON public.store_ad_catalogs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.store_ad_catalogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_ad_catalog_products ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para store_ad_catalogs
DROP POLICY IF EXISTS "Sellers can view own store catalogs" ON public.store_ad_catalogs;
CREATE POLICY "Sellers can view own store catalogs" ON public.store_ad_catalogs
  FOR SELECT
  TO authenticated
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE seller_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Sellers can create own store catalogs" ON public.store_ad_catalogs;
CREATE POLICY "Sellers can create own store catalogs" ON public.store_ad_catalogs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    store_id IN (
      SELECT id FROM public.stores WHERE seller_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Sellers can update own store catalogs" ON public.store_ad_catalogs;
CREATE POLICY "Sellers can update own store catalogs" ON public.store_ad_catalogs
  FOR UPDATE
  TO authenticated
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE seller_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    store_id IN (
      SELECT id FROM public.stores WHERE seller_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Sellers can delete own store catalogs" ON public.store_ad_catalogs;
CREATE POLICY "Sellers can delete own store catalogs" ON public.store_ad_catalogs
  FOR DELETE
  TO authenticated
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE seller_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas RLS para store_ad_catalog_products
DROP POLICY IF EXISTS "Sellers can view own catalog products" ON public.store_ad_catalog_products;
CREATE POLICY "Sellers can view own catalog products" ON public.store_ad_catalog_products
  FOR SELECT
  TO authenticated
  USING (
    catalog_id IN (
      SELECT id FROM public.store_ad_catalogs
      WHERE store_id IN (
        SELECT id FROM public.stores WHERE seller_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Sellers can add products to own catalogs" ON public.store_ad_catalog_products;
CREATE POLICY "Sellers can add products to own catalogs" ON public.store_ad_catalog_products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    catalog_id IN (
      SELECT id FROM public.store_ad_catalogs
      WHERE store_id IN (
        SELECT id FROM public.stores WHERE seller_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Sellers can remove products from own catalogs" ON public.store_ad_catalog_products;
CREATE POLICY "Sellers can remove products from own catalogs" ON public.store_ad_catalog_products
  FOR DELETE
  TO authenticated
  USING (
    catalog_id IN (
      SELECT id FROM public.store_ad_catalogs
      WHERE store_id IN (
        SELECT id FROM public.stores WHERE seller_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Comentarios
COMMENT ON TABLE public.store_ad_catalogs IS 
  'Catálogos de publicidad configurados por tienda. Modela la configuración de negocio (qué productos incluir), no la sincronización técnica (que se maneja en product_catalog_sync).';

COMMENT ON TABLE public.store_ad_catalog_products IS 
  'Relación muchos a muchos entre catálogos y productos. Representa la selección manual de productos para un catálogo específico.';

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

DO $$
BEGIN
  -- Verificar campos en products
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'is_in_global_catalog'
  ) THEN
    RAISE EXCEPTION 'Error: Campo is_in_global_catalog no se agregó correctamente';
  END IF;
  
  -- Verificar tablas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'store_ad_catalogs'
  ) THEN
    RAISE EXCEPTION 'Error: Tabla store_ad_catalogs no se creó correctamente';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'store_ad_catalog_products'
  ) THEN
    RAISE EXCEPTION 'Error: Tabla store_ad_catalog_products no se creó correctamente';
  END IF;
  
  RAISE NOTICE '✅ Migraciones de catálogos aplicadas correctamente';
END $$;



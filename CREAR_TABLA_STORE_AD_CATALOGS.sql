-- ============================================
-- CREAR TABLA store_ad_catalogs (si falta)
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Verificar si la tabla existe
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'store_ad_catalogs';

-- Si no existe, ejecutar esto:

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

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_store_ad_catalogs_store
  ON public.store_ad_catalogs (store_id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_store_ad_catalogs_store_slug
  ON public.store_ad_catalogs (store_id, slug);

-- Crear trigger de updated_at
DROP TRIGGER IF EXISTS set_updated_at_store_ad_catalogs ON public.store_ad_catalogs;

CREATE TRIGGER set_updated_at_store_ad_catalogs
  BEFORE UPDATE ON public.store_ad_catalogs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.store_ad_catalogs ENABLE ROW LEVEL SECURITY;

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

-- Comentarios
COMMENT ON TABLE public.store_ad_catalogs IS 
  'Catálogos de publicidad configurados por tienda. Modela la configuración de negocio (qué productos incluir), no la sincronización técnica (que se maneja en product_catalog_sync).';

-- Verificar que se creó
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'store_ad_catalogs';



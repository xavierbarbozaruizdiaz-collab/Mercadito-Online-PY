-- ============================================
-- MERCADITO ONLINE PY - CATÁLOGOS DE PUBLICIDAD POR TIENDA
-- Migración: Crear tablas para configuración de catálogos de publicidad por tienda
-- ============================================
-- 
-- OBJETIVO:
-- Crear estructura para que cada tienda tenga sus propios catálogos de productos
-- para publicidad (ej: "default", "ofertas", "nuevos"), SIN duplicar la funcionalidad
-- de product_catalog_sync (que es para sincronización técnica).
--
-- CONTEXTO:
-- - product_catalog_sync ya existe para sincronización técnica con plataformas externas
-- - Esta estructura modela la "configuración de negocio", no la sincronización técnica
-- - Usa la función global public.update_updated_at_column() para timestamps
-- ============================================

-- ============================================
-- CREAR TABLA store_ad_catalogs
-- ============================================
-- Tabla principal que representa los catálogos de publicidad configurados por tienda

CREATE TABLE IF NOT EXISTS public.store_ad_catalogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tienda propietaria del catálogo
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  
  -- Identificador interno único por tienda: "default", "ofertas", "nuevos", etc.
  slug TEXT NOT NULL,
  
  -- Nombre visible en el panel: "Mi catálogo general", "Ofertas de la semana"
  name TEXT NOT NULL,
  
  -- Tipo de catálogo: 'default' | 'collection' | 'promotional' | etc.
  type TEXT NOT NULL DEFAULT 'default',
  
  -- Criterios de filtrado automático: categorías, rango de precio, stock mínimo, etc.
  -- Ejemplo: {"categories": ["uuid1", "uuid2"], "min_price": 10000, "max_price": 50000, "min_stock": 1}
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Estado activo/inactivo del catálogo
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Última vez que se regeneró el catálogo para un feed
  last_generated_at TIMESTAMPTZ,
  
  -- Contador de productos incluidos según filtros o selección manual
  -- Se actualizará cuando se regeneren los productos del catálogo
  products_count INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- CREAR TABLA store_ad_catalog_products
-- ============================================
-- Tabla de relación muchos a muchos: catálogo ↔ productos
-- Representa la selección manual de productos para un catálogo específico

CREATE TABLE IF NOT EXISTS public.store_ad_catalog_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Catálogo al que pertenece el producto
  catalog_id UUID NOT NULL REFERENCES public.store_ad_catalogs(id) ON DELETE CASCADE,
  
  -- Producto incluido en el catálogo
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  
  -- Timestamp de cuando se agregó el producto al catálogo
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- CREAR ÍNDICES PARA OPTIMIZAR CONSULTAS
-- ============================================

-- Índice para buscar catálogos por tienda
CREATE INDEX IF NOT EXISTS idx_store_ad_catalogs_store
  ON public.store_ad_catalogs (store_id);

-- Índice único para evitar duplicar slugs dentro de la misma tienda
CREATE UNIQUE INDEX IF NOT EXISTS uniq_store_ad_catalogs_store_slug
  ON public.store_ad_catalogs (store_id, slug);

-- Índice para buscar productos por catálogo
CREATE INDEX IF NOT EXISTS idx_store_ad_catalog_products_catalog
  ON public.store_ad_catalog_products (catalog_id);

-- Índice para buscar catálogos por producto (útil para saber en qué catálogos está un producto)
CREATE INDEX IF NOT EXISTS idx_store_ad_catalog_products_product
  ON public.store_ad_catalog_products (product_id);

-- Índice único para evitar duplicar productos en el mismo catálogo
CREATE UNIQUE INDEX IF NOT EXISTS uniq_store_ad_catalog_products_unique
  ON public.store_ad_catalog_products (catalog_id, product_id);

-- ============================================
-- CONFIGURAR TRIGGER DE updated_at
-- ============================================
-- Usa la función global existente public.update_updated_at_column()
-- NO se crea la función aquí, solo se referencia

DROP TRIGGER IF EXISTS set_updated_at_store_ad_catalogs ON public.store_ad_catalogs;

CREATE TRIGGER set_updated_at_store_ad_catalogs
  BEFORE UPDATE ON public.store_ad_catalogs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.store_ad_catalogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_ad_catalog_products ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS RLS PARA store_ad_catalogs
-- ============================================

-- SELECT: Los vendedores pueden ver sus propios catálogos, admins pueden ver todos
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

-- INSERT: Los vendedores pueden crear catálogos para sus tiendas, admins pueden crear para cualquier tienda
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

-- UPDATE: Los vendedores pueden actualizar sus propios catálogos, admins pueden actualizar todos
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

-- DELETE: Los vendedores pueden eliminar sus propios catálogos, admins pueden eliminar todos
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

-- ============================================
-- POLÍTICAS RLS PARA store_ad_catalog_products
-- ============================================

-- SELECT: Los vendedores pueden ver productos de sus catálogos, admins pueden ver todos
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

-- INSERT: Los vendedores pueden agregar productos a sus catálogos, admins pueden agregar a cualquier catálogo
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

-- UPDATE: No se permite actualizar (solo insert/delete)
-- DELETE: Los vendedores pueden quitar productos de sus catálogos, admins pueden quitar de cualquier catálogo
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

-- ============================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================

COMMENT ON TABLE public.store_ad_catalogs IS 
  'Catálogos de publicidad configurados por tienda. Modela la configuración de negocio (qué productos incluir), no la sincronización técnica (que se maneja en product_catalog_sync).';

COMMENT ON COLUMN public.store_ad_catalogs.store_id IS 
  'Tienda propietaria del catálogo. Una tienda puede tener múltiples catálogos.';

COMMENT ON COLUMN public.store_ad_catalogs.slug IS 
  'Identificador interno único por tienda. Ejemplos: "default", "ofertas", "nuevos". Debe ser único dentro de la misma tienda.';

COMMENT ON COLUMN public.store_ad_catalogs.name IS 
  'Nombre visible en el panel de administración. Ejemplo: "Mi catálogo general", "Ofertas de la semana".';

COMMENT ON COLUMN public.store_ad_catalogs.type IS 
  'Tipo de catálogo: "default" (general), "collection" (colección específica), "promotional" (promocional), etc.';

COMMENT ON COLUMN public.store_ad_catalogs.filters IS 
  'Criterios de filtrado automático en formato JSONB. Ejemplo: {"categories": ["uuid1"], "min_price": 10000, "max_price": 50000, "min_stock": 1}.';

COMMENT ON COLUMN public.store_ad_catalogs.last_generated_at IS 
  'Última vez que se regeneró el catálogo para generar un feed. Se actualiza cuando se ejecuta la generación del catálogo.';

COMMENT ON COLUMN public.store_ad_catalogs.products_count IS 
  'Contador de productos incluidos en el catálogo según filtros o selección manual. Se actualiza cuando se regenera el catálogo.';

COMMENT ON TABLE public.store_ad_catalog_products IS 
  'Relación muchos a muchos entre catálogos y productos. Representa la selección manual de productos para un catálogo específico.';

COMMENT ON COLUMN public.store_ad_catalog_products.catalog_id IS 
  'Catálogo al que pertenece el producto.';

COMMENT ON COLUMN public.store_ad_catalog_products.product_id IS 
  'Producto incluido en el catálogo.';

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

DO $$
BEGIN
  -- Verificar que las tablas se crearon correctamente
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
  
  -- Verificar que el trigger se creó
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_updated_at_store_ad_catalogs'
  ) THEN
    RAISE WARNING 'Advertencia: Trigger set_updated_at_store_ad_catalogs no se encontró. Verificar que public.update_updated_at_column() existe.';
  END IF;
  
  RAISE NOTICE '✅ Migración completada: Tablas de catálogos de publicidad por tienda creadas';
END $$;





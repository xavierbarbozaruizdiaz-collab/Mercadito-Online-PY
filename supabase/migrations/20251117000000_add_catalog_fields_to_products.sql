-- ============================================
-- MERCADITO ONLINE PY - CAMPOS DE CATÁLOGO GENERAL
-- Migración: Agregar campos para manejo de Catálogo General de Mercadito
-- ============================================
-- 
-- OBJETIVO:
-- Añadir campos al modelo public.products para manejar el "Catálogo General de Mercadito"
-- sin romper funcionalidades existentes ni duplicar is_featured.
--
-- CONTEXTO:
-- - is_featured ya existe y se mantiene para destacar productos en UI/UX
-- - Estos campos son específicos para publicidad/feeds y catálogo global
-- - No se tocan tablas promotions ni product_catalog_sync
-- ============================================

-- ============================================
-- AGREGAR CAMPOS A public.products
-- ============================================

ALTER TABLE public.products
  -- Indica si el producto participa en el Catálogo General de Mercadito
  -- Diferente de is_featured: este es para publicidad/feeds, is_featured es para UI/UX
  ADD COLUMN IF NOT EXISTS is_in_global_catalog BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Fecha desde la cual el producto es válido en el catálogo (NULL = sin inicio)
  ADD COLUMN IF NOT EXISTS catalog_valid_from TIMESTAMPTZ,
  
  -- Fecha hasta la cual el producto es válido en el catálogo (NULL = sin expiración)
  ADD COLUMN IF NOT EXISTS catalog_valid_until TIMESTAMPTZ,
  
  -- Prioridad para ordenar en el feed (mayor número = mayor prioridad)
  -- Se usará junto con membresía, calidad, etc. para determinar orden
  ADD COLUMN IF NOT EXISTS catalog_priority INTEGER NOT NULL DEFAULT 0,
  
  -- Indica si el producto debe quedar fuera de los catálogos individuales de tienda
  -- Útil para productos que solo deben aparecer en catálogo global
  ADD COLUMN IF NOT EXISTS exclude_from_store_catalog BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================
-- CREAR ÍNDICES PARA OPTIMIZAR CONSULTAS
-- ============================================

-- Índice compuesto para consultas de catálogo activo
-- Útil para queries como: "productos en catálogo global y vigentes en fecha X"
CREATE INDEX IF NOT EXISTS idx_products_global_catalog_active
  ON public.products (is_in_global_catalog, catalog_valid_from, catalog_valid_until)
  WHERE is_in_global_catalog = TRUE;

-- Índice para ordenar por prioridad en catálogo
-- Útil para queries que necesitan ordenar productos por prioridad
CREATE INDEX IF NOT EXISTS idx_products_catalog_priority
  ON public.products (catalog_priority DESC)
  WHERE is_in_global_catalog = TRUE;

-- ============================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================

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
-- VERIFICACIÓN FINAL
-- ============================================

DO $$
BEGIN
  -- Verificar que los campos se agregaron correctamente
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'is_in_global_catalog'
  ) THEN
    RAISE EXCEPTION 'Error: Campo is_in_global_catalog no se agregó correctamente';
  END IF;
  
  RAISE NOTICE '✅ Migración completada: Campos de catálogo general agregados a products';
END $$;





-- ============================================
-- VERIFICACIÓN RÁPIDA - ELEMENTOS RESTANTES
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Verificar campos en products (debe mostrar 5 filas)
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'products'
  AND column_name IN (
    'is_in_global_catalog',
    'catalog_valid_from',
    'catalog_valid_until',
    'catalog_priority',
    'exclude_from_store_catalog'
  )
ORDER BY column_name;

-- 2. Verificar tablas (debe mostrar 2 filas)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('store_ad_catalogs', 'store_ad_catalog_products')
ORDER BY table_name;

-- 3. Verificar trigger (debe mostrar 1 fila)
SELECT 
  trigger_name,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table = 'store_ad_catalogs';

-- 4. Verificar índices principales (debe mostrar varios)
SELECT 
  indexname,
  tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE '%catalog%' 
    OR tablename IN ('store_ad_catalogs', 'store_ad_catalog_products')
  )
ORDER BY tablename, indexname;



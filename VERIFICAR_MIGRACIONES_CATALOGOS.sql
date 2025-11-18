-- ============================================
-- VERIFICAR MIGRACIONES DE CATÁLOGOS APLICADAS
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Verificar campos en products
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
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

-- 2. Verificar tablas creadas
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('store_ad_catalogs', 'store_ad_catalog_products')
ORDER BY table_name;

-- 3. Verificar índices creados
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE '%catalog%' 
    OR tablename IN ('store_ad_catalogs', 'store_ad_catalog_products')
  )
ORDER BY tablename, indexname;

-- 4. Verificar triggers
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table = 'store_ad_catalogs';

-- 5. Verificar políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('store_ad_catalogs', 'store_ad_catalog_products')
ORDER BY tablename, policyname;

-- ============================================
-- RESUMEN: Debes ver:
-- ============================================
-- ✅ 5 columnas en products (is_in_global_catalog, catalog_valid_from, etc.)
-- ✅ 2 tablas (store_ad_catalogs, store_ad_catalog_products)
-- ✅ Múltiples índices relacionados con catalog
-- ✅ 1 trigger (set_updated_at_store_ad_catalogs)
-- ✅ 6 políticas RLS (3 por tabla)



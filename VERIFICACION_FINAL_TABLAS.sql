-- ============================================
-- VERIFICACIÓN FINAL - TABLAS DE CATÁLOGOS
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Verificar que AMBAS tablas existen
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('store_ad_catalogs', 'store_ad_catalog_products')
ORDER BY table_name;

-- 2. Verificar estructura de store_ad_catalogs
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'store_ad_catalogs'
ORDER BY ordinal_position;

-- 3. Verificar índices de store_ad_catalogs
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'store_ad_catalogs'
ORDER BY indexname;

-- 4. Verificar trigger
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table = 'store_ad_catalogs';

-- 5. Verificar políticas RLS de store_ad_catalogs
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'store_ad_catalogs'
ORDER BY policyname;

-- 6. Verificar políticas RLS de store_ad_catalog_products
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'store_ad_catalog_products'
ORDER BY policyname;

-- ============================================
-- RESULTADOS ESPERADOS:
-- ============================================
-- 1. Debe mostrar 2 tablas
-- 2. store_ad_catalogs debe tener 11 columnas
-- 3. Debe tener 2 índices (idx_store_ad_catalogs_store, uniq_store_ad_catalogs_store_slug)
-- 4. Debe tener 1 trigger (set_updated_at_store_ad_catalogs)
-- 5. Debe tener 4 políticas RLS para store_ad_catalogs
-- 6. Debe tener 3 políticas RLS para store_ad_catalog_products



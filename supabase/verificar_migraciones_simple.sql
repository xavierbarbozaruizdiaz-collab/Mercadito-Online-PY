-- ============================================
-- VERIFICAR MIGRACIONES APLICADAS (VERSIÓN SIMPLE)
-- ============================================
-- Ejecutar en Supabase Dashboard SQL Editor
-- ============================================

-- Ver TODAS las migraciones aplicadas (versión corregida)
SELECT 
  version,
  name
FROM supabase_migrations.schema_migrations
ORDER BY version ASC;

-- Contar total aplicadas
SELECT 
  COUNT(*) as total_migraciones_aplicadas
FROM supabase_migrations.schema_migrations;

-- Ver últimas 20 migraciones aplicadas
SELECT 
  version,
  name
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 20;




-- ============================================
-- VERIFICAR MIGRACIONES PENDIENTES
-- ============================================
-- Ejecutar en Supabase Dashboard SQL Editor
-- Compara con archivos en supabase/migrations/
-- ============================================

-- Ver TODAS las migraciones aplicadas
SELECT 
  version,
  name
FROM supabase_migrations.schema_migrations
ORDER BY version ASC;

-- Contar total aplicadas
SELECT 
  COUNT(*) as total_migraciones_aplicadas
FROM supabase_migrations.schema_migrations;

-- Ver últimas 20 migraciones aplicadas (por version, que es el timestamp)
SELECT 
  version,
  name
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 20;

-- Buscar migraciones específicas críticas
SELECT 
  version,
  name
FROM supabase_migrations.schema_migrations
WHERE name LIKE '%hero%' 
   OR name LIKE '%orders%' 
   OR name LIKE '%products%'
   OR name LIKE '%profiles%'
   OR name LIKE '%stores%'
ORDER BY version DESC;

-- Verificar migraciones recientes (por timestamp en version)
SELECT 
  version,
  name,
  CASE 
    WHEN version::bigint > EXTRACT(EPOCH FROM (NOW() - INTERVAL '7 days'))::bigint / 100 THEN 'Última semana'
    WHEN version::bigint > EXTRACT(EPOCH FROM (NOW() - INTERVAL '30 days'))::bigint / 100 THEN 'Último mes'
    ELSE 'Antigua'
  END as periodo
FROM supabase_migrations.schema_migrations
WHERE version::bigint > 20251000000000  -- Migraciones desde octubre 2025
ORDER BY version DESC;


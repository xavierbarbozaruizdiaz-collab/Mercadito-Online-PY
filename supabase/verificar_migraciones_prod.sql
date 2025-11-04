-- ============================================
-- VERIFICAR MIGRACIONES APLICADAS EN PROD
-- ============================================
-- Ejecutar en Supabase Dashboard SQL Editor
-- Comparar resultados con archivos en supabase/migrations/
-- ============================================

-- Ver todas las migraciones aplicadas (últimas 100)
SELECT 
  version,
  name,
  executed_at,
  execution_time_ms
FROM supabase_migrations.schema_migrations
ORDER BY executed_at DESC
LIMIT 100;

-- Contar total de migraciones aplicadas
SELECT 
  COUNT(*) as total_migraciones_aplicadas
FROM supabase_migrations.schema_migrations;

-- Verificar migraciones recientes (últimos 30 días)
SELECT 
  version,
  name,
  executed_at,
  CASE 
    WHEN executed_at > NOW() - INTERVAL '30 days' THEN 'Reciente'
    ELSE 'Antigua'
  END as estado
FROM supabase_migrations.schema_migrations
WHERE executed_at > NOW() - INTERVAL '30 days'
ORDER BY executed_at DESC;

-- Buscar migraciones específicas críticas
SELECT 
  version,
  name,
  executed_at
FROM supabase_migrations.schema_migrations
WHERE name LIKE '%hero%' OR name LIKE '%orders%' OR name LIKE '%products%'
ORDER BY executed_at DESC;




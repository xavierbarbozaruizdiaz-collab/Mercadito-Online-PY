-- ============================================
-- VERIFICACIÓN COMPLETA - SUPABASE
-- ============================================
-- Ejecutar en Supabase Dashboard → SQL Editor
-- para verificar que todo está configurado correctamente

-- 1. Verificar usuario admin
SELECT 
    id, 
    email, 
    role,
    CASE 
        WHEN role = 'admin' THEN '✅ ES ADMIN'
        ELSE '❌ NO ES ADMIN'
    END as status
FROM profiles 
WHERE email = 'mercadoxbar@gmail.com';

-- 2. Verificar tablas creadas
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('admin_alerts', 'maintenance_logs', 'backup_logs') 
        THEN '✅ Existe'
        ELSE '❌ No existe'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('admin_alerts', 'maintenance_logs', 'backup_logs');

-- 3. Verificar funciones SQL
SELECT 
    routine_name,
    routine_type,
    CASE 
        WHEN routine_name IN ('run_nightly_audit', 'cleanup_inactive_items', 'cleanup_old_backups')
        THEN '✅ Existe'
        ELSE '❌ No existe'
    END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('run_nightly_audit', 'cleanup_inactive_items', 'cleanup_old_backups')
ORDER BY routine_name;

-- 4. Verificar índices
SELECT 
    indexname,
    tablename,
    '✅ Existe' as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    tablename IN ('admin_alerts', 'maintenance_logs', 'backup_logs')
    OR indexname LIKE 'idx_admin_%'
    OR indexname LIKE 'idx_maintenance_%'
    OR indexname LIKE 'idx_backup_%'
  )
ORDER BY tablename, indexname;

-- 5. Contar registros (para verificar que las tablas están vacías inicialmente)
SELECT 
    'admin_alerts' as tabla,
    COUNT(*) as registros,
    COUNT(CASE WHEN status = 'open' THEN 1 END) as alertas_abiertas
FROM admin_alerts
UNION ALL
SELECT 
    'maintenance_logs',
    COUNT(*),
    COUNT(*)
FROM maintenance_logs
UNION ALL
SELECT 
    'backup_logs',
    COUNT(*),
    COUNT(CASE WHEN status = 'completed' THEN 1 END)
FROM backup_logs;

-- 6. Probar función de auditoría (solo lectura)
SELECT run_nightly_audit() as resultado_auditoria;

-- 7. Verificar última ejecución de mantenimiento
SELECT 
    maintenance_type,
    action_description,
    affected_count,
    executed_at
FROM maintenance_logs
ORDER BY executed_at DESC
LIMIT 5;


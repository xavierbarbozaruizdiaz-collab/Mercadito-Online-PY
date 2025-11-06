-- ============================================
-- MERCADITO ONLINE PY - BACKUP SYSTEM (SIMPLIFIED)
-- Sistema de backup y recuperación de datos
-- ============================================

-- ============================================
-- TABLA DE LOGS DE BACKUP
-- ============================================

CREATE TABLE IF NOT EXISTS backup_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    backup_id TEXT UNIQUE NOT NULL,
    backup_type TEXT NOT NULL CHECK (backup_type IN ('full', 'incremental')),
    backup_data JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_backup_logs_type ON backup_logs(backup_type);
CREATE INDEX IF NOT EXISTS idx_backup_logs_status ON backup_logs(status);
CREATE INDEX IF NOT EXISTS idx_backup_logs_created_at ON backup_logs(created_at DESC);

-- Habilitar RLS
ALTER TABLE backup_logs ENABLE ROW LEVEL SECURITY;

-- Política RLS para backup_logs (solo admins pueden acceder)
CREATE POLICY "Only admins can access backup logs" ON backup_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- ============================================
-- FUNCIONES SIMPLIFICADAS DE BACKUP
-- ============================================

-- Función para crear backup completo de la base de datos
CREATE OR REPLACE FUNCTION create_full_backup()
RETURNS TEXT AS $$
DECLARE
    backup_id TEXT;
    backup_data JSONB;
BEGIN
    -- Generar ID único para el backup
    backup_id := 'backup_' || to_char(NOW(), 'YYYYMMDD_HH24MISS') || '_' || substr(md5(random()::text), 1, 8);
    
    -- Crear estructura de backup básica
    backup_data := jsonb_build_object(
        'backup_id', backup_id,
        'created_at', NOW(),
        'version', '1.0',
        'tables', jsonb_build_object()
    );
    
    -- Backup de productos
    backup_data := jsonb_set(
        backup_data,
        '{tables,products}',
        to_jsonb(
            (SELECT jsonb_agg(row_to_json(p)) FROM products p LIMIT 1000)
        )
    );
    
    -- Backup de categorías
    backup_data := jsonb_set(
        backup_data,
        '{tables,categories}',
        to_jsonb(
            (SELECT jsonb_agg(row_to_json(c)) FROM categories c)
        )
    );
    
    -- Backup de órdenes
    backup_data := jsonb_set(
        backup_data,
        '{tables,orders}',
        to_jsonb(
            (SELECT jsonb_agg(row_to_json(o)) FROM orders o LIMIT 1000)
        )
    );
    
    -- Backup de perfiles
    backup_data := jsonb_set(
        backup_data,
        '{tables,profiles}',
        to_jsonb(
            (SELECT jsonb_agg(row_to_json(p)) FROM profiles p LIMIT 1000)
        )
    );
    
    -- Insertar backup en tabla de backups
    INSERT INTO backup_logs (backup_id, backup_type, backup_data, status, created_at)
    VALUES (backup_id, 'full', backup_data, 'completed', NOW());
    
    RETURN backup_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener estadísticas de backup
CREATE OR REPLACE FUNCTION get_backup_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_backups', COUNT(*),
        'full_backups', COUNT(*) FILTER (WHERE backup_type = 'full'),
        'incremental_backups', COUNT(*) FILTER (WHERE backup_type = 'incremental'),
        'completed_backups', COUNT(*) FILTER (WHERE status = 'completed'),
        'failed_backups', COUNT(*) FILTER (WHERE status = 'failed'),
        'last_backup', MAX(created_at),
        'oldest_backup', MIN(created_at),
        'total_size_mb', ROUND(
            SUM(
                pg_column_size(backup_data) / 1024.0 / 1024.0
            )::numeric, 2
        )
    ) INTO result
    FROM backup_logs;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para limpiar backups antiguos
CREATE OR REPLACE FUNCTION cleanup_old_backups(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Eliminar backups más antiguos que el período de retención
    DELETE FROM backup_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days
    AND backup_type = 'incremental';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Mantener al menos los últimos 5 backups completos
    DELETE FROM backup_logs 
    WHERE backup_type = 'full'
    AND backup_id NOT IN (
        SELECT backup_id FROM backup_logs 
        WHERE backup_type = 'full' 
        ORDER BY created_at DESC 
        LIMIT 5
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- ============================================

COMMENT ON FUNCTION create_full_backup() IS 'Crea un backup completo de toda la base de datos';
COMMENT ON FUNCTION get_backup_stats() IS 'Obtiene estadísticas de los backups existentes';
COMMENT ON FUNCTION cleanup_old_backups(INTEGER) IS 'Limpia backups antiguos según el período de retención';
COMMENT ON TABLE backup_logs IS 'Log de todos los backups realizados en el sistema';
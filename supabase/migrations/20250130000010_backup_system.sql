-- ============================================
-- MERCADITO ONLINE PY - SISTEMA DE BACKUPS
-- Migración: Tabla para tracking de backups automáticos
-- ============================================

-- ============================================
-- TABLA backup_logs (Prioridad 9)
-- ============================================

CREATE TABLE IF NOT EXISTS backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type TEXT NOT NULL CHECK (backup_type IN ('database', 'storage', 'full')),
  backup_location TEXT NOT NULL, -- URL o path del backup
  backup_size_bytes BIGINT,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'failed', 'expired')),
  error_message TEXT,
  retention_until TIMESTAMPTZ NOT NULL, -- Fecha de expiración (4 semanas = 28 días)
  metadata JSONB DEFAULT '{}', -- Info adicional: bucket, region, compression, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Agregar columna retention_until si la tabla ya existe pero le falta
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_logs') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'backup_logs' AND column_name = 'retention_until') THEN
      ALTER TABLE backup_logs ADD COLUMN retention_until TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '28 days');
    END IF;
  END IF;
END $$;

-- Índices para backup_logs
CREATE INDEX IF NOT EXISTS idx_backup_logs_type ON backup_logs(backup_type);
CREATE INDEX IF NOT EXISTS idx_backup_logs_status ON backup_logs(status);
CREATE INDEX IF NOT EXISTS idx_backup_logs_retention ON backup_logs(retention_until);
CREATE INDEX IF NOT EXISTS idx_backup_logs_created ON backup_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_backup_logs_completed ON backup_logs(completed_at) WHERE completed_at IS NOT NULL;

-- ============================================
-- FUNCIÓN: cleanup_old_backups()
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_backups()
RETURNS JSONB AS $$
DECLARE
  v_expired_count INTEGER := 0;
  v_backup_record RECORD;
  v_result JSONB;
BEGIN
  -- Encontrar y marcar backups expirados (>4 semanas)
  FOR v_backup_record IN (
    SELECT id, backup_location, backup_type
    FROM backup_logs
    WHERE retention_until < NOW()
      AND status = 'completed'
    LIMIT 100 -- Limitar por ejecución para no sobrecargar
  ) LOOP
    -- Marcar como expirado (la eliminación física se hace desde API externa)
    UPDATE backup_logs
    SET 
      status = 'expired',
      metadata = COALESCE(metadata, '{}'::jsonb) || 
        jsonb_build_object('expired_at', NOW())
    WHERE id = v_backup_record.id;
    
    v_expired_count := v_expired_count + 1;
  END LOOP;
  
  -- Retornar resumen
  v_result := jsonb_build_object(
    'expired_backups_marked', v_expired_count,
    'timestamp', NOW()
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON TABLE backup_logs IS 'Registro de backups automáticos de base de datos y storage';
COMMENT ON FUNCTION cleanup_old_backups() IS 'Marca backups expirados para limpieza (retención 4 semanas)';


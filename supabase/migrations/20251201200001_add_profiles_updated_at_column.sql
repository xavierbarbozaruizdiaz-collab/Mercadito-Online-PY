-- ============================================
-- MERCADITO ONLINE PY - ADD PROFILES.UPDATED_AT COLUMN (SOLUCIÓN LPMS)
-- Agrega la columna updated_at a profiles para consistencia con:
-- - Tipos TypeScript (database.ts línea 25 espera updated_at)
-- - Patrón del sistema (todas las otras tablas tienen updated_at)
-- - Buenas prácticas de tracking de cambios
-- ============================================

-- ============================================
-- 1. AGREGAR COLUMNA updated_at A PROFILES
-- ============================================

-- Agregar columna con valor por defecto NOW() para registros existentes
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Actualizar registros existentes que puedan tener NULL (por seguridad)
UPDATE profiles 
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

-- ============================================
-- 2. CREAR TRIGGER AUTOMÁTICO
-- Reutiliza la función genérica existente update_updated_at_column()
-- ============================================

-- Asegurar que la función existe (ya debería existir, pero por seguridad)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger automático para actualizar updated_at en cada UPDATE
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. VERIFICACIÓN Y COMENTARIOS
-- ============================================

COMMENT ON COLUMN profiles.updated_at IS 'Fecha de última actualización del perfil. Actualizado automáticamente por trigger.';

-- Verificación
DO $$
DECLARE
    column_exists BOOLEAN;
    trigger_exists BOOLEAN;
BEGIN
    -- Verificar que la columna existe
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'updated_at'
    ) INTO column_exists;
    
    -- Verificar que el trigger existe
    SELECT EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'update_profiles_updated_at'
    ) INTO trigger_exists;
    
    IF column_exists AND trigger_exists THEN
        RAISE NOTICE '✅ Columna updated_at agregada exitosamente a profiles';
        RAISE NOTICE '✅ Trigger automático creado exitosamente';
        RAISE NOTICE '✅ Profiles ahora tiene tracking de cambios como todas las otras tablas';
    ELSE
        RAISE WARNING '⚠️ Verificación falló. Column exists: %, Trigger exists: %', column_exists, trigger_exists;
    END IF;
END $$;















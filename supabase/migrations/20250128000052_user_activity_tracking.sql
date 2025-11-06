-- ============================================
-- MERCADITO ONLINE PY - USER ACTIVITY TRACKING
-- Agregar campos para tracking de actividad y estado en línea
-- ============================================

-- Agregar columnas de actividad a profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_products INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0;

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Función para actualizar last_seen periódicamente
CREATE OR REPLACE FUNCTION update_user_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET last_seen = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para actualizar last_seen cuando hay actividad en auth.users
-- (Nota: No podemos crear triggers directos en auth.users, pero podemos hacerlo desde la app)

-- Función para obtener usuarios en línea (últimos 5 minutos)
CREATE OR REPLACE FUNCTION get_online_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  role TEXT,
  first_name TEXT,
  last_name TEXT,
  last_seen TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.role,
    p.first_name,
    p.last_name,
    p.last_seen
  FROM profiles p
  WHERE p.last_seen > NOW() - INTERVAL '5 minutes'
  ORDER BY p.last_seen DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener estadísticas de usuarios
CREATE OR REPLACE FUNCTION get_user_stats()
RETURNS TABLE (
  total_users BIGINT,
  active_users BIGINT,
  total_sellers BIGINT,
  online_users BIGINT,
  online_sellers BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM profiles)::BIGINT as total_users,
    (SELECT COUNT(*) FROM profiles WHERE is_active = true)::BIGINT as active_users,
    (SELECT COUNT(*) FROM profiles WHERE role = 'seller' AND is_active = true)::BIGINT as total_sellers,
    (SELECT COUNT(*) FROM profiles WHERE last_seen > NOW() - INTERVAL '5 minutes')::BIGINT as online_users,
    (SELECT COUNT(*) FROM profiles WHERE role = 'seller' AND last_seen > NOW() - INTERVAL '5 minutes' AND is_active = true)::BIGINT as online_sellers;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  RAISE NOTICE '✅ Campos de actividad de usuarios agregados';
END $$;


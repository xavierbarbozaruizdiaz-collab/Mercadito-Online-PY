-- ============================================
-- MERCADITO ONLINE PY - STRUCTURED LOCATION
-- Agregar campos estructurados de ubicación a profiles y stores
-- ============================================

-- PROFILES
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS address_note TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- STORES
ALTER TABLE stores 
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS address_note TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Índices útiles para filtros
CREATE INDEX IF NOT EXISTS idx_profiles_department ON profiles(department);
CREATE INDEX IF NOT EXISTS idx_profiles_city ON profiles(city);
CREATE INDEX IF NOT EXISTS idx_stores_department ON stores(department);
CREATE INDEX IF NOT EXISTS idx_stores_city ON stores(city);

DO $$ BEGIN
  RAISE NOTICE '✅ Campos de ubicación estructurada agregados (profiles, stores)';
END $$;



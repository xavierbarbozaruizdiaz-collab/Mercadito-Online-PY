-- ============================================
-- MERCADITO ONLINE PY - BANNERS AND USER BAN
-- Tablas para banners y funcionalidad de banear usuarios
-- ============================================

-- Tabla de banners/promociones
CREATE TABLE IF NOT EXISTS banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  position TEXT NOT NULL CHECK (position IN ('hero', 'sidebar', 'footer', 'top')),
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices para banners
CREATE INDEX IF NOT EXISTS idx_banners_position ON banners(position);
CREATE INDEX IF NOT EXISTS idx_banners_active ON banners(is_active);
CREATE INDEX IF NOT EXISTS idx_banners_dates ON banners(start_date, end_date);

-- Habilitar RLS
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para banners
CREATE POLICY "public_can_view_active_banners" 
ON banners FOR SELECT 
TO public 
USING (is_active = true AND (
  start_date IS NULL OR start_date <= NOW()
) AND (
  end_date IS NULL OR end_date >= NOW()
));

CREATE POLICY "admins_can_manage_banners" 
ON banners FOR ALL 
TO authenticated 
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());

-- Agregar campo banned_at y ban_reason a profiles si no existe
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'banned_at') THEN
    ALTER TABLE profiles 
    ADD COLUMN banned_at TIMESTAMPTZ,
    ADD COLUMN ban_reason TEXT,
    ADD COLUMN banned_by UUID REFERENCES profiles(id);
  END IF;
END $$;

-- Índice para usuarios baneados
CREATE INDEX IF NOT EXISTS idx_profiles_banned ON profiles(banned_at);

DO $$ BEGIN
  RAISE NOTICE '✅ Tabla de banners y campos de ban creados';
END $$;


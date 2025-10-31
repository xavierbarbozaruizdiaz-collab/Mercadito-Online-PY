-- ============================================
-- MERCADITO ONLINE PY - SITE SETTINGS
-- Tabla para configuración del sitio
-- ============================================

-- Tabla de configuración del sitio
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_site_settings_key ON site_settings(key);

-- Habilitar RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Solo admins pueden leer y escribir
CREATE POLICY "admins_can_view_site_settings" 
ON site_settings FOR SELECT 
TO authenticated 
USING (is_current_user_admin());

CREATE POLICY "admins_can_update_site_settings" 
ON site_settings FOR UPDATE 
TO authenticated 
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());

CREATE POLICY "admins_can_insert_site_settings" 
ON site_settings FOR INSERT 
TO authenticated 
WITH CHECK (is_current_user_admin());

-- Configuraciones iniciales
INSERT INTO site_settings (key, value, description) VALUES
  ('site_name', '"Mercadito Online PY"', 'Nombre del sitio'),
  ('site_logo', 'null', 'URL del logo del sitio'),
  ('primary_color', '"#3b82f6"', 'Color primario del sitio'),
  ('secondary_color', '"#8b5cf6"', 'Color secundario del sitio'),
  ('contact_email', '"contacto@mercadito-py.com"', 'Email de contacto'),
  ('contact_phone', '"+595123456789"', 'Teléfono de contacto'),
  ('shipping_cost', '5000', 'Costo de envío por defecto'),
  ('free_shipping_threshold', '100000', 'Umbral para envío gratis'),
  ('payment_methods', '["cash", "transfer", "card"]', 'Métodos de pago disponibles')
ON CONFLICT (key) DO NOTHING;

DO $$ BEGIN
  RAISE NOTICE '✅ Tabla de configuración del sitio creada';
END $$;


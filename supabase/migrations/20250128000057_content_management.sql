-- ============================================
-- MERCADITO ONLINE PY - CONTENT MANAGEMENT
-- Tablas para gestión de contenido estático
-- ============================================

-- Tabla para páginas de contenido estático
CREATE TABLE IF NOT EXISTS static_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  meta_description TEXT,
  is_published BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_static_pages_slug ON static_pages(slug);
CREATE INDEX IF NOT EXISTS idx_static_pages_published ON static_pages(is_published);

-- Habilitar RLS
ALTER TABLE static_pages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Público puede leer páginas publicadas, admins pueden todo
CREATE POLICY "public_can_view_published_pages" 
ON static_pages FOR SELECT 
TO public 
USING (is_published = true);

CREATE POLICY "admins_can_view_all_pages" 
ON static_pages FOR SELECT 
TO authenticated 
USING (is_current_user_admin());

CREATE POLICY "admins_can_manage_pages" 
ON static_pages FOR ALL 
TO authenticated 
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());

-- Tabla para denuncias/reportes
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('product', 'user', 'store', 'order', 'review')),
  target_id UUID NOT NULL, -- ID del objeto denunciado
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'rejected', 'dismissed')),
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);

-- Habilitar RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "users_can_create_reports" 
ON reports FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "users_can_view_own_reports" 
ON reports FOR SELECT 
TO authenticated 
USING (auth.uid() = reporter_id);

CREATE POLICY "admins_can_view_all_reports" 
ON reports FOR SELECT 
TO authenticated 
USING (is_current_user_admin());

CREATE POLICY "admins_can_update_reports" 
ON reports FOR UPDATE 
TO authenticated 
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());

-- Tabla para logs de actividad
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON activity_logs(resource_type, resource_id);

-- Habilitar RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Solo admins pueden ver logs
CREATE POLICY "admins_can_view_logs" 
ON activity_logs FOR SELECT 
TO authenticated 
USING (is_current_user_admin());

CREATE POLICY "system_can_insert_logs" 
ON activity_logs FOR INSERT 
TO authenticated 
WITH CHECK (true); -- Permitir que cualquier usuario autenticado inserte (el sistema lo hará)

DO $$ BEGIN
  RAISE NOTICE '✅ Tablas de gestión de contenido creadas';
END $$;


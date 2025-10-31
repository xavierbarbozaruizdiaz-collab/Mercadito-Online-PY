-- ============================================
-- MERCADITO ONLINE PY - BULK NOTIFICATIONS LOG
-- Tabla para registrar notificaciones masivas enviadas
-- ============================================

-- Tabla para logs de notificaciones masivas
CREATE TABLE IF NOT EXISTS bulk_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  recipient_type TEXT NOT NULL,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  channels TEXT[] DEFAULT ARRAY[]::TEXT[],
  sent_by UUID REFERENCES profiles(id),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_bulk_notifications_sent_at ON bulk_notifications(sent_at);
CREATE INDEX IF NOT EXISTS idx_bulk_notifications_sent_by ON bulk_notifications(sent_by);
CREATE INDEX IF NOT EXISTS idx_bulk_notifications_type ON bulk_notifications(notification_type);

-- Habilitar RLS
ALTER TABLE bulk_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Solo admins pueden ver y crear logs
CREATE POLICY "admins_can_view_bulk_notifications" 
ON bulk_notifications FOR SELECT 
TO authenticated 
USING (is_current_user_admin());

CREATE POLICY "admins_can_create_bulk_notifications" 
ON bulk_notifications FOR INSERT 
TO authenticated 
WITH CHECK (is_current_user_admin());

DO $$ BEGIN
  RAISE NOTICE '✅ Tabla de logs de notificaciones masivas creada';
END $$;


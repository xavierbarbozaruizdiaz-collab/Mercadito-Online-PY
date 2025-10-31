-- Migration: Sistema de Notificaciones Completo
-- ============================================

-- Verificar si la tabla notifications existe y mejorarla
DO $$
BEGIN
    -- Si la tabla notifications no tiene la columna 'content', agregarla
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'content' AND table_schema = 'public') THEN
            ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS content TEXT;
            -- Copiar message a content si existe
            UPDATE public.notifications SET content = message WHERE content IS NULL AND message IS NOT NULL;
        END IF;
    END IF;
END $$;

-- Tabla de preferencias de notificaciones por usuario
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    -- Preferencias por tipo de notificación
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    -- Preferencias por categoría
    order_notifications BOOLEAN DEFAULT true,
    message_notifications BOOLEAN DEFAULT true,
    review_notifications BOOLEAN DEFAULT true,
    promotion_notifications BOOLEAN DEFAULT true,
    system_notifications BOOLEAN DEFAULT true,
    -- Preferencias avanzadas
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla para tracking de notificaciones enviadas (email/SMS)
CREATE TABLE IF NOT EXISTS public.notification_delivery_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    delivery_method TEXT NOT NULL CHECK (delivery_method IN ('email', 'sms', 'push')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Mejorar tabla notifications si no tiene todas las columnas
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
        -- Agregar columna category si no existe
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'category' AND table_schema = 'public') THEN
            ALTER TABLE public.notifications ADD COLUMN category TEXT DEFAULT 'general';
        END IF;
        
        -- Agregar columna priority si no existe
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'priority' AND table_schema = 'public') THEN
            ALTER TABLE public.notifications ADD COLUMN priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
        END IF;
        
        -- Agregar columna action_url si no existe
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'action_url' AND table_schema = 'public') THEN
            ALTER TABLE public.notifications ADD COLUMN action_url TEXT;
        END IF;
        
        -- Agregar columna expires_at si no existe
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'expires_at' AND table_schema = 'public') THEN
            ALTER TABLE public.notifications ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
        END IF;
    END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON public.notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON public.notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_notification ON public.notification_delivery_log(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_user ON public.notification_delivery_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_status ON public.notification_delivery_log(status);

-- Habilitar RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_log ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para notification_preferences
CREATE POLICY "Users can view their own notification preferences" ON public.notification_preferences
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own notification preferences" ON public.notification_preferences
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para notification_delivery_log
CREATE POLICY "Users can view their own delivery logs" ON public.notification_delivery_log
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Función para obtener o crear preferencias de notificaciones
CREATE OR REPLACE FUNCTION get_or_create_notification_preferences(user_id_param UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    email_enabled BOOLEAN,
    push_enabled BOOLEAN,
    sms_enabled BOOLEAN,
    order_notifications BOOLEAN,
    message_notifications BOOLEAN,
    review_notifications BOOLEAN,
    promotion_notifications BOOLEAN,
    system_notifications BOOLEAN,
    quiet_hours_enabled BOOLEAN,
    quiet_hours_start TIME,
    quiet_hours_end TIME
) AS $$
DECLARE
    prefs_record RECORD;
BEGIN
    -- Intentar obtener preferencias existentes
    SELECT * INTO prefs_record
    FROM public.notification_preferences
    WHERE user_id = user_id_param;

    -- Si no existen, crear con valores por defecto
    IF NOT FOUND THEN
        INSERT INTO public.notification_preferences (user_id)
        VALUES (user_id_param)
        RETURNING * INTO prefs_record;
    END IF;

    RETURN QUERY SELECT
        prefs_record.id,
        prefs_record.user_id,
        prefs_record.email_enabled,
        prefs_record.push_enabled,
        prefs_record.sms_enabled,
        prefs_record.order_notifications,
        prefs_record.message_notifications,
        prefs_record.review_notifications,
        prefs_record.promotion_notifications,
        prefs_record.system_notifications,
        prefs_record.quiet_hours_enabled,
        prefs_record.quiet_hours_start,
        prefs_record.quiet_hours_end;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_or_create_notification_preferences(UUID) TO authenticated;

-- Función para verificar si se debe enviar notificación según preferencias
CREATE OR REPLACE FUNCTION should_send_notification(
    user_id_param UUID,
    notification_type_param TEXT,
    notification_category_param TEXT DEFAULT 'general'
)
RETURNS TABLE (
    send_email BOOLEAN,
    send_push BOOLEAN,
    send_sms BOOLEAN,
    is_quiet_hour BOOLEAN
) AS $$
DECLARE
    prefs_record RECORD;
    current_time_value TIME;
    is_quiet BOOLEAN := false;
BEGIN
    -- Obtener preferencias del usuario
    SELECT * INTO prefs_record
    FROM get_or_create_notification_preferences(user_id_param)
    LIMIT 1;

    -- Verificar si está en horas silenciosas
    current_time_value := CURRENT_TIME;
    IF prefs_record.quiet_hours_enabled THEN
        IF prefs_record.quiet_hours_start > prefs_record.quiet_hours_end THEN
            -- Horas silenciosas cruzan medianoche
            is_quiet := current_time_value >= prefs_record.quiet_hours_start OR current_time_value <= prefs_record.quiet_hours_end;
        ELSE
            -- Horas silenciosas normales
            is_quiet := current_time_value >= prefs_record.quiet_hours_start AND current_time_value <= prefs_record.quiet_hours_end;
        END IF;
    END IF;

    -- Verificar preferencias por categoría
    CASE notification_category_param
        WHEN 'order' THEN
            IF NOT prefs_record.order_notifications THEN
                RETURN QUERY SELECT false::BOOLEAN, false::BOOLEAN, false::BOOLEAN, is_quiet;
                RETURN;
            END IF;
        WHEN 'message' THEN
            IF NOT prefs_record.message_notifications THEN
                RETURN QUERY SELECT false::BOOLEAN, false::BOOLEAN, false::BOOLEAN, is_quiet;
                RETURN;
            END IF;
        WHEN 'review' THEN
            IF NOT prefs_record.review_notifications THEN
                RETURN QUERY SELECT false::BOOLEAN, false::BOOLEAN, false::BOOLEAN, is_quiet;
                RETURN;
            END IF;
        WHEN 'promotion' THEN
            IF NOT prefs_record.promotion_notifications THEN
                RETURN QUERY SELECT false::BOOLEAN, false::BOOLEAN, false::BOOLEAN, is_quiet;
                RETURN;
            END IF;
        WHEN 'system' THEN
            IF NOT prefs_record.system_notifications THEN
                RETURN QUERY SELECT false::BOOLEAN, false::BOOLEAN, false::BOOLEAN, is_quiet;
                RETURN;
            END IF;
    END CASE;

    -- Retornar preferencias de envío
    RETURN QUERY SELECT
        prefs_record.email_enabled AND NOT is_quiet AS send_email,
        prefs_record.push_enabled AS send_push,
        prefs_record.sms_enabled AND NOT is_quiet AS send_sms,
        is_quiet AS is_quiet_hour;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION should_send_notification(UUID, TEXT, TEXT) TO authenticated;

-- Función para obtener estadísticas de notificaciones
CREATE OR REPLACE FUNCTION get_notification_stats(user_id_param UUID)
RETURNS TABLE (
    total_notifications BIGINT,
    unread_notifications BIGINT,
    read_notifications BIGINT,
    notifications_by_type JSONB,
    notifications_by_category JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_notifications,
        COUNT(*) FILTER (WHERE is_read = false)::BIGINT AS unread_notifications,
        COUNT(*) FILTER (WHERE is_read = true)::BIGINT AS read_notifications,
        jsonb_object_agg(type, count) FILTER (WHERE type IS NOT NULL) AS notifications_by_type,
        jsonb_object_agg(category, count) FILTER (WHERE category IS NOT NULL) AS notifications_by_category
    FROM (
        SELECT 
            type,
            category,
            COUNT(*) as count
        FROM public.notifications
        WHERE user_id = user_id_param
        GROUP BY type, category
    ) subquery
    CROSS JOIN (
        SELECT COUNT(*) FROM public.notifications WHERE user_id = user_id_param
    ) total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_notification_stats(UUID) TO authenticated;

-- Trigger para updated_at
CREATE TRIGGER notification_preferences_updated_at
    BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_simple_updated_at();


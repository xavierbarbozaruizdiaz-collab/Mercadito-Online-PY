-- Migration: Auditoría Final de Seguridad
-- ============================================
-- Verifica y asegura que todas las medidas de seguridad estén implementadas

-- ============================================
-- VERIFICACIÓN DE RLS EN TODAS LAS TABLAS
-- ============================================

DO $$
DECLARE
    rls_missing TEXT[];
    table_name TEXT;
BEGIN
    -- Obtener todas las tablas que deberían tener RLS
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'profiles', 'stores', 'categories', 'products', 'product_variants', 
            'product_images', 'orders', 'order_items', 'cart_items', 'payments', 
            'shipments', 'notifications', 'messages', 'conversations', 
            'analytics_events', 'reviews', 'coupons', 'coupon_usages', 
            'wishlist_items', 'wishlists', 'referrals', 'product_questions', 
            'price_alerts', 'saved_searches', 'price_history',
            'notification_preferences', 'notification_delivery_log'
        )
    LOOP
        -- Verificar si RLS está habilitado
        IF NOT EXISTS (
            SELECT 1 
            FROM pg_tables t
            JOIN pg_class c ON c.relname = t.tablename
            WHERE t.schemaname = 'public' 
            AND t.tablename = table_name
            AND c.relrowsecurity = true
        ) THEN
            rls_missing := array_append(rls_missing, table_name);
            -- Habilitar RLS
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
            RAISE NOTICE 'RLS habilitado en: %', table_name;
        END IF;
    END LOOP;
    
    IF array_length(rls_missing, 1) > 0 THEN
        RAISE NOTICE 'Tablas con RLS habilitado: %', array_to_string(rls_missing, ', ');
    END IF;
END $$;

-- ============================================
-- POLÍTICAS DE SEGURIDAD FALTANTES
-- ============================================

-- Asegurar políticas para orders (si no existen)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'orders' 
        AND policyname = 'orders_select_own'
    ) THEN
        CREATE POLICY "orders_select_own" ON public.orders
        FOR SELECT TO authenticated
        USING (buyer_id = auth.uid() OR seller_id = auth.uid());
        
        CREATE POLICY "orders_insert_own" ON public.orders
        FOR INSERT TO authenticated
        WITH CHECK (buyer_id = auth.uid());
        
        CREATE POLICY "orders_update_seller" ON public.orders
        FOR UPDATE TO authenticated
        USING (seller_id = auth.uid());
        
        RAISE NOTICE 'Políticas creadas para orders';
    END IF;
END $$;

-- Asegurar políticas para cart_items
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'cart_items' 
        AND policyname = 'cart_items_select_own'
    ) THEN
        CREATE POLICY "cart_items_select_own" ON public.cart_items
        FOR SELECT TO authenticated
        USING (user_id = auth.uid());
        
        CREATE POLICY "cart_items_insert_own" ON public.cart_items
        FOR INSERT TO authenticated
        WITH CHECK (user_id = auth.uid());
        
        CREATE POLICY "cart_items_update_own" ON public.cart_items
        FOR UPDATE TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
        
        CREATE POLICY "cart_items_delete_own" ON public.cart_items
        FOR DELETE TO authenticated
        USING (user_id = auth.uid());
        
        RAISE NOTICE 'Políticas creadas para cart_items';
    END IF;
END $$;

-- Asegurar políticas para reviews
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'reviews' 
        AND policyname = 'reviews_select_public'
    ) THEN
        CREATE POLICY "reviews_select_public" ON public.reviews
        FOR SELECT TO public
        USING (COALESCE(status, 'approved') = 'approved');
        
        CREATE POLICY "reviews_insert_own" ON public.reviews
        FOR INSERT TO authenticated
        WITH CHECK (buyer_id = auth.uid());
        
        CREATE POLICY "reviews_update_own" ON public.reviews
        FOR UPDATE TO authenticated
        USING (buyer_id = auth.uid())
        WITH CHECK (buyer_id = auth.uid());
        
        CREATE POLICY "reviews_delete_own" ON public.reviews
        FOR DELETE TO authenticated
        USING (buyer_id = auth.uid());
        
        RAISE NOTICE 'Políticas creadas para reviews';
    END IF;
END $$;

-- ============================================
-- FUNCIÓN DE AUDITORÍA DE SEGURIDAD
-- ============================================

CREATE OR REPLACE FUNCTION audit_security_status()
RETURNS TABLE (
    table_name TEXT,
    rls_enabled BOOLEAN,
    policy_count BIGINT,
    has_insert_policy BOOLEAN,
    has_select_policy BOOLEAN,
    has_update_policy BOOLEAN,
    has_delete_policy BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.tablename::TEXT,
        c.relrowsecurity AS rls_enabled,
        COUNT(p.policyname)::BIGINT AS policy_count,
        BOOL_OR(p.policyname LIKE '%insert%' OR p.policyname LIKE '%INSERT%') AS has_insert_policy,
        BOOL_OR(p.policyname LIKE '%select%' OR p.policyname LIKE '%SELECT%') AS has_select_policy,
        BOOL_OR(p.policyname LIKE '%update%' OR p.policyname LIKE '%UPDATE%') AS has_update_policy,
        BOOL_OR(p.policyname LIKE '%delete%' OR p.policyname LIKE '%DELETE%') AS has_delete_policy
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    LEFT JOIN pg_policies p ON p.schemaname = t.schemaname AND p.tablename = t.tablename
    WHERE t.schemaname = 'public'
    AND t.tablename IN (
        'profiles', 'stores', 'categories', 'products', 'product_variants', 
        'product_images', 'orders', 'order_items', 'cart_items', 'payments', 
        'shipments', 'notifications', 'messages', 'conversations', 
        'analytics_events', 'reviews', 'coupons', 'coupon_usages', 
        'wishlist_items', 'wishlists', 'referrals', 'product_questions', 
        'price_alerts', 'saved_searches', 'price_history',
        'notification_preferences', 'notification_delivery_log'
    )
    GROUP BY t.tablename, c.relrowsecurity
    ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION audit_security_status() TO authenticated;

-- ============================================
-- FUNCIÓN PARA VERIFICAR PERMISOS DE USUARIO
-- ============================================

CREATE OR REPLACE FUNCTION verify_user_permissions(
    user_id_param UUID,
    resource_type TEXT,
    action TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Obtener rol del usuario
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = user_id_param;
    
    -- Verificar permisos según rol
    CASE user_role
        WHEN 'admin' THEN
            RETURN true; -- Admins tienen todos los permisos
        WHEN 'seller' THEN
            RETURN CASE
                WHEN resource_type = 'products' AND action IN ('read', 'create', 'update', 'delete') THEN true
                WHEN resource_type = 'orders' AND action = 'read' THEN true
                WHEN resource_type = 'analytics' AND action = 'read' THEN true
                ELSE false
            END;
        WHEN 'buyer' THEN
            RETURN CASE
                WHEN resource_type = 'products' AND action = 'read' THEN true
                WHEN resource_type = 'orders' AND action IN ('read', 'create', 'update') THEN true
                WHEN resource_type = 'cart' AND action IN ('read', 'create', 'update', 'delete') THEN true
                ELSE false
            END;
        ELSE
            RETURN false;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION verify_user_permissions(UUID, TEXT, TEXT) TO authenticated;

-- ============================================
-- TRIGGER PARA LOG DE ACTIVIDADES SENSIBLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.security_audit_log
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Función para registrar cambios críticos
CREATE OR REPLACE FUNCTION log_security_event()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.security_audit_log (
        user_id,
        action_type,
        table_name,
        record_id,
        old_data,
        new_data
    )
    VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger a tablas críticas (opcional, puede ser pesado en producción)
-- CREATE TRIGGER audit_profiles_changes
--     AFTER INSERT OR UPDATE OR DELETE ON public.profiles
--     FOR EACH ROW
--     EXECUTE FUNCTION log_security_event();

-- ============================================
-- ÍNDICES PARA SEGURIDAD AUDIT LOG
-- ============================================

CREATE INDEX IF NOT EXISTS idx_security_audit_user ON public.security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_table ON public.security_audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_security_audit_created ON public.security_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_action ON public.security_audit_log(action_type);

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

DO $$
DECLARE
    rls_count INTEGER;
    policy_count INTEGER;
BEGIN
    -- Contar tablas con RLS habilitado
    SELECT COUNT(*) INTO rls_count
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    WHERE t.schemaname = 'public'
    AND t.tablename IN (
        'profiles', 'stores', 'categories', 'products', 'product_variants', 
        'product_images', 'orders', 'order_items', 'cart_items', 'payments', 
        'shipments', 'notifications', 'messages', 'conversations', 
        'analytics_events', 'reviews', 'coupons', 'coupon_usages', 
        'wishlist_items', 'wishlists', 'referrals', 'product_questions', 
        'price_alerts', 'saved_searches', 'price_history',
        'notification_preferences', 'notification_delivery_log'
    )
    AND c.relrowsecurity = true;
    
    -- Contar políticas totales
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public';
    
    RAISE NOTICE '✅ Auditoría de Seguridad Completada';
    RAISE NOTICE '   - Tablas con RLS: %', rls_count;
    RAISE NOTICE '   - Políticas RLS creadas: %', policy_count;
    RAISE NOTICE '   - Funciones de seguridad: 3 (audit_security_status, verify_user_permissions, log_security_event)';
    RAISE NOTICE '   - Tabla de auditoría: security_audit_log';
END $$;


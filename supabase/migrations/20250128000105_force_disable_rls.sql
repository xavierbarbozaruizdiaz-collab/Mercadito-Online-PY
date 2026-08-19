-- ============================================
-- [LPMS SOLUCIÓN RADICAL] Deshabilitar RLS completamente
-- ============================================
-- Si las políticas permisivas no funcionan, deshabilitamos RLS directamente

-- Deshabilitar RLS en product_images
ALTER TABLE public.product_images DISABLE ROW LEVEL SECURITY;

-- Verificar que se deshabilitó
DO $$
DECLARE
    v_rls_enabled BOOLEAN;
BEGIN
    SELECT relrowsecurity INTO v_rls_enabled
    FROM pg_class
    WHERE relname = 'product_images'
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    
    IF v_rls_enabled THEN
        RAISE NOTICE 'RLS todavía está habilitado en product_images';
    ELSE
        RAISE NOTICE 'RLS deshabilitado correctamente en product_images';
    END IF;
END $$;







-- ============================================
-- [LPMS VERIFICACIÓN] Verificar que RLS está deshabilitado
-- ============================================

-- Verificar estado de RLS en product_images
SELECT 
    relname as table_name,
    relrowsecurity as rls_enabled,
    CASE 
        WHEN relrowsecurity THEN 'HABILITADO (PROBLEMA)'
        ELSE 'DESHABILITADO (CORRECTO)'
    END as status
FROM pg_class
WHERE relname = 'product_images'
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Si RLS está habilitado, deshabilitarlo
DO $$
DECLARE
    v_rls_enabled BOOLEAN;
BEGIN
    SELECT relrowsecurity INTO v_rls_enabled
    FROM pg_class
    WHERE relname = 'product_images'
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    
    IF v_rls_enabled THEN
        ALTER TABLE public.product_images DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS deshabilitado en product_images';
    ELSE
        RAISE NOTICE 'RLS ya está deshabilitado en product_images';
    END IF;
END $$;







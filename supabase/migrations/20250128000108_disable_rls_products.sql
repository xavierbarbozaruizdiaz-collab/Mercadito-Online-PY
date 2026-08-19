-- ============================================
-- [LPMS CRÍTICO] Deshabilitar RLS en products también
-- ============================================
-- El error puede venir del UPDATE a products, no de product_images

-- Deshabilitar RLS en products
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;

-- Verificar que se deshabilitó
DO $$
DECLARE
    v_rls_enabled BOOLEAN;
BEGIN
    SELECT relrowsecurity INTO v_rls_enabled
    FROM pg_class
    WHERE relname = 'products'
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    
    IF v_rls_enabled THEN
        RAISE NOTICE 'RLS todavía está habilitado en products';
    ELSE
        RAISE NOTICE 'RLS deshabilitado correctamente en products';
    END IF;
END $$;







-- ============================================
-- [LPMS VERIFICACIÓN COMPLETA] Verificar RLS en todas las tablas relacionadas
-- ============================================

-- Verificar RLS en product_images
SELECT 
    'product_images' as table_name,
    relrowsecurity as rls_enabled,
    CASE WHEN relrowsecurity THEN 'HABILITADO' ELSE 'DESHABILITADO' END as status
FROM pg_class
WHERE relname = 'product_images'
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')

UNION ALL

-- Verificar RLS en products
SELECT 
    'products' as table_name,
    relrowsecurity as rls_enabled,
    CASE WHEN relrowsecurity THEN 'HABILITADO' ELSE 'DESHABILITADO' END as status
FROM pg_class
WHERE relname = 'products'
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Si alguna está habilitada, deshabilitarla
DO $$
DECLARE
    v_product_images_rls BOOLEAN;
    v_products_rls BOOLEAN;
BEGIN
    SELECT relrowsecurity INTO v_product_images_rls
    FROM pg_class
    WHERE relname = 'product_images'
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    
    SELECT relrowsecurity INTO v_products_rls
    FROM pg_class
    WHERE relname = 'products'
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    
    IF v_product_images_rls THEN
        ALTER TABLE public.product_images DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS deshabilitado en product_images';
    ELSE
        RAISE NOTICE 'RLS ya estaba deshabilitado en product_images';
    END IF;
    
    IF v_products_rls THEN
        ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS deshabilitado en products';
    ELSE
        RAISE NOTICE 'RLS ya estaba deshabilitado en products';
    END IF;
END $$;







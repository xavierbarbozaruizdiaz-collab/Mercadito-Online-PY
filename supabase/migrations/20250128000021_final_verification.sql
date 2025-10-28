-- Verificación final de categorías y acceso
DO $$
DECLARE
    category_count INTEGER;
    rec RECORD;
BEGIN
    -- Contar categorías
    SELECT COUNT(*) INTO category_count FROM public.categories;
    RAISE NOTICE '=== VERIFICACIÓN FINAL DE CATEGORÍAS ===';
    RAISE NOTICE 'Total de categorías en la base de datos: %', category_count;
    
    -- Mostrar todas las categorías
    RAISE NOTICE 'Lista de categorías:';
    FOR rec IN (SELECT id, name FROM public.categories ORDER BY name) LOOP
        RAISE NOTICE '  - %: %', rec.id, rec.name;
    END LOOP;
    
    -- Verificar políticas RLS
    RAISE NOTICE 'Verificando políticas RLS...';
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'categories' 
        AND policyname = 'categories_select_public'
    ) THEN
        RAISE NOTICE '✅ Política categories_select_public existe';
    ELSE
        RAISE NOTICE '❌ Política categories_select_public NO existe';
    END IF;
    
    -- Verificar si RLS está habilitado
    IF EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = 'categories' 
        AND relrowsecurity = true
    ) THEN
        RAISE NOTICE '✅ RLS está habilitado para categories';
    ELSE
        RAISE NOTICE '❌ RLS NO está habilitado para categories';
    END IF;
    
    RAISE NOTICE '=== FIN DE VERIFICACIÓN ===';
END $$;

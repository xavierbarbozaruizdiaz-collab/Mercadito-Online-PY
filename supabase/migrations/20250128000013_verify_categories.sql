-- Verificar categorías existentes
DO $$
DECLARE
    category_count INTEGER;
    rec RECORD;
BEGIN
    SELECT COUNT(*) INTO category_count FROM public.categories;
    RAISE NOTICE 'Total de categorías: %', category_count;
    
    -- Mostrar todas las categorías
    FOR rec IN (SELECT id, name FROM public.categories ORDER BY name) LOOP
        RAISE NOTICE 'Categoría: % - %', rec.id, rec.name;
    END LOOP;
END $$;

-- Verificar y corregir completamente el acceso a categorías

-- 1. Verificar que la tabla existe y tiene datos
DO $$
DECLARE
    category_count INTEGER;
    table_exists BOOLEAN;
BEGIN
    -- Verificar si la tabla existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'categories' AND table_schema = 'public'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'Tabla categories existe';
        
        -- Contar categorías
        SELECT COUNT(*) INTO category_count FROM public.categories;
        RAISE NOTICE 'Total de categorías: %', category_count;
        
        -- Si no hay categorías, insertar algunas
        IF category_count = 0 THEN
            INSERT INTO public.categories (name) VALUES
                ('Electrónicos'),
                ('Ropa y Accesorios'),
                ('Hogar y Jardín'),
                ('Deportes y Fitness'),
                ('Libros y Música'),
                ('Juguetes y Juegos'),
                ('Automotriz'),
                ('Belleza y Salud'),
                ('Alimentos y Bebidas'),
                ('Otros')
            ON CONFLICT (name) DO NOTHING;
            
            RAISE NOTICE 'Categorías básicas insertadas';
        END IF;
    ELSE
        RAISE NOTICE 'ERROR: Tabla categories NO existe';
    END IF;
END $$;

-- 2. Asegurar que RLS está habilitado
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 3. Eliminar todas las políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "categories_select_public" ON public.categories;
DROP POLICY IF EXISTS "categories_select_all" ON public.categories;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.categories;

-- 4. Crear política simple y efectiva
CREATE POLICY "categories_select_public" ON public.categories 
FOR SELECT 
TO public, authenticated, anon
USING (true);

-- 5. Verificar que la política se creó
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE tablename = 'categories' AND policyname = 'categories_select_public';
    
    IF policy_count > 0 THEN
        RAISE NOTICE 'Política categories_select_public creada exitosamente';
    ELSE
        RAISE NOTICE 'ERROR: No se pudo crear la política';
    END IF;
END $$;

-- 6. Probar acceso directo
DO $$
DECLARE
    test_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO test_count FROM public.categories;
    RAISE NOTICE 'Prueba de acceso: % categorías encontradas', test_count;
END $$;

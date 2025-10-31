-- Asegurar que las categorías estén disponibles y las políticas RLS funcionen

-- 1. Verificar que la tabla categories existe y tiene datos
DO $$
DECLARE
    category_count INTEGER;
BEGIN
    -- Contar categorías existentes
    SELECT COUNT(*) INTO category_count FROM public.categories;
    RAISE NOTICE 'Total de categorías encontradas: %', category_count;
    
    -- Si no hay categorías, insertar algunas básicas
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
END $$;

-- 2. Asegurar que RLS está habilitado
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 3. Eliminar políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "categories_select_public" ON public.categories;

-- 4. Crear política de lectura pública
CREATE POLICY "categories_select_public" ON public.categories 
FOR SELECT TO public 
USING (true);

-- 5. Verificar que la política se creó correctamente
DO $$
DECLARE
    policy_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'categories' 
        AND policyname = 'categories_select_public'
    ) INTO policy_exists;
    
    IF policy_exists THEN
        RAISE NOTICE 'Política categories_select_public creada exitosamente';
    ELSE
        RAISE NOTICE 'ERROR: No se pudo crear la política categories_select_public';
    END IF;
END $$;

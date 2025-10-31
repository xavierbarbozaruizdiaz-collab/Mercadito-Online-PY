-- Verificar categorías existentes
SELECT COUNT(*) as total_categorias FROM public.categories;

-- Mostrar todas las categorías
SELECT id, name FROM public.categories ORDER BY name;

-- Verificar políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'categories';

-- ============================================
-- VERIFICAR QUE LAS POLITICAS RLS SE APLICARON
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Verificar políticas de profiles
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles'
ORDER BY policyname;

-- Verificar políticas de orders
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'orders'
ORDER BY policyname;

-- Verificar políticas de order_items
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'order_items'
ORDER BY policyname;

-- Verificar políticas de products
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'products'
ORDER BY policyname;

-- Verificar políticas de categories
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'categories'
ORDER BY policyname;

-- Probar consulta simple a profiles
SELECT COUNT(*) as total_profiles FROM public.profiles;

-- Probar consulta con filtro por ID (como hace la app)
SELECT id, role, email FROM public.profiles LIMIT 5;

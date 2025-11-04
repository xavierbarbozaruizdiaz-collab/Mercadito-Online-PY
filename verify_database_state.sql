-- ============================================
-- Script de Verificación - Estado de la Base de Datos
-- ============================================
-- Ejecutar este script en Supabase SQL Editor para verificar el estado actual

-- 1. Verificar columnas de products relacionadas con imágenes
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'products' 
AND table_schema = 'public'
AND column_name IN ('image_url', 'cover_url', 'seller_id', 'store_id')
ORDER BY column_name;

-- 2. Verificar si image_url existe (debe retornar 0 filas)
SELECT 
    'image_url EXISTS' as check_name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '❌ PROBLEMA: image_url todavía existe'
        ELSE '✅ OK: image_url no existe'
    END as status
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name = 'image_url' 
AND table_schema = 'public';

-- 3. Verificar si cover_url existe (debe retornar 1 fila)
SELECT 
    'cover_url EXISTS' as check_name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ OK: cover_url existe'
        ELSE '❌ PROBLEMA: cover_url no existe'
    END as status
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name = 'cover_url' 
AND table_schema = 'public';

-- 4. Verificar políticas RLS de products
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'products'
ORDER BY policyname;

-- 5. Contar productos con cover_url vs null
SELECT 
    'Products with cover_url' as metric,
    COUNT(*) FILTER (WHERE cover_url IS NOT NULL) as with_url,
    COUNT(*) FILTER (WHERE cover_url IS NULL) as without_url,
    COUNT(*) as total
FROM public.products;





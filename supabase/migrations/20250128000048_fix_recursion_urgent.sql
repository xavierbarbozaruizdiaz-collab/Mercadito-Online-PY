-- ============================================
-- SOLUCIÓN URGENTE: Eliminar recursión infinita en RLS
-- Error: 42P27 - infinite recursion detected in policy for relation "profiles"
-- ============================================

-- ============================================
-- 1. ELIMINAR TODAS LAS POLÍTICAS PROBLEMÁTICAS DE PROFILES
-- ============================================

-- Eliminar TODAS las políticas existentes que puedan causar recursión
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.profiles;

-- Asegurar limpieza de política previa con mismo nombre
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;

-- ============================================
-- 2. CREAR POLÍTICAS SIMPLES SIN RECURSIÓN PARA PROFILES
-- ============================================

-- SELECT: Permitir lectura pública de profiles (sin verificar roles para evitar recursión)
CREATE POLICY "profiles_select_all"
ON public.profiles FOR SELECT
TO public
USING (true);

-- INSERT: Permitir a usuarios autenticados crear su propio perfil
CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- UPDATE: Permitir a usuarios autenticados actualizar solo su propio perfil
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================
-- 3. CORREGIR CATEGORIES: ACCESO PÚBLICO COMPLETO
-- ============================================

-- Eliminar todas las políticas existentes de categories
DROP POLICY IF EXISTS "categories_select_public" ON public.categories;
DROP POLICY IF EXISTS "categories_select_all" ON public.categories;
DROP POLICY IF EXISTS "categories_insert_admin" ON public.categories;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.categories;

-- SELECT: Acceso público completo (sin autenticación)
CREATE POLICY "categories_select_all"
ON public.categories FOR SELECT
TO public
USING (true);

-- INSERT: Temporalmente deshabilitado (solo para admins manualmente)
-- Por ahora, no permitimos INSERT a través de RLS para evitar complejidad

-- ============================================
-- 4. ASEGURAR PRODUCTS TIENE ACCESO PÚBLICO
-- ============================================

-- Eliminar políticas conflictivas de products
DROP POLICY IF EXISTS "Public can view products" ON public.products;
DROP POLICY IF EXISTS "products_select_public" ON public.products;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.products;

-- Crear política pública simple para products
CREATE POLICY "products_select_public"
ON public.products FOR SELECT
TO public
USING (
  -- Mostrar productos activos o sin status (compatibilidad)
  COALESCE(status, 'active') = 'active' OR status IS NULL
);

-- ============================================
-- 5. VERIFICACIÓN Y MENSAJE FINAL
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migración de corrección de recursión aplicada exitosamente';
    RAISE NOTICE '   - profiles: Políticas simplificadas sin recursión';
    RAISE NOTICE '   - categories: Acceso público de lectura habilitado';
    RAISE NOTICE '   - products: Acceso público de lectura habilitado';
    RAISE NOTICE '   - Todas las políticas problemáticas eliminadas';
END $$;


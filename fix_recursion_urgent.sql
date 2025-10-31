-- ============================================
-- EJECUTAR ESTE SCRIPT EN SUPABASE SQL EDITOR
-- SOLUCIÓN URGENTE: Eliminar recursión infinita en RLS
-- Error: 42P27 - infinite recursion detected in policy for relation "profiles"
-- ============================================

-- ============================================
-- 1. ELIMINAR ABSOLUTAMENTE TODAS LAS POLÍTICAS DE PROFILES
-- ============================================

-- PASO CRÍTICO: Deshabilitar RLS temporalmente para permitir limpieza completa
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Eliminar TODAS las políticas conocidas que puedan causar recursión
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON public.profiles;

-- Eliminar dinámicamente cualquier otra política restante
DO $$
DECLARE
    r RECORD;
    policy_count INTEGER := 0;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
            policy_count := policy_count + 1;
            RAISE NOTICE '✅ Política eliminada: %', r.policyname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ No se pudo eliminar política: % - %', r.policyname, SQLERRM;
        END;
    END LOOP;
    RAISE NOTICE '📊 Total de políticas eliminadas: %', policy_count;
END $$;

-- ============================================
-- 2. REHABILITAR RLS Y CREAR POLÍTICAS SIMPLES SIN RECURSIÓN
-- ============================================

-- Rehabilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Crear políticas SIMPLES sin recursión
-- IMPORTANTE: Estas políticas NO consultan la tabla profiles dentro de sí mismas

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


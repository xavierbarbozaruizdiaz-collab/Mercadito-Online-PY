-- ============================================
-- ⚠️ SOLUCIÓN URGENTE: CORREGIR RECURSIÓN INFINITA
-- Ejecutar ESTE script en Supabase SQL Editor
-- Error: 42P17/42P27 - infinite recursion in "profiles"
-- ============================================

-- ============================================
-- PASO 1: ELIMINAR ABSOLUTAMENTE TODAS LAS POLÍTICAS DE PROFILES
-- ============================================

-- Deshabilitar RLS temporalmente para permitir la limpieza
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Eliminar TODAS las políticas conocidas
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
    -- Primero intentar eliminar todas las políticas que puedan existir
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
-- PASO 2: REHABILITAR RLS Y CREAR POLÍTICAS SIMPLES
-- ============================================

-- Rehabilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Crear políticas SIMPLES sin recursión
-- Estas políticas NO consultan la tabla profiles dentro de sí mismas

-- SELECT: Lectura pública (sin verificar roles para evitar recursión)
CREATE POLICY "profiles_select_all"
ON public.profiles FOR SELECT
TO public
USING (true);

-- INSERT: Usuarios autenticados pueden crear su propio perfil
CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- UPDATE: Usuarios autenticados pueden actualizar solo su propio perfil
-- IMPORTANTE: No verificamos roles aquí para evitar recursión
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================
-- PASO 3: CORREGIR CATEGORIES (verificar acceso público)
-- ============================================

DROP POLICY IF EXISTS "categories_select_public" ON public.categories;
DROP POLICY IF EXISTS "categories_select_all" ON public.categories;
DROP POLICY IF EXISTS "categories_insert_admin" ON public.categories;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.categories;

CREATE POLICY "categories_select_all"
ON public.categories FOR SELECT
TO public
USING (true);

-- ============================================
-- PASO 4: VERIFICAR PRODUCTS (asegurar acceso público)
-- ============================================

DROP POLICY IF EXISTS "Public can view products" ON public.products;
DROP POLICY IF EXISTS "products_select_public" ON public.products;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.products;

CREATE POLICY "products_select_public"
ON public.products FOR SELECT
TO public
USING (
  COALESCE(status, 'active') = 'active' OR status IS NULL
);

-- ============================================
-- PASO 5: MENSAJE DE CONFIRMACIÓN
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '✅ SOLUCIÓN APLICADA EXITOSAMENTE';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '   ✓ Todas las políticas recursivas eliminadas';
    RAISE NOTICE '   ✓ Políticas simples creadas sin recursión';
    RAISE NOTICE '   ✓ profiles: Acceso público de lectura';
    RAISE NOTICE '   ✓ categories: Acceso público de lectura';
    RAISE NOTICE '   ✓ products: Acceso público de lectura';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 RECARGA TU APLICACIÓN AHORA';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;


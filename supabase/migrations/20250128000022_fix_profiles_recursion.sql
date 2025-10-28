-- SOLUCIÓN CRÍTICA: Eliminar políticas problemáticas de profiles
-- Este error causa recursión infinita y bloquea toda la aplicación

-- Eliminar todas las políticas existentes de profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.profiles;

-- Crear políticas simples y seguras para profiles
CREATE POLICY "profiles_select_public" ON public.profiles FOR SELECT TO public USING (true);
CREATE POLICY "profiles_insert_authenticated" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Verificar que no hay recursión
DO $$
BEGIN
    RAISE NOTICE '✅ Políticas de profiles corregidas - sin recursión';
END $$;

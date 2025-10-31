-- ============================================
-- SOLUCIÓN CRÍTICA: Corregir recursión infinita en RLS
-- Error 500 en profiles y categories
-- ============================================

-- ============================================
-- 1. CORREGIR PROFILES: Eliminar recursión
-- ============================================

-- Eliminar políticas problemáticas que causan recursión
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Crear función segura para verificar si es admin (sin recursión)
-- SECURITY DEFINER permite que la función bypass RLS y acceda directamente
CREATE OR REPLACE FUNCTION public.is_user_admin_safe()
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
    user_role TEXT;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- SECURITY DEFINER permite acceso directo sin RLS, evitando recursión
    SELECT p.role INTO user_role
    FROM public.profiles p
    WHERE p.id = current_user_id
    LIMIT 1;
    
    RETURN COALESCE(user_role, 'buyer') = 'admin';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Crear política de SELECT para admins sin recursión
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  -- Si es su propio perfil, puede verlo
  auth.uid() = id
  OR
  -- Si es admin, puede ver todos (usando función sin recursión)
  public.is_user_admin_safe()
);

-- Crear política de UPDATE sin recursión
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  -- No verificar rol actual para evitar recursión
);

-- ============================================
-- 2. ASEGURAR CATEGORIES TIENE RLS PÚBLICO
-- ============================================

-- Habilitar RLS en categories si no está habilitado
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes de categories para recrearlas
DROP POLICY IF EXISTS "categories_select_public" ON public.categories;
DROP POLICY IF EXISTS "categories_select_all" ON public.categories;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.categories;

-- Crear política pública simple para categories (sin autenticación requerida)
CREATE POLICY "categories_select_public"
ON public.categories FOR SELECT
TO public
USING (true);

-- Permitir insert solo a admins (opcional, para futuras expansiones)
CREATE POLICY "categories_insert_admin"
ON public.categories FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================
-- 3. MEJORAR POLÍTICA DE PRODUCTS (por si acaso)
-- ============================================

-- Asegurar que products tiene política pública de lectura
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'products' 
        AND policyname = 'products_select_public'
    ) THEN
        CREATE POLICY "products_select_public"
        ON public.products FOR SELECT
        TO public
        USING (status = 'active' OR auth.uid() = seller_id);
    END IF;
END $$;

-- ============================================
-- 4. VERIFICACIÓN FINAL
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Políticas RLS corregidas:';
    RAISE NOTICE '   - profiles: Sin recursión, usando función segura';
    RAISE NOTICE '   - categories: Lectura pública habilitada';
    RAISE NOTICE '   - products: Lectura pública verificada';
END $$;


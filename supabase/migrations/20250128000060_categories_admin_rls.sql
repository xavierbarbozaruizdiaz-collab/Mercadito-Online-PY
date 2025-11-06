-- Agregar políticas RLS para admins en la tabla categories
-- Permitir SELECT público (ya existe), INSERT/UPDATE/DELETE solo para admins

-- 1. Verificar/crear función para verificar si el usuario es admin
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Eliminar políticas de admin existentes si las hay
DROP POLICY IF EXISTS "categories_admin_all" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_insert" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_update" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_delete" ON public.categories;

-- 3. Crear políticas para admins
-- INSERT para admins
CREATE POLICY "categories_admin_insert" ON public.categories
FOR INSERT
TO authenticated
WITH CHECK (is_current_user_admin() = true);

-- UPDATE para admins
CREATE POLICY "categories_admin_update" ON public.categories
FOR UPDATE
TO authenticated
USING (is_current_user_admin() = true)
WITH CHECK (is_current_user_admin() = true);

-- DELETE para admins
CREATE POLICY "categories_admin_delete" ON public.categories
FOR DELETE
TO authenticated
USING (is_current_user_admin() = true);

-- 4. Verificar que las políticas se crearon
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE tablename = 'categories' 
    AND policyname IN ('categories_select_public', 'categories_admin_insert', 'categories_admin_update', 'categories_admin_delete');
    
    RAISE NOTICE 'Políticas creadas para categories: %', policy_count;
END $$;

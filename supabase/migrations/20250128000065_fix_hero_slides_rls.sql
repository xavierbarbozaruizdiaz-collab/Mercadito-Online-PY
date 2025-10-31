-- Corregir políticas RLS para hero_slides
-- El problema es que auth.jwt() no contiene el role, debe verificarse desde profiles

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "hero_read_public" ON public.hero_slides;
DROP POLICY IF EXISTS "hero_write_admin" ON public.hero_slides;

-- Crear función para verificar si el usuario es admin (si no existe)
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

-- Política de lectura: público puede ver slides activos, autenticados pueden ver todos
CREATE POLICY "hero_read_public" ON public.hero_slides
FOR SELECT
TO public, authenticated
USING (
  is_active = true 
  OR is_current_user_admin() = true
);

-- Política de inserción: solo admins
CREATE POLICY "hero_insert_admin" ON public.hero_slides
FOR INSERT
TO authenticated
WITH CHECK (is_current_user_admin() = true);

-- Política de actualización: solo admins
CREATE POLICY "hero_update_admin" ON public.hero_slides
FOR UPDATE
TO authenticated
USING (is_current_user_admin() = true)
WITH CHECK (is_current_user_admin() = true);

-- Política de eliminación: solo admins
CREATE POLICY "hero_delete_admin" ON public.hero_slides
FOR DELETE
TO authenticated
USING (is_current_user_admin() = true);

-- Verificar que las políticas se crearon
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE tablename = 'hero_slides';
    
    RAISE NOTICE 'Políticas creadas para hero_slides: %', policy_count;
END $$;

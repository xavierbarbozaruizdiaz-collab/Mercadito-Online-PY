-- ============================================
-- MERCADITO ONLINE PY - ADMIN UPDATE PROFILES
-- Permitir que administradores modifiquen otros perfiles
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Admins can update profiles'
  ) THEN
    DROP POLICY "Admins can update profiles" ON public.profiles;
  END IF;
END $$;

CREATE POLICY "Admins can update profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  )
);
















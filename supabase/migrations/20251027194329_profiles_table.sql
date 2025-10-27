-- ============================================
-- Crear tabla public.profiles con políticas RLS
-- ============================================

-- 1. Crear tabla profiles si no existe
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('admin', 'seller', 'buyer')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Habilitar RLS en profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Crear índices para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 4. Limpiar políticas existentes (si existen) para evitar conflictos
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON public.profiles;

-- 5. SELECT: Usuario autenticado puede leer su propio perfil
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 6. SELECT: Administradores pueden leer todos los perfiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  -- Verifica si el usuario actual es admin consultando su propio perfil
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- 7. UPDATE: Usuario autenticado puede modificar solo su propio perfil
-- Nota: No permitimos que usuarios cambien su rol manualmente por seguridad
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  -- Previene que usuarios cambien su propio rol
  AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
);

-- 8. INSERT: Permitir que se cree un perfil automáticamente para nuevos usuarios
-- Esto puede ser usado por triggers o en el proceso de registro
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 9. Función auxiliar: Crear perfil automáticamente cuando se registra un usuario
-- Esto es útil para asegurar que cada usuario tiene un perfil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    'buyer' -- Por defecto, todos los nuevos usuarios son 'buyer'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Trigger para crear perfil automáticamente al registrarse
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 11. Comentarios para documentación
COMMENT ON TABLE public.profiles IS 'Tabla de perfiles de usuario con información extendida y roles';
COMMENT ON COLUMN public.profiles.id IS 'UUID del usuario, referencia a auth.users.id';
COMMENT ON COLUMN public.profiles.email IS 'Email único del usuario';
COMMENT ON COLUMN public.profiles.role IS 'Rol del usuario: admin (administrador), seller (vendedor), buyer (comprador)';
COMMENT ON COLUMN public.profiles.created_at IS 'Fecha de creación del perfil';


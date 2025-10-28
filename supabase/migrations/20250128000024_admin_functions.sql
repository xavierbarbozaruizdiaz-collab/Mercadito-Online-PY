-- ============================================
-- Función para asignar rol de admin desde la aplicación
-- ============================================

-- Función para asignar rol de admin al usuario actual (ejecutable desde la app)
CREATE OR REPLACE FUNCTION public.assign_current_user_admin()
RETURNS JSON AS $$
DECLARE
    current_user_id UUID;
    current_user_email TEXT;
    result JSON;
BEGIN
    -- Obtener el ID del usuario actual
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'No hay usuario autenticado'
        );
    END IF;
    
    -- Obtener el email del usuario actual
    SELECT email INTO current_user_email 
    FROM auth.users 
    WHERE id = current_user_id;
    
    -- Crear o actualizar el perfil con rol de admin
    INSERT INTO public.profiles (id, email, role)
    VALUES (current_user_id, current_user_email, 'admin')
    ON CONFLICT (id) 
    DO UPDATE SET 
        role = 'admin',
        email = EXCLUDED.email;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Usuario asignado como administrador',
        'email', current_user_email,
        'role', 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si el usuario actual es admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
    user_role TEXT;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    SELECT role INTO user_role
    FROM public.profiles 
    WHERE id = current_user_id;
    
    RETURN COALESCE(user_role = 'admin', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

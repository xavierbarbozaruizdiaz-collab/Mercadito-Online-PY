-- ============================================
-- SOLUCIÓN CRÍTICA: Corregir función ensure_user_profile
-- ============================================

-- Eliminar función problemática
DROP FUNCTION IF EXISTS public.ensure_user_profile();

-- Crear función corregida sin problemas de JSON
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS TEXT AS $$
DECLARE
    current_user_id UUID;
    current_user_email TEXT;
    existing_profile BOOLEAN;
    result_message TEXT;
BEGIN
    -- Obtener el ID del usuario actual
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN 'ERROR: No hay usuario autenticado';
    END IF;
    
    -- Obtener el email del usuario actual
    SELECT email INTO current_user_email 
    FROM auth.users 
    WHERE id = current_user_id;
    
    -- Verificar si ya existe un perfil
    SELECT EXISTS(
        SELECT 1 FROM public.profiles 
        WHERE id = current_user_id
    ) INTO existing_profile;
    
    -- Si no existe, crear el perfil
    IF NOT existing_profile THEN
        INSERT INTO public.profiles (id, email, role)
        VALUES (current_user_id, current_user_email, 'buyer')
        ON CONFLICT (id) DO NOTHING;
        
        result_message := 'SUCCESS: Perfil creado exitosamente para ' || current_user_email;
    ELSE
        result_message := 'SUCCESS: Perfil ya existe para ' || current_user_email;
    END IF;
    
    RETURN result_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función simple para verificar si el usuario es admin
CREATE OR REPLACE FUNCTION public.is_user_admin()
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

-- Función para asignar rol admin (simplificada)
CREATE OR REPLACE FUNCTION public.assign_admin_role()
RETURNS TEXT AS $$
DECLARE
    current_user_id UUID;
    current_user_email TEXT;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN 'ERROR: No hay usuario autenticado';
    END IF;
    
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
    
    RETURN 'SUCCESS: Usuario ' || current_user_email || ' asignado como administrador';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

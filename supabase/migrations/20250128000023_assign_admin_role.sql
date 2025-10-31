-- ============================================
-- Asignar rol de administrador al usuario actual
-- ============================================

-- Función para asignar rol de admin al usuario actual
CREATE OR REPLACE FUNCTION public.assign_admin_role()
RETURNS TEXT AS $$
DECLARE
    current_user_id UUID;
    current_user_email TEXT;
    result_message TEXT;
BEGIN
    -- Obtener el ID del usuario actual
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN 'Error: No hay usuario autenticado';
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
    
    result_message := 'Usuario ' || current_user_email || ' asignado como administrador';
    
    RAISE NOTICE '%', result_message;
    RETURN result_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ejecutar la función para asignar el rol de admin
SELECT public.assign_admin_role();

-- Verificar que el usuario actual tiene rol de admin
DO $$
DECLARE
    current_user_id UUID;
    user_role TEXT;
    user_email TEXT;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NOT NULL THEN
        SELECT role, email INTO user_role, user_email
        FROM public.profiles 
        WHERE id = current_user_id;
        
        IF user_role = 'admin' THEN
            RAISE NOTICE '✅ Usuario % tiene rol de administrador', user_email;
        ELSE
            RAISE NOTICE '❌ Usuario % tiene rol: %', user_email, user_role;
        END IF;
    ELSE
        RAISE NOTICE '❌ No hay usuario autenticado';
    END IF;
END $$;

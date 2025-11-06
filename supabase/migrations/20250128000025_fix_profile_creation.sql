-- ============================================
-- SOLUCIÓN CRÍTICA: Crear perfil para usuario actual
-- ============================================

-- Función para crear perfil del usuario actual si no existe
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS JSON AS $$
DECLARE
    current_user_id UUID;
    current_user_email TEXT;
    existing_profile BOOLEAN;
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
        
        RETURN json_build_object(
            'success', true,
            'message', 'Perfil creado exitosamente',
            'email', current_user_email,
            'role', 'buyer',
            'created', true
        );
    ELSE
        -- Si ya existe, devolver la información
        SELECT role INTO result
        FROM public.profiles 
        WHERE id = current_user_id;
        
        RETURN json_build_object(
            'success', true,
            'message', 'Perfil ya existe',
            'email', current_user_email,
            'role', result,
            'created', false
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ejecutar la función para crear el perfil del usuario actual
SELECT public.ensure_user_profile();

-- Verificar que el perfil existe
DO $$
DECLARE
    current_user_id UUID;
    profile_count INTEGER;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NOT NULL THEN
        SELECT COUNT(*) INTO profile_count
        FROM public.profiles 
        WHERE id = current_user_id;
        
        IF profile_count > 0 THEN
            RAISE NOTICE '✅ Perfil del usuario actual existe';
        ELSE
            RAISE NOTICE '❌ Perfil del usuario actual NO existe';
        END IF;
    ELSE
        RAISE NOTICE '❌ No hay usuario autenticado';
    END IF;
END $$;

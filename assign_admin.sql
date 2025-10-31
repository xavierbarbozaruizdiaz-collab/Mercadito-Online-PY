-- ============================================
-- ASIGNAR ROL DE ADMINISTRADOR AL USUARIO ACTUAL
-- EJECUTAR ESTE SCRIPT EN SUPABASE SQL EDITOR
-- ============================================

-- Opción 1: Asignar admin al usuario actual usando función RPC
-- NOTA: Esto solo funciona si estás autenticado en Supabase Dashboard
-- Si no funciona, usa la Opción 2
DO $$
BEGIN
    PERFORM public.assign_admin_role();
    RAISE NOTICE '✅ Función assign_admin_role() ejecutada';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Error ejecutando assign_admin_role(): %', SQLERRM;
        RAISE NOTICE '   Usa la Opción 2 en su lugar';
END $$;

-- Opción 2: Asignar admin a un usuario específico por email
-- Reemplaza 'tu-email@ejemplo.com' con tu email real
DO $$
DECLARE
    target_email TEXT := 'mercadoxbar@gmail.com'; -- 👈 CAMBIA ESTO A TU EMAIL
    target_user_id UUID;
    target_user_role TEXT;
BEGIN
    -- Buscar el usuario por email
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = target_email;
    
    IF target_user_id IS NULL THEN
        RAISE NOTICE '❌ Usuario con email % no encontrado', target_email;
        RETURN;
    END IF;
    
    -- Verificar rol actual
    SELECT role INTO target_user_role
    FROM public.profiles
    WHERE id = target_user_id;
    
    -- Crear o actualizar perfil con rol de admin
    INSERT INTO public.profiles (id, email, role)
    VALUES (target_user_id, target_email, 'admin')
    ON CONFLICT (id) 
    DO UPDATE SET 
        role = 'admin',
        email = EXCLUDED.email;
    
    RAISE NOTICE '✅ Rol de administrador asignado a: %', target_email;
    RAISE NOTICE '   User ID: %', target_user_id;
    RAISE NOTICE '   Rol anterior: %', COALESCE(target_user_role, 'sin perfil');
    RAISE NOTICE '   Rol nuevo: admin';
END $$;

-- Opción 3: Ver todos los usuarios y sus roles
SELECT 
    u.email,
    p.role,
    p.id as profile_id,
    u.id as user_id
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.email;


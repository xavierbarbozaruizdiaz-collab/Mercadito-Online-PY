-- ============================================
-- VERIFICAR Y CONFIGURAR ADMIN
-- ============================================

-- 1. Verificar si mercadoxbar@gmail.com es admin
SELECT 
    id, 
    email, 
    role,
    created_at
FROM profiles 
WHERE email = 'mercadoxbar@gmail.com';

-- 2. Si no es admin o no existe, actualizarlo a admin
-- (Ejecutar solo si el resultado anterior muestra que NO es admin)
UPDATE profiles 
SET role = 'admin'
WHERE email = 'mercadoxbar@gmail.com';

-- 3. Si el usuario no existe en profiles pero sí en auth.users, crear perfil
-- Primero verificar si existe en auth.users:
SELECT id, email 
FROM auth.users 
WHERE email = 'mercadoxbar@gmail.com';

-- Si existe en auth.users pero no en profiles, ejecutar:
INSERT INTO profiles (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'mercadoxbar@gmail.com'
ON CONFLICT (id) DO UPDATE SET 
    role = 'admin',
    email = EXCLUDED.email;

-- 4. Verificar resultado final
SELECT 
    p.id, 
    p.email, 
    p.role,
    CASE 
        WHEN p.role = 'admin' THEN '✅ ES ADMIN'
        ELSE '❌ NO ES ADMIN'
    END as status
FROM profiles p
WHERE p.email = 'mercadoxbar@gmail.com';


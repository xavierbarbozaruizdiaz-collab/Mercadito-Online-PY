-- ============================================
-- MERCADITO ONLINE PY - FIX STORES RLS
-- Corregir políticas RLS para stores
-- ============================================

-- Habilitar RLS si no está habilitado
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes que puedan causar conflictos
DROP POLICY IF EXISTS "stores_select_public" ON stores;
DROP POLICY IF EXISTS "stores_insert_seller" ON stores;
DROP POLICY IF EXISTS "stores_update_own" ON stores;
DROP POLICY IF EXISTS "stores_delete_own" ON stores;
DROP POLICY IF EXISTS "stores_select_own" ON stores;

-- SELECT: Público puede ver tiendas activas
CREATE POLICY "stores_select_public" 
ON stores FOR SELECT 
TO public 
USING (is_active = true);

-- SELECT: Autenticados pueden ver su propia tienda (aunque esté inactiva)
CREATE POLICY "stores_select_own" 
ON stores FOR SELECT 
TO authenticated 
USING (
  seller_id IN (
    SELECT id FROM profiles WHERE id = auth.uid()
  )
);

-- SELECT: Admins pueden ver todas las tiendas
CREATE POLICY "stores_select_admin" 
ON stores FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- INSERT: Usuarios autenticados pueden crear tiendas solo para sí mismos
CREATE POLICY "stores_insert_seller" 
ON stores FOR INSERT 
TO authenticated 
WITH CHECK (
  seller_id IN (
    SELECT id FROM profiles WHERE id = auth.uid()
  )
);

-- UPDATE: Usuarios autenticados pueden actualizar su propia tienda
CREATE POLICY "stores_update_own" 
ON stores FOR UPDATE 
TO authenticated 
USING (
  seller_id IN (
    SELECT id FROM profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  seller_id IN (
    SELECT id FROM profiles WHERE id = auth.uid()
  )
);

-- UPDATE: Admins pueden actualizar cualquier tienda
CREATE POLICY "stores_update_admin" 
ON stores FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

DO $$ BEGIN
  RAISE NOTICE '✅ Políticas RLS de stores corregidas y aplicadas';
END $$;


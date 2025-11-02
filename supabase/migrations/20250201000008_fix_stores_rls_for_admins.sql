-- ============================================
-- MERCADITO ONLINE PY - FIX STORES RLS FOR ADMINS
-- Permite que admins vean todas las tiendas en el panel de comisiones
-- ============================================

-- Agregar política para que admins puedan ver todas las tiendas
DROP POLICY IF EXISTS "Admins can view all stores" ON stores;
CREATE POLICY "Admins can view all stores" ON stores
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- También permitir que admins vean todas las tiendas incluso inactivas
-- La política existente "stores_select_public" solo muestra activas al público
-- Esta nueva política permite a admins ver todo

COMMENT ON POLICY "Admins can view all stores" ON stores IS 'Permite que administradores vean todas las tiendas (activas e inactivas) para gestión administrativa';




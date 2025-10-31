-- ============================================
-- MERCADITO ONLINE PY - ORDERS ADMIN RLS
-- Políticas RLS para que admins puedan ver todas las órdenes
-- ============================================

-- Política para que admins puedan ver todas las órdenes
DROP POLICY IF EXISTS "admins_can_view_all_orders" ON orders;
CREATE POLICY "admins_can_view_all_orders" 
ON orders FOR SELECT 
TO authenticated 
USING (is_current_user_admin());

-- Política para que admins puedan actualizar cualquier orden
DROP POLICY IF EXISTS "admins_can_update_all_orders" ON orders;
CREATE POLICY "admins_can_update_all_orders" 
ON orders FOR UPDATE 
TO authenticated 
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());

-- Política para que admins puedan ver todos los order_items
DROP POLICY IF EXISTS "admins_can_view_all_order_items" ON order_items;
CREATE POLICY "admins_can_view_all_order_items" 
ON order_items FOR SELECT 
TO authenticated 
USING (is_current_user_admin());

DO $$ BEGIN
  RAISE NOTICE '✅ Políticas RLS de órdenes para admins agregadas';
END $$;


-- ============================================
-- MERCADITO ONLINE PY - ADD ADMIN DELETE PRODUCTS RLS
-- Permite que los admins puedan eliminar productos
-- ============================================

-- Agregar política RLS para que admins puedan eliminar cualquier producto
DROP POLICY IF EXISTS "admins_can_delete_products" ON public.products;
CREATE POLICY "admins_can_delete_products"
ON public.products FOR DELETE
TO authenticated
USING (is_current_user_admin() = true);

-- Nota: La política existente "Users can delete own products" permite que vendedores eliminen sus propios productos
-- Esta nueva política permite que admins eliminen cualquier producto

DO $$ BEGIN
  RAISE NOTICE '✅ Política RLS para admins eliminar productos creada';
END $$;


















-- ============================================
-- Arreglar políticas RLS para orders - Asegurar que compradores vean sus pedidos
-- ============================================

-- Eliminar políticas que puedan estar causando conflictos
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
DROP POLICY IF EXISTS "Buyers can view own orders" ON public.orders;

-- Crear política simple y clara para que compradores vean SUS pedidos
CREATE POLICY "buyers_can_view_own_orders" ON public.orders
FOR SELECT
TO authenticated
USING (auth.uid() = buyer_id);

-- Asegurar que la política para vendedores también esté correcta
DROP POLICY IF EXISTS "Sellers can view orders with their products" ON public.orders;
CREATE POLICY "sellers_can_view_their_orders" ON public.orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.order_items oi
    JOIN public.products p ON oi.product_id = p.id
    WHERE oi.order_id = orders.id
    AND p.seller_id = auth.uid()
  )
);

-- Verificar que buyer_id se esté guardando correctamente en orders
-- Crear función de verificación (opcional, para debugging)
CREATE OR REPLACE FUNCTION verify_order_buyer_id()
RETURNS TABLE (
  order_id UUID,
  buyer_id UUID,
  created_at TIMESTAMPTZ,
  has_items BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.buyer_id,
    o.created_at,
    EXISTS(SELECT 1 FROM public.order_items oi WHERE oi.order_id = o.id) as has_items
  FROM public.orders o
  ORDER BY o.created_at DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios
COMMENT ON POLICY "buyers_can_view_own_orders" ON public.orders IS 'Permite que compradores vean sus propias órdenes usando buyer_id';
COMMENT ON POLICY "sellers_can_view_their_orders" ON public.orders IS 'Permite que vendedores vean órdenes que contienen sus productos';


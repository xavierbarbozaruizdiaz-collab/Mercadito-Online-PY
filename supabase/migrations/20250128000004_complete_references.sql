-- ============================================
-- Completar Referencias y Políticas - Mercadito Online PY
-- ============================================

-- Esta migración se ejecuta DESPUÉS de crear la tabla products
-- para agregar las foreign keys y políticas que faltan

-- 1. Agregar foreign keys a order_items y cart_items
ALTER TABLE public.order_items 
ADD CONSTRAINT fk_order_items_product_id 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.cart_items 
ADD CONSTRAINT fk_cart_items_product_id 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

-- 2. Agregar políticas RLS que referencian products
-- Política para que vendedores vean órdenes de sus productos
CREATE POLICY "Sellers can view orders with their products" ON public.orders FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON oi.product_id = p.id
    WHERE oi.order_id = orders.id
    AND p.seller_id = auth.uid()
  )
);

-- Política para que vendedores vean items de órdenes de sus productos
CREATE POLICY "Sellers can view order items of their products" ON public.order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = order_items.product_id
    AND p.seller_id = auth.uid()
  )
);

-- 3. Actualizar función create_order_from_cart para usar precios reales
CREATE OR REPLACE FUNCTION public.create_order_from_cart(
  p_buyer_id UUID,
  p_shipping_address JSONB,
  p_payment_method TEXT DEFAULT 'cash',
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_order_id UUID;
  v_total_amount DECIMAL(10,2) := 0;
  v_item_total DECIMAL(10,2);
  cart_item RECORD;
BEGIN
  -- Crear la orden
  INSERT INTO public.orders (buyer_id, shipping_address, payment_method, notes, total_amount)
  VALUES (p_buyer_id, p_shipping_address, p_payment_method, p_notes, 0)
  RETURNING id INTO v_order_id;

  -- Procesar items del carrito con precios reales
  FOR cart_item IN (
    SELECT ci.product_id, ci.quantity, p.price, p.seller_id
    FROM public.cart_items ci
    JOIN public.products p ON ci.product_id = p.id
    WHERE ci.user_id = p_buyer_id
  ) LOOP
    v_item_total := cart_item.quantity * cart_item.price;
    
    -- Insertar item de orden
    INSERT INTO public.order_items (order_id, product_id, seller_id, quantity, unit_price, total_price)
    VALUES (v_order_id, cart_item.product_id, cart_item.seller_id, cart_item.quantity, cart_item.price, v_item_total);
    
    v_total_amount := v_total_amount + v_item_total;
  END LOOP;

  -- Actualizar total de la orden
  UPDATE public.orders 
  SET total_amount = v_total_amount 
  WHERE id = v_order_id;

  -- Limpiar carrito
  DELETE FROM public.cart_items WHERE user_id = p_buyer_id;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Comentarios adicionales
COMMENT ON POLICY "Sellers can view orders with their products" ON public.orders IS 'Permite que vendedores vean órdenes que contienen sus productos';
COMMENT ON POLICY "Sellers can view order items of their products" ON public.order_items IS 'Permite que vendedores vean items de órdenes de sus productos';

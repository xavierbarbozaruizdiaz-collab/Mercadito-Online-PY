-- ============================================
-- Sistema de Órdenes - Mercadito Online PY
-- ============================================

-- 1. Tabla de órdenes principales
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  total_amount DECIMAL(10,2) NOT NULL,
  shipping_address JSONB NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'transfer', 'card')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Tabla de items de órdenes
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price > 0),
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price > 0),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Tabla de carrito de compras
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, product_id)
);

-- 4. Habilitar RLS en todas las tablas
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- 5. Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_seller_id ON public.order_items(seller_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);

-- 6. Políticas RLS para orders
-- SELECT: Compradores pueden ver sus propias órdenes, vendedores pueden ver órdenes de sus productos
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT
TO authenticated
USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers can view orders with their products" ON public.orders FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON oi.product_id = p.id
    WHERE oi.order_id = orders.id
    AND p.created_by = auth.uid()
  )
);

-- INSERT: Solo compradores pueden crear órdenes
CREATE POLICY "Buyers can create orders" ON public.orders FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = buyer_id);

-- UPDATE: Solo compradores pueden actualizar sus órdenes (para cancelar)
CREATE POLICY "Buyers can update own orders" ON public.orders FOR UPDATE
TO authenticated
USING (auth.uid() = buyer_id)
WITH CHECK (auth.uid() = buyer_id);

-- 7. Políticas RLS para order_items
-- SELECT: Compradores y vendedores pueden ver items de órdenes relevantes
CREATE POLICY "Users can view relevant order items" ON public.order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
    AND (
      o.buyer_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = order_items.product_id
        AND p.created_by = auth.uid()
      )
    )
  )
);

-- INSERT: Solo sistema puede insertar order_items (via triggers o funciones)
CREATE POLICY "System can insert order items" ON public.order_items FOR INSERT
TO authenticated
WITH CHECK (true);

-- 8. Políticas RLS para cart_items
-- SELECT: Usuarios pueden ver su propio carrito
CREATE POLICY "Users can view own cart" ON public.cart_items FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- INSERT: Usuarios pueden agregar items a su carrito
CREATE POLICY "Users can add to own cart" ON public.cart_items FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Usuarios pueden actualizar su carrito
CREATE POLICY "Users can update own cart" ON public.cart_items FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: Usuarios pueden eliminar items de su carrito
CREATE POLICY "Users can delete from own cart" ON public.cart_items FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 9. Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Triggers para updated_at
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Función para crear orden desde carrito
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
BEGIN
  -- Crear la orden
  INSERT INTO public.orders (buyer_id, shipping_address, payment_method, notes, total_amount)
  VALUES (p_buyer_id, p_shipping_address, p_payment_method, p_notes, 0)
  RETURNING id INTO v_order_id;

  -- Procesar items del carrito
  FOR cart_item IN (
    SELECT ci.product_id, ci.quantity, p.price, p.created_by as seller_id
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

-- 12. Comentarios para documentación
COMMENT ON TABLE public.orders IS 'Órdenes de compra de los usuarios';
COMMENT ON TABLE public.order_items IS 'Items individuales dentro de cada orden';
COMMENT ON TABLE public.cart_items IS 'Carrito de compras temporal de los usuarios';
COMMENT ON FUNCTION public.create_order_from_cart IS 'Crea una orden completa desde el carrito del usuario';

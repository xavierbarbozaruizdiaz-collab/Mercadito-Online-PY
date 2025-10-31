-- ============================================
-- Completar Configuración - Mercadito Online PY
-- ============================================

-- 1. Crear bucket de storage si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Crear políticas de storage básicas
DROP POLICY IF EXISTS "Public Access for Select" ON storage.objects;
CREATE POLICY "Public Access for Select" ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
CREATE POLICY "Authenticated users can update" ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;
CREATE POLICY "Authenticated users can delete" ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);

-- 3. Crear función para crear perfil automáticamente si no existe
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'buyer')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Crear trigger para crear perfil automáticamente si no existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Crear función para updated_at si no existe
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Crear triggers para updated_at si no existen
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at 
  BEFORE UPDATE ON public.products 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at 
  BEFORE UPDATE ON public.orders 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_cart_items_updated_at ON public.cart_items;
CREATE TRIGGER update_cart_items_updated_at 
  BEFORE UPDATE ON public.cart_items 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Crear función para crear orden desde carrito si no existe
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

  -- Procesar items del carrito
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

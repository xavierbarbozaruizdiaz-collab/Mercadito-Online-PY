-- ============================================
-- MERCADITO ONLINE PY - ACTUALIZAR CREACIÓN DE ÓRDENES
-- Integrar reducción de stock y cálculo de comisiones
-- ============================================

-- ============================================
-- 1. MODIFICAR FUNCIÓN: CREATE_ORDER_FROM_CART
-- Agregar reducción de stock y cálculo de comisiones
-- ============================================

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
  v_base_price DECIMAL(10,2);
  v_commission_amount DECIMAL(10,2);
  v_commission_percent DECIMAL(5,2);
  v_store_id UUID;
  cart_item RECORD;
BEGIN
  -- Crear la orden
  INSERT INTO public.orders (buyer_id, shipping_address, payment_method, notes, total_amount)
  VALUES (p_buyer_id, p_shipping_address, p_payment_method, p_notes, 0)
  RETURNING id INTO v_order_id;

  -- Procesar items del carrito con precios reales
  FOR cart_item IN (
    SELECT 
      ci.product_id, 
      ci.quantity, 
      p.price,           -- Precio mostrado (ya incluye comisión para directos)
      p.base_price,      -- Precio base (lo que recibe vendedor)
      p.commission_percent_applied, -- % comisión aplicado
      p.seller_id,
      p.store_id,
      p.sale_type,
      p.stock_management_enabled,
      p.stock_quantity
    FROM public.cart_items ci
    JOIN public.products p ON ci.product_id = p.id
    WHERE ci.user_id = p_buyer_id
  ) LOOP
      -- Para productos directos: precio ya incluye comisión
      IF cart_item.sale_type = 'direct' OR cart_item.sale_type = 'fixed' THEN
        -- Validar cantidad
        IF cart_item.quantity <= 0 THEN
          RAISE EXCEPTION 'La cantidad debe ser mayor a 0 para el producto %', cart_item.product_id;
        END IF;
        
        v_item_total := cart_item.quantity * cart_item.price;
        v_base_price := COALESCE(cart_item.base_price, cart_item.price);
        v_commission_percent := COALESCE(cart_item.commission_percent_applied, 0);
        v_commission_amount := v_item_total - (v_base_price * cart_item.quantity);
        
        -- Validar montos
        IF v_item_total <= 0 THEN
          RAISE EXCEPTION 'El monto total del producto debe ser mayor a 0';
        END IF;
        
        -- Reducir stock si está habilitado
        IF cart_item.stock_management_enabled = true AND cart_item.stock_quantity IS NOT NULL THEN
          PERFORM decrease_stock(
            cart_item.product_id,
            cart_item.quantity,
            v_order_id,
            'Venta: orden ' || v_order_id::TEXT,
            cart_item.seller_id
          );
        END IF;
      
      -- Insertar item de orden
      INSERT INTO public.order_items (order_id, product_id, seller_id, quantity, unit_price, total_price)
      VALUES (v_order_id, cart_item.product_id, cart_item.seller_id, cart_item.quantity, cart_item.price, v_item_total);
      
      -- Insertar comisión (productos directos)
      INSERT INTO public.platform_fees (
        order_id,
        order_item_id,
        seller_id,
        store_id,
        transaction_type,
        order_amount,
        base_amount,
        commission_amount,
        commission_percent,
        status,
        payment_status
      )
      SELECT
        v_order_id,
        currval('order_items_id_seq'),
        cart_item.seller_id,
        cart_item.store_id,
        'direct_sale',
        v_item_total,
        v_base_price * cart_item.quantity,
        v_commission_amount,
        v_commission_percent,
        'pending',
        'escrowed'
      WHERE v_commission_amount > 0;
      
      -- Actualizar balance del vendedor
      INSERT INTO public.seller_balance (seller_id, store_id, pending_balance)
      VALUES (cart_item.seller_id, cart_item.store_id, v_base_price * cart_item.quantity)
      ON CONFLICT (seller_id) 
      DO UPDATE SET 
        pending_balance = seller_balance.pending_balance + (v_base_price * cart_item.quantity),
        total_earnings = seller_balance.total_earnings + (v_base_price * cart_item.quantity),
        updated_at = NOW();
      
    -- Para subastas: comisiones ya calculadas al finalizar
    -- Solo crear el order_item (las comisiones se manejan en el flujo de subastas)
    ELSE
      v_item_total := cart_item.quantity * cart_item.price;
      
      INSERT INTO public.order_items (order_id, product_id, seller_id, quantity, unit_price, total_price)
      VALUES (v_order_id, cart_item.product_id, cart_item.seller_id, cart_item.quantity, cart_item.price, v_item_total);
    END IF;
    
    v_total_amount := v_total_amount + v_item_total;
  END LOOP;

  -- Actualizar total de la orden
  UPDATE public.orders 
  SET total_amount = v_total_amount 
  WHERE id = v_order_id;

  -- Limpiar carrito
  DELETE FROM public.cart_items WHERE user_id = p_buyer_id;
  
  -- Limpiar reservas de carrito
  DELETE FROM public.cart_reservations WHERE user_id = p_buyer_id;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. FUNCIÓN: LIBERAR PAGO AL VENDEDOR
-- Cuando la orden se marca como 'delivered'
-- ============================================

CREATE OR REPLACE FUNCTION public.release_seller_payment(
  p_order_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_fee RECORD;
BEGIN
  -- Actualizar todas las fees relacionadas
  FOR v_fee IN
    SELECT id, seller_id, base_amount, seller_earnings
    FROM platform_fees
    WHERE order_id = p_order_id
      AND status = 'pending'
      AND payment_status = 'escrowed'
  LOOP
    -- Actualizar fee
    UPDATE platform_fees
    SET 
      status = 'confirmed',
      payment_status = 'released',
      released_at = NOW(),
      updated_at = NOW()
    WHERE id = v_fee.id;
    
    -- Actualizar balance del vendedor
    UPDATE seller_balance
    SET 
      pending_balance = pending_balance - COALESCE(v_fee.base_amount, v_fee.seller_earnings, 0),
      available_balance = available_balance + COALESCE(v_fee.base_amount, v_fee.seller_earnings, 0),
      updated_at = NOW()
    WHERE seller_id = v_fee.seller_id;
  END LOOP;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. TRIGGER: AUTO-LIBERAR PAGO AL MARCAR 'delivered'
-- ============================================

CREATE OR REPLACE FUNCTION trigger_release_payment_on_delivered()
RETURNS TRIGGER AS $$
BEGIN
  -- Si cambió a 'delivered' desde otro estado
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    PERFORM release_seller_payment(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_release_payment_on_delivered ON orders;
CREATE TRIGGER trigger_release_payment_on_delivered
AFTER UPDATE OF status ON orders
FOR EACH ROW
EXECUTE FUNCTION trigger_release_payment_on_delivered();

-- ============================================
-- 4. COMENTARIOS
-- ============================================

COMMENT ON FUNCTION create_order_from_cart IS 'Crea orden desde carrito, reduce stock y calcula comisiones';
COMMENT ON FUNCTION release_seller_payment IS 'Libera pago al vendedor cuando la orden se marca como entregada';


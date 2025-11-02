-- ============================================
-- MERCADITO ONLINE PY - REVERSIÓN DE COMISIONES
-- Función para cancelar órdenes y revertir todo
-- ============================================

CREATE OR REPLACE FUNCTION cancel_order_with_refund(
  p_order_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_cancelled_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_order RECORD;
  v_fee RECORD;
  v_order_item RECORD;
  v_product RECORD;
BEGIN
  -- Obtener orden
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id;
  
  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Orden no encontrada';
  END IF;
  
  IF v_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'La orden ya está cancelada';
  END IF;
  
  IF v_order.status = 'delivered' THEN
    RAISE EXCEPTION 'No se puede cancelar una orden ya entregada';
  END IF;
  
  -- Marcar orden como cancelada
  UPDATE orders
  SET status = 'cancelled',
      notes = COALESCE(v_order.notes || E'\n' || 'Cancelada: ' || p_reason, 'Cancelada: ' || p_reason),
      updated_at = NOW()
  WHERE id = p_order_id;
  
  -- Revertir comisiones y balances
  FOR v_fee IN
    SELECT * FROM platform_fees
    WHERE order_id = p_order_id
      AND status != 'refunded'
  LOOP
    -- Marcar comisión como refunded
    UPDATE platform_fees
    SET status = 'refunded',
        payment_status = 'refunded',
        refunded_at = NOW(),
        updated_at = NOW()
    WHERE id = v_fee.id;
    
    -- Revertir balance del vendedor
    IF v_fee.payment_status = 'escrowed' THEN
      -- Si estaba en escrow, reducir pending_balance
      UPDATE seller_balance
      SET pending_balance = pending_balance - COALESCE(v_fee.base_amount, v_fee.seller_earnings, 0),
          total_earnings = total_earnings - COALESCE(v_fee.base_amount, v_fee.seller_earnings, 0),
          updated_at = NOW()
      WHERE seller_id = v_fee.seller_id;
    ELSIF v_fee.payment_status = 'released' THEN
      -- Si ya estaba liberado, reducir available_balance
      UPDATE seller_balance
      SET available_balance = available_balance - COALESCE(v_fee.base_amount, v_fee.seller_earnings, 0),
          total_earnings = total_earnings - COALESCE(v_fee.base_amount, v_fee.seller_earnings, 0),
          updated_at = NOW()
      WHERE seller_id = v_fee.seller_id;
    END IF;
    
    -- Actualizar total_commissions_paid (reducir)
    UPDATE seller_balance
    SET total_commissions_paid = total_commissions_paid - COALESCE(v_fee.commission_amount, 0),
        updated_at = NOW()
    WHERE seller_id = v_fee.seller_id;
  END LOOP;
  
    -- Restaurar stock de productos usando la función existente
    FOR v_order_item IN
      SELECT * FROM order_items
      WHERE order_id = p_order_id
    LOOP
      -- Obtener información del producto
      SELECT * INTO v_product
      FROM products
      WHERE id = v_order_item.product_id;
      
      -- Restaurar stock solo si tiene gestión habilitada
      IF v_product.stock_management_enabled = true THEN
        -- Llamar a función SQL existente (increase_stock de inventory_system.sql)
        -- Parámetros: product_id, quantity, movement_type, order_id, notes, created_by
        PERFORM increase_stock(
          v_order_item.product_id,
          v_order_item.quantity,
          'return', -- Tipo: return (devolución)
          p_order_id,
          'Cancelación de orden: ' || COALESCE(p_reason, 'Sin razón especificada'),
          p_cancelled_by
        );
      END IF;
    END LOOP;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- NOTA: La función increase_stock ya existe en 20250201000002_inventory_system.sql
-- Esta función se usa para restaurar stock en cancelaciones

-- Trigger: Auto-revertir si orden se cancela directamente (sin función)
CREATE OR REPLACE FUNCTION trigger_refund_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
  -- Si cambió a 'cancelled' desde otro estado
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    -- Llamar función de reversión (con manejo de errores silencioso)
    BEGIN
      PERFORM cancel_order_with_refund(
        NEW.id,
        'Cancelación automática por cambio de estado',
        NULL
      );
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error pero no fallar el trigger
        RAISE WARNING 'Error al revertir orden cancelada: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_refund_on_cancel ON orders;
CREATE TRIGGER trigger_refund_on_cancel
AFTER UPDATE OF status ON orders
FOR EACH ROW
WHEN (NEW.status = 'cancelled' AND OLD.status != 'cancelled')
EXECUTE FUNCTION trigger_refund_on_cancel();

-- Comentarios
COMMENT ON FUNCTION cancel_order_with_refund IS 'Cancela una orden y revierte comisiones, balances y stock';
COMMENT ON FUNCTION increase_stock IS 'Aumenta el stock de un producto (para reversiones)';
COMMENT ON TRIGGER trigger_refund_on_cancel ON orders IS 'Auto-revierte cuando una orden se marca como cancelada';


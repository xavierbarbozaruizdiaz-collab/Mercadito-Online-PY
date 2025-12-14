-- ============================================
-- TRIGGER: Sincronizar stock_alerts cuando se actualiza stock_quantity
-- ============================================
-- Problema: Cuando se actualiza stock_quantity directamente en products,
-- las alertas en stock_alerts no se actualizan automáticamente.
-- Solución: Trigger que sincroniza stock_alerts al actualizar products.stock_quantity

-- Agregar constraint UNIQUE en product_id si no existe (una alerta activa por producto)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'stock_alerts_product_id_unique' 
    AND conrelid = 'stock_alerts'::regclass
  ) THEN
    ALTER TABLE stock_alerts 
    ADD CONSTRAINT stock_alerts_product_id_unique 
    UNIQUE (product_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION sync_stock_alerts_on_update()
RETURNS TRIGGER AS $$
DECLARE
  v_seller_id UUID;
  v_low_stock_threshold INTEGER;
BEGIN
  -- Solo procesar si stock_quantity cambió y el producto tiene gestión de stock
  IF OLD.stock_quantity IS DISTINCT FROM NEW.stock_quantity 
     AND NEW.stock_management_enabled = true 
     AND NEW.stock_quantity IS NOT NULL THEN
    
    -- Obtener seller_id y threshold
    SELECT seller_id, COALESCE(low_stock_threshold, 5)
    INTO v_seller_id, v_low_stock_threshold
    FROM products
    WHERE id = NEW.id;
    
    -- Si el nuevo stock está por debajo o igual al umbral
    IF NEW.stock_quantity <= v_low_stock_threshold THEN
      -- Crear o actualizar alerta activa
      INSERT INTO stock_alerts (
        product_id,
        seller_id,
        threshold,
        current_stock,
        is_active
      ) VALUES (
        NEW.id,
        v_seller_id,
        v_low_stock_threshold,
        NEW.stock_quantity,
        true
      )
      ON CONFLICT (product_id) 
      DO UPDATE SET
        current_stock = NEW.stock_quantity,
        threshold = v_low_stock_threshold,
        is_active = true,
        notified_at = NULL; -- Reset notificación para que se vuelva a notificar si es necesario
    ELSE
      -- Si el stock está por encima del umbral, desactivar alertas activas
      UPDATE stock_alerts
      SET 
        is_active = false,
        current_stock = NEW.stock_quantity
      WHERE product_id = NEW.id
        AND is_active = true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_sync_stock_alerts ON products;
CREATE TRIGGER trigger_sync_stock_alerts
AFTER UPDATE OF stock_quantity, stock_management_enabled, low_stock_threshold ON products
FOR EACH ROW
WHEN (OLD.stock_quantity IS DISTINCT FROM NEW.stock_quantity 
      OR OLD.stock_management_enabled IS DISTINCT FROM NEW.stock_management_enabled
      OR OLD.low_stock_threshold IS DISTINCT FROM NEW.low_stock_threshold)
EXECUTE FUNCTION sync_stock_alerts_on_update();

COMMENT ON FUNCTION sync_stock_alerts_on_update IS 'Sincroniza stock_alerts automáticamente cuando se actualiza stock_quantity en products';


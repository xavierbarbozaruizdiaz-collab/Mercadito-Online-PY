-- ============================================
-- MERCADITO ONLINE PY - SISTEMA DE INVENTARIO
-- Sistema completo de gestión de stock
-- ============================================

-- ============================================
-- 1. TABLA: CART_RESERVATIONS
-- Reservas temporales de stock en carrito
-- ============================================

CREATE TABLE IF NOT EXISTS cart_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cart_reservations_product ON cart_reservations(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_reservations_user ON cart_reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_reservations_expires ON cart_reservations(expires_at);

-- RLS
ALTER TABLE cart_reservations ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios pueden ver/crear sus propias reservas
DROP POLICY IF EXISTS "Users can manage own reservations" ON cart_reservations;
CREATE POLICY "Users can manage own reservations" ON cart_reservations
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 2. TABLA: STOCK_MOVEMENTS
-- Historial de movimientos de stock
-- ============================================

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'sale',              -- Venta
    'restock',           -- Reabastecimiento
    'adjustment',        -- Ajuste manual
    'return',            -- Devolución
    'expired_reservation', -- Reserva expirada
    'cancellation'       -- Cancelación
  )),
  quantity INTEGER NOT NULL, -- Positivo para entrada, negativo para salida
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  order_id UUID REFERENCES orders(id),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_order ON stock_movements(order_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at DESC);

-- RLS
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Política: Vendedores pueden ver movimientos de sus productos
DROP POLICY IF EXISTS "Sellers can view stock movements" ON stock_movements;
CREATE POLICY "Sellers can view stock movements" ON stock_movements
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM products
    WHERE products.id = stock_movements.product_id
    AND products.seller_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Política: Solo sistema puede insertar movimientos
DROP POLICY IF EXISTS "System can insert movements" ON stock_movements;
CREATE POLICY "System can insert movements" ON stock_movements
FOR INSERT
TO authenticated
WITH CHECK (true); -- Se valida en la aplicación

-- ============================================
-- 3. TABLA: STOCK_ALERTS
-- Alertas de stock bajo
-- ============================================

CREATE TABLE IF NOT EXISTS stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  threshold INTEGER NOT NULL,
  current_stock INTEGER NOT NULL,
  notified_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_stock_alerts_product ON stock_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_seller ON stock_alerts(seller_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_active ON stock_alerts(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;

-- Política: Vendedores pueden ver sus alertas
DROP POLICY IF EXISTS "Sellers can view own alerts" ON stock_alerts;
CREATE POLICY "Sellers can view own alerts" ON stock_alerts
FOR SELECT
TO authenticated
USING (
  seller_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================
-- 4. FUNCIONES DE INVENTARIO
-- ============================================

-- 4.1 Función: Verificar stock disponible (considerando reservas)
CREATE OR REPLACE FUNCTION get_available_stock(
  p_product_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_stock_quantity INTEGER;
  v_reserved_quantity INTEGER;
  v_stock_management_enabled BOOLEAN;
BEGIN
  -- Obtener stock y configuración
  SELECT 
    stock_quantity,
    stock_management_enabled
  INTO v_stock_quantity, v_stock_management_enabled
  FROM products
  WHERE id = p_product_id;
  
  -- Si no tiene gestión de stock, retornar -1 (ilimitado)
  IF NOT v_stock_management_enabled OR v_stock_quantity IS NULL THEN
    RETURN -1;
  END IF;
  
  -- Calcular cantidad reservada (no expirada)
  SELECT COALESCE(SUM(quantity), 0) INTO v_reserved_quantity
  FROM cart_reservations
  WHERE product_id = p_product_id
    AND expires_at > NOW();
  
  -- Retornar stock disponible
  RETURN GREATEST(0, v_stock_quantity - v_reserved_quantity);
END;
$$ LANGUAGE plpgsql STABLE;

-- 4.2 Función: Reducir stock y registrar movimiento
CREATE OR REPLACE FUNCTION decrease_stock(
  p_product_id UUID,
  p_quantity INTEGER,
  p_order_id UUID DEFAULT NULL,
  p_movement_notes TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_stock INTEGER;
  v_new_stock INTEGER;
  v_stock_management_enabled BOOLEAN;
  v_low_stock_threshold INTEGER;
BEGIN
  -- Obtener stock actual y configuración
  SELECT 
    stock_quantity,
    stock_management_enabled,
    low_stock_threshold
  INTO v_current_stock, v_stock_management_enabled, v_low_stock_threshold
  FROM products
  WHERE id = p_product_id;
  
  -- Si no tiene gestión de stock, retornar true (permitir)
  IF NOT v_stock_management_enabled OR v_current_stock IS NULL THEN
    RETURN true;
  END IF;
  
  -- Validar cantidad solicitada
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'La cantidad solicitada debe ser mayor a 0';
  END IF;
  
  -- Validar que hay suficiente stock
  IF v_current_stock < p_quantity THEN
    RAISE EXCEPTION 'Stock insuficiente. Disponible: %, Solicitado: %', 
      v_current_stock, p_quantity;
  END IF;
  
  -- Calcular nuevo stock
  v_new_stock := v_current_stock - p_quantity;
  
  -- Actualizar stock del producto
  UPDATE products
  SET 
    stock_quantity = v_new_stock,
    updated_at = NOW()
  WHERE id = p_product_id;
  
  -- Registrar movimiento
  INSERT INTO stock_movements (
    product_id,
    movement_type,
    quantity,
    previous_stock,
    new_stock,
    order_id,
    notes,
    created_by
  ) VALUES (
    p_product_id,
    'sale',
    -p_quantity,
    v_current_stock,
    v_new_stock,
    p_order_id,
    p_movement_notes,
    p_created_by
  );
  
  -- Verificar si está bajo el umbral y crear alerta si es necesario
  IF v_new_stock <= v_low_stock_threshold THEN
    INSERT INTO stock_alerts (
      product_id,
      seller_id,
      threshold,
      current_stock,
      is_active
    )
    SELECT 
      p_product_id,
      seller_id,
      v_low_stock_threshold,
      v_new_stock,
      true
    FROM products
    WHERE id = p_product_id
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 4.3 Función: Aumentar stock (reabastecimiento/devolución)
CREATE OR REPLACE FUNCTION increase_stock(
  p_product_id UUID,
  p_quantity INTEGER,
  p_movement_type TEXT DEFAULT 'restock',
  p_order_id UUID DEFAULT NULL,
  p_movement_notes TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_stock INTEGER;
  v_new_stock INTEGER;
  v_stock_management_enabled BOOLEAN;
BEGIN
  -- Obtener stock actual
  SELECT 
    stock_quantity,
    stock_management_enabled
  INTO v_current_stock, v_stock_management_enabled
  FROM products
  WHERE id = p_product_id;
  
  -- Si no tiene gestión de stock, retornar true
  IF NOT v_stock_management_enabled THEN
    RETURN true;
  END IF;
  
  -- Si stock es NULL, inicializar en 0
  v_current_stock := COALESCE(v_current_stock, 0);
  
  -- Calcular nuevo stock
  v_new_stock := v_current_stock + p_quantity;
  
  -- Actualizar stock del producto
  UPDATE products
  SET 
    stock_quantity = v_new_stock,
    updated_at = NOW()
  WHERE id = p_product_id;
  
  -- Registrar movimiento
  INSERT INTO stock_movements (
    product_id,
    movement_type,
    quantity,
    previous_stock,
    new_stock,
    order_id,
    notes,
    created_by
  ) VALUES (
    p_product_id,
    p_movement_type,
    p_quantity,
    v_current_stock,
    v_new_stock,
    p_order_id,
    p_movement_notes,
    p_created_by
  );
  
  -- Si ahora está por encima del umbral, desactivar alerta
  UPDATE stock_alerts
  SET is_active = false
  WHERE product_id = p_product_id
    AND is_active = true
    AND current_stock <= threshold
    AND v_new_stock > threshold;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 4.4 Función: Limpiar reservas expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
  v_reservation RECORD;
BEGIN
  v_deleted_count := 0;
  
  -- Para cada reserva expirada, registrar movimiento si corresponde
  FOR v_reservation IN
    SELECT product_id, quantity
    FROM cart_reservations
    WHERE expires_at < NOW()
  LOOP
    -- Registrar como movimiento de expiración (solo log, no afecta stock ya que no se redujo)
    INSERT INTO stock_movements (
      product_id,
      movement_type,
      quantity,
      previous_stock,
      new_stock,
      notes
    )
    SELECT 
      v_reservation.product_id,
      'expired_reservation',
      0,
      stock_quantity,
      stock_quantity,
      'Reserva expirada, stock no se había reducido'
    FROM products
    WHERE id = v_reservation.product_id;
    
    v_deleted_count := v_deleted_count + 1;
  END LOOP;
  
  -- Eliminar reservas expiradas
  DELETE FROM cart_reservations
  WHERE expires_at < NOW();
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. TRIGGERS
-- ============================================

-- Trigger: Auto-ocultar productos sin stock
CREATE OR REPLACE FUNCTION auto_hide_out_of_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo para productos directos (no subastas)
  IF NEW.sale_type = 'direct' AND NEW.stock_management_enabled = true THEN
    IF NEW.stock_quantity IS NOT NULL AND NEW.stock_quantity <= 0 THEN
      -- Cambiar status a pausado si está activo
      IF NEW.status = 'active' THEN
        NEW.status := 'paused';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_hide_out_of_stock ON products;
CREATE TRIGGER trigger_auto_hide_out_of_stock
BEFORE UPDATE OF stock_quantity ON products
FOR EACH ROW
EXECUTE FUNCTION auto_hide_out_of_stock();

-- ============================================
-- 6. COMENTARIOS
-- ============================================

COMMENT ON TABLE cart_reservations IS 'Reservas temporales de stock cuando se agrega al carrito';
COMMENT ON TABLE stock_movements IS 'Historial completo de movimientos de stock';
COMMENT ON TABLE stock_alerts IS 'Alertas cuando el stock está por debajo del umbral';
COMMENT ON FUNCTION get_available_stock IS 'Calcula stock disponible considerando reservas temporales';
COMMENT ON FUNCTION decrease_stock IS 'Reduce stock y registra movimiento (venta)';
COMMENT ON FUNCTION increase_stock IS 'Aumenta stock y registra movimiento (reabastecimiento/devolución)';
COMMENT ON FUNCTION cleanup_expired_reservations IS 'Limpia reservas expiradas del carrito';


-- ============================================
-- MERCADITO ONLINE PY - PROTECCIÓN DE ENTREGAS
-- Sistema para proteger compradores de subastas
-- Multas y penalizaciones para vendedores que no entregan
-- ============================================

-- ============================================
-- 1. TABLA: SELLER_DELIVERY_PENALTIES
-- Multas a vendedores que no entregan productos
-- ============================================

CREATE TABLE IF NOT EXISTS seller_delivery_penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relaciones
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  auction_id UUID REFERENCES products(id) ON DELETE SET NULL,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Información del pedido
  order_amount DECIMAL(10,2) NOT NULL CHECK (order_amount > 0),
  expected_delivery_date TIMESTAMPTZ, -- Fecha esperada de entrega
  
  -- Información de multa
  penalty_percent DECIMAL(5,2) NOT NULL DEFAULT 10.00 CHECK (penalty_percent >= 0 AND penalty_percent <= 100),
  penalty_amount DECIMAL(10,2) NOT NULL CHECK (penalty_amount >= 0),
  
  -- Estado
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'waived', 'cancelled', 'refunded')),
  payment_method TEXT, -- Cómo se pagó la multa
  payment_reference TEXT, -- Referencia de pago
  
  -- Acciones tomadas
  seller_restricted BOOLEAN DEFAULT false, -- Si se restringió al vendedor
  seller_restriction_level TEXT, -- 'warning', 'suspended', 'banned'
  refund_issued BOOLEAN DEFAULT false, -- Si se reembolsó al comprador
  refund_amount DECIMAL(10,2), -- Monto reembolsado
  
  -- Notificaciones
  notified_at TIMESTAMPTZ, -- Cuando se notificó al vendedor
  notification_count INTEGER DEFAULT 0,
  
  -- Razón de la penalización
  reason TEXT NOT NULL DEFAULT 'delivery_not_confirmed', -- 'delivery_not_confirmed', 'delivery_late', 'no_delivery', 'item_mismatch'
  days_overdue INTEGER, -- Días de retraso
  
  -- Auditoría
  applied_by UUID REFERENCES profiles(id), -- Admin que aplicó (si manual)
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  waived_at TIMESTAMPTZ,
  waived_by UUID REFERENCES profiles(id),
  waived_reason TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_seller_penalties_seller ON seller_delivery_penalties(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_penalties_order ON seller_delivery_penalties(order_id);
CREATE INDEX IF NOT EXISTS idx_seller_penalties_status ON seller_delivery_penalties(status);
CREATE INDEX IF NOT EXISTS idx_seller_penalties_auction ON seller_delivery_penalties(auction_id);
CREATE INDEX IF NOT EXISTS idx_seller_penalties_applied_at ON seller_delivery_penalties(applied_at DESC);

-- RLS
ALTER TABLE seller_delivery_penalties ENABLE ROW LEVEL SECURITY;

-- Política: Vendedores pueden ver sus propias multas
DROP POLICY IF EXISTS "Sellers can view own penalties" ON seller_delivery_penalties;
CREATE POLICY "Sellers can view own penalties" ON seller_delivery_penalties
FOR SELECT
TO authenticated
USING (seller_id = auth.uid());

-- Política: Compradores pueden ver multas de sus pedidos
DROP POLICY IF EXISTS "Buyers can view order penalties" ON seller_delivery_penalties;
CREATE POLICY "Buyers can view order penalties" ON seller_delivery_penalties
FOR SELECT
TO authenticated
USING (buyer_id = auth.uid());

-- Política: Admins pueden ver todas las multas
DROP POLICY IF EXISTS "Admins can view all seller penalties" ON seller_delivery_penalties;
CREATE POLICY "Admins can view all seller penalties" ON seller_delivery_penalties
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Política: Sistema puede insertar multas
DROP POLICY IF EXISTS "System can insert seller penalties" ON seller_delivery_penalties;
CREATE POLICY "System can insert seller penalties" ON seller_delivery_penalties
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política: Admins pueden actualizar multas
DROP POLICY IF EXISTS "Admins can update seller penalties" ON seller_delivery_penalties;
CREATE POLICY "Admins can update seller penalties" ON seller_delivery_penalties
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================
-- 2. TABLA: SELLER_DELIVERY_SETTINGS
-- Configuración de plazos y multas
-- ============================================

CREATE TABLE IF NOT EXISTS seller_delivery_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Plazos de entrega
  max_delivery_days INTEGER NOT NULL DEFAULT 7, -- Días máximos para entregar después del pago
  grace_period_hours INTEGER NOT NULL DEFAULT 48, -- Período de gracia antes de aplicar multa
  warning_hours_before INTEGER NOT NULL DEFAULT 24, -- Aviso antes del plazo
  
  -- Configuración de multas
  penalty_percent DECIMAL(5,2) NOT NULL DEFAULT 10.00 CHECK (penalty_percent >= 0 AND penalty_percent <= 100),
  min_penalty_amount DECIMAL(10,2) DEFAULT 0, -- Multa mínima
  max_penalty_amount DECIMAL(10,2), -- Multa máxima (NULL = sin límite)
  
  -- Restricciones automáticas
  auto_restrict_seller BOOLEAN DEFAULT false, -- Restringir vendedor automáticamente
  restriction_after_penalties INTEGER DEFAULT 3, -- Restringir después de N multas
  restriction_level TEXT DEFAULT 'warning' CHECK (restriction_level IN ('warning', 'suspended', 'banned')),
  
  -- Reembolsos
  auto_refund_buyer BOOLEAN DEFAULT false, -- Reembolsar automáticamente al comprador
  refund_after_days INTEGER DEFAULT 14, -- Reembolsar después de N días sin entrega
  
  -- Estado
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insertar configuración por defecto
INSERT INTO seller_delivery_settings (
  max_delivery_days,
  grace_period_hours,
  warning_hours_before,
  penalty_percent,
  auto_restrict_seller,
  restriction_after_penalties,
  auto_refund_buyer,
  refund_after_days
) VALUES (
  7, -- 7 días para entregar
  48, -- 48 horas de gracia
24, -- 24 horas antes de avisar
10.00, -- 10% del monto del pedido
true, -- Restringir automáticamente
3, -- Después de 3 multas
true, -- Reembolsar automáticamente
14 -- Después de 14 días
) ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE seller_delivery_settings ENABLE ROW LEVEL SECURITY;

-- Política: Todos pueden ver configuración activa
DROP POLICY IF EXISTS "Anyone can view active settings" ON seller_delivery_settings;
CREATE POLICY "Anyone can view active settings" ON seller_delivery_settings
FOR SELECT
TO public
USING (is_active = true);

-- Política: Solo admins pueden gestionar
DROP POLICY IF EXISTS "Admins can manage delivery settings" ON seller_delivery_settings;
CREATE POLICY "Admins can manage delivery settings" ON seller_delivery_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================
-- 3. ACTUALIZAR TABLA ORDERS
-- Agregar campos para seguimiento de entrega
-- ============================================

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'confirmed', 'in_transit', 'delivered', 'failed', 'refunded')),
ADD COLUMN IF NOT EXISTS delivery_confirmed_at TIMESTAMPTZ, -- Cuando el comprador confirmó recepción
ADD COLUMN IF NOT EXISTS delivery_confirmed_by UUID REFERENCES profiles(id), -- Quién confirmó (comprador)
ADD COLUMN IF NOT EXISTS expected_delivery_date TIMESTAMPTZ, -- Fecha esperada de entrega
ADD COLUMN IF NOT EXISTS shipping_tracking_number TEXT, -- Número de seguimiento
ADD COLUMN IF NOT EXISTS shipping_carrier TEXT, -- Transportista
ADD COLUMN IF NOT EXISTS is_auction_order BOOLEAN DEFAULT false, -- Si es orden de subasta
ADD COLUMN IF NOT EXISTS auction_id UUID REFERENCES products(id) ON DELETE SET NULL, -- ID de la subasta original
ADD COLUMN IF NOT EXISTS delivery_deadline TIMESTAMPTZ, -- Fecha límite para entregar
ADD COLUMN IF NOT EXISTS delivery_warning_sent BOOLEAN DEFAULT false, -- Si se envió aviso
ADD COLUMN IF NOT EXISTS delivery_penalty_applied BOOLEAN DEFAULT false; -- Si se aplicó multa

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON orders(delivery_status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_deadline ON orders(delivery_deadline) WHERE delivery_deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_is_auction_order ON orders(is_auction_order) WHERE is_auction_order = true;
CREATE INDEX IF NOT EXISTS idx_orders_auction_id ON orders(auction_id) WHERE auction_id IS NOT NULL;

-- ============================================
-- 4. FUNCIÓN: check_unfulfilled_orders_and_apply_penalties()
-- Verifica órdenes sin entregar y aplica multas
-- ============================================

CREATE OR REPLACE FUNCTION check_unfulfilled_orders_and_apply_penalties()
RETURNS JSONB AS $$
DECLARE
  v_setting RECORD;
  v_order RECORD;
  v_penalty_id UUID;
  v_penalty_amount DECIMAL(10,2);
  v_days_overdue INTEGER;
  v_result JSONB;
  v_total_checked INTEGER := 0;
  v_penalties_applied INTEGER := 0;
  v_orders_refunded INTEGER := 0;
  v_sellers_restricted INTEGER := 0;
BEGIN
  -- Obtener configuración activa
  SELECT * INTO v_setting
  FROM seller_delivery_settings
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No hay configuración activa de entregas',
      'timestamp', NOW()
    );
  END IF;
  
  -- Iterar sobre órdenes que están pendientes de entrega y pasaron el plazo
  FOR v_order IN
    SELECT 
      o.id,
      o.buyer_id,
      o.status,
      o.delivery_status,
      o.delivery_deadline,
      o.delivery_warning_sent,
      o.delivery_penalty_applied,
      o.total_amount,
      o.is_auction_order,
      o.auction_id,
      oi.seller_id,
      o.created_at
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE 
      o.status = 'paid' -- Orden pagada
      AND o.delivery_status IN ('pending', 'confirmed', 'in_transit') -- Aún no entregada
      AND o.delivery_deadline IS NOT NULL -- Tiene fecha límite
      AND o.delivery_deadline < NOW() - (v_setting.grace_period_hours || ' hours')::INTERVAL -- Pasó el plazo + gracia
      AND o.delivery_penalty_applied = false -- Aún no se aplicó multa
      AND o.is_auction_order = true -- Solo subastas por ahora
    GROUP BY o.id, o.buyer_id, o.status, o.delivery_status, o.delivery_deadline, 
             o.delivery_warning_sent, o.delivery_penalty_applied, o.total_amount, 
             o.is_auction_order, o.auction_id, o.created_at
    ORDER BY o.delivery_deadline ASC
  LOOP
    v_total_checked := v_total_checked + 1;
    
    -- Calcular días de retraso
    v_days_overdue := EXTRACT(DAY FROM NOW() - v_order.delivery_deadline);
    
    -- Calcular monto de multa
    v_penalty_amount := (v_order.total_amount * v_setting.penalty_percent / 100);
    
    -- Aplicar límites
    IF v_setting.min_penalty_amount > 0 AND v_penalty_amount < v_setting.min_penalty_amount THEN
      v_penalty_amount := v_setting.min_penalty_amount;
    END IF;
    
    IF v_setting.max_penalty_amount IS NOT NULL AND v_penalty_amount > v_setting.max_penalty_amount THEN
      v_penalty_amount := v_setting.max_penalty_amount;
    END IF;
    
    -- Crear registro de multa
    INSERT INTO seller_delivery_penalties (
      order_id,
      auction_id,
      seller_id,
      buyer_id,
      order_amount,
      expected_delivery_date,
      penalty_percent,
      penalty_amount,
      status,
      reason,
      days_overdue,
      applied_at
    )
    VALUES (
      v_order.id,
      v_order.auction_id,
      v_order.seller_id,
      v_order.buyer_id,
      v_order.total_amount,
      v_order.delivery_deadline,
      v_setting.penalty_percent,
      v_penalty_amount,
      'pending',
      CASE 
        WHEN v_days_overdue > 14 THEN 'no_delivery'
        WHEN v_days_overdue > 7 THEN 'delivery_late'
        ELSE 'delivery_not_confirmed'
      END,
      v_days_overdue,
      NOW()
    )
    RETURNING id INTO v_penalty_id;
    
    v_penalties_applied := v_penalties_applied + 1;
    
    -- Marcar orden como penalizada
    UPDATE orders
    SET 
      delivery_penalty_applied = true,
      updated_at = NOW()
    WHERE id = v_order.id;
    
    -- Verificar si se debe reembolsar al comprador
    IF v_setting.auto_refund_buyer 
       AND v_days_overdue >= v_setting.refund_after_days 
       AND NOT EXISTS (SELECT 1 FROM orders WHERE id = v_order.id AND delivery_status = 'refunded') THEN
      
      -- Actualizar estado de orden
      UPDATE orders
      SET 
        delivery_status = 'refunded',
        status = 'cancelled',
        updated_at = NOW()
      WHERE id = v_order.id;
      
      -- Marcar reembolso en multa
      UPDATE seller_delivery_penalties
      SET 
        refund_issued = true,
        refund_amount = v_order.total_amount,
        updated_at = NOW()
      WHERE id = v_penalty_id;
      
      v_orders_refunded := v_orders_refunded + 1;
      
      -- Crear notificación para comprador
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
        INSERT INTO public.notifications (
          user_id,
          type,
          title,
          message,
          content,
          data
        )
        VALUES (
          v_order.buyer_id,
          'system',
          'Pedido reembolsado por falta de entrega',
          'Tu pedido #' || SUBSTRING(v_order.id::text, 1, 8) || ' ha sido reembolsado porque el vendedor no entregó el producto.',
          'El vendedor no entregó tu pedido dentro del plazo establecido. Se te ha reembolsado el monto completo de Gs. ' || TO_CHAR(v_order.total_amount, '999,999,999') || '.',
          jsonb_build_object(
            'order_id', v_order.id,
            'refund_amount', v_order.total_amount,
            'action_url', '/dashboard/orders'
          )
        );
      END IF;
    END IF;
    
    -- Verificar si se debe restringir al vendedor
    IF v_setting.auto_restrict_seller THEN
      DECLARE
        v_penalty_count INTEGER;
      BEGIN
        -- Contar multas pendientes o pagadas del vendedor
        SELECT COUNT(*) INTO v_penalty_count
        FROM seller_delivery_penalties
        WHERE seller_id = v_order.seller_id
          AND status IN ('pending', 'paid');
        
        -- Si alcanza el límite, aplicar restricción
        IF v_penalty_count >= v_setting.restriction_after_penalties THEN
          UPDATE seller_delivery_penalties
          SET 
            seller_restricted = true,
            seller_restriction_level = v_setting.restriction_level,
            updated_at = NOW()
          WHERE id = v_penalty_id;
          
          -- Pausar tienda del vendedor si está suspendido o baneado
          IF v_setting.restriction_level IN ('suspended', 'banned') THEN
            UPDATE stores
            SET 
              status = 'paused',
              updated_at = NOW()
            WHERE seller_id = v_order.seller_id;
          END IF;
          
          v_sellers_restricted := v_sellers_restricted + 1;
        END IF;
      END;
    END IF;
    
    -- Crear notificación para vendedor
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
      DECLARE
        v_penalty_formatted TEXT;
        v_order_formatted TEXT;
      BEGIN
        v_penalty_formatted := TO_CHAR(v_penalty_amount, '999,999,999');
        v_order_formatted := TO_CHAR(v_order.total_amount, '999,999,999');
        
        INSERT INTO public.notifications (
          user_id,
          type,
          title,
          message,
          content,
          data
        )
        VALUES (
          v_order.seller_id,
          'system',
          'Multa aplicada por falta de entrega',
          'Se te ha aplicado una multa de Gs. ' || v_penalty_formatted || ' por no entregar el pedido #' || SUBSTRING(v_order.id::text, 1, 8),
          'Se te ha aplicado una multa de Gs. ' || v_penalty_formatted || ' (' || v_setting.penalty_percent || '% del monto del pedido de Gs. ' || v_order_formatted || ') por no completar la entrega dentro del plazo establecido (' || v_days_overdue || ' días de retraso).',
          jsonb_build_object(
            'penalty_id', v_penalty_id,
            'order_id', v_order.id,
            'penalty_amount', v_penalty_amount,
            'order_amount', v_order.total_amount,
            'days_overdue', v_days_overdue,
            'action_url', '/dashboard/orders'
          )
        );
        
        -- Actualizar multa con timestamp de notificación
        UPDATE seller_delivery_penalties
        SET 
          notified_at = NOW(),
          notification_count = 1,
          updated_at = NOW()
        WHERE id = v_penalty_id;
      END;
    END IF;
  END LOOP;
  
  -- Retornar resultado
  v_result := jsonb_build_object(
    'success', true,
    'total_checked', v_total_checked,
    'penalties_applied', v_penalties_applied,
    'orders_refunded', v_orders_refunded,
    'sellers_restricted', v_sellers_restricted,
    'timestamp', NOW()
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. FUNCIÓN: send_delivery_warnings()
-- Envía avisos a vendedores antes del plazo
-- ============================================

CREATE OR REPLACE FUNCTION send_delivery_warnings()
RETURNS JSONB AS $$
DECLARE
  v_setting RECORD;
  v_order RECORD;
  v_warnings_sent INTEGER := 0;
  v_result JSONB;
BEGIN
  -- Obtener configuración activa
  SELECT * INTO v_setting
  FROM seller_delivery_settings
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No hay configuración activa');
  END IF;
  
  -- Buscar órdenes próximas a vencer que aún no recibieron aviso
  FOR v_order IN
    SELECT 
      o.id,
      o.buyer_id,
      o.total_amount,
      o.delivery_deadline,
      oi.seller_id
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE 
      o.status = 'paid'
      AND o.delivery_status IN ('pending', 'confirmed', 'in_transit')
      AND o.delivery_deadline IS NOT NULL
      AND o.delivery_deadline <= NOW() + (v_setting.warning_hours_before || ' hours')::INTERVAL
      AND o.delivery_deadline > NOW()
      AND o.delivery_warning_sent = false
      AND o.is_auction_order = true
    GROUP BY o.id, o.buyer_id, o.total_amount, o.delivery_deadline, oi.seller_id
  LOOP
    -- Enviar notificación de aviso
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        content,
        data
      )
      VALUES (
        v_order.seller_id,
        'system',
        '⚠️ Recordatorio: Entrega próxima a vencer',
        'Tu pedido #' || SUBSTRING(v_order.id::text, 1, 8) || ' debe entregarse antes del ' || TO_CHAR(v_order.delivery_deadline, 'DD/MM/YYYY HH24:MI'),
        'Recuerda entregar el producto del pedido #' || SUBSTRING(v_order.id::text, 1, 8) || ' antes del ' || TO_CHAR(v_order.delivery_deadline, 'DD/MM/YYYY') || '. Si no lo entregas, se aplicará una multa del ' || v_setting.penalty_percent || '% del monto del pedido.',
        jsonb_build_object(
          'order_id', v_order.id,
          'deadline', v_order.delivery_deadline,
          'action_url', '/dashboard/orders'
        )
      );
    END IF;
    
    -- Marcar que se envió aviso
    UPDATE orders
    SET 
      delivery_warning_sent = true,
      updated_at = NOW()
    WHERE id = v_order.id;
    
    v_warnings_sent := v_warnings_sent + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'warnings_sent', v_warnings_sent,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. FUNCIÓN: confirm_delivery()
-- Permite que comprador confirme recepción
-- ============================================

CREATE OR REPLACE FUNCTION confirm_delivery(
  p_order_id UUID,
  p_buyer_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_result JSONB;
BEGIN
  -- Verificar que la orden existe y pertenece al comprador
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
    AND buyer_id = p_buyer_id
    AND status = 'paid'
    AND delivery_status != 'delivered';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Orden no encontrada o ya entregada'
    );
  END IF;
  
  -- Actualizar estado de entrega
  UPDATE orders
  SET 
    delivery_status = 'delivered',
    delivery_confirmed_at = NOW(),
    delivery_confirmed_by = p_buyer_id,
    status = 'delivered',
    updated_at = NOW()
  WHERE id = p_order_id;
  
  -- Crear notificación para vendedor
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
    DECLARE
      v_seller_id UUID;
    BEGIN
      SELECT seller_id INTO v_seller_id
      FROM order_items
      WHERE order_id = p_order_id
      LIMIT 1;
      
      IF v_seller_id IS NOT NULL THEN
        INSERT INTO public.notifications (
          user_id,
          type,
          title,
          message,
          content,
          data
        )
        VALUES (
          v_seller_id,
          'system',
          '✅ Entrega confirmada',
          'El comprador confirmó la recepción del pedido #' || SUBSTRING(p_order_id::text, 1, 8),
          'El comprador confirmó que recibió el producto. La transacción se ha completado exitosamente.',
          jsonb_build_object(
            'order_id', p_order_id,
            'action_url', '/dashboard/orders'
          )
        );
      END IF;
    END;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Entrega confirmada exitosamente',
    'order_id', p_order_id,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. FUNCIÓN: set_delivery_deadline()
-- Establece fecha límite al crear orden de subasta
-- ============================================

CREATE OR REPLACE FUNCTION set_delivery_deadline_for_auction_order()
RETURNS TRIGGER AS $$
DECLARE
  v_setting RECORD;
BEGIN
  -- Solo para órdenes de subastas
  IF NEW.is_auction_order = true THEN
    -- Obtener configuración
    SELECT * INTO v_setting
    FROM seller_delivery_settings
    WHERE is_active = true
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Si hay configuración, establecer fecha límite
    IF FOUND THEN
      NEW.delivery_deadline := NEW.created_at + (v_setting.max_delivery_days || ' days')::INTERVAL;
      NEW.expected_delivery_date := NEW.delivery_deadline;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para establecer fecha límite automáticamente
DROP TRIGGER IF EXISTS trigger_set_delivery_deadline ON orders;
CREATE TRIGGER trigger_set_delivery_deadline
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_delivery_deadline_for_auction_order();

-- ============================================
-- 8. TRIGGER: Actualizar updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_seller_delivery_penalties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_seller_penalties_updated_at ON seller_delivery_penalties;
CREATE TRIGGER trigger_update_seller_penalties_updated_at
  BEFORE UPDATE ON seller_delivery_penalties
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_delivery_penalties_updated_at();

CREATE OR REPLACE FUNCTION update_seller_delivery_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_delivery_settings_updated_at ON seller_delivery_settings;
CREATE TRIGGER trigger_update_delivery_settings_updated_at
  BEFORE UPDATE ON seller_delivery_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_delivery_settings_updated_at();

-- ============================================
-- 9. COMENTARIOS
-- ============================================

COMMENT ON TABLE seller_delivery_penalties IS 'Multas aplicadas a vendedores que no entregan productos';
COMMENT ON TABLE seller_delivery_settings IS 'Configuración de plazos y multas para entregas';
COMMENT ON FUNCTION check_unfulfilled_orders_and_apply_penalties IS 'Verifica órdenes sin entregar y aplica multas automáticamente';
COMMENT ON FUNCTION send_delivery_warnings IS 'Envía avisos a vendedores antes de que venza el plazo de entrega';
COMMENT ON FUNCTION confirm_delivery IS 'Permite que comprador confirme recepción del producto';






-- ============================================
-- MERCADITO ONLINE PY - AUDITORÍA Y MANTENIMIENTO
-- Migración: Tablas y funciones para auditoría nocturna y limpieza
-- ============================================

-- ============================================
-- 1. TABLA admin_alerts (Prioridad 7)
-- ============================================

CREATE TABLE IF NOT EXISTS admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'unpaid_order',
    'missing_auction_order',
    'suspicious_bidder',
    'inactive_seller',
    'system_error',
    'backup_failed',
    'maintenance_completed'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  related_entity_type TEXT, -- 'order', 'product', 'user', 'store', etc.
  related_entity_id UUID,
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para admin_alerts
CREATE INDEX IF NOT EXISTS idx_admin_alerts_type ON admin_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_status ON admin_alerts(status);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_severity ON admin_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_created ON admin_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_entity ON admin_alerts(related_entity_type, related_entity_id) WHERE related_entity_id IS NOT NULL;

-- ============================================
-- 2. TABLA maintenance_logs (Prioridad 8)
-- ============================================

CREATE TABLE IF NOT EXISTS maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN (
    'product_hidden',
    'product_restored',
    'store_paused',
    'store_activated',
    'cleanup',
    'backup',
    'audit'
  )),
  entity_type TEXT NOT NULL, -- 'product', 'store', 'order', 'system', etc.
  entity_id UUID,
  action_description TEXT NOT NULL,
  affected_count INTEGER,
  metadata JSONB DEFAULT '{}',
  executed_by TEXT DEFAULT 'system', -- 'system', admin user_id, etc.
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para maintenance_logs
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_type ON maintenance_logs(maintenance_type);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_executed ON maintenance_logs(executed_at);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_entity ON maintenance_logs(entity_type, entity_id) WHERE entity_id IS NOT NULL;

-- ============================================
-- 3. FUNCIÓN: run_nightly_audit() (Prioridad 7)
-- ============================================

CREATE OR REPLACE FUNCTION run_nightly_audit()
RETURNS JSONB AS $$
DECLARE
  v_unpaid_orders INTEGER := 0;
  v_missing_orders INTEGER := 0;
  v_suspicious_bidders INTEGER := 0;
  v_order_record RECORD;
  v_auction_record RECORD;
  v_result JSONB;
BEGIN
  -- 1. Verificar órdenes sin pago >48h
  FOR v_order_record IN (
    SELECT 
      o.id,
      o.buyer_id,
      o.total_amount,
      o.created_at,
      o.status,
      o.payment_method
    FROM orders o
    WHERE o.status = 'pending'
      AND (o.payment_method = 'cash' OR o.payment_method IS NULL)
      AND o.created_at < NOW() - INTERVAL '48 hours'
  ) LOOP
    INSERT INTO admin_alerts (
      alert_type,
      severity,
      title,
      description,
      related_entity_type,
      related_entity_id,
      metadata
    ) VALUES (
      'unpaid_order',
      'medium',
      'Orden sin pago por más de 48 horas',
      'La orden #' || SUBSTRING(v_order_record.id::TEXT, 1, 8) || ' tiene un monto pendiente de $' || v_order_record.total_amount,
      'order',
      v_order_record.id,
      jsonb_build_object(
        'buyer_id', v_order_record.buyer_id,
        'amount', v_order_record.total_amount,
        'created_at', v_order_record.created_at,
        'payment_method', v_order_record.payment_method
      )
    );
    v_unpaid_orders := v_unpaid_orders + 1;
  END LOOP;
  
  -- 2. Verificar subastas finalizadas sin orden
  FOR v_auction_record IN (
    SELECT 
      p.id,
      p.title,
      p.seller_id,
      p.auction_end_at,
      p.winner_id,
      EXTRACT(EPOCH FROM (NOW() - p.auction_end_at)) / 3600 AS hours_since_ended
    FROM products p
    WHERE p.sale_type = 'auction'
      AND p.auction_status = 'ended'
      AND p.winner_id IS NOT NULL
      AND p.auction_end_at < NOW() - INTERVAL '24 hours'
      AND NOT EXISTS (
        SELECT 1 FROM orders o
        WHERE o.buyer_id = p.winner_id
        AND EXISTS (
          SELECT 1 FROM order_items oi
          WHERE oi.order_id = o.id
          AND oi.product_id = p.id
        )
      )
  ) LOOP
    INSERT INTO admin_alerts (
      alert_type,
      severity,
      title,
      description,
      related_entity_type,
      related_entity_id,
      metadata
    ) VALUES (
      'missing_auction_order',
      'high',
      'Subasta finalizada sin orden de compra',
      'La subasta "' || v_auction_record.title || '" terminó hace ' || ROUND(v_auction_record.hours_since_ended) || ' horas pero el ganador no ha completado la compra',
      'product',
      v_auction_record.id,
      jsonb_build_object(
        'seller_id', v_auction_record.seller_id,
        'winner_id', v_auction_record.winner_id,
        'ended_at', v_auction_record.auction_end_at,
        'hours_since_ended', ROUND(v_auction_record.hours_since_ended)
      )
    );
    v_missing_orders := v_missing_orders + 1;
  END LOOP;
  
  -- 3. Detectar postores anómalos (simplificado - requiere analytics_events)
  -- Nota: Esta verificación usa analytics_events si tiene IP/UA
  -- Se puede expandir más adelante con tabla específica de bids
  
  -- 4. Verificar y aplicar multas por no-pago de subastas
  -- Esta función se ejecuta automáticamente desde check_unpaid_auctions_and_apply_penalties()
  -- Solo agregamos nota en el resultado
  
  -- Retornar resumen
  v_result := jsonb_build_object(
    'alerts_created', v_unpaid_orders + v_missing_orders + v_suspicious_bidders,
    'by_type', jsonb_build_object(
      'unpaid_orders', v_unpaid_orders,
      'missing_auction_orders', v_missing_orders,
      'suspicious_bidders', v_suspicious_bidders
    ),
    'note', 'Las multas por no-pago se aplican mediante check_unpaid_auctions_and_apply_penalties()',
    'timestamp', NOW()
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. FUNCIÓN: cleanup_inactive_items() (Prioridad 8)
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_inactive_items()
RETURNS JSONB AS $$
DECLARE
  v_products_hidden INTEGER := 0;
  v_stores_paused INTEGER := 0;
  v_log_id UUID;
  v_result JSONB;
BEGIN
  -- 1. Ocultar productos sin stock (solo productos directos, no subastas)
  WITH updated_products AS (
    UPDATE products
    SET 
      status = 'out_of_stock',
      updated_at = NOW()
    WHERE 
      status = 'active'
      AND sale_type = 'direct'
      AND (
        stock_quantity IS NULL 
        OR stock_quantity <= 0
        OR (stock_quantity::text = '0')
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_products_hidden FROM updated_products;
  
  -- 2. Pausar tiendas inactivas (sin actividad en 90 días)
  WITH updated_stores AS (
    UPDATE stores
    SET 
      is_active = false,
      settings = COALESCE(settings, '{}'::jsonb) || 
        jsonb_build_object(
          'auto_paused_at', NOW(),
          'reason', 'inactivity_90d',
          'previous_status', is_active
        ),
      updated_at = NOW()
    WHERE 
      is_active = true
      AND (
        -- Sin productos nuevos en 90 días
        (
          SELECT MAX(created_at) 
          FROM products 
          WHERE store_id = stores.id OR seller_id = stores.seller_id
        ) < NOW() - INTERVAL '90 days'
        OR NOT EXISTS (
          SELECT 1 
          FROM products 
          WHERE store_id = stores.id OR seller_id = stores.seller_id
        )
      )
      AND (
        -- Sin órdenes recientes en 90 días
        NOT EXISTS (
          SELECT 1 
          FROM orders o
          JOIN order_items oi ON oi.order_id = o.id
          JOIN products p ON p.id = oi.product_id
          WHERE (p.store_id = stores.id OR p.seller_id = stores.seller_id)
          AND o.created_at > NOW() - INTERVAL '90 days'
        )
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_stores_paused FROM updated_stores;
  
  -- 3. Registrar en log
  INSERT INTO maintenance_logs (
    maintenance_type,
    entity_type,
    action_description,
    affected_count,
    metadata,
    executed_by
  ) VALUES (
    'cleanup',
    'mixed',
    'Limpieza automática de productos y tiendas inactivas',
    v_products_hidden + v_stores_paused,
    jsonb_build_object(
      'products_hidden', v_products_hidden,
      'stores_paused', v_stores_paused,
      'executed_at', NOW()
    ),
    'system'
  ) RETURNING id INTO v_log_id;
  
  -- Retornar resumen
  v_result := jsonb_build_object(
    'products_hidden', v_products_hidden,
    'stores_paused', v_stores_paused,
    'log_id', v_log_id,
    'timestamp', NOW()
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. COMENTARIOS Y DOCUMENTACIÓN
-- ============================================

COMMENT ON TABLE admin_alerts IS 'Alertas generadas por el sistema de auditoría para administradores';
COMMENT ON TABLE maintenance_logs IS 'Log de acciones de mantenimiento automático del sistema';
COMMENT ON FUNCTION run_nightly_audit IS 'Ejecuta verificaciones nocturnas y genera alertas administrativas';
COMMENT ON FUNCTION cleanup_inactive_items IS 'Oculta productos sin stock y pausa tiendas inactivas por 90 días';


-- ============================================
-- MERCADITO ONLINE PY - SISTEMA DE MULTAS Y PENALIZACIONES
-- Multas para ganadores que no pagan subastas ganadas
-- Cancelación de membresía por no-pago
-- ============================================

-- ============================================
-- 1. TABLA: AUCTION_PENALTIES
-- Registro de multas aplicadas
-- ============================================

CREATE TABLE IF NOT EXISTS auction_penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relaciones
  auction_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL, -- Orden que no se pagó
  
  -- Información de la subasta
  winning_bid_amount DECIMAL(10,2) NOT NULL CHECK (winning_bid_amount > 0),
  
  -- Información de multa
  penalty_percent DECIMAL(5,2) NOT NULL DEFAULT 5.00 CHECK (penalty_percent >= 0 AND penalty_percent <= 100),
  penalty_amount DECIMAL(10,2) NOT NULL CHECK (penalty_amount >= 0),
  
  -- Estado
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'waived', 'cancelled')),
  payment_method TEXT, -- Cómo se pagó la multa
  payment_reference TEXT, -- Referencia de pago
  
  -- Acciones tomadas
  membership_cancelled BOOLEAN DEFAULT false,
  membership_level_before TEXT, -- Nivel antes de cancelar
  membership_level_after TEXT DEFAULT 'free', -- Nivel después (normalmente free)
  
  -- Notificaciones
  notified_at TIMESTAMPTZ, -- Cuando se notificó al usuario
  notification_count INTEGER DEFAULT 0, -- Cuántas veces se notificó
  
  -- Auditoría
  applied_by UUID REFERENCES profiles(id), -- Admin que aplicó (si manual)
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  waived_at TIMESTAMPTZ,
  waived_by UUID REFERENCES profiles(id), -- Admin que perdonó la multa
  waived_reason TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}', -- Información adicional
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_penalties_user ON auction_penalties(user_id);
CREATE INDEX IF NOT EXISTS idx_penalties_auction ON auction_penalties(auction_id);
CREATE INDEX IF NOT EXISTS idx_penalties_status ON auction_penalties(status);
CREATE INDEX IF NOT EXISTS idx_penalties_applied_at ON auction_penalties(applied_at DESC);

-- RLS
ALTER TABLE auction_penalties ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios pueden ver sus propias multas
DROP POLICY IF EXISTS "Users can view own penalties" ON auction_penalties;
CREATE POLICY "Users can view own penalties" ON auction_penalties
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Política: Admins pueden ver todas las multas
DROP POLICY IF EXISTS "Admins can view all penalties" ON auction_penalties;
CREATE POLICY "Admins can view all penalties" ON auction_penalties
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
DROP POLICY IF EXISTS "System can insert penalties" ON auction_penalties;
CREATE POLICY "System can insert penalties" ON auction_penalties
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política: Admins pueden actualizar multas
DROP POLICY IF EXISTS "Admins can update penalties" ON auction_penalties;
CREATE POLICY "Admins can update penalties" ON auction_penalties
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
-- 2. TABLA: PENALTY_SETTINGS
-- Configuración de multas (porcentaje, tiempos, etc.)
-- ============================================

CREATE TABLE IF NOT EXISTS penalty_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Configuración de multa
  penalty_percent DECIMAL(5,2) NOT NULL DEFAULT 5.00 CHECK (penalty_percent >= 0 AND penalty_percent <= 100),
  
  -- Tiempos
  grace_period_hours INTEGER DEFAULT 48, -- Horas antes de aplicar multa (2 días)
  notification_hours_before INTEGER[] DEFAULT ARRAY[72, 48, 24], -- Horas antes para enviar notificaciones (3, 2, 1 día)
  
  -- Acciones automáticas
  auto_cancel_membership BOOLEAN DEFAULT true, -- Cancelar membresía automáticamente
  membership_cancellation_delay_hours INTEGER DEFAULT 0, -- Horas después de multa para cancelar (0 = inmediato)
  
  -- Configuración
  is_active BOOLEAN DEFAULT true,
  
  -- Auditoría
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Solo un registro activo
  CONSTRAINT unique_active_setting UNIQUE (is_active) WHERE is_active = true
);

-- Insertar configuración por defecto
INSERT INTO penalty_settings (
  penalty_percent,
  grace_period_hours,
  notification_hours_before,
  auto_cancel_membership,
  membership_cancellation_delay_hours,
  is_active
) VALUES (
  5.00,
  48,
  ARRAY[72, 48, 24],
  true,
  0,
  true
) ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE penalty_settings ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver/editar
DROP POLICY IF EXISTS "Admins can manage penalty settings" ON penalty_settings;
CREATE POLICY "Admins can manage penalty settings" ON penalty_settings
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
-- 3. FUNCIÓN: check_unpaid_auctions_and_apply_penalties()
-- Verifica subastas ganadas sin pago y aplica multas
-- ============================================

CREATE OR REPLACE FUNCTION check_unpaid_auctions_and_apply_penalties()
RETURNS JSONB AS $$
DECLARE
  v_setting RECORD;
  v_auction RECORD;
  v_penalty_id UUID;
  v_penalty_amount DECIMAL(10,2);
  v_hours_since_ended NUMERIC;
  v_total_checked INTEGER := 0;
  v_penalties_applied INTEGER := 0;
  v_result JSONB;
BEGIN
  -- Obtener configuración activa
  SELECT * INTO v_setting
  FROM penalty_settings
  WHERE is_active = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    -- Usar valores por defecto si no hay configuración
    v_setting := ROW(
      NULL::UUID, -- id
      5.00, -- penalty_percent
      48, -- grace_period_hours
      ARRAY[72, 48, 24]::INTEGER[], -- notification_hours_before
      true, -- auto_cancel_membership
      0, -- membership_cancellation_delay_hours
      true, -- is_active
      NULL::UUID, -- updated_by
      NOW() -- updated_at
    );
  END IF;
  
  -- Buscar subastas ganadas sin orden o con orden sin pago
  FOR v_auction IN (
    SELECT 
      p.id AS auction_id,
      p.title,
      p.seller_id,
      p.winner_id,
      p.auction_end_at,
      p.current_bid AS winning_bid,
      EXTRACT(EPOCH FROM (NOW() - p.auction_end_at)) / 3600 AS hours_since_ended
    FROM products p
    WHERE p.sale_type = 'auction'
      AND p.auction_status = 'ended'
      AND p.winner_id IS NOT NULL
      AND p.auction_end_at IS NOT NULL
      -- Más de grace_period_hours desde que terminó
      AND p.auction_end_at < NOW() - (v_setting.grace_period_hours || ' hours')::INTERVAL
      -- No tiene orden completa pagada
      AND NOT EXISTS (
        SELECT 1 
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE oi.product_id = p.id
          AND o.buyer_id = p.winner_id
          AND o.status IN ('confirmed', 'shipped', 'delivered')
      )
      -- No tiene multa ya aplicada
      AND NOT EXISTS (
        SELECT 1
        FROM auction_penalties ap
        WHERE ap.auction_id = p.id
          AND ap.user_id = p.winner_id
          AND ap.status != 'cancelled'
      )
  ) LOOP
    v_total_checked := v_total_checked + 1;
    
    -- Calcular multa
    v_penalty_amount := v_auction.winning_bid * (v_setting.penalty_percent / 100);
    
    -- Variables locales para este bloque
    DECLARE
      v_order_id UUID;
      v_membership_level_before TEXT;
      v_membership_level_after TEXT := 'free';
      v_penalty_id UUID;
      v_penalty_formatted TEXT;
      v_bid_formatted TEXT;
    BEGIN
      -- Buscar orden no pagada relacionada
      SELECT o.id INTO v_order_id
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      WHERE oi.product_id = v_auction.auction_id
        AND o.buyer_id = v_auction.winner_id
        AND o.status = 'pending'
      LIMIT 1;
      
      -- Obtener membresía actual
      SELECT membership_level INTO v_membership_level_before
      FROM profiles
      WHERE id = v_auction.winner_id;
      
      -- Crear multa
      INSERT INTO auction_penalties (
        auction_id,
        user_id,
        order_id,
        winning_bid_amount,
        penalty_percent,
        penalty_amount,
        status,
        membership_level_before,
        membership_level_after,
        membership_cancelled,
        metadata
      )
      VALUES (
        v_auction.auction_id,
        v_auction.winner_id,
        v_order_id,
        v_auction.winning_bid,
        v_setting.penalty_percent,
        v_penalty_amount,
        'pending',
        v_membership_level_before,
        v_membership_level_after,
        false, -- Se cancelará después si está configurado
        jsonb_build_object(
          'grace_period_hours', v_setting.grace_period_hours,
          'hours_since_ended', v_auction.hours_since_ended,
          'auction_title', v_auction.title
        )
      )
      RETURNING id INTO v_penalty_id;
      
      -- Cancelar membresía si está configurado
      IF v_setting.auto_cancel_membership THEN
        -- Si delay es 0, cancelar inmediatamente, sino esperar
        IF v_setting.membership_cancellation_delay_hours = 0 THEN
          -- Cancelar membresía inmediatamente
          UPDATE profiles
          SET 
            membership_level = 'free',
            membership_expires_at = NULL,
            updated_at = NOW()
          WHERE id = v_auction.winner_id
            AND membership_level != 'free'; -- Solo si no es ya free
          
          -- Actualizar multa
          UPDATE auction_penalties
          SET 
            membership_cancelled = true,
            membership_level_after = 'free',
            updated_at = NOW()
          WHERE id = v_penalty_id;
        END IF;
      END IF;
      
      -- Crear notificación para el usuario
      -- Verificar si existe tabla de notificaciones
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
        -- Formatear montos (simplificado, sin función formatCurrency)
        v_penalty_formatted := TO_CHAR(v_penalty_amount, '999,999,999');
        v_bid_formatted := TO_CHAR(v_auction.winning_bid, '999,999,999');
        
        INSERT INTO public.notifications (
          user_id,
          type,
          title,
          message,
          content,
          data
        )
        VALUES (
          v_auction.winner_id,
          'system',
          'Multa aplicada por no-pago de subasta',
          'Se te ha aplicado una multa de Gs. ' || v_penalty_formatted || ' por no completar el pago de la subasta "' || v_auction.title || '"',
          'Se te ha aplicado una multa de Gs. ' || v_penalty_formatted || ' (' || v_setting.penalty_percent || '% del monto adjudicado de Gs. ' || v_bid_formatted || ') por no completar el pago de la subasta "' || v_auction.title || '" dentro del período de gracia de ' || v_setting.grace_period_hours || ' horas.',
          jsonb_build_object(
            'penalty_id', v_penalty_id,
            'auction_id', v_auction.auction_id,
            'penalty_amount', v_penalty_amount,
            'winning_bid', v_auction.winning_bid,
            'action_url', '/dashboard/penalties'
          )
        );
        
        -- Actualizar multa con timestamp de notificación
        UPDATE auction_penalties
        SET 
          notified_at = NOW(),
          notification_count = 1,
          updated_at = NOW()
        WHERE id = v_penalty_id;
      END IF;
      
      v_penalties_applied := v_penalties_applied + 1;
    END;
  END LOOP;
  
  -- Retornar resultado
  v_result := jsonb_build_object(
    'success', true,
    'total_checked', v_total_checked,
    'penalties_applied', v_penalties_applied,
    'timestamp', NOW()
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. FUNCIÓN: apply_penalty_to_user()
-- Aplica multa manualmente a un usuario
-- ============================================

CREATE OR REPLACE FUNCTION apply_penalty_to_user(
  p_auction_id UUID,
  p_user_id UUID,
  p_penalty_percent DECIMAL(5,2) DEFAULT NULL,
  p_admin_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_auction RECORD;
  v_setting RECORD;
  v_penalty_amount DECIMAL(10,2);
  v_penalty_id UUID;
  v_membership_level_before TEXT;
BEGIN
  -- Validar que es admin
  IF p_admin_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Solo administradores pueden aplicar multas manualmente';
    END IF;
  END IF;
  
  -- Obtener información de subasta
  SELECT 
    id,
    winner_id,
    current_bid,
    auction_end_at,
    title
  INTO v_auction
  FROM products
  WHERE id = p_auction_id
    AND sale_type = 'auction'
    AND auction_status = 'ended'
    AND winner_id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subasta no encontrada o usuario no es el ganador';
  END IF;
  
  -- Verificar que no tenga multa ya aplicada
  IF EXISTS (
    SELECT 1 FROM auction_penalties
    WHERE auction_id = p_auction_id
      AND user_id = p_user_id
      AND status != 'cancelled'
  ) THEN
    RAISE EXCEPTION 'Ya existe una multa para esta subasta';
  END IF;
  
  -- Obtener configuración
  SELECT * INTO v_setting
  FROM penalty_settings
  WHERE is_active = true
  LIMIT 1;
  
  -- Usar porcentaje proporcionado o de configuración
  IF p_penalty_percent IS NULL THEN
    p_penalty_percent := COALESCE(v_setting.penalty_percent, 5.00);
  END IF;
  
  -- Calcular multa
  v_penalty_amount := v_auction.current_bid * (p_penalty_percent / 100);
  
  -- Obtener membresía actual
  SELECT membership_level INTO v_membership_level_before
  FROM profiles
  WHERE id = p_user_id;
  
  -- Crear multa
  INSERT INTO auction_penalties (
    auction_id,
    user_id,
    winning_bid_amount,
    penalty_percent,
    penalty_amount,
    status,
    membership_level_before,
    membership_level_after,
    applied_by,
    metadata
  )
  VALUES (
    p_auction_id,
    p_user_id,
    v_auction.current_bid,
    p_penalty_percent,
    v_penalty_amount,
    'pending',
    v_membership_level_before,
    'free',
    p_admin_id,
    jsonb_build_object(
      'applied_manually', true,
      'auction_title', v_auction.title
    )
  )
  RETURNING id INTO v_penalty_id;
  
  -- Cancelar membresía si está configurado
  IF v_setting.auto_cancel_membership THEN
    UPDATE profiles
    SET 
      membership_level = 'free',
      membership_expires_at = NULL,
      updated_at = NOW()
    WHERE id = p_user_id
      AND membership_level != 'free';
    
    UPDATE auction_penalties
    SET membership_cancelled = true
    WHERE id = v_penalty_id;
  END IF;
  
  RETURN v_penalty_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. FUNCIÓN: cancel_membership_for_non_payment()
-- Cancela membresía de usuarios con multas pendientes
-- ============================================

CREATE OR REPLACE FUNCTION cancel_membership_for_non_payment(
  p_user_id UUID,
  p_reason TEXT DEFAULT 'No pago de subasta ganada'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_level TEXT;
BEGIN
  -- Obtener nivel actual
  SELECT membership_level INTO v_current_level
  FROM profiles
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;
  
  IF v_current_level = 'free' THEN
    RETURN false; -- Ya es free, no hacer nada
  END IF;
  
  -- Cancelar membresía
  UPDATE profiles
  SET 
    membership_level = 'free',
    membership_expires_at = NULL,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Actualizar multas pendientes
  UPDATE auction_penalties
  SET 
    membership_cancelled = true,
    membership_level_after = 'free',
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND status = 'pending'
    AND membership_cancelled = false;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. ACTUALIZAR AUDITORÍA NOCTURNA
-- ============================================

-- La función run_nightly_audit() ya existe, solo agregamos llamada a check_unpaid_auctions_and_apply_penalties()
-- Se puede llamar desde el cron job existente

-- ============================================
-- 7. COMENTARIOS
-- ============================================

COMMENT ON TABLE auction_penalties IS 'Registro de multas aplicadas a ganadores que no pagan subastas';
COMMENT ON TABLE penalty_settings IS 'Configuración de multas y penalizaciones por no-pago';
COMMENT ON FUNCTION check_unpaid_auctions_and_apply_penalties IS 'Verifica subastas ganadas sin pago y aplica multas automáticamente';
COMMENT ON FUNCTION apply_penalty_to_user IS 'Aplica multa manualmente a un usuario (solo admin)';
COMMENT ON FUNCTION cancel_membership_for_non_payment IS 'Cancela membresía de usuario por no-pago de subasta';


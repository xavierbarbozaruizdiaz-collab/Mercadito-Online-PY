-- ============================================
-- MERCADITO ONLINE PY - SISTEMA DE INFLUENCERS
-- Sistema de marketing con influencers gestionado desde panel admin
-- Comisiones basadas en porcentaje de comisión de pasarela de pago
-- ============================================

-- ============================================
-- 1. TABLA: INFLUENCERS
-- Gestión de influencers desde panel admin
-- ============================================

CREATE TABLE IF NOT EXISTS influencers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Información básica
  influencer_name TEXT NOT NULL,           -- Nombre/username del influencer
  influencer_code TEXT UNIQUE NOT NULL,    -- Código único: INSTAGRAM_USERNAME, TIKTOK_USERNAME
  social_media_platform TEXT NOT NULL,      -- instagram, tiktok, youtube, facebook, twitter
  contact_email TEXT,
  contact_phone TEXT,
  bio TEXT,                                -- Biografía/descripción
  
  -- Comisiones (gestionables desde admin)
  commission_percent DECIMAL(5,2) NOT NULL DEFAULT 10.00 CHECK (commission_percent >= 0 AND commission_percent <= 100),
  commission_type TEXT DEFAULT 'gateway_fee_percent' CHECK (commission_type IN ('gateway_fee_percent', 'platform_revenue_percent', 'fixed_per_sale')),
  
  -- Configuración de alcance
  can_track_all_stores BOOLEAN DEFAULT true, -- Si puede trackear todas las tiendas o solo específicas
  assigned_stores UUID[],                   -- Tiendas específicas (si can_track_all_stores = false)
  
  -- Límites y condiciones
  min_sales_threshold INTEGER DEFAULT 0,    -- Mínimo de ventas para activar comisión
  max_commission_per_month DECIMAL(10,2),   -- Límite mensual de comisiones (NULL = sin límite)
  min_commission_per_order DECIMAL(10,2) DEFAULT 0, -- Mínimo por orden
  max_commission_per_order DECIMAL(10,2),  -- Máximo por orden (NULL = sin límite)
  
  -- Métricas acumuladas
  total_clicks INTEGER DEFAULT 0 CHECK (total_clicks >= 0),
  total_visits INTEGER DEFAULT 0 CHECK (total_visits >= 0),
  total_registrations INTEGER DEFAULT 0 CHECK (total_registrations >= 0),
  total_orders INTEGER DEFAULT 0 CHECK (total_orders >= 0),
  total_revenue DECIMAL(12,2) DEFAULT 0 CHECK (total_revenue >= 0),
  total_commissions_earned DECIMAL(12,2) DEFAULT 0 CHECK (total_commissions_earned >= 0),
  total_commissions_paid DECIMAL(12,2) DEFAULT 0 CHECK (total_commissions_paid >= 0),
  
  -- Tracking
  referral_link TEXT,                      -- Link único: "/?influencer=CODE"
  qr_code_url TEXT,                        -- URL del QR code generado
  
  -- Configuración de pagos
  payment_method TEXT CHECK (payment_method IN ('bank_transfer', 'paypal', 'cash', 'mobile_wallet')),
  payment_schedule TEXT DEFAULT 'monthly' CHECK (payment_schedule IN ('weekly', 'biweekly', 'monthly', 'per_order')),
  payment_threshold DECIMAL(10,2) DEFAULT 0 CHECK (payment_threshold >= 0),
  
  -- Estado
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,       -- Verificación por admin
  
  -- Auditoría
  created_by UUID REFERENCES profiles(id), -- Admin que creó
  notes TEXT,                              -- Notas internas
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_influencers_code ON influencers(influencer_code);
CREATE INDEX IF NOT EXISTS idx_influencers_active ON influencers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_influencers_platform ON influencers(social_media_platform);
CREATE INDEX IF NOT EXISTS idx_influencers_created_by ON influencers(created_by);

-- ============================================
-- 2. TABLA: PAYMENT_GATEWAY_SETTINGS
-- Configuración de comisiones por pasarela de pago
-- ============================================

CREATE TABLE IF NOT EXISTS payment_gateway_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_provider TEXT UNIQUE NOT NULL,    -- stripe, paypal, local_bank, bank_transfer, etc
  gateway_name TEXT NOT NULL,               -- Nombre legible: "Stripe", "PayPal", "Banco Nacional"
  
  -- Comisiones
  fee_percent DECIMAL(5,2) NOT NULL DEFAULT 5.00 CHECK (fee_percent >= 0 AND fee_percent <= 100),
  fixed_fee DECIMAL(10,2) DEFAULT 0 CHECK (fixed_fee >= 0), -- Fee fijo adicional (opcional)
  
  -- Configuración
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,        -- Pasarela por defecto
  
  -- Auditoría
  updated_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_gateway_settings_provider ON payment_gateway_settings(gateway_provider);
CREATE INDEX IF NOT EXISTS idx_gateway_settings_active ON payment_gateway_settings(is_active) WHERE is_active = true;

-- Insertar valores por defecto
INSERT INTO payment_gateway_settings (gateway_provider, gateway_name, fee_percent, is_default, is_active)
VALUES 
  ('stripe', 'Stripe', 5.00, true, true),
  ('paypal', 'PayPal', 5.50, false, true),
  ('local_bank', 'Banco Local', 3.00, false, true),
  ('bank_transfer', 'Transferencia Bancaria', 2.00, false, true),
  ('cash', 'Efectivo', 0.00, false, true)
ON CONFLICT (gateway_provider) DO NOTHING;

-- ============================================
-- 3. TABLA: PAYMENT_GATEWAY_FEES
-- Registro de comisiones cobradas por pasarelas
-- ============================================

CREATE TABLE IF NOT EXISTS payment_gateway_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Información de orden
  order_total DECIMAL(10,2) NOT NULL CHECK (order_total >= 0),
  
  -- Montos de comisión
  gateway_provider TEXT NOT NULL,          -- stripe, paypal, etc
  gateway_fee_percent DECIMAL(5,2) NOT NULL, -- % aplicado (histórico)
  gateway_fee_amount DECIMAL(10,2) NOT NULL CHECK (gateway_fee_amount >= 0), -- Monto real cobrado
  
  -- Información de transacción
  gateway_transaction_id TEXT,             -- ID de transacción en la pasarela
  gateway_response JSONB,                 -- Respuesta completa de la pasarela (para debug)
  
  -- Estados
  is_refunded BOOLEAN DEFAULT false,       -- Si fue reembolsado
  
  -- Timestamps
  charged_at TIMESTAMPTZ DEFAULT NOW(),
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_gateway_fees_order_id ON payment_gateway_fees(order_id);
CREATE INDEX IF NOT EXISTS idx_gateway_fees_provider ON payment_gateway_fees(gateway_provider);
CREATE INDEX IF NOT EXISTS idx_gateway_fees_charged_at ON payment_gateway_fees(charged_at DESC);

-- ============================================
-- 4. TABLA: INFLUENCER_COMMISSIONS
-- Registro de comisiones ganadas por influencers
-- ============================================

CREATE TABLE IF NOT EXISTS influencer_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  gateway_fee_id UUID REFERENCES payment_gateway_fees(id) ON DELETE SET NULL,
  
  -- Información de orden
  order_total DECIMAL(10,2) NOT NULL CHECK (order_total >= 0),
  
  -- Cálculo de comisión
  gateway_fee_amount DECIMAL(10,2) NOT NULL CHECK (gateway_fee_amount >= 0), -- Comisión de pasarela (base)
  commission_percent DECIMAL(5,2) NOT NULL, -- % del influencer (histórico)
  commission_amount DECIMAL(10,2) NOT NULL CHECK (commission_amount >= 0), -- Monto a pagar
  
  -- Tracking de origen
  referral_source TEXT,                    -- instagram, tiktok, etc (de social_media_platform)
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  -- Estado
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled', 'refunded')),
  
  -- Pagos
  paid_at TIMESTAMPTZ,
  payout_id UUID,                          -- Referencia a payout si existe
  
  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_influencer_commissions_influencer ON influencer_commissions(influencer_id);
CREATE INDEX IF NOT EXISTS idx_influencer_commissions_order ON influencer_commissions(order_id);
CREATE INDEX IF NOT EXISTS idx_influencer_commissions_status ON influencer_commissions(status);
CREATE INDEX IF NOT EXISTS idx_influencer_commissions_created_at ON influencer_commissions(created_at DESC);

-- ============================================
-- 5. MODIFICAR TABLA ORDERS
-- Agregar campos de tracking para influencers
-- ============================================

-- Agregar columnas si no existen
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'influencer_code') THEN
    ALTER TABLE orders ADD COLUMN influencer_code TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'utm_source') THEN
    ALTER TABLE orders ADD COLUMN utm_source TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'utm_medium') THEN
    ALTER TABLE orders ADD COLUMN utm_medium TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'utm_campaign') THEN
    ALTER TABLE orders ADD COLUMN utm_campaign TEXT;
  END IF;
END $$;

-- Agregar columnas a analytics_events para tracking de influencers
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_events' AND table_schema = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analytics_events' AND column_name = 'influencer_code' AND table_schema = 'public') THEN
      ALTER TABLE public.analytics_events ADD COLUMN influencer_code TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analytics_events' AND column_name = 'utm_source' AND table_schema = 'public') THEN
      ALTER TABLE public.analytics_events ADD COLUMN utm_source TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analytics_events' AND column_name = 'utm_medium' AND table_schema = 'public') THEN
      ALTER TABLE public.analytics_events ADD COLUMN utm_medium TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analytics_events' AND column_name = 'utm_campaign' AND table_schema = 'public') THEN
      ALTER TABLE public.analytics_events ADD COLUMN utm_campaign TEXT;
    END IF;
  END IF;
END $$;

-- Crear índices para analytics_events si no existen
CREATE INDEX IF NOT EXISTS idx_analytics_events_influencer_code ON public.analytics_events(influencer_code) WHERE influencer_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_events_utm_source ON public.analytics_events(utm_source) WHERE utm_source IS NOT NULL;

-- Índices para tracking
CREATE INDEX IF NOT EXISTS idx_orders_influencer_code ON orders(influencer_code) WHERE influencer_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_utm_source ON orders(utm_source) WHERE utm_source IS NOT NULL;

-- ============================================
-- 6. RLS (ROW LEVEL SECURITY)
-- ============================================

-- Influencers: Solo admins pueden gestionar, influencers pueden ver sus propios datos (si tienen login)
ALTER TABLE influencers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage influencers" ON influencers;
CREATE POLICY "Admins can manage influencers" ON influencers
FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Payment gateway settings: Solo admins
ALTER TABLE payment_gateway_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage gateway settings" ON payment_gateway_settings;
CREATE POLICY "Admins can manage gateway settings" ON payment_gateway_settings
FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Payment gateway fees: Solo admins pueden ver
ALTER TABLE payment_gateway_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view gateway fees" ON payment_gateway_fees;
CREATE POLICY "Admins can view gateway fees" ON payment_gateway_fees
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

DROP POLICY IF EXISTS "System can insert gateway fees" ON payment_gateway_fees;
CREATE POLICY "System can insert gateway fees" ON payment_gateway_fees
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Influencer commissions: Admins pueden ver todo, sistema puede insertar
ALTER TABLE influencer_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view influencer commissions" ON influencer_commissions;
CREATE POLICY "Admins can view influencer commissions" ON influencer_commissions
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

DROP POLICY IF EXISTS "System can insert influencer commissions" ON influencer_commissions;
CREATE POLICY "System can insert influencer commissions" ON influencer_commissions
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update influencer commissions" ON influencer_commissions;
CREATE POLICY "Admins can update influencer commissions" ON influencer_commissions
FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- ============================================
-- 7. FUNCIONES SQL
-- ============================================

-- Función: Calcular comisión de gateway para una orden
CREATE OR REPLACE FUNCTION calculate_gateway_fee(
  p_order_id UUID,
  p_gateway_provider TEXT DEFAULT NULL
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_order orders;
  v_gateway_provider TEXT;
  v_gateway_setting payment_gateway_settings;
  v_fee_percent DECIMAL(5,2);
  v_fixed_fee DECIMAL(10,2);
  v_fee_amount DECIMAL(10,2);
BEGIN
  -- Obtener orden
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Orden no encontrada';
  END IF;
  
  -- Determinar gateway provider
  IF p_gateway_provider IS NOT NULL THEN
    v_gateway_provider := p_gateway_provider;
  ELSE
    v_gateway_provider := v_order.payment_method;
  END IF;
  
  -- Obtener configuración de gateway
  SELECT * INTO v_gateway_setting
  FROM payment_gateway_settings
  WHERE gateway_provider = v_gateway_provider
    AND is_active = true
  LIMIT 1;
  
  -- Si no hay configuración, usar valores por defecto
  IF v_gateway_setting IS NULL THEN
    v_fee_percent := 5.00; -- Default 5%
    v_fixed_fee := 0;
  ELSE
    v_fee_percent := v_gateway_setting.fee_percent;
    v_fixed_fee := v_gateway_setting.fixed_fee;
  END IF;
  
  -- Calcular fee
  v_fee_amount := (v_order.total_amount * v_fee_percent / 100) + v_fixed_fee;
  
  RETURN v_fee_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Calcular comisión de influencer
CREATE OR REPLACE FUNCTION calculate_influencer_commission(
  p_order_id UUID,
  p_influencer_id UUID
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_order orders;
  v_influencer influencers;
  v_gateway_fee payment_gateway_fees;
  v_gateway_fee_amount DECIMAL(10,2);
  v_commission_percent DECIMAL(5,2);
  v_commission_amount DECIMAL(10,2);
BEGIN
  -- Obtener orden
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF v_order IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Obtener influencer
  SELECT * INTO v_influencer FROM influencers WHERE id = p_influencer_id;
  
  IF v_influencer IS NULL OR NOT v_influencer.is_active THEN
    RETURN 0;
  END IF;
  
  -- Verificar límite de ventas mínimas
  IF v_influencer.min_sales_threshold > 0 THEN
    IF v_influencer.total_orders < v_influencer.min_sales_threshold THEN
      RETURN 0;
    END IF;
  END IF;
  
  -- Obtener gateway fee de la orden
  SELECT * INTO v_gateway_fee 
  FROM payment_gateway_fees 
  WHERE order_id = p_order_id
  LIMIT 1;
  
  -- Si no existe, calcular usando función
  IF v_gateway_fee IS NULL THEN
    v_gateway_fee_amount := calculate_gateway_fee(p_order_id);
  ELSE
    v_gateway_fee_amount := v_gateway_fee.gateway_fee_amount;
  END IF;
  
  -- Si no hay gateway fee, no hay comisión
  IF v_gateway_fee_amount <= 0 THEN
    RETURN 0;
  END IF;
  
  -- Calcular comisión según tipo
  IF v_influencer.commission_type = 'gateway_fee_percent' THEN
    -- % sobre gateway fee (el caso del ejemplo)
    v_commission_percent := v_influencer.commission_percent;
    v_commission_amount := v_gateway_fee_amount * (v_commission_percent / 100);
  
  ELSIF v_influencer.commission_type = 'platform_revenue_percent' THEN
    -- % sobre ganancia de plataforma (futuro)
    -- Por ahora retornamos 0
    v_commission_amount := 0;
  
  ELSIF v_influencer.commission_type = 'fixed_per_sale' THEN
    -- Monto fijo por venta
    v_commission_amount := v_influencer.commission_percent; -- Reusar campo para monto fijo
  ELSE
    RETURN 0;
  END IF;
  
  -- Aplicar límites
  IF v_influencer.min_commission_per_order > 0 AND v_commission_amount < v_influencer.min_commission_per_order THEN
    v_commission_amount := v_influencer.min_commission_per_order;
  END IF;
  
  IF v_influencer.max_commission_per_order IS NOT NULL AND v_commission_amount > v_influencer.max_commission_per_order THEN
    v_commission_amount := v_influencer.max_commission_per_order;
  END IF;
  
  RETURN v_commission_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Procesar orden con influencer (crear gateway fee y comisión)
CREATE OR REPLACE FUNCTION process_influencer_order(
  p_order_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_order orders;
  v_influencer influencers;
  v_gateway_fee_amount DECIMAL(10,2);
  v_gateway_fee_id UUID;
  v_commission_amount DECIMAL(10,2);
  v_gateway_setting payment_gateway_settings;
BEGIN
  -- Obtener orden
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF v_order IS NULL OR v_order.status != 'paid' THEN
    RETURN false;
  END IF;
  
  -- Si no tiene influencer_code, no procesar
  IF v_order.influencer_code IS NULL THEN
    RETURN false;
  END IF;
  
  -- Obtener influencer
  SELECT * INTO v_influencer 
  FROM influencers 
  WHERE influencer_code = v_order.influencer_code 
    AND is_active = true
  LIMIT 1;
  
  IF v_influencer IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verificar si ya fue procesado
  IF EXISTS (SELECT 1 FROM influencer_commissions WHERE order_id = p_order_id) THEN
    RETURN false; -- Ya procesado
  END IF;
  
  -- Obtener configuración de gateway
  SELECT * INTO v_gateway_setting
  FROM payment_gateway_settings
  WHERE gateway_provider = COALESCE(v_order.payment_method, 'stripe')
    AND is_active = true
  LIMIT 1;
  
  -- Calcular gateway fee
  IF v_gateway_setting IS NOT NULL THEN
    v_gateway_fee_amount := (v_order.total_amount * v_gateway_setting.fee_percent / 100) + v_gateway_setting.fixed_fee;
  ELSE
    v_gateway_fee_amount := v_order.total_amount * 0.05; -- Default 5%
  END IF;
  
  -- Crear registro de gateway fee
  INSERT INTO payment_gateway_fees (
    order_id,
    order_total,
    gateway_provider,
    gateway_fee_percent,
    gateway_fee_amount,
    charged_at
  )
  VALUES (
    p_order_id,
    v_order.total_amount,
    COALESCE(v_order.payment_method, 'stripe'),
    COALESCE(v_gateway_setting.fee_percent, 5.00),
    v_gateway_fee_amount,
    NOW()
  )
  RETURNING id INTO v_gateway_fee_id;
  
  -- Calcular comisión del influencer
  v_commission_amount := calculate_influencer_commission(p_order_id, v_influencer.id);
  
  -- Si hay comisión, crear registro
  IF v_commission_amount > 0 THEN
    INSERT INTO influencer_commissions (
      influencer_id,
      order_id,
      gateway_fee_id,
      order_total,
      gateway_fee_amount,
      commission_percent,
      commission_amount,
      referral_source,
      utm_source,
      utm_medium,
      utm_campaign,
      status
    )
    VALUES (
      v_influencer.id,
      p_order_id,
      v_gateway_fee_id,
      v_order.total_amount,
      v_gateway_fee_amount,
      v_influencer.commission_percent,
      v_commission_amount,
      v_influencer.social_media_platform,
      v_order.utm_source,
      v_order.utm_medium,
      v_order.utm_campaign,
      'pending'
    );
    
    -- Actualizar métricas del influencer
    UPDATE influencers
    SET
      total_orders = total_orders + 1,
      total_revenue = total_revenue + v_order.total_amount,
      total_commissions_earned = total_commissions_earned + v_commission_amount,
      updated_at = NOW()
    WHERE id = v_influencer.id;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-procesar orden con influencer cuando se paga
CREATE OR REPLACE FUNCTION trigger_process_influencer_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    IF NEW.influencer_code IS NOT NULL THEN
      PERFORM process_influencer_order(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_process_influencer_order ON orders;
CREATE TRIGGER trigger_process_influencer_order
AFTER UPDATE ON orders
FOR EACH ROW
WHEN (NEW.status = 'paid')
EXECUTE FUNCTION trigger_process_influencer_order();

-- Función: Actualizar estadísticas de clicks y visitas
CREATE OR REPLACE FUNCTION track_influencer_visit(
  p_influencer_code TEXT,
  p_event_type TEXT DEFAULT 'visit' -- 'click', 'visit', 'registration'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_influencer influencers;
BEGIN
  -- Obtener influencer
  SELECT * INTO v_influencer
  FROM influencers
  WHERE influencer_code = p_influencer_code
    AND is_active = true
  LIMIT 1;
  
  IF v_influencer IS NULL THEN
    RETURN false;
  END IF;
  
  -- Actualizar estadísticas
  IF p_event_type = 'click' THEN
    UPDATE influencers SET total_clicks = total_clicks + 1 WHERE id = v_influencer.id;
  ELSIF p_event_type = 'visit' THEN
    UPDATE influencers SET total_visits = total_visits + 1 WHERE id = v_influencer.id;
  ELSIF p_event_type = 'registration' THEN
    UPDATE influencers SET total_registrations = total_registrations + 1 WHERE id = v_influencer.id;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Obtener estadísticas de influencer
CREATE OR REPLACE FUNCTION get_influencer_stats(
  p_influencer_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_stats JSON;
  v_influencer_code TEXT;
BEGIN
  -- Obtener código del influencer
  SELECT influencer_code INTO v_influencer_code
  FROM influencers
  WHERE id = p_influencer_id;
  
  -- Calcular estadísticas desde comisiones
  SELECT json_build_object(
    'influencer_id', p_influencer_id,
    'total_clicks', (
      SELECT COUNT(*) FROM analytics_events
      WHERE influencer_code = v_influencer_code
        AND (event_data->>'event_type' = 'influencer_click' OR event_type = 'influencer_click')
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date)
    ),
    'total_visits', (
      SELECT COUNT(*) FROM analytics_events
      WHERE influencer_code = v_influencer_code
        AND (event_data->>'event_type' = 'influencer_visit' OR event_type = 'influencer_visit')
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date)
    ),
    'total_orders', COUNT(DISTINCT ic.order_id),
    'total_revenue', COALESCE(SUM(ic.order_total), 0),
    'total_commissions', COALESCE(SUM(ic.commission_amount), 0),
    'pending_commissions', COALESCE(SUM(CASE WHEN ic.status = 'pending' THEN ic.commission_amount ELSE 0 END), 0),
    'paid_commissions', COALESCE(SUM(CASE WHEN ic.status = 'paid' THEN ic.commission_amount ELSE 0 END), 0)
  ) INTO v_stats
  FROM influencer_commissions ic
  WHERE ic.influencer_id = p_influencer_id
    AND (p_start_date IS NULL OR ic.created_at >= p_start_date)
    AND (p_end_date IS NULL OR ic.created_at <= p_end_date);
  
  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. COMENTARIOS
-- ============================================

COMMENT ON TABLE influencers IS 'Influencers gestionados desde panel admin para marketing';
COMMENT ON TABLE payment_gateway_settings IS 'Configuración de comisiones por pasarela de pago';
COMMENT ON TABLE payment_gateway_fees IS 'Registro de comisiones cobradas por pasarelas';
COMMENT ON TABLE influencer_commissions IS 'Comisiones ganadas por influencers basadas en gateway fees';


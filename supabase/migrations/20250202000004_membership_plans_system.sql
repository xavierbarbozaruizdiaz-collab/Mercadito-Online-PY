-- ============================================
-- MERCADITO ONLINE PY - SISTEMA DE PLANES DE MEMBRESÍA
-- Planes configurables con precios editables
-- Suscripciones automáticas
-- ============================================

-- ============================================
-- 1. TABLA: MEMBERSHIP_PLANS
-- Planes de membresía con precios configurables
-- ============================================

CREATE TABLE IF NOT EXISTS membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Información del plan
  level TEXT NOT NULL UNIQUE CHECK (level IN ('bronze', 'silver', 'gold')),
  name TEXT NOT NULL, -- "Bronce", "Plata", "Oro"
  description TEXT,
  
  -- Precios
  price_monthly DECIMAL(10,2) NOT NULL CHECK (price_monthly >= 0),
  price_yearly DECIMAL(10,2) CHECK (price_yearly >= 0),
  price_one_time DECIMAL(10,2) CHECK (price_one_time >= 0), -- Pago único sin renovación
  
  -- Configuración
  duration_days INTEGER NOT NULL DEFAULT 30, -- Duración en días (30 = mensual, 365 = anual)
  bid_limit DECIMAL(12,2), -- Límite de puja (NULL = ilimitado)
  bid_limit_formatted TEXT, -- Para mostrar: "2.5M Gs", "10M Gs", "Ilimitado"
  
  -- Características (JSONB)
  features JSONB DEFAULT '[]'::jsonb, -- Array de características: ["Pujas hasta 2.5M", "Soporte prioritario"]
  
  -- Estado
  is_active BOOLEAN DEFAULT true,
  is_popular BOOLEAN DEFAULT false, -- Marcar plan popular/recomendado
  sort_order INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insertar planes por defecto
INSERT INTO membership_plans (level, name, description, price_monthly, price_yearly, duration_days, bid_limit, bid_limit_formatted, features, is_popular, sort_order) VALUES
  ('bronze', 'Bronce', 'Plan básico para pujar en subastas', 50000, 500000, 30, 2500000, '2.5M Gs', '["Pujas hasta 2.5M Gs", "Acceso a todas las subastas", "Soporte por email"]'::jsonb, false, 1),
  ('silver', 'Plata', 'Plan intermedio con mayor límite', 150000, 1500000, 30, 10000000, '10M Gs', '["Pujas hasta 10M Gs", "Acceso a todas las subastas", "Soporte prioritario", "Notificaciones push"]'::jsonb, true, 2),
  ('gold', 'Oro', 'Plan premium con límite ilimitado', 300000, 3000000, 30, NULL, 'Ilimitado', '["Pujas ilimitadas", "Acceso a todas las subastas", "Soporte VIP 24/7", "Notificaciones push", "Acceso anticipado a subastas exclusivas"]'::jsonb, false, 3)
ON CONFLICT (level) DO NOTHING;

-- Índices
CREATE INDEX IF NOT EXISTS idx_membership_plans_active ON membership_plans(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_membership_plans_sort ON membership_plans(sort_order);

-- RLS
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;

-- Política: Todos pueden ver planes activos
DROP POLICY IF EXISTS "Anyone can view active plans" ON membership_plans;
CREATE POLICY "Anyone can view active plans" ON membership_plans
FOR SELECT
TO public
USING (is_active = true);

-- Política: Solo admins pueden gestionar
DROP POLICY IF EXISTS "Admins can manage plans" ON membership_plans;
CREATE POLICY "Admins can manage plans" ON membership_plans
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
-- 2. TABLA: MEMBERSHIP_SUBSCRIPTIONS
-- Historial y estado de suscripciones
-- ============================================

CREATE TABLE IF NOT EXISTS membership_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relaciones
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES membership_plans(id) ON DELETE RESTRICT,
  
  -- Información de la suscripción
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled', 'failed')),
  subscription_type TEXT NOT NULL CHECK (subscription_type IN ('monthly', 'yearly', 'one_time')),
  
  -- Fechas
  starts_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES profiles(id), -- Usuario o admin que canceló
  cancellation_reason TEXT,
  
  -- Renovación automática
  auto_renew BOOLEAN DEFAULT false,
  next_billing_date TIMESTAMPTZ, -- Para renovaciones automáticas
  
  -- Pago
  amount_paid DECIMAL(10,2) NOT NULL,
  payment_method TEXT, -- 'stripe', 'paypal', 'transfer', 'cash'
  payment_provider TEXT,
  payment_reference TEXT, -- ID de transacción en el proveedor
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  paid_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON membership_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON membership_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON membership_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires ON membership_subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing ON membership_subscriptions(next_billing_date) WHERE next_billing_date IS NOT NULL;

-- RLS
ALTER TABLE membership_subscriptions ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios pueden ver sus propias suscripciones
DROP POLICY IF EXISTS "Users can view own subscriptions" ON membership_subscriptions;
CREATE POLICY "Users can view own subscriptions" ON membership_subscriptions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Política: Admins pueden ver todas
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON membership_subscriptions;
CREATE POLICY "Admins can view all subscriptions" ON membership_subscriptions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Política: Sistema puede insertar suscripciones
DROP POLICY IF EXISTS "System can insert subscriptions" ON membership_subscriptions;
CREATE POLICY "System can insert subscriptions" ON membership_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política: Usuarios pueden actualizar sus propias suscripciones (para cancelar)
DROP POLICY IF EXISTS "Users can update own subscriptions" ON membership_subscriptions;
CREATE POLICY "Users can update own subscriptions" ON membership_subscriptions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================
-- 3. FUNCIÓN: activate_membership_subscription()
-- Activa membresía automáticamente tras pago
-- ============================================

CREATE OR REPLACE FUNCTION activate_membership_subscription(
  p_user_id UUID,
  p_plan_id UUID,
  p_subscription_type TEXT,
  p_amount_paid DECIMAL(10,2),
  p_payment_method TEXT,
  p_payment_reference TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_plan RECORD;
  v_subscription_id UUID;
  v_starts_at TIMESTAMPTZ;
  v_expires_at TIMESTAMPTZ;
  v_duration_days INTEGER;
BEGIN
  -- Obtener información del plan
  SELECT * INTO v_plan
  FROM membership_plans
  WHERE id = p_plan_id
    AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan de membresía no encontrado o inactivo';
  END IF;
  
  -- Calcular duración según tipo
  IF p_subscription_type = 'monthly' THEN
    v_duration_days := v_plan.duration_days;
  ELSIF p_subscription_type = 'yearly' THEN
    v_duration_days := v_plan.duration_days * 12; -- Asumir que duration_days es mensual
  ELSE -- one_time
    v_duration_days := v_plan.duration_days;
  END IF;
  
  -- Calcular fechas
  v_starts_at := NOW();
  v_expires_at := NOW() + (v_duration_days || ' days')::INTERVAL;
  
  -- Desactivar suscripciones anteriores activas
  UPDATE membership_subscriptions
  SET 
    status = 'expired',
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND status = 'active';
  
  -- Crear nueva suscripción
  INSERT INTO membership_subscriptions (
    user_id,
    plan_id,
    status,
    subscription_type,
    starts_at,
    expires_at,
    auto_renew,
    amount_paid,
    payment_method,
    payment_provider,
    payment_reference,
    payment_status,
    paid_at
  )
  VALUES (
    p_user_id,
    p_plan_id,
    'active',
    p_subscription_type,
    v_starts_at,
    v_expires_at,
    p_subscription_type IN ('monthly', 'yearly'), -- Auto-renovación solo para recurrentes
    p_amount_paid,
    p_payment_method,
    CASE 
      WHEN p_payment_method IN ('stripe', 'paypal') THEN p_payment_method
      ELSE NULL
    END,
    p_payment_reference,
    'completed',
    NOW()
  )
  RETURNING id INTO v_subscription_id;
  
  -- Actualizar perfil del usuario
  UPDATE profiles
  SET 
    membership_level = v_plan.level,
    membership_expires_at = v_expires_at,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Crear notificación
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
      p_user_id,
      'system',
      'Membresía activada',
      'Tu membresía ' || v_plan.name || ' ha sido activada exitosamente',
      'Tu membresía ' || v_plan.name || ' ha sido activada. Expira el ' || TO_CHAR(v_expires_at, 'DD/MM/YYYY') || '. ' || 
      CASE WHEN v_plan.bid_limit IS NULL THEN 'Límite de puja: Ilimitado' ELSE 'Límite de puja: ' || v_plan.bid_limit_formatted END,
      jsonb_build_object(
        'subscription_id', v_subscription_id,
        'plan_id', p_plan_id,
        'plan_name', v_plan.name,
        'expires_at', v_expires_at
      )
    );
  END IF;
  
  -- Reactivar productos pausados si es una renovación/actualización
  -- (Solo si hay productos pausados y el nuevo plan lo permite)
  IF EXISTS (SELECT 1 FROM products WHERE seller_id = p_user_id AND status = 'paused') THEN
    PERFORM reactivate_paused_products_on_renewal(p_user_id);
  END IF;
  
  RETURN v_subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. FUNCIÓN: check_and_expire_memberships()
-- Verifica y expira membresías vencidas
-- ============================================

CREATE OR REPLACE FUNCTION check_and_expire_memberships()
RETURNS JSONB AS $$
DECLARE
  v_expired_count INTEGER := 0;
BEGIN
  -- Marcar suscripciones expiradas
  UPDATE membership_subscriptions
  SET 
    status = 'expired',
    updated_at = NOW()
  WHERE status = 'active'
    AND expires_at <= NOW();
  
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  
  -- Actualizar perfiles de usuarios con membresías expiradas
  UPDATE profiles p
  SET 
    membership_level = 'free',
    membership_expires_at = NULL,
    updated_at = NOW()
  FROM membership_subscriptions ms
  WHERE p.id = ms.user_id
    AND ms.status = 'expired'
    AND p.membership_level != 'free';
  
  RETURN jsonb_build_object(
    'success', true,
    'expired_count', v_expired_count,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. FUNCIÓN: get_user_bid_limit()
-- Obtiene el límite de puja del usuario actual
-- ============================================

CREATE OR REPLACE FUNCTION get_user_bid_limit(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_profile RECORD;
  v_subscription RECORD;
  v_plan RECORD;
  v_result JSONB;
BEGIN
  -- Obtener perfil
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Usuario no encontrado');
  END IF;
  
  -- Si es free, no tiene límite porque no puede pujar
  IF v_profile.membership_level = 'free' THEN
    RETURN jsonb_build_object(
      'can_bid', false,
      'membership_level', 'free',
      'bid_limit', NULL,
      'bid_limit_formatted', 'N/A',
      'message', 'Necesitas una membresía para pujar'
    );
  END IF;
  
  -- Si la membresía está expirada
  IF v_profile.membership_expires_at IS NOT NULL AND v_profile.membership_expires_at <= NOW() THEN
    RETURN jsonb_build_object(
      'can_bid', false,
      'membership_level', v_profile.membership_level,
      'membership_expired', true,
      'expires_at', v_profile.membership_expires_at,
      'message', 'Tu membresía ha expirado. Renueva para continuar pujando'
    );
  END IF;
  
  -- Obtener plan activo más reciente
  SELECT ms.*, mp.bid_limit, mp.bid_limit_formatted, mp.name
  INTO v_subscription
  FROM membership_subscriptions ms
  JOIN membership_plans mp ON mp.id = ms.plan_id
  WHERE ms.user_id = p_user_id
    AND ms.status = 'active'
    AND ms.expires_at > NOW()
  ORDER BY ms.created_at DESC
  LIMIT 1;
  
  -- Si no hay suscripción activa pero tiene nivel en perfil, usar valores por defecto
  IF NOT FOUND THEN
    -- Valores por defecto basados en nivel
    DECLARE
      v_default_limit DECIMAL(12,2);
      v_default_formatted TEXT;
    BEGIN
      CASE v_profile.membership_level
        WHEN 'bronze' THEN
          v_default_limit := 2500000;
          v_default_formatted := '2.5M Gs';
        WHEN 'silver' THEN
          v_default_limit := 10000000;
          v_default_formatted := '10M Gs';
        WHEN 'gold' THEN
          v_default_limit := NULL;
          v_default_formatted := 'Ilimitado';
        ELSE
          v_default_limit := NULL;
          v_default_formatted := 'N/A';
      END CASE;
      
      RETURN jsonb_build_object(
        'can_bid', true,
        'membership_level', v_profile.membership_level,
        'bid_limit', v_default_limit,
        'bid_limit_formatted', v_default_formatted,
        'membership_expires_at', v_profile.membership_expires_at
      );
    END;
  END IF;
  
  -- Retornar información completa
  RETURN jsonb_build_object(
    'can_bid', true,
    'membership_level', v_profile.membership_level,
    'bid_limit', v_subscription.bid_limit,
    'bid_limit_formatted', v_subscription.bid_limit_formatted,
    'membership_expires_at', v_profile.membership_expires_at,
    'subscription_expires_at', v_subscription.expires_at,
    'plan_name', v_subscription.name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. TRIGGER: Actualizar updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_membership_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_membership_plans_updated_at ON membership_plans;
CREATE TRIGGER trigger_update_membership_plans_updated_at
  BEFORE UPDATE ON membership_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_membership_plans_updated_at();

CREATE OR REPLACE FUNCTION update_membership_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_membership_subscriptions_updated_at ON membership_subscriptions;
CREATE TRIGGER trigger_update_membership_subscriptions_updated_at
  BEFORE UPDATE ON membership_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_membership_subscriptions_updated_at();

-- ============================================
-- 7. COMENTARIOS
-- ============================================

COMMENT ON TABLE membership_plans IS 'Planes de membresía con precios configurables desde admin';
COMMENT ON TABLE membership_subscriptions IS 'Historial y estado de suscripciones de usuarios';
COMMENT ON FUNCTION activate_membership_subscription IS 'Activa membresía automáticamente tras pago exitoso';
COMMENT ON FUNCTION check_and_expire_memberships IS 'Verifica y expira membresías vencidas (ejecutar en cron)';
COMMENT ON FUNCTION get_user_bid_limit IS 'Obtiene límite de puja y estado de membresía del usuario';


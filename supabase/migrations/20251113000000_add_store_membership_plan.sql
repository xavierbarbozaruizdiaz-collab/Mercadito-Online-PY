-- ============================================
-- MERCADITO ONLINE PY - PLAN DE MEMBRESÍA PARA TIENDAS
-- Agrega clasificación de planes (subastas vs tienda) y crea plan tienda completo
-- ============================================

BEGIN;

-- 1. Ajustar constraint de niveles para permitir nuevo plan
ALTER TABLE membership_plans
  DROP CONSTRAINT IF EXISTS membership_plans_level_check;

ALTER TABLE membership_plans
  ADD CONSTRAINT membership_plans_level_check
    CHECK (level IN ('bronze', 'silver', 'gold', 'store'));

-- 2. Agregar columnas para clasificar planes
ALTER TABLE membership_plans
  ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'auction';

ALTER TABLE membership_plans
  ALTER COLUMN plan_type SET NOT NULL;

ALTER TABLE membership_plans
  ADD COLUMN IF NOT EXISTS includes_store BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN membership_plans.plan_type IS 'Clasificación del plan: auction (subastas), store (tiendas) o ambos';
COMMENT ON COLUMN membership_plans.includes_store IS 'Indica si el plan habilita la tienda sin límites adicionales';

-- 3. Asegurar valores en planes existentes
UPDATE membership_plans
SET plan_type = COALESCE(plan_type, 'auction'),
    includes_store = false
WHERE plan_type IS NULL OR includes_store IS NULL;

-- 4. Crear plan para tiendas (si no existe)
INSERT INTO membership_plans (
  level,
  name,
  description,
  price_monthly,
  price_yearly,
  price_one_time,
  duration_days,
  bid_limit,
  bid_limit_formatted,
  max_products,
  max_price_base,
  features,
  is_active,
  is_popular,
  sort_order,
  plan_type,
  includes_store
)
SELECT
  'store',
  'Plan Tienda Pro',
  'Convértete en tienda oficial, vende sin límites y participa en subastas ilimitadas.',
  200000, -- Precio lanzamiento 200.000 Gs/mes
  1800000, -- 90% off primer año (equivale a 150.000 Gs/mes promocional)
  NULL,
  30,
  NULL,
  'Ilimitado',
  NULL,
  NULL,
  '[
    "Vitrina personalizada y catálogo ilimitado",
    "Participación ilimitada en subastas (excepto en tus propios lotes)",
    "Herramientas avanzadas de venta y analíticas",
    "Soporte prioritario y onboarding",
    "Promoción lanzamiento: 90% OFF en apertura"
  ]'::jsonb,
  true,
  true,
  4,
  'store',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM membership_plans WHERE level = 'store'
);

-- 5. Índices
CREATE INDEX IF NOT EXISTS idx_membership_plans_plan_type
  ON membership_plans(plan_type);

-- 6. Actualizar función get_user_bid_limit (incluye planes de tienda)
CREATE OR REPLACE FUNCTION get_user_bid_limit(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_profile RECORD;
  v_subscription RECORD;
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
  SELECT ms.*, mp.bid_limit, mp.bid_limit_formatted, mp.name, mp.plan_type
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
        WHEN 'store' THEN
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
    'bid_limit_formatted', COALESCE(v_subscription.bid_limit_formatted, 
      CASE 
        WHEN v_subscription.bid_limit IS NULL THEN 'Ilimitado' 
        ELSE TO_CHAR(v_subscription.bid_limit, 'FM999G999G999D00') || ' Gs'
      END
    ),
    'membership_expires_at', v_profile.membership_expires_at,
    'subscription_expires_at', v_subscription.expires_at,
    'plan_name', v_subscription.name,
    'plan_type', v_subscription.plan_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;


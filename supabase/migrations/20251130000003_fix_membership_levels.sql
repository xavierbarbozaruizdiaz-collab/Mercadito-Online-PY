-- ============================================
-- FIX: Actualizar constraint de membership_plans.level
-- Permite 'store' y 'free' además de bronze, silver, gold
-- ============================================

-- 1. Eliminar constraint antiguo de membership_plans
ALTER TABLE membership_plans 
DROP CONSTRAINT IF EXISTS membership_plans_level_check;

-- 2. Agregar constraint nuevo que incluye 'store' y 'free'
ALTER TABLE membership_plans
ADD CONSTRAINT membership_plans_level_check 
CHECK (level IN ('bronze', 'silver', 'gold', 'store', 'free'));

-- 3. Actualizar constraint en profiles.membership_level si existe
DO $$
BEGIN
  -- Intentar eliminar constraint si existe
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_membership_level_check'
  ) THEN
    ALTER TABLE profiles
    DROP CONSTRAINT profiles_membership_level_check;
  END IF;
END $$;

-- Agregar constraint nuevo en profiles
ALTER TABLE profiles
ADD CONSTRAINT profiles_membership_level_check
CHECK (membership_level IN ('free', 'bronze', 'silver', 'gold', 'store'));

-- 4. Insertar plan "store" si no existe
INSERT INTO membership_plans (
  level, 
  name, 
  description, 
  price_monthly, 
  price_yearly, 
  duration_days, 
  bid_limit, 
  bid_limit_formatted, 
  features, 
  is_active, 
  is_popular, 
  sort_order
) VALUES (
  'store',
  'Plan Tienda Pro',
  'Plan premium para vendedores con tienda',
  200000,
  1800000,
  30,
  NULL,
  'Ilimitado',
  '["Vitrina personalizada y catálogo ilimitado", "Participación ilimitada en subastas (excepto en tus propios lotes)", "Herramientas avanzadas de venta y analíticas", "Soporte prioritario y onboarding"]'::jsonb,
  true,
  true,
  4
)
ON CONFLICT (level) DO NOTHING;

-- 5. Insertar plan "free" si no existe (para referencia, aunque no sea pagado)
INSERT INTO membership_plans (
  level,
  name,
  description,
  price_monthly,
  price_yearly,
  duration_days,
  bid_limit,
  bid_limit_formatted,
  features,
  is_active,
  is_popular,
  sort_order
) VALUES (
  'free',
  'Gratis',
  'Plan gratuito sin acceso a pujas',
  0,
  0,
  30, -- duration_days es NOT NULL, usar 30 como default
  0,
  'No puede pujar',
  '["Solo visualización de subastas"]'::jsonb,
  true,
  false,
  0
)
ON CONFLICT (level) DO NOTHING;

-- 6. Agregar columna max_products y max_price_base si no existen
ALTER TABLE membership_plans
ADD COLUMN IF NOT EXISTS max_products INTEGER,
ADD COLUMN IF NOT EXISTS max_price_base DECIMAL(12,2);

-- 7. Actualizar planes existentes con valores por defecto si no tienen
UPDATE membership_plans
SET 
  max_products = CASE 
    WHEN level = 'bronze' THEN 5
    WHEN level = 'silver' THEN 10
    WHEN level IN ('gold', 'store') THEN NULL
    ELSE NULL
  END,
  max_price_base = CASE
    WHEN level = 'bronze' THEN 2500000
    WHEN level = 'silver' THEN 10000000
    WHEN level IN ('gold', 'store') THEN NULL
    ELSE NULL
  END
WHERE max_products IS NULL OR max_price_base IS NULL;


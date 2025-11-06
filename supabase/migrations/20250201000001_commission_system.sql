-- ============================================
-- MERCADITO ONLINE PY - SISTEMA DE COMISIONES
-- Sistema completo de comisiones para productos directos y subastas
-- ============================================

-- ============================================
-- 1. TABLA: COMMISSION_SETTINGS
-- Administración de comisiones por alcance
-- ============================================

CREATE TABLE IF NOT EXISTS commission_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Alcance de la comisión
  scope_type TEXT NOT NULL CHECK (scope_type IN (
    'global',           -- Comisión global por defecto
    'store',            -- Comisión específica de tienda
    'seller',           -- Comisión específica de vendedor
    'category',          -- Comisión por categoría (opcional, futuro)
    'auction_buyer',     -- Comisión de comprador en subastas (global/tienda/vendedor)
    'auction_seller'     -- Comisión de vendedor en subastas (global/tienda/vendedor)
  )),
  
  -- Referencias (según scope_type)
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  
  -- Comisiones para productos directos
  direct_sale_commission_percent DECIMAL(5,2), -- Ej: 8.50 = 8.5%
  
  -- Comisiones para subastas
  auction_buyer_commission_percent DECIMAL(5,2), -- Comisión al comprador
  auction_seller_commission_percent DECIMAL(5,2), -- Comisión al vendedor
  
  -- Configuración
  applies_to TEXT DEFAULT 'both' CHECK (applies_to IN ('direct_only', 'auction_only', 'both')),
  is_active BOOLEAN DEFAULT true,
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  effective_until TIMESTAMPTZ, -- NULL = indefinido
  
  -- Auditoría
  created_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: asegurar que hay referencia según scope_type
  CONSTRAINT check_scope_reference CHECK (
    (scope_type = 'global' AND store_id IS NULL AND seller_id IS NULL AND category_id IS NULL) OR
    (scope_type = 'store' AND store_id IS NOT NULL) OR
    (scope_type = 'seller' AND seller_id IS NOT NULL) OR
    (scope_type = 'category' AND category_id IS NOT NULL) OR
    (scope_type IN ('auction_buyer', 'auction_seller'))
  )
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_commission_settings_scope 
  ON commission_settings(scope_type, store_id, seller_id, category_id);
CREATE INDEX IF NOT EXISTS idx_commission_settings_active 
  ON commission_settings(is_active, effective_from, effective_until) 
  WHERE is_active = true;

-- RLS
ALTER TABLE commission_settings ENABLE ROW LEVEL SECURITY;

-- Política: Solo admins pueden ver/modificar comisiones
DROP POLICY IF EXISTS "Admins can manage commission settings" ON commission_settings;
CREATE POLICY "Admins can manage commission settings" ON commission_settings
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

-- Política: Vendedores pueden ver sus propias comisiones (solo lectura)
DROP POLICY IF EXISTS "Sellers can view own commissions" ON commission_settings;
CREATE POLICY "Sellers can view own commissions" ON commission_settings
FOR SELECT
TO authenticated
USING (
  seller_id = auth.uid() OR
  store_id IN (
    SELECT id FROM stores WHERE seller_id = auth.uid()
  )
);

-- ============================================
-- 2. TABLA: PLATFORM_FEES
-- Registro de todas las comisiones cobradas
-- ============================================

CREATE TABLE IF NOT EXISTS platform_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
  
  -- Identificación
  seller_id UUID REFERENCES profiles(id),
  buyer_id UUID REFERENCES profiles(id), -- Para subastas
  store_id UUID REFERENCES stores(id),
  
  -- Tipo de transacción
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('direct_sale', 'auction')),
  
  -- Montos para productos directos
  order_amount DECIMAL(10,2), -- Precio pagado por cliente (ya incluye comisión)
  base_amount DECIMAL(10,2), -- Precio base (lo que recibe vendedor)
  commission_amount DECIMAL(10,2), -- Comisión cobrada
  commission_percent DECIMAL(5,2), -- % aplicado (histórico)
  
  -- Montos para subastas
  auction_final_price DECIMAL(10,2), -- Precio final de la subasta
  buyer_commission_percent DECIMAL(5,2), -- % comisión comprador
  buyer_commission_amount DECIMAL(10,2), -- Monto comisión comprador
  buyer_total_paid DECIMAL(10,2), -- Total pagado por comprador (precio + comisión)
  seller_commission_percent DECIMAL(5,2), -- % comisión vendedor
  seller_commission_amount DECIMAL(10,2), -- Monto comisión vendedor
  seller_earnings DECIMAL(10,2), -- Lo que recibe vendedor (precio - comisión)
  
  -- Estados
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'confirmed', 'paid', 'refunded', 'cancelled'
  )),
  payment_status TEXT DEFAULT 'escrowed' CHECK (payment_status IN (
    'escrowed', 'released', 'refunded'
  )),
  
  -- Referencias
  commission_setting_id UUID REFERENCES commission_settings(id), -- Regla aplicada
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  
  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_platform_fees_order ON platform_fees(order_id);
CREATE INDEX IF NOT EXISTS idx_platform_fees_seller ON platform_fees(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_platform_fees_buyer ON platform_fees(buyer_id, status);
CREATE INDEX IF NOT EXISTS idx_platform_fees_type ON platform_fees(transaction_type);
CREATE INDEX IF NOT EXISTS idx_platform_fees_status ON platform_fees(status, payment_status);

-- RLS
ALTER TABLE platform_fees ENABLE ROW LEVEL SECURITY;

-- Política: Vendedores pueden ver sus comisiones
DROP POLICY IF EXISTS "Sellers can view own fees" ON platform_fees;
CREATE POLICY "Sellers can view own fees" ON platform_fees
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

-- Política: Compradores pueden ver sus comisiones (subastas)
DROP POLICY IF EXISTS "Buyers can view own fees" ON platform_fees;
CREATE POLICY "Buyers can view own fees" ON platform_fees
FOR SELECT
TO authenticated
USING (
  buyer_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Política: Solo sistema puede insertar/actualizar fees
DROP POLICY IF EXISTS "System can manage fees" ON platform_fees;
CREATE POLICY "System can manage fees" ON platform_fees
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================
-- 3. TABLA: SELLER_BALANCE
-- Balance de vendedores
-- ============================================

CREATE TABLE IF NOT EXISTS seller_balance (
  seller_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id),
  
  -- Balances
  pending_balance DECIMAL(10,2) DEFAULT 0, -- En escolta
  available_balance DECIMAL(10,2) DEFAULT 0, -- Listo para retiro
  
  -- Históricos
  total_earnings DECIMAL(10,2) DEFAULT 0,
  total_commissions_paid DECIMAL(10,2) DEFAULT 0,
  
  -- Última actualización
  last_payout_date TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_seller_balance_store ON seller_balance(store_id);

-- RLS
ALTER TABLE seller_balance ENABLE ROW LEVEL SECURITY;

-- Política: Vendedores pueden ver su balance
DROP POLICY IF EXISTS "Sellers can view own balance" ON seller_balance;
CREATE POLICY "Sellers can view own balance" ON seller_balance
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

-- Política: Solo sistema puede actualizar balance
DROP POLICY IF EXISTS "System can update balance" ON seller_balance;
CREATE POLICY "System can update balance" ON seller_balance
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================
-- 4. MODIFICAR TABLA PRODUCTS
-- Agregar campos para comisiones y stock
-- ============================================

ALTER TABLE products
ADD COLUMN IF NOT EXISTS base_price DECIMAL(10,2), -- Precio que recibe vendedor (productos directos)
ADD COLUMN IF NOT EXISTS commission_percent_applied DECIMAL(5,2), -- % usado al calcular precio mostrado
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER, -- Inventario
ADD COLUMN IF NOT EXISTS stock_management_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;

-- Comentarios
COMMENT ON COLUMN products.base_price IS 'Precio base que recibe el vendedor (sin comisión incluida)';
COMMENT ON COLUMN products.commission_percent_applied IS 'Porcentaje de comisión aplicado al calcular el precio mostrado';
COMMENT ON COLUMN products.stock_quantity IS 'Cantidad disponible en inventario (NULL = ilimitado)';
COMMENT ON COLUMN products.stock_management_enabled IS 'Si true, se valida y reduce stock. Si false, stock ilimitado';

-- ============================================
-- 5. FUNCIONES SQL
-- ============================================

-- 5.1 Función: Obtener comisión para producto directo
CREATE OR REPLACE FUNCTION get_direct_sale_commission(
  p_seller_id UUID,
  p_store_id UUID
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  v_commission DECIMAL(5,2);
BEGIN
  -- Prioridad 1: Comisión específica del vendedor
  SELECT direct_sale_commission_percent INTO v_commission
  FROM commission_settings
  WHERE scope_type = 'seller'
    AND seller_id = p_seller_id
    AND is_active = true
    AND (effective_until IS NULL OR effective_until > NOW())
    AND applies_to IN ('direct_only', 'both')
  ORDER BY effective_from DESC
  LIMIT 1;
  
  -- Prioridad 2: Comisión de la tienda
  IF v_commission IS NULL THEN
    SELECT direct_sale_commission_percent INTO v_commission
    FROM commission_settings
    WHERE scope_type = 'store'
      AND store_id = p_store_id
      AND is_active = true
      AND (effective_until IS NULL OR effective_until > NOW())
      AND applies_to IN ('direct_only', 'both')
    ORDER BY effective_from DESC
    LIMIT 1;
  END IF;
  
  -- Prioridad 3: Comisión global
  IF v_commission IS NULL THEN
    SELECT direct_sale_commission_percent INTO v_commission
    FROM commission_settings
    WHERE scope_type = 'global'
      AND is_active = true
      AND applies_to IN ('direct_only', 'both')
    ORDER BY effective_from DESC
    LIMIT 1;
  END IF;
  
  -- Default: 10% si no hay ninguna configuración
  RETURN COALESCE(v_commission, 10.00);
END;
$$ LANGUAGE plpgsql STABLE;

-- 5.2 Función: Obtener comisiones para subasta
CREATE OR REPLACE FUNCTION get_auction_commissions(
  p_seller_id UUID,
  p_store_id UUID
)
RETURNS TABLE(
  buyer_commission_percent DECIMAL(5,2),
  seller_commission_percent DECIMAL(5,2)
) AS $$
DECLARE
  v_buyer_commission DECIMAL(5,2);
  v_seller_commission DECIMAL(5,2);
  v_priority INTEGER;
BEGIN
  -- Buscar comisión de comprador (prioridad: seller > store > global)
  SELECT 
    auction_buyer_commission_percent,
    CASE scope_type 
      WHEN 'seller' THEN 1
      WHEN 'store' THEN 2
      WHEN 'global' THEN 3
      ELSE 4
    END as priority
  INTO v_buyer_commission, v_priority
  FROM commission_settings
  WHERE (
    (scope_type = 'seller' AND seller_id = p_seller_id) OR
    (scope_type = 'store' AND store_id = p_store_id) OR
    (scope_type = 'global')
  )
  AND is_active = true
  AND (effective_until IS NULL OR effective_until > NOW())
  AND applies_to IN ('auction_only', 'both')
  AND auction_buyer_commission_percent IS NOT NULL
  ORDER BY 
    CASE scope_type 
      WHEN 'seller' THEN 1
      WHEN 'store' THEN 2
      WHEN 'global' THEN 3
    END,
    effective_from DESC
  LIMIT 1;
  
  -- Buscar comisión de vendedor (prioridad: seller > store > global)
  SELECT auction_seller_commission_percent INTO v_seller_commission
  FROM commission_settings
  WHERE (
    (scope_type = 'seller' AND seller_id = p_seller_id) OR
    (scope_type = 'store' AND store_id = p_store_id) OR
    (scope_type = 'global')
  )
  AND is_active = true
  AND (effective_until IS NULL OR effective_until > NOW())
  AND applies_to IN ('auction_only', 'both')
  AND auction_seller_commission_percent IS NOT NULL
  ORDER BY 
    CASE scope_type 
      WHEN 'seller' THEN 1
      WHEN 'store' THEN 2
      WHEN 'global' THEN 3
    END,
    effective_from DESC
  LIMIT 1;
  
  -- Defaults: 3% comprador, 5% vendedor
  RETURN QUERY SELECT 
    COALESCE(v_buyer_commission, 3.00),
    COALESCE(v_seller_commission, 5.00);
END;
$$ LANGUAGE plpgsql STABLE;

-- 5.3 Función: Calcular precio con comisión (productos directos)
CREATE OR REPLACE FUNCTION calculate_price_with_commission(
  p_base_price DECIMAL(10,2),
  p_commission_percent DECIMAL(5,2)
)
RETURNS DECIMAL(10,2) AS $$
BEGIN
  -- Validaciones
  IF p_base_price IS NULL OR p_base_price <= 0 THEN
    RAISE EXCEPTION 'Precio base debe ser mayor a 0';
  END IF;
  
  IF p_commission_percent IS NULL THEN
    RAISE EXCEPTION 'Porcentaje de comisión es requerido';
  END IF;
  
  IF p_commission_percent < 0 THEN
    RAISE EXCEPTION 'Comisión no puede ser negativa';
  END IF;
  
  IF p_commission_percent >= 100 THEN
    RAISE EXCEPTION 'Comisión no puede ser >= 100%%';
  END IF;
  
  -- Precio mostrado = precio base / (1 - comisión/100)
  RETURN ROUND(p_base_price / (1 - p_commission_percent / 100), 0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5.4 Función: Calcular comisiones de subasta
CREATE OR REPLACE FUNCTION calculate_auction_commissions(
  p_final_price DECIMAL(10,2),
  p_buyer_commission_percent DECIMAL(5,2),
  p_seller_commission_percent DECIMAL(5,2)
)
RETURNS TABLE(
  buyer_commission_amount DECIMAL(10,2),
  buyer_total_paid DECIMAL(10,2),
  seller_commission_amount DECIMAL(10,2),
  seller_earnings DECIMAL(10,2)
) AS $$
DECLARE
  v_buyer_commission DECIMAL(10,2);
  v_buyer_total DECIMAL(10,2);
  v_seller_commission DECIMAL(10,2);
  v_seller_earnings DECIMAL(10,2);
BEGIN
  -- Validaciones
  IF p_final_price IS NULL OR p_final_price <= 0 THEN
    RAISE EXCEPTION 'Precio final debe ser mayor a 0';
  END IF;
  
  IF p_buyer_commission_percent IS NULL OR p_buyer_commission_percent < 0 OR p_buyer_commission_percent > 100 THEN
    RAISE EXCEPTION 'Porcentaje de comisión del comprador inválido (debe estar entre 0 y 100)';
  END IF;
  
  IF p_seller_commission_percent IS NULL OR p_seller_commission_percent < 0 OR p_seller_commission_percent > 100 THEN
    RAISE EXCEPTION 'Porcentaje de comisión del vendedor inválido (debe estar entre 0 y 100)';
  END IF;
  
  -- Comisión comprador
  v_buyer_commission := ROUND(p_final_price * p_buyer_commission_percent / 100, 0);
  v_buyer_total := p_final_price + v_buyer_commission;
  
  -- Comisión vendedor
  v_seller_commission := ROUND(p_final_price * p_seller_commission_percent / 100, 0);
  v_seller_earnings := GREATEST(0, p_final_price - v_seller_commission); -- Asegurar no negativo
  
  RETURN QUERY SELECT 
    v_buyer_commission,
    v_buyer_total,
    v_seller_commission,
    v_seller_earnings;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 6. INSERTAR COMISIONES GLOBALES POR DEFECTO
-- ============================================

INSERT INTO commission_settings (
  scope_type,
  direct_sale_commission_percent,
  auction_buyer_commission_percent,
  auction_seller_commission_percent,
  applies_to,
  is_active,
  notes
) VALUES (
  'global',
  10.00,  -- 10% para productos directos
  3.00,   -- 3% para comprador en subastas
  5.00,   -- 5% para vendedor en subastas
  'both',
  true,
  'Configuración global por defecto'
) ON CONFLICT DO NOTHING;

-- ============================================
-- 7. COMENTARIOS FINALES
-- ============================================

COMMENT ON TABLE commission_settings IS 'Configuración de comisiones por alcance (global, tienda, vendedor)';
COMMENT ON TABLE platform_fees IS 'Registro de todas las comisiones cobradas en transacciones';
COMMENT ON TABLE seller_balance IS 'Balance de vendedores (pendiente y disponible)';


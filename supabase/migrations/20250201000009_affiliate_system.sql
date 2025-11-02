-- ============================================
-- MERCADITO ONLINE PY - SISTEMA DE AFILIADOS
-- Sistema completo de vendedores afiliados para tiendas
-- ============================================

-- ============================================
-- 1. TABLA: STORE_AFFILIATES
-- Relación entre tiendas y vendedores afiliados
-- ============================================

CREATE TABLE IF NOT EXISTS store_affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  affiliate_seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Identificación única
  affiliate_code TEXT UNIQUE NOT NULL, -- Código único: "AFF-STORE123-SELLER456"
  display_name TEXT, -- Nombre para mostrar en productos
  
  -- Comisiones
  commission_percent DECIMAL(5,2) NOT NULL CHECK (commission_percent >= 0 AND commission_percent <= 100),
  min_commission DECIMAL(10,2) DEFAULT 0 CHECK (min_commission >= 0),
  max_commission DECIMAL(10,2) CHECK (max_commission IS NULL OR max_commission >= 0),
  
  -- Niveles de comisión (tiers) - JSON array: [{"min_sales": 10, "percent": 15}, ...]
  commission_tiers JSONB DEFAULT '[]',
  
  -- Productos asignados
  can_sell_all_products BOOLEAN DEFAULT false,
  product_category_limit UUID[], -- Categorías permitidas (NULL = todas)
  
  -- Pagos
  payment_schedule TEXT DEFAULT 'monthly' CHECK (payment_schedule IN ('weekly', 'biweekly', 'monthly')),
  payment_threshold DECIMAL(10,2) DEFAULT 0 CHECK (payment_threshold >= 0),
  payment_method_preference TEXT CHECK (payment_method_preference IN ('bank_transfer', 'paypal', 'cash', 'mobile_wallet')),
  
  -- Estado y contrato
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'terminated')),
  contract_start_date TIMESTAMPTZ,
  contract_end_date TIMESTAMPTZ, -- NULL = sin fecha de término
  terms_accepted_at TIMESTAMPTZ,
  terms_version TEXT, -- Versión de términos aceptados
  
  -- Límites y controles
  max_products INTEGER CHECK (max_products IS NULL OR max_products > 0),
  max_monthly_sales DECIMAL(12,2) CHECK (max_monthly_sales IS NULL OR max_monthly_sales > 0),
  
  -- Tracking
  referral_link TEXT, -- Link único de referido: "/store/tienda-slug?ref=AFF-STORE123-SELLER456"
  total_sales_count INTEGER DEFAULT 0 CHECK (total_sales_count >= 0),
  total_sales_amount DECIMAL(12,2) DEFAULT 0 CHECK (total_sales_amount >= 0),
  total_commissions_earned DECIMAL(12,2) DEFAULT 0 CHECK (total_commissions_earned >= 0),
  
  -- Auditoría
  invited_by UUID REFERENCES profiles(id),
  invited_at TIMESTAMPTZ,
  activated_by UUID REFERENCES profiles(id),
  activated_at TIMESTAMPTZ,
  suspended_by UUID REFERENCES profiles(id),
  suspended_at TIMESTAMPTZ,
  termination_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(store_id, affiliate_seller_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_store_affiliates_store ON store_affiliates(store_id);
CREATE INDEX IF NOT EXISTS idx_store_affiliates_seller ON store_affiliates(affiliate_seller_id);
CREATE INDEX IF NOT EXISTS idx_store_affiliates_status ON store_affiliates(status);
CREATE INDEX IF NOT EXISTS idx_store_affiliates_code ON store_affiliates(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_store_affiliates_active ON store_affiliates(store_id, status) WHERE status = 'active';

-- ============================================
-- 2. TABLA: AFFILIATE_PRODUCT_ASSIGNMENTS
-- Productos asignados a afiliados con comisiones personalizadas
-- ============================================

CREATE TABLE IF NOT EXISTS affiliate_product_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  affiliate_id UUID NOT NULL REFERENCES store_affiliates(id) ON DELETE CASCADE,
  
  -- Comisión específica para este producto (sobrescribe la del affiliate)
  custom_commission_percent DECIMAL(5,2) CHECK (custom_commission_percent IS NULL OR (custom_commission_percent >= 0 AND custom_commission_percent <= 100)),
  
  -- Estado
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  
  -- Auditoría
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id),
  ended_at TIMESTAMPTZ,
  ended_by UUID REFERENCES profiles(id),
  
  -- Performance tracking
  sales_count INTEGER DEFAULT 0 CHECK (sales_count >= 0),
  total_revenue DECIMAL(12,2) DEFAULT 0 CHECK (total_revenue >= 0),
  
  UNIQUE(product_id, affiliate_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_affiliate_assignments_product ON affiliate_product_assignments(product_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_assignments_affiliate ON affiliate_product_assignments(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_assignments_status ON affiliate_product_assignments(affiliate_id, status) WHERE status = 'active';

-- ============================================
-- 3. TABLA: AFFILIATE_PERFORMANCE
-- Métricas de rendimiento por período
-- ============================================

CREATE TABLE IF NOT EXISTS affiliate_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES store_affiliates(id) ON DELETE CASCADE,
  
  -- Período
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  -- Métricas
  total_sales INTEGER DEFAULT 0 CHECK (total_sales >= 0),
  total_revenue DECIMAL(12,2) DEFAULT 0 CHECK (total_revenue >= 0),
  total_commissions DECIMAL(12,2) DEFAULT 0 CHECK (total_commissions >= 0),
  average_order_value DECIMAL(10,2) CHECK (average_order_value IS NULL OR average_order_value >= 0),
  conversion_rate DECIMAL(5,2) CHECK (conversion_rate IS NULL OR (conversion_rate >= 0 AND conversion_rate <= 100)),
  
  -- Rankings
  rank_in_store INTEGER CHECK (rank_in_store IS NULL OR rank_in_store > 0),
  rank_percentile DECIMAL(5,2) CHECK (rank_percentile IS NULL OR (rank_percentile >= 0 AND rank_percentile <= 100)),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(affiliate_id, period_type, period_start)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_affiliate_performance_affiliate ON affiliate_performance(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_performance_period ON affiliate_performance(period_type, period_start, period_end);

-- ============================================
-- 4. MODIFICAR TABLAS EXISTENTES
-- ============================================

-- Modificar platform_fees para soportar afiliados
ALTER TABLE platform_fees
ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES store_affiliates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS affiliate_commission DECIMAL(10,2) CHECK (affiliate_commission IS NULL OR affiliate_commission >= 0),
ADD COLUMN IF NOT EXISTS store_owner_commission DECIMAL(10,2) CHECK (store_owner_commission IS NULL OR store_owner_commission >= 0);

CREATE INDEX IF NOT EXISTS idx_platform_fees_affiliate ON platform_fees(affiliate_id) WHERE affiliate_id IS NOT NULL;

-- Modificar orders para tracking de afiliados
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS affiliate_code TEXT,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES store_affiliates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_affiliate ON orders(referred_by) WHERE referred_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_affiliate_code ON orders(affiliate_code) WHERE affiliate_code IS NOT NULL;

-- ============================================
-- 5. FUNCIONES SQL
-- ============================================

-- Función: Generar código único de afiliado
CREATE OR REPLACE FUNCTION generate_affiliate_code(
  p_store_id UUID,
  p_seller_id UUID
)
RETURNS TEXT AS $$
DECLARE
  v_store_slug TEXT;
  v_seller_short_id TEXT;
  v_code TEXT;
BEGIN
  -- Obtener slug de la tienda
  SELECT slug INTO v_store_slug FROM stores WHERE id = p_store_id;
  
  -- Generar ID corto del vendedor (últimos 6 caracteres del UUID)
  v_seller_short_id := UPPER(SUBSTRING(p_seller_id::TEXT FROM 28));
  
  -- Generar código: AFF-{store_slug}-{seller_short}
  v_code := 'AFF-' || UPPER(REPLACE(v_store_slug, '-', '')) || '-' || v_seller_short_id;
  
  -- Verificar unicidad
  WHILE EXISTS(SELECT 1 FROM store_affiliates WHERE affiliate_code = v_code) LOOP
    v_code := v_code || '-' || FLOOR(RANDOM() * 1000)::TEXT;
  END LOOP;
  
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Función: Invitar afiliado
CREATE OR REPLACE FUNCTION invite_affiliate(
  p_store_id UUID,
  p_seller_email TEXT,
  p_commission_percent DECIMAL(5,2),
  p_invited_by UUID,
  p_can_sell_all BOOLEAN DEFAULT false,
  p_category_limit UUID[] DEFAULT NULL,
  p_commission_tiers JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_seller_id UUID;
  v_affiliate_id UUID;
  v_code TEXT;
  v_store_slug TEXT;
  v_referral_link TEXT;
BEGIN
  -- Verificar que el invitador es dueño de la tienda
  IF NOT EXISTS(SELECT 1 FROM stores WHERE id = p_store_id AND seller_id = p_invited_by) THEN
    RAISE EXCEPTION 'Solo el dueño de la tienda puede invitar afiliados';
  END IF;
  
  -- Buscar o crear perfil del vendedor por email
  SELECT id INTO v_seller_id FROM profiles WHERE email = p_seller_email;
  
  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'Vendedor con email % no encontrado. Debe registrarse primero.', p_seller_email;
  END IF;
  
  -- Verificar que no esté ya afiliado a esta tienda
  IF EXISTS(SELECT 1 FROM store_affiliates WHERE store_id = p_store_id AND affiliate_seller_id = v_seller_id) THEN
    RAISE EXCEPTION 'Este vendedor ya es afiliado de esta tienda';
  END IF;
  
  -- Generar código
  v_code := generate_affiliate_code(p_store_id, v_seller_id);
  
  -- Obtener slug de tienda
  SELECT slug INTO v_store_slug FROM stores WHERE id = p_store_id;
  v_referral_link := '/store/' || v_store_slug || '?ref=' || v_code;
  
  -- Crear afiliado
  INSERT INTO store_affiliates (
    store_id,
    affiliate_seller_id,
    affiliate_code,
    commission_percent,
    commission_tiers,
    can_sell_all_products,
    product_category_limit,
    payment_schedule,
    status,
    invited_by,
    invited_at,
    referral_link
  )
  VALUES (
    p_store_id,
    v_seller_id,
    v_code,
    p_commission_percent,
    p_commission_tiers,
    p_can_sell_all,
    p_category_limit,
    'monthly',
    'pending',
    p_invited_by,
    NOW(),
    v_referral_link
  )
  RETURNING id INTO v_affiliate_id;
  
  RETURN v_affiliate_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Activar afiliado
CREATE OR REPLACE FUNCTION activate_affiliate(
  p_affiliate_id UUID,
  p_activated_by UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_affiliate store_affiliates;
BEGIN
  -- Obtener afiliado
  SELECT * INTO v_affiliate FROM store_affiliates WHERE id = p_affiliate_id;
  
  IF v_affiliate IS NULL THEN
    RAISE EXCEPTION 'Afiliado no encontrado';
  END IF;
  
  -- Verificar que el activador es dueño de la tienda
  IF NOT EXISTS(
    SELECT 1 FROM stores 
    WHERE id = v_affiliate.store_id AND seller_id = p_activated_by
  ) THEN
    RAISE EXCEPTION 'Solo el dueño de la tienda puede activar afiliados';
  END IF;
  
  -- Actualizar estado
  UPDATE store_affiliates
  SET 
    status = 'active',
    activated_by = p_activated_by,
    activated_at = NOW(),
    contract_start_date = NOW(),
    updated_at = NOW()
  WHERE id = p_affiliate_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Asignar producto a afiliado
CREATE OR REPLACE FUNCTION assign_product_to_affiliate(
  p_product_id UUID,
  p_affiliate_id UUID,
  p_assigned_by UUID,
  p_custom_commission DECIMAL(5,2) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_store_id UUID;
  v_assignment_id UUID;
BEGIN
  -- Verificar que el producto pertenece a la tienda del afiliado
  SELECT store_id INTO v_store_id 
  FROM products 
  WHERE id = p_product_id;
  
  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;
  
  IF NOT EXISTS(
    SELECT 1 FROM store_affiliates 
    WHERE id = p_affiliate_id AND store_id = v_store_id
  ) THEN
    RAISE EXCEPTION 'El producto no pertenece a la tienda del afiliado';
  END IF;
  
  -- Verificar permisos (dueño o admin)
  IF NOT EXISTS(
    SELECT 1 FROM stores 
    WHERE id = v_store_id AND seller_id = p_assigned_by
  ) AND NOT EXISTS(
    SELECT 1 FROM profiles WHERE id = p_assigned_by AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'No tienes permisos para asignar productos';
  END IF;
  
  -- Insertar o actualizar asignación
  INSERT INTO affiliate_product_assignments (
    product_id,
    affiliate_id,
    custom_commission_percent,
    assigned_by,
    status
  )
  VALUES (
    p_product_id,
    p_affiliate_id,
    p_custom_commission,
    p_assigned_by,
    'active'
  )
  ON CONFLICT (product_id, affiliate_id) 
  DO UPDATE SET
    custom_commission_percent = COALESCE(p_custom_commission, affiliate_product_assignments.custom_commission_percent),
    status = 'active',
    assigned_at = NOW(),
    assigned_by = p_assigned_by
  RETURNING id INTO v_assignment_id;
  
  RETURN v_assignment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Calcular comisión de afiliado con tiers
CREATE OR REPLACE FUNCTION calculate_affiliate_commission(
  p_affiliate_id UUID,
  p_order_amount DECIMAL(10,2),
  p_product_id UUID DEFAULT NULL
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_affiliate store_affiliates;
  v_custom_commission DECIMAL(5,2);
  v_base_commission DECIMAL(5,2);
  v_final_commission DECIMAL(5,2);
  v_total_sales INTEGER;
  v_tier JSONB;
  v_tier_sales INTEGER;
  v_commission_amount DECIMAL(10,2);
BEGIN
  -- Obtener datos del afiliado
  SELECT * INTO v_affiliate FROM store_affiliates WHERE id = p_affiliate_id;
  
  IF v_affiliate IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Verificar si hay comisión personalizada para el producto
  IF p_product_id IS NOT NULL THEN
    SELECT custom_commission_percent INTO v_custom_commission
    FROM affiliate_product_assignments
    WHERE product_id = p_product_id 
      AND affiliate_id = p_affiliate_id 
      AND status = 'active'
    LIMIT 1;
    
    IF v_custom_commission IS NOT NULL THEN
      -- Usar comisión personalizada del producto
      v_final_commission := v_custom_commission;
    END IF;
  END IF;
  
  -- Si no hay comisión personalizada, calcular con tiers
  IF v_final_commission IS NULL THEN
    v_base_commission := v_affiliate.commission_percent;
    
    -- Obtener total de ventas del período actual (mes)
    SELECT COUNT(*) INTO v_total_sales
    FROM orders o
    WHERE o.referred_by = p_affiliate_id
    AND o.status = 'paid'
    AND o.created_at >= date_trunc('month', CURRENT_DATE);
    
    -- Calcular tier aplicable (iterar sobre commission_tiers JSONB)
    IF v_affiliate.commission_tiers IS NOT NULL AND jsonb_array_length(v_affiliate.commission_tiers) > 0 THEN
      FOR v_tier IN SELECT * FROM jsonb_array_elements(v_affiliate.commission_tiers)
      LOOP
        v_tier_sales := (v_tier->>'min_sales')::INTEGER;
        IF v_total_sales >= v_tier_sales THEN
          v_final_commission := (v_tier->>'percent')::DECIMAL(5,2);
        END IF;
      END LOOP;
    END IF;
    
    -- Si no aplica ningún tier, usar comisión base
    IF v_final_commission IS NULL THEN
      v_final_commission := v_base_commission;
    END IF;
  END IF;
  
  -- Calcular monto de comisión
  v_commission_amount := (p_order_amount * v_final_commission / 100);
  
  -- Aplicar mínimo
  IF v_commission_amount < v_affiliate.min_commission THEN
    v_commission_amount := v_affiliate.min_commission;
  END IF;
  
  -- Aplicar máximo
  IF v_affiliate.max_commission IS NOT NULL AND v_commission_amount > v_affiliate.max_commission THEN
    v_commission_amount := v_affiliate.max_commission;
  END IF;
  
  RETURN v_commission_amount;
END;
$$ LANGUAGE plpgsql;

-- Función: Calcular y distribuir comisiones de orden
CREATE OR REPLACE FUNCTION calculate_order_affiliate_commissions(
  p_order_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_order orders;
  v_order_item order_items;
  v_affiliate store_affiliates;
  v_product products;
  v_store stores;
  v_affiliate_commission DECIMAL(10,2);
  v_store_owner_commission DECIMAL(10,2);
  v_platform_commission DECIMAL(10,2);
  v_base_amount DECIMAL(10,2);
  v_existing_fee platform_fees;
BEGIN
  -- Obtener orden
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF v_order IS NULL OR v_order.status != 'paid' THEN
    RETURN false;
  END IF;
  
  -- Solo procesar si tiene affiliate_code
  IF v_order.referred_by IS NULL THEN
    RETURN false;
  END IF;
  
  -- Obtener afiliado
  SELECT * INTO v_affiliate FROM store_affiliates WHERE id = v_order.referred_by;
  
  IF v_affiliate IS NULL OR v_affiliate.status != 'active' THEN
    RETURN false;
  END IF;
  
  -- Procesar cada item de la orden
  FOR v_order_item IN 
    SELECT * FROM order_items WHERE order_id = p_order_id
  LOOP
    -- Obtener producto
    SELECT * INTO v_product FROM products WHERE id = v_order_item.product_id;
    
    IF v_product IS NULL THEN
      CONTINUE;
    END IF;
    
    -- Verificar que el producto está asignado al afiliado
    IF NOT (
      v_affiliate.can_sell_all_products = true OR
      EXISTS(
        SELECT 1 FROM affiliate_product_assignments
        WHERE product_id = v_product.id 
          AND affiliate_id = v_affiliate.id 
          AND status = 'active'
      )
    ) THEN
      CONTINUE; -- Saltar este producto
    END IF;
    
    -- Obtener tienda
    SELECT * INTO v_store FROM stores WHERE id = v_product.store_id;
    
    -- Calcular comisiones
    v_base_amount := v_order_item.total_price;
    
    -- Comisión de afiliado
    v_affiliate_commission := calculate_affiliate_commission(
      v_affiliate.id,
      v_base_amount,
      v_product.id
    );
    
    -- Comisión de plataforma (obtener de commission_settings)
    SELECT direct_sale_commission_percent INTO v_platform_commission
    FROM commission_settings
    WHERE scope_type = 'global' AND is_active = true
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_platform_commission IS NULL THEN
      v_platform_commission := 8.0; -- Default 8%
    END IF;
    
    v_platform_commission := (v_base_amount * v_platform_commission / 100);
    
    -- Comisión del dueño de tienda (resto después de plataforma y afiliado)
    -- Asumiendo que el dueño recibe un porcentaje del monto base
    -- O se calcula como: base - platform - affiliate
    v_store_owner_commission := v_base_amount - v_platform_commission - v_affiliate_commission;
    
    -- Verificar si ya existe fee para este item
    SELECT * INTO v_existing_fee
    FROM platform_fees
    WHERE order_item_id = v_order_item.id AND affiliate_id = v_affiliate.id;
    
    IF v_existing_fee IS NULL THEN
      -- Crear nuevo fee
      INSERT INTO platform_fees (
        order_id,
        order_item_id,
        seller_id,
        base_amount,
        commission_amount,
        commission_percent,
        affiliate_id,
        affiliate_commission,
        store_owner_commission,
        status,
        payment_status
      )
      VALUES (
        p_order_id,
        v_order_item.id,
        v_affiliate.affiliate_seller_id,
        v_base_amount,
        v_platform_commission,
        v_platform_commission / v_base_amount * 100,
        v_affiliate.id,
        v_affiliate_commission,
        v_store_owner_commission,
        'pending',
        'escrowed'
      );
    ELSE
      -- Actualizar fee existente
      UPDATE platform_fees
      SET
        affiliate_commission = v_affiliate_commission,
        store_owner_commission = v_store_owner_commission,
        updated_at = NOW()
      WHERE id = v_existing_fee.id;
    END IF;
    
    -- Actualizar balance del afiliado
    UPDATE seller_balance
    SET
      pending_balance = pending_balance + v_affiliate_commission,
      total_earnings = total_earnings + v_affiliate_commission,
      updated_at = NOW()
    WHERE seller_id = v_affiliate.affiliate_seller_id;
    
    -- Actualizar balance del dueño de tienda (si existe)
    IF v_store.seller_id IS NOT NULL THEN
      INSERT INTO seller_balance (seller_id, store_id, pending_balance, total_earnings)
      VALUES (v_store.seller_id, v_store.id, v_store_owner_commission, v_store_owner_commission)
      ON CONFLICT (seller_id) 
      DO UPDATE SET
        pending_balance = seller_balance.pending_balance + v_store_owner_commission,
        total_earnings = seller_balance.total_earnings + v_store_owner_commission,
        updated_at = NOW();
    END IF;
    
    -- Actualizar estadísticas del afiliado
    UPDATE store_affiliates
    SET
      total_sales_count = total_sales_count + 1,
      total_sales_amount = total_sales_amount + v_base_amount,
      total_commissions_earned = total_commissions_earned + v_affiliate_commission,
      updated_at = NOW()
    WHERE id = v_affiliate.id;
    
    -- Actualizar estadísticas de asignación de producto
    UPDATE affiliate_product_assignments
    SET
      sales_count = sales_count + 1,
      total_revenue = total_revenue + v_base_amount
    WHERE product_id = v_product.id AND affiliate_id = v_affiliate.id;
  END LOOP;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-calcular comisiones cuando orden se paga
CREATE OR REPLACE FUNCTION trigger_calculate_affiliate_commissions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    PERFORM calculate_order_affiliate_commissions(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_affiliate_commissions ON orders;
CREATE TRIGGER trigger_calculate_affiliate_commissions
AFTER UPDATE ON orders
FOR EACH ROW
WHEN (NEW.status = 'paid' AND OLD.status != 'paid')
EXECUTE FUNCTION trigger_calculate_affiliate_commissions();

-- ============================================
-- 6. RLS (ROW LEVEL SECURITY)
-- ============================================

-- store_affiliates
ALTER TABLE store_affiliates ENABLE ROW LEVEL SECURITY;

-- Dueños de tienda pueden ver sus afiliados
DROP POLICY IF EXISTS "Store owners can view own affiliates" ON store_affiliates;
CREATE POLICY "Store owners can view own affiliates" ON store_affiliates
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM stores
    WHERE stores.id = store_affiliates.store_id
    AND stores.seller_id = auth.uid()
  )
);

-- Afiliados pueden ver su propio registro
DROP POLICY IF EXISTS "Affiliates can view own record" ON store_affiliates;
CREATE POLICY "Affiliates can view own record" ON store_affiliates
FOR SELECT
TO authenticated
USING (affiliate_seller_id = auth.uid());

-- Dueños pueden insertar/actualizar
DROP POLICY IF EXISTS "Store owners can manage affiliates" ON store_affiliates;
CREATE POLICY "Store owners can manage affiliates" ON store_affiliates
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM stores
    WHERE stores.id = store_affiliates.store_id
    AND stores.seller_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM stores
    WHERE stores.id = store_affiliates.store_id
    AND stores.seller_id = auth.uid()
  )
);

-- Admins pueden ver todo
DROP POLICY IF EXISTS "Admins can view all affiliates" ON store_affiliates;
CREATE POLICY "Admins can view all affiliates" ON store_affiliates
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- affiliate_product_assignments
ALTER TABLE affiliate_product_assignments ENABLE ROW LEVEL SECURITY;

-- Afiliados pueden ver sus asignaciones
DROP POLICY IF EXISTS "Affiliates can view own assignments" ON affiliate_product_assignments;
CREATE POLICY "Affiliates can view own assignments" ON affiliate_product_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM store_affiliates
    WHERE store_affiliates.id = affiliate_product_assignments.affiliate_id
    AND store_affiliates.affiliate_seller_id = auth.uid()
  )
);

-- Dueños pueden gestionar asignaciones
DROP POLICY IF EXISTS "Store owners can manage assignments" ON affiliate_product_assignments;
CREATE POLICY "Store owners can manage assignments" ON affiliate_product_assignments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM store_affiliates sa
    JOIN stores s ON sa.store_id = s.id
    WHERE sa.id = affiliate_product_assignments.affiliate_id
    AND s.seller_id = auth.uid()
  )
);

-- affiliate_performance
ALTER TABLE affiliate_performance ENABLE ROW LEVEL SECURITY;

-- Afiliados pueden ver su performance
DROP POLICY IF EXISTS "Affiliates can view own performance" ON affiliate_performance;
CREATE POLICY "Affiliates can view own performance" ON affiliate_performance
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM store_affiliates
    WHERE store_affiliates.id = affiliate_performance.affiliate_id
    AND store_affiliates.affiliate_seller_id = auth.uid()
  )
);

-- Dueños pueden ver performance de sus afiliados
DROP POLICY IF EXISTS "Store owners can view affiliate performance" ON affiliate_performance;
CREATE POLICY "Store owners can view affiliate performance" ON affiliate_performance
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM store_affiliates sa
    JOIN stores s ON sa.store_id = s.id
    WHERE sa.id = affiliate_performance.affiliate_id
    AND s.seller_id = auth.uid()
  )
);

-- ============================================
-- 7. COMENTARIOS
-- ============================================

COMMENT ON TABLE store_affiliates IS 'Vendedores afiliados asociados a tiendas';
COMMENT ON TABLE affiliate_product_assignments IS 'Asignación de productos a afiliados con comisiones personalizadas';
COMMENT ON TABLE affiliate_performance IS 'Métricas de rendimiento de afiliados por período';


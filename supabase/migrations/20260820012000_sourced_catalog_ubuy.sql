-- ============================================
-- MERCADITO ONLINE PY - CATÁLOGO SOURCED (TIENDA TIPO UBUY)
-- Productos importados (AliExpress) en la tienda fallback, sin stock propio
-- ============================================

-- ============================================
-- 1. COLUMNAS SOURCED EN products
-- ============================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS fulfillment_type TEXT NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS source_platform TEXT,
  ADD COLUMN IF NOT EXISTS source_product_id TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS source_currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS source_price NUMERIC(12,4),
  ADD COLUMN IF NOT EXISTS source_shipping_price NUMERIC(12,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS markup_percent NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fx_rate_used NUMERIC(12,4),
  ADD COLUMN IF NOT EXISTS estimated_delivery_min_days INTEGER,
  ADD COLUMN IF NOT EXISTS estimated_delivery_max_days INTEGER,
  ADD COLUMN IF NOT EXISTS last_source_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_available BOOLEAN DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_fulfillment_type_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_fulfillment_type_check
      CHECK (fulfillment_type IN ('local', 'sourced'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_source_origin
  ON public.products (store_id, source_platform, source_product_id)
  WHERE source_product_id IS NOT NULL AND source_platform IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_fulfillment_type
  ON public.products (fulfillment_type);

CREATE INDEX IF NOT EXISTS idx_products_source_sync
  ON public.products (fulfillment_type, last_source_synced_at)
  WHERE fulfillment_type = 'sourced';

COMMENT ON COLUMN public.products.fulfillment_type IS 'local = inventario propio; sourced = catálogo estirado (AliExpress/Ubuy)';
COMMENT ON COLUMN public.products.source_product_id IS 'ID del producto en la plataforma de origen';

-- ============================================
-- 2. sourced_import_jobs
-- ============================================

CREATE TABLE IF NOT EXISTS public.sourced_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  keyword TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_count INTEGER NOT NULL DEFAULT 0,
  imported_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  CONSTRAINT sourced_import_jobs_status_check
    CHECK (status IN ('pending', 'running', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_sourced_import_jobs_store
  ON public.sourced_import_jobs (store_id, created_at DESC);

ALTER TABLE public.sourced_import_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store owners can view import jobs" ON public.sourced_import_jobs;
CREATE POLICY "Store owners can view import jobs" ON public.sourced_import_jobs
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = sourced_import_jobs.store_id
      AND s.seller_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Store owners can insert import jobs" ON public.sourced_import_jobs;
CREATE POLICY "Store owners can insert import jobs" ON public.sourced_import_jobs
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = sourced_import_jobs.store_id
      AND s.seller_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Store owners can update import jobs" ON public.sourced_import_jobs;
CREATE POLICY "Store owners can update import jobs" ON public.sourced_import_jobs
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = sourced_import_jobs.store_id
      AND s.seller_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

DROP TRIGGER IF EXISTS update_sourced_import_jobs_updated_at ON public.sourced_import_jobs;
CREATE TRIGGER update_sourced_import_jobs_updated_at
  BEFORE UPDATE ON public.sourced_import_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 3. sourced_fulfillments
-- ============================================

CREATE TABLE IF NOT EXISTS public.sourced_fulfillments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  source_platform TEXT,
  source_product_id TEXT,
  source_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending_purchase',
  tracking_number TEXT,
  notes TEXT,
  purchased_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sourced_fulfillments_status_check
    CHECK (status IN ('pending_purchase', 'purchased', 'shipped', 'cancelled')),
  CONSTRAINT sourced_fulfillments_order_item_unique UNIQUE (order_item_id)
);

CREATE INDEX IF NOT EXISTS idx_sourced_fulfillments_store
  ON public.sourced_fulfillments (store_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sourced_fulfillments_order
  ON public.sourced_fulfillments (order_id);

ALTER TABLE public.sourced_fulfillments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store owners can view sourced fulfillments" ON public.sourced_fulfillments;
CREATE POLICY "Store owners can view sourced fulfillments" ON public.sourced_fulfillments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = sourced_fulfillments.store_id
      AND s.seller_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = sourced_fulfillments.order_id
      AND o.buyer_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Store owners can update sourced fulfillments" ON public.sourced_fulfillments;
CREATE POLICY "Store owners can update sourced fulfillments" ON public.sourced_fulfillments
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = sourced_fulfillments.store_id
      AND s.seller_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = sourced_fulfillments.store_id
      AND s.seller_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "System can insert sourced fulfillments" ON public.sourced_fulfillments;
-- INSERT lo hace el trigger SECURITY DEFINER (create_sourced_fulfillment_from_order_item).
-- No hay política INSERT para authenticated a propósito.

DROP TRIGGER IF EXISTS update_sourced_fulfillments_updated_at ON public.sourced_fulfillments;
CREATE TRIGGER update_sourced_fulfillments_updated_at
  BEFORE UPDATE ON public.sourced_fulfillments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 4. Trigger: al crear order_item de producto sourced, abrir fulfillment
-- ============================================

CREATE OR REPLACE FUNCTION public.create_sourced_fulfillment_from_order_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product RECORD;
BEGIN
  SELECT
    p.fulfillment_type,
    p.source_platform,
    p.source_product_id,
    p.source_url,
    p.store_id
  INTO v_product
  FROM public.products p
  WHERE p.id = NEW.product_id;

  IF v_product.fulfillment_type = 'sourced' AND v_product.store_id IS NOT NULL THEN
    INSERT INTO public.sourced_fulfillments (
      order_id,
      order_item_id,
      product_id,
      store_id,
      source_platform,
      source_product_id,
      source_url,
      status
    )
    VALUES (
      NEW.order_id,
      NEW.id,
      NEW.product_id,
      v_product.store_id,
      v_product.source_platform,
      v_product.source_product_id,
      v_product.source_url,
      'pending_purchase'
    )
    ON CONFLICT (order_item_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_sourced_fulfillment ON public.order_items;
CREATE TRIGGER trg_create_sourced_fulfillment
  AFTER INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.create_sourced_fulfillment_from_order_item();

-- ============================================
-- 5. Eximir catálogo sourced / tienda fallback de límites de membresía
-- ============================================

CREATE OR REPLACE FUNCTION public.is_user_fallback_store_owner(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_owner BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.seller_id = p_user_id
      AND s.is_fallback_store = true
      AND s.is_active = true
  ) INTO v_is_owner;

  RETURN COALESCE(v_is_owner, false);
END;
$$;

COMMENT ON FUNCTION public.is_user_fallback_store_owner IS 'Dueño de la tienda fallback (catálogo Ubuy/sourced): sin límite de SKUs';

CREATE OR REPLACE FUNCTION public.count_user_active_products(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.products
  WHERE seller_id = p_user_id
    AND COALESCE(fulfillment_type, 'local') <> 'sourced'
    AND (
      status IS NULL OR
      status = 'active' OR
      (status != 'deleted' AND status != 'archived')
    );

  RETURN COALESCE(v_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.check_can_publish_product(
  p_user_id UUID,
  p_price_base DECIMAL(12,2)
)
RETURNS TABLE (
  can_publish BOOLEAN,
  reason TEXT,
  suggested_plan_level TEXT,
  suggested_plan_name TEXT,
  current_products INTEGER,
  max_products INTEGER,
  can_publish_more_products BOOLEAN,
  price_exceeds_limit BOOLEAN,
  max_price_base DECIMAL(12,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limits RECORD;
  v_price_exceeds BOOLEAN;
  v_reason TEXT;
BEGIN
  IF public.is_user_fallback_store_owner(p_user_id) THEN
    RETURN QUERY SELECT
      true,
      'Tienda fallback: catálogo sourced sin límites de membresía'::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      public.count_user_active_products(p_user_id),
      NULL::INTEGER,
      true,
      false,
      NULL::DECIMAL(12,2);
    RETURN;
  END IF;

  SELECT * INTO v_limits
  FROM public.get_user_publication_limits(p_user_id);

  IF v_limits.is_store_owner THEN
    RETURN QUERY SELECT
      true,
      'Tienes una tienda activa'::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      v_limits.current_products,
      NULL::INTEGER,
      true,
      false,
      NULL::DECIMAL(12,2);
    RETURN;
  END IF;

  IF NOT v_limits.can_publish THEN
    RETURN QUERY SELECT
      false,
      v_limits.message,
      v_limits.suggested_plan_level,
      v_limits.suggested_plan_name,
      v_limits.current_products,
      v_limits.max_products,
      false,
      false,
      v_limits.max_price_base;
    RETURN;
  END IF;

  IF NOT v_limits.can_publish_more THEN
    RETURN QUERY SELECT
      false,
      ('Has alcanzado el límite de ' || v_limits.max_products || ' productos')::TEXT,
      v_limits.suggested_plan_level,
      v_limits.suggested_plan_name,
      v_limits.current_products,
      v_limits.max_products,
      false,
      false,
      v_limits.max_price_base;
    RETURN;
  END IF;

  IF v_limits.max_price_base IS NOT NULL AND p_price_base > v_limits.max_price_base THEN
    v_price_exceeds := true;
    v_reason := 'El precio base (' || TO_CHAR(p_price_base, 'FM999G999G999D00') || ' Gs.) excede el límite de tu plan ' || v_limits.membership_level || ' (' || TO_CHAR(v_limits.max_price_base, 'FM999G999G999D00') || ' Gs.)';

    IF v_limits.membership_level = 'bronze' THEN
      v_reason := v_reason || '. Actualiza a Plata para publicar hasta 10,000,000 Gs.';
      RETURN QUERY SELECT
        false, v_reason, 'silver'::TEXT, 'Plata'::TEXT,
        v_limits.current_products, v_limits.max_products, true, true, v_limits.max_price_base;
      RETURN;
    ELSIF v_limits.membership_level = 'silver' THEN
      v_reason := v_reason || '. Actualiza a Oro para publicar sin límite de precio.';
      RETURN QUERY SELECT
        false, v_reason, 'gold'::TEXT, 'Oro'::TEXT,
        v_limits.current_products, v_limits.max_products, true, true, v_limits.max_price_base;
      RETURN;
    END IF;
  ELSE
    v_price_exceeds := false;
  END IF;

  RETURN QUERY SELECT
    true,
    'Puedes publicar este producto'::TEXT,
    NULL::TEXT,
    NULL::TEXT,
    v_limits.current_products,
    v_limits.max_products,
    true,
    v_price_exceeds,
    v_limits.max_price_base;
END;
$$;

CREATE OR REPLACE FUNCTION public.pause_products_on_membership_expiration(p_user_id UUID)
RETURNS TABLE (
  products_paused INTEGER,
  products_kept_active INTEGER,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_store_owner BOOLEAN;
  v_active_products_count INTEGER;
  v_max_products INTEGER;
  v_paused_count INTEGER;
  v_kept_active INTEGER;
BEGIN
  IF public.is_user_fallback_store_owner(p_user_id) THEN
    RETURN QUERY SELECT
      0::INTEGER,
      public.count_user_active_products(p_user_id),
      'Tienda fallback activa: el catálogo sourced no se pausa'::TEXT;
    RETURN;
  END IF;

  SELECT public.is_user_store_owner(p_user_id) INTO v_store_owner;

  SELECT membership_level, membership_expires_at
  INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_store_owner THEN
    RETURN QUERY SELECT
      0::INTEGER,
      public.count_user_active_products(p_user_id),
      'Usuario tiene tienda activa, no se aplican límites'::TEXT;
    RETURN;
  END IF;

  IF v_profile.membership_level = 'free'
     AND EXISTS (
       SELECT 1 FROM public.stores
       WHERE seller_id = p_user_id
         AND is_active = false
     ) THEN
    UPDATE public.products
    SET status = 'paused', updated_at = NOW()
    WHERE seller_id = p_user_id
      AND status = 'active'
      AND COALESCE(fulfillment_type, 'local') <> 'sourced';

    GET DIAGNOSTICS v_paused_count = ROW_COUNT;

    RETURN QUERY SELECT
      v_paused_count,
      0::INTEGER,
      ('Membresía de tienda expirada. ' || v_paused_count || ' producto(s) locales pausados. El catálogo sourced se mantiene.')::TEXT;
    RETURN;
  END IF;

  IF NOT FOUND OR v_profile.membership_level IS NULL THEN
    v_max_products := 0;
  ELSIF v_profile.membership_expires_at IS NOT NULL
       AND v_profile.membership_expires_at < NOW() THEN
    v_max_products := 0;
  ELSE
    SELECT max_products INTO v_max_products
    FROM public.membership_plans
    WHERE level = v_profile.membership_level
      AND is_active = true;

    IF v_max_products IS NULL THEN
      v_max_products := 0;
    END IF;
  END IF;

  v_active_products_count := public.count_user_active_products(p_user_id);

  IF v_active_products_count <= v_max_products THEN
    RETURN QUERY SELECT
      0::INTEGER,
      v_active_products_count,
      ('No se requieren cambios. Productos activos: ' || v_active_products_count || ', Límite: ' || COALESCE(v_max_products::TEXT, '∞'))::TEXT;
    RETURN;
  END IF;

  v_paused_count := v_active_products_count - v_max_products;

  UPDATE public.products
  SET status = 'paused', updated_at = NOW()
  WHERE seller_id = p_user_id
    AND COALESCE(fulfillment_type, 'local') <> 'sourced'
    AND (
      status IS NULL OR
      status = 'active' OR
      (status != 'deleted' AND status != 'archived')
    )
    AND id IN (
      SELECT id
      FROM public.products
      WHERE seller_id = p_user_id
        AND COALESCE(fulfillment_type, 'local') <> 'sourced'
        AND (
          status IS NULL OR
          status = 'active' OR
          (status != 'deleted' AND status != 'archived')
        )
      ORDER BY created_at DESC
      LIMIT v_paused_count
    );

  GET DIAGNOSTICS v_paused_count = ROW_COUNT;
  v_kept_active := public.count_user_active_products(p_user_id);

  RETURN QUERY SELECT
    v_paused_count,
    v_kept_active,
    ('Se pausaron ' || v_paused_count || ' producto(s) locales. ' ||
     v_kept_active || ' producto(s) siguen activos (límite ' ||
     COALESCE(v_max_products::TEXT, '∞') || '). El catálogo sourced no se pausa.')::TEXT;
END;
$$;

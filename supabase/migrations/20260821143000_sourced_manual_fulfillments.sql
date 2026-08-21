-- ============================================
-- Manual sourced fulfillments (WhatsApp / panel Ubuy)
-- Allow enqueueing AliExpress purchases without a checkout order
-- ============================================

-- 1. Nullable order links for manual origin
ALTER TABLE public.sourced_fulfillments
  ALTER COLUMN order_id DROP NOT NULL;

ALTER TABLE public.sourced_fulfillments
  ALTER COLUMN order_item_id DROP NOT NULL;

-- 2. Origin + customer fields
ALTER TABLE public.sourced_fulfillments
  ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'checkout',
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS customer_notes TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sourced_fulfillments_origin_check'
  ) THEN
    ALTER TABLE public.sourced_fulfillments
      ADD CONSTRAINT sourced_fulfillments_origin_check
      CHECK (origin IN ('checkout', 'manual'));
  END IF;
END $$;

-- Manual rows must not fake a checkout link inconsistently
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sourced_fulfillments_manual_order_null_check'
  ) THEN
    ALTER TABLE public.sourced_fulfillments
      ADD CONSTRAINT sourced_fulfillments_manual_order_null_check
      CHECK (
        (origin = 'checkout' AND order_id IS NOT NULL AND order_item_id IS NOT NULL)
        OR (origin = 'manual' AND order_id IS NULL AND order_item_id IS NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sourced_fulfillments_origin
  ON public.sourced_fulfillments (store_id, origin, status, created_at DESC);

COMMENT ON COLUMN public.sourced_fulfillments.origin IS
  'checkout = generado por order_item; manual = encolado desde panel Ubuy';

-- 3. Trigger: mark checkout origin explicitly
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
      status,
      origin
    )
    VALUES (
      NEW.order_id,
      NEW.id,
      NEW.product_id,
      v_product.store_id,
      v_product.source_platform,
      v_product.source_product_id,
      v_product.source_url,
      'pending_purchase',
      'checkout'
    )
    ON CONFLICT (order_item_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. RLS: allow store owner / admin to INSERT manual fulfillments
DROP POLICY IF EXISTS "Store owners can insert manual sourced fulfillments" ON public.sourced_fulfillments;
CREATE POLICY "Store owners can insert manual sourced fulfillments" ON public.sourced_fulfillments
FOR INSERT TO authenticated
WITH CHECK (
  origin = 'manual'
  AND order_id IS NULL
  AND order_item_id IS NULL
  AND (
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
);

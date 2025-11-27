-- ============================================
-- LPMS - UPDATE ORDER STATUS ENUM
-- Adds new lifecycle statuses required for Pagopar flow.
-- ============================================

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (
    status IN (
      'pending',
      'pending_payment',
      'paid',
      'failed',
      'cod_pending',
      'confirmed',
      'shipped',
      'delivered',
      'cancelled',
      'canceled'
    )
  );









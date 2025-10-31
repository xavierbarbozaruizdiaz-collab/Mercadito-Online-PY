-- ============================================
-- MERCADITO ONLINE PY - ORDERS DISPUTES
-- Agregar campos para disputas y gestión avanzada de órdenes
-- ============================================

-- Agregar campos de disputa
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS dispute_status TEXT DEFAULT 'none' CHECK (dispute_status IN ('none', 'pending', 'under_review', 'resolved', 'rejected')),
  ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
  ADD COLUMN IF NOT EXISTS dispute_raised_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS dispute_raised_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispute_resolved_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS dispute_resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispute_resolution_notes TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded'));

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_orders_dispute_status ON orders(dispute_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);

-- Agregar campo de tracking si no existe (en shipments ya existe, pero lo verificamos)
-- Agregar campos adicionales útiles para gestión
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS internal_notes TEXT, -- Notas internas para admins
  ADD COLUMN IF NOT EXISTS cancelled_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES profiles(id);

DO $$ BEGIN
  RAISE NOTICE '✅ Campos de disputas y gestión de órdenes agregados';
END $$;


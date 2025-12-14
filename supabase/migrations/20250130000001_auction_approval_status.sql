-- ============================================
-- MERCADITO ONLINE PY - AUCTION APPROVAL STATUS
-- Agregar campo para manejar aprobación de compras cuando monto < buy_now_price
-- ============================================

-- Agregar columna approval_status a products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS approval_status TEXT 
  CHECK (approval_status IN ('pending_approval', 'approved', 'rejected', NULL))
  DEFAULT NULL;

-- Agregar columna approval_deadline (tiempo límite para aprobar)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS approval_deadline TIMESTAMPTZ DEFAULT NULL;

-- Agregar columna approval_decision_at (cuándo se tomó la decisión)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS approval_decision_at TIMESTAMPTZ DEFAULT NULL;

-- Agregar columna approval_notes (notas del vendedor al aprobar/rechazar)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS approval_notes TEXT DEFAULT NULL;

-- Comentarios para documentación
COMMENT ON COLUMN public.products.approval_status IS 'Estado de aprobación cuando monto ganador < buy_now_price: pending_approval, approved, rejected';
COMMENT ON COLUMN public.products.approval_deadline IS 'Fecha límite para que el vendedor apruebe o rechace (default: 48 horas después de finalizar)';
COMMENT ON COLUMN public.products.approval_decision_at IS 'Timestamp cuando el vendedor tomó la decisión';
COMMENT ON COLUMN public.products.approval_notes IS 'Notas opcionales del vendedor al aprobar/rechazar';

-- Índice para búsquedas rápidas de subastas pendientes de aprobación
CREATE INDEX IF NOT EXISTS idx_products_approval_status 
ON public.products(approval_status) 
WHERE approval_status = 'pending_approval';

-- Índice para búsquedas por vendedor y estado de aprobación
CREATE INDEX IF NOT EXISTS idx_products_seller_approval 
ON public.products(seller_id, approval_status) 
WHERE approval_status IS NOT NULL;


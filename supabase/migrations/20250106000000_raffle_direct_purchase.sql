-- ============================================
-- MERCADITO ONLINE PY - ACTUALIZAR SORTEOS
-- Agregar soporte para compra directa de cupones e imágenes
-- ============================================

-- Agregar campos para compra directa de cupones
ALTER TABLE public.raffles
ADD COLUMN IF NOT EXISTS cover_url TEXT,
ADD COLUMN IF NOT EXISTS ticket_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS allow_direct_purchase BOOLEAN DEFAULT FALSE;

-- Hacer product_id opcional (ya es nullable por defecto)
-- No necesitamos cambiar nada, ya es nullable

COMMENT ON COLUMN public.raffles.cover_url IS 'URL de imagen del sorteo (si no hay producto)';
COMMENT ON COLUMN public.raffles.ticket_price IS 'Precio por cupón si se permite compra directa';
COMMENT ON COLUMN public.raffles.allow_direct_purchase IS 'Permitir compra directa de cupones';

-- Actualizar constraint para permitir sorteos sin producto
ALTER TABLE public.raffles
DROP CONSTRAINT IF EXISTS valid_tickets_config;

ALTER TABLE public.raffles
ADD CONSTRAINT valid_tickets_config CHECK (
  (raffle_type = 'purchase_based' AND tickets_per_amount > 0) OR
  (raffle_type = 'seller_raffle') OR
  (raffle_type = 'direct_purchase')
);

-- Actualizar tipo de sorteo para incluir direct_purchase
ALTER TABLE public.raffles
DROP CONSTRAINT IF EXISTS raffles_raffle_type_check;

ALTER TABLE public.raffles
ADD CONSTRAINT raffles_raffle_type_check CHECK (raffle_type IN ('purchase_based', 'seller_raffle', 'direct_purchase'));

-- Crear tabla para imágenes de sorteos (opcional, para múltiples imágenes)
CREATE TABLE IF NOT EXISTS public.raffle_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  idx INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(raffle_id, idx)
);

CREATE INDEX IF NOT EXISTS idx_raffle_images_raffle_id ON public.raffle_images(raffle_id);

COMMENT ON TABLE public.raffle_images IS 'Imágenes adicionales para sorteos';

-- Políticas RLS para raffle_images
ALTER TABLE public.raffle_images ENABLE ROW LEVEL SECURITY;

-- SELECT: Público puede ver imágenes de sorteos activos
DROP POLICY IF EXISTS "Public can view raffle images" ON public.raffle_images;
CREATE POLICY "Public can view raffle images" ON public.raffle_images FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.raffles 
    WHERE id = raffle_id AND status = 'active' AND is_enabled = true
  )
);

-- INSERT/UPDATE/DELETE: Solo admins pueden gestionar imágenes
DROP POLICY IF EXISTS "Admins can manage raffle images" ON public.raffle_images;
CREATE POLICY "Admins can manage raffle images" ON public.raffle_images FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);


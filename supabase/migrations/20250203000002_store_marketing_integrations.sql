-- ============================================
-- STORE MARKETING INTEGRATIONS
-- Agregar campos para IDs de marketing por tienda
-- ============================================

-- Agregar columnas a stores para IDs de marketing
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS fb_pixel_id TEXT,
ADD COLUMN IF NOT EXISTS ga_measurement_id TEXT,
ADD COLUMN IF NOT EXISTS gtm_id TEXT;

-- Comentarios
COMMENT ON COLUMN public.stores.fb_pixel_id IS 'Facebook Pixel ID específico de la tienda (opcional, si no está se usa el global)';
COMMENT ON COLUMN public.stores.ga_measurement_id IS 'Google Analytics 4 Measurement ID específico de la tienda (opcional, si no está se usa el global)';
COMMENT ON COLUMN public.stores.gtm_id IS 'Google Tag Manager Container ID específico de la tienda (opcional, si no está se usa el global)';

-- Índice en slug si no existe (para búsquedas rápidas)
CREATE INDEX IF NOT EXISTS idx_stores_slug ON public.stores(slug);

-- RLS Policy: Solo el owner puede actualizar los campos de marketing
-- Primero dropear la policy si existe
DROP POLICY IF EXISTS "Store owners can update marketing integrations" ON public.stores;

CREATE POLICY "Store owners can update marketing integrations" ON public.stores
FOR UPDATE
USING (
  -- Solo el owner puede actualizar estos campos
  seller_id = auth.uid()
)
WITH CHECK (
  seller_id = auth.uid()
);

-- Nota: La policy permite actualizar cualquier campo, pero en la API validaremos
-- que solo se actualicen los 3 campos de marketing para mayor seguridad


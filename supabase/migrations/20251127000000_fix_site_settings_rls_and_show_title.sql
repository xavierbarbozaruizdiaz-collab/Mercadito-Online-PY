-- ============================================
-- MERCADITO ONLINE PY - FIX SITE SETTINGS RLS Y SHOW_TITLE
-- Permite lectura pública de payment_methods y asegura show_title existe
-- ============================================

-- 1. Agregar política RLS para permitir lectura pública de payment_methods
-- Esto es necesario porque los usuarios no autenticados necesitan ver los métodos de pago disponibles
DROP POLICY IF EXISTS "public_can_read_payment_methods" ON public.site_settings;
CREATE POLICY "public_can_read_payment_methods"
ON public.site_settings FOR SELECT
TO public
USING (key = 'payment_methods');

-- 2. Asegurar que show_title existe en hero_slides
ALTER TABLE public.hero_slides 
ADD COLUMN IF NOT EXISTS show_title BOOLEAN DEFAULT TRUE;

-- Comentario para documentación
COMMENT ON COLUMN public.hero_slides.show_title IS 'Indica si el título del slide debe mostrarse (true) u ocultarse (false). Por defecto true.';

-- 3. Actualizar payment_methods para incluir pagopar si no existe
UPDATE public.site_settings
SET value = '["cash", "transfer", "card", "pagopar"]'::jsonb
WHERE key = 'payment_methods'
AND NOT (value::text LIKE '%pagopar%');

-- Si no existe el registro, crearlo
INSERT INTO public.site_settings (key, value, description)
VALUES ('payment_methods', '["cash", "transfer", "card", "pagopar"]'::jsonb, 'Métodos de pago disponibles')
ON CONFLICT (key) DO NOTHING;

DO $$ BEGIN
  RAISE NOTICE '✅ Política RLS para payment_methods creada';
  RAISE NOTICE '✅ Columna show_title verificada en hero_slides';
  RAISE NOTICE '✅ payment_methods actualizado con pagopar';
END $$;


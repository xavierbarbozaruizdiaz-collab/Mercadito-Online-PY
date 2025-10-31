-- Agregar campos de banners a hero_slides para combinar funcionalidades

-- Agregar columnas para funcionalidades de banners
ALTER TABLE public.hero_slides 
  ADD COLUMN IF NOT EXISTS banner_position TEXT DEFAULT 'hero' CHECK (banner_position IN ('hero', 'sidebar', 'footer', 'top')),
  ADD COLUMN IF NOT EXISTS link_url TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;

-- Crear índice para filtrar banners por posición y fecha
CREATE INDEX IF NOT EXISTS idx_hero_slides_banner_position ON public.hero_slides(banner_position, is_active);
CREATE INDEX IF NOT EXISTS idx_hero_slides_dates ON public.hero_slides(start_date, end_date);

-- Comentarios para documentación
COMMENT ON COLUMN public.hero_slides.banner_position IS 'Posición del banner: hero, sidebar, footer, top';
COMMENT ON COLUMN public.hero_slides.link_url IS 'URL de destino cuando se hace clic en el banner';
COMMENT ON COLUMN public.hero_slides.description IS 'Descripción adicional del banner';
COMMENT ON COLUMN public.hero_slides.start_date IS 'Fecha de inicio de validez del banner (opcional)';
COMMENT ON COLUMN public.hero_slides.end_date IS 'Fecha de fin de validez del banner (opcional)';

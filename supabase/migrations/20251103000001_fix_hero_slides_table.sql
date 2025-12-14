-- ============================================
-- FIX: Hero Slides Table - Production
-- ============================================
-- Objetivo: Agregar columnas faltantes, crear índice, habilitar RLS
-- y asegurar que hay al menos un slide activo.
-- ============================================

-- Paso 1: Agregar columnas faltantes
-- Nota: El código usa 'position' (no sort_order) y 'bg_gradient_from/bg_gradient_to' (no gradient_from/to)
ALTER TABLE public.hero_slides
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT ' ',
  ADD COLUMN IF NOT EXISTS subtitle text,
  ADD COLUMN IF NOT EXISTS cta_primary_label text,
  ADD COLUMN IF NOT EXISTS cta_primary_href text,
  ADD COLUMN IF NOT EXISTS cta_secondary_label text,
  ADD COLUMN IF NOT EXISTS cta_secondary_href text,
  ADD COLUMN IF NOT EXISTS bg_type text NOT NULL DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS image_url text,
  -- Compatibilidad: crear ambas versiones de nombres de columnas
  ADD COLUMN IF NOT EXISTS gradient_from text DEFAULT '#6d28d9',
  ADD COLUMN IF NOT EXISTS gradient_to text DEFAULT '#2563eb',
  ADD COLUMN IF NOT EXISTS bg_gradient_from text DEFAULT '#6d28d9',
  ADD COLUMN IF NOT EXISTS bg_gradient_to text DEFAULT '#2563eb',
  ADD COLUMN IF NOT EXISTS bg_image_url text,
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS banner_position text DEFAULT 'hero',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS position int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Paso 2: Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_hero_slides_active_order
  ON public.hero_slides(is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_hero_slides_active_position
  ON public.hero_slides(is_active, position);

CREATE INDEX IF NOT EXISTS idx_hero_slides_banner_position
  ON public.hero_slides(banner_position);

-- Paso 3: Habilitar Row Level Security
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

-- Paso 4: Crear política RLS para lectura pública de slides activos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' 
      AND tablename = 'hero_slides' 
      AND policyname = 'Public read active slides'
  ) THEN
    CREATE POLICY "Public read active slides"
      ON public.hero_slides FOR SELECT
      USING (is_active = true);
  END IF;
END $$;

-- Paso 5: Sincronizar position con sort_order si es necesario
UPDATE public.hero_slides
SET position = sort_order
WHERE position IS NULL OR position = 0 AND sort_order != 0;

-- Sincronizar bg_gradient_from/to con gradient_from/to
UPDATE public.hero_slides
SET bg_gradient_from = gradient_from
WHERE bg_gradient_from IS NULL AND gradient_from IS NOT NULL;

UPDATE public.hero_slides
SET bg_gradient_to = gradient_to
WHERE bg_gradient_to IS NULL AND gradient_to IS NOT NULL;

-- Sincronizar bg_image_url con image_url si es necesario
UPDATE public.hero_slides
SET bg_image_url = image_url
WHERE bg_image_url IS NULL AND image_url IS NOT NULL;

-- Paso 6: Insertar slide de prueba si no existe ninguno activo
INSERT INTO public.hero_slides
  (title, subtitle, cta_primary_label, cta_primary_href, bg_type, image_url, bg_image_url, is_active, sort_order, position, banner_position)
SELECT
  'Bienvenido a Mercadito Online PY',
  'Encuentra los mejores productos en Paraguay',
  'Explorar productos',
  '/search',
  'image',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470',
  true,
  0,
  0,
  'hero'
WHERE NOT EXISTS (
  SELECT 1 FROM public.hero_slides WHERE is_active = true
);

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar que la tabla tiene columnas correctas
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'hero_slides'
ORDER BY ordinal_position;

-- Verificar slides activos
SELECT 
  id,
  title,
  subtitle,
  image_url,
  bg_image_url,
  bg_type,
  is_active,
  sort_order,
  position,
  banner_position,
  created_at
FROM public.hero_slides
WHERE is_active = true
ORDER BY position, sort_order
LIMIT 3;

-- Verificar que el índice existe
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'hero_slides'
  AND indexname = 'idx_hero_slides_active_order';

-- Verificar políticas RLS
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'hero_slides';


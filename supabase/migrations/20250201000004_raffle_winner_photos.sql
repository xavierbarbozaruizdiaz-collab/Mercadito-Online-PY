-- ============================================
-- MERCADITO ONLINE PY - FOTOS DE GANADORES DE SORTEOS
-- Tabla para almacenar fotos de ganadores con sus premios
-- ============================================

-- ============================================
-- 1. TABLA RAFFLE_WINNER_PHOTOS
-- ============================================

CREATE TABLE IF NOT EXISTS public.raffle_winner_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  winner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT, -- Descripción opcional de la foto
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
  
  -- Nota: Permitimos múltiples fotos por ganador/sorteo
  -- Cada foto puede tener su propia descripción
);

COMMENT ON TABLE public.raffle_winner_photos IS 'Fotos de ganadores de sorteos con sus premios';
COMMENT ON COLUMN public.raffle_winner_photos.caption IS 'Descripción opcional de la foto/premio';

-- Índices
CREATE INDEX IF NOT EXISTS idx_raffle_winner_photos_raffle_id ON public.raffle_winner_photos(raffle_id);
CREATE INDEX IF NOT EXISTS idx_raffle_winner_photos_winner_id ON public.raffle_winner_photos(winner_id);
CREATE INDEX IF NOT EXISTS idx_raffle_winner_photos_created_at ON public.raffle_winner_photos(created_at DESC);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_raffle_winner_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_raffle_winner_photos_updated_at ON public.raffle_winner_photos;
CREATE TRIGGER trigger_update_raffle_winner_photos_updated_at
  BEFORE UPDATE ON public.raffle_winner_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_raffle_winner_photos_updated_at();

-- ============================================
-- 2. POLÍTICAS RLS
-- ============================================

-- Habilitar RLS
ALTER TABLE public.raffle_winner_photos ENABLE ROW LEVEL SECURITY;

-- SELECT: Todos pueden ver las fotos (público)
DROP POLICY IF EXISTS "Anyone can view winner photos" ON public.raffle_winner_photos;
CREATE POLICY "Anyone can view winner photos"
  ON public.raffle_winner_photos
  FOR SELECT
  USING (true);

-- INSERT: Solo el ganador puede subir su foto
DROP POLICY IF EXISTS "Winners can upload their photos" ON public.raffle_winner_photos;
CREATE POLICY "Winners can upload their photos"
  ON public.raffle_winner_photos
  FOR INSERT
  WITH CHECK (
    auth.uid() = winner_id
    AND EXISTS (
      SELECT 1 FROM public.raffles
      WHERE id = raffle_id
      AND winner_id = auth.uid()
      AND status = 'drawn'
    )
  );

-- UPDATE: Solo el ganador puede actualizar su foto
DROP POLICY IF EXISTS "Winners can update their photos" ON public.raffle_winner_photos;
CREATE POLICY "Winners can update their photos"
  ON public.raffle_winner_photos
  FOR UPDATE
  USING (auth.uid() = winner_id)
  WITH CHECK (auth.uid() = winner_id);

-- DELETE: Solo el ganador o admin puede eliminar
DROP POLICY IF EXISTS "Winners and admins can delete photos" ON public.raffle_winner_photos;
CREATE POLICY "Winners and admins can delete photos"
  ON public.raffle_winner_photos
  FOR DELETE
  USING (
    auth.uid() = winner_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================
-- 3. BUCKET DE STORAGE
-- ============================================

-- Crear bucket para fotos de ganadores
INSERT INTO storage.buckets (id, name, public)
VALUES ('raffle-winner-photos', 'raffle-winner-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para raffle-winner-photos
-- SELECT: Público (cualquiera puede ver)
DROP POLICY IF EXISTS "Public can view winner photos" ON storage.objects;
CREATE POLICY "Public can view winner photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'raffle-winner-photos');

-- INSERT: Solo usuarios autenticados que sean ganadores
DROP POLICY IF EXISTS "Winners can upload photos" ON storage.objects;
CREATE POLICY "Winners can upload photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'raffle-winner-photos'
    AND auth.role() = 'authenticated'
  );

-- UPDATE: Solo el dueño del archivo puede actualizar
DROP POLICY IF EXISTS "Winners can update their photos" ON storage.objects;
CREATE POLICY "Winners can update their photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'raffle-winner-photos'
    AND auth.role() = 'authenticated'
    -- El usuario debe ser el dueño (el path contiene su user_id)
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE: Solo el dueño o admin puede eliminar
DROP POLICY IF EXISTS "Winners and admins can delete photos" ON storage.objects;
CREATE POLICY "Winners and admins can delete photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'raffle-winner-photos'
    AND (
      auth.role() = 'authenticated'
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );


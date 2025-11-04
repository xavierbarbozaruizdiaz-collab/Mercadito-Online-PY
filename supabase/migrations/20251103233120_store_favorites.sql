-- ============================================
-- MERCADITO ONLINE PY - SISTEMA DE TIENDAS FAVORITAS
-- Permite a los usuarios guardar sus tiendas favoritas
-- ============================================

-- ============================================
-- 1. CREAR TABLA STORE_FAVORITES
-- ============================================

CREATE TABLE IF NOT EXISTS public.store_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  
  -- Evitar favoritos duplicados
  UNIQUE(user_id, store_id)
);

-- ============================================
-- 2. CREAR ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_store_favorites_user_id ON public.store_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_store_favorites_store_id ON public.store_favorites(store_id);
CREATE INDEX IF NOT EXISTS idx_store_favorites_created_at ON public.store_favorites(created_at);

-- ============================================
-- 3. HABILITAR RLS
-- ============================================

ALTER TABLE public.store_favorites ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. POLÍTICAS RLS
-- ============================================

-- SELECT: Los usuarios pueden ver sus propios favoritos
DROP POLICY IF EXISTS "Users can view their own favorites" ON public.store_favorites;
CREATE POLICY "Users can view their own favorites" ON public.store_favorites
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: Los usuarios pueden agregar sus propios favoritos
DROP POLICY IF EXISTS "Users can add their own favorites" ON public.store_favorites;
CREATE POLICY "Users can add their own favorites" ON public.store_favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Los usuarios pueden eliminar sus propios favoritos
DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.store_favorites;
CREATE POLICY "Users can delete their own favorites" ON public.store_favorites
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- 5. COMENTARIOS
-- ============================================

COMMENT ON TABLE public.store_favorites IS 
  'Almacena las tiendas favoritas de cada usuario';

COMMENT ON COLUMN public.store_favorites.user_id IS 
  'ID del usuario que agregó la tienda a favoritos';

COMMENT ON COLUMN public.store_favorites.store_id IS 
  'ID de la tienda favorita';


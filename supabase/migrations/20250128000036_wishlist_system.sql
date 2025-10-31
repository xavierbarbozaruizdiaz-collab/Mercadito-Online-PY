-- Migration: Sistema de Wishlist/Favoritos
-- ============================================

-- Tabla de wishlists
CREATE TABLE IF NOT EXISTS public.wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, product_id)
);

-- Índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON public.wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_product_id ON public.wishlists(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_created_at ON public.wishlists(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own wishlist" ON public.wishlists
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own wishlist" ON public.wishlists
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their own wishlist" ON public.wishlists
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Función para verificar si un producto está en wishlist
CREATE OR REPLACE FUNCTION is_product_in_wishlist(
    product_id_param UUID,
    user_id_param UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.wishlists
        WHERE product_id = product_id_param
        AND user_id = user_id_param
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_product_in_wishlist(UUID, UUID) TO authenticated;

-- Función para obtener el conteo de wishlist de un producto
CREATE OR REPLACE FUNCTION get_product_wishlist_count(product_id_param UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM public.wishlists
        WHERE product_id = product_id_param
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_product_wishlist_count(UUID) TO authenticated;


-- Migration: Sistema de Reviews y Ratings Completo
-- ============================================

-- Tabla de reviews (reseñas de productos y vendedores)
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL, -- Para verificar compra
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT, -- Título opcional de la reseña
    comment TEXT, -- Comentario de la reseña
    is_verified_purchase BOOLEAN DEFAULT false, -- Solo compradores verificados pueden reseñar
    is_edited BOOLEAN DEFAULT false, -- Indica si fue editada
    helpful_count INTEGER DEFAULT 0, -- Contador de "útil"
    status TEXT DEFAULT 'published' CHECK (status IN ('pending', 'published', 'hidden', 'reported')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Un usuario solo puede reseñar un producto una vez
    UNIQUE(buyer_id, product_id)
);

-- Tabla para fotos en reviews
CREATE TABLE IF NOT EXISTS public.review_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    order_index INTEGER DEFAULT 0, -- Orden de las imágenes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla para respuestas de vendedores a reviews
CREATE TABLE IF NOT EXISTS public.review_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE UNIQUE,
    seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    response_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla para "útil" (helpful) en reviews
CREATE TABLE IF NOT EXISTS public.review_helpful (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(review_id, user_id) -- Un usuario solo puede marcar útil una vez
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_store_id ON public.reviews(store_id);
CREATE INDEX IF NOT EXISTS idx_reviews_buyer_id ON public.reviews(buyer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_seller_id ON public.reviews(seller_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_images_review_id ON public.review_images(review_id);
CREATE INDEX IF NOT EXISTS idx_review_helpful_review_id ON public.review_helpful(review_id);
CREATE INDEX IF NOT EXISTS idx_review_helpful_user_id ON public.review_helpful(user_id);

-- Habilitar RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_helpful ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para reviews
CREATE POLICY "Anyone can view published reviews" ON public.reviews
    FOR SELECT TO authenticated
    USING (status = 'published' OR buyer_id = auth.uid() OR seller_id = auth.uid());

CREATE POLICY "Buyers can create reviews for their purchases" ON public.reviews
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyers can update their own reviews" ON public.reviews
    FOR UPDATE TO authenticated
    USING (auth.uid() = buyer_id)
    WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyers can delete their own reviews" ON public.reviews
    FOR DELETE TO authenticated
    USING (auth.uid() = buyer_id);

-- Políticas RLS para review_images
CREATE POLICY "Anyone can view review images of published reviews" ON public.review_images
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.reviews
            WHERE reviews.id = review_images.review_id
            AND (reviews.status = 'published' OR reviews.buyer_id = auth.uid())
        )
    );

CREATE POLICY "Review owners can manage their review images" ON public.review_images
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.reviews
            WHERE reviews.id = review_images.review_id
            AND reviews.buyer_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.reviews
            WHERE reviews.id = review_images.review_id
            AND reviews.buyer_id = auth.uid()
        )
    );

-- Políticas RLS para review_responses
CREATE POLICY "Anyone can view published review responses" ON public.review_responses
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.reviews
            WHERE reviews.id = review_responses.review_id
            AND reviews.status = 'published'
        )
    );

CREATE POLICY "Sellers can create responses to their reviews" ON public.review_responses
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = seller_id AND
        EXISTS (
            SELECT 1 FROM public.reviews
            WHERE reviews.id = review_responses.review_id
            AND reviews.seller_id = auth.uid()
        )
    );

CREATE POLICY "Sellers can update their own responses" ON public.review_responses
    FOR UPDATE TO authenticated
    USING (auth.uid() = seller_id)
    WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own responses" ON public.review_responses
    FOR DELETE TO authenticated
    USING (auth.uid() = seller_id);

-- Políticas RLS para review_helpful
CREATE POLICY "Anyone can view helpful votes" ON public.review_helpful
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Users can mark reviews as helpful" ON public.review_helpful
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their helpful vote" ON public.review_helpful
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Función para verificar si un usuario puede reseñar un producto (debe haber comprado)
CREATE OR REPLACE FUNCTION can_user_review_product(
    user_id_param UUID,
    product_id_param UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    has_order BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.orders o
        JOIN public.order_items oi ON oi.order_id = o.id
        WHERE o.buyer_id = user_id_param
        AND oi.product_id = product_id_param
        AND o.status IN ('completed', 'delivered')
    ) INTO has_order;
    
    RETURN has_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION can_user_review_product(UUID, UUID) TO authenticated;

-- Función para calcular rating promedio de un producto
CREATE OR REPLACE FUNCTION get_product_rating_stats(product_id_param UUID)
RETURNS TABLE (
    average_rating NUMERIC,
    total_reviews BIGINT,
    rating_distribution JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(ROUND(AVG(rating)::NUMERIC, 2), 0) AS average_rating,
        COUNT(*)::BIGINT AS total_reviews,
        jsonb_build_object(
            '5', COUNT(*) FILTER (WHERE rating = 5),
            '4', COUNT(*) FILTER (WHERE rating = 4),
            '3', COUNT(*) FILTER (WHERE rating = 3),
            '2', COUNT(*) FILTER (WHERE rating = 2),
            '1', COUNT(*) FILTER (WHERE rating = 1)
        ) AS rating_distribution
    FROM public.reviews
    WHERE product_id = product_id_param
    AND status = 'published';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_product_rating_stats(UUID) TO authenticated;

-- Función para calcular rating promedio de una tienda
CREATE OR REPLACE FUNCTION get_store_rating_stats(store_id_param UUID)
RETURNS TABLE (
    average_rating NUMERIC,
    total_reviews BIGINT,
    rating_distribution JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(ROUND(AVG(rating)::NUMERIC, 2), 0) AS average_rating,
        COUNT(*)::BIGINT AS total_reviews,
        jsonb_build_object(
            '5', COUNT(*) FILTER (WHERE rating = 5),
            '4', COUNT(*) FILTER (WHERE rating = 4),
            '3', COUNT(*) FILTER (WHERE rating = 3),
            '2', COUNT(*) FILTER (WHERE rating = 2),
            '1', COUNT(*) FILTER (WHERE rating = 1)
        ) AS rating_distribution
    FROM public.reviews
    WHERE store_id = store_id_param
    AND status = 'published';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_store_rating_stats(UUID) TO authenticated;

-- Función para actualizar helpful_count automáticamente
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.reviews
        SET helpful_count = helpful_count + 1
        WHERE id = NEW.review_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.reviews
        SET helpful_count = GREATEST(helpful_count - 1, 0)
        WHERE id = OLD.review_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER review_helpful_count_trigger
    AFTER INSERT OR DELETE ON public.review_helpful
    FOR EACH ROW
    EXECUTE FUNCTION update_review_helpful_count();

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_review_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    IF OLD.comment IS DISTINCT FROM NEW.comment OR OLD.rating IS DISTINCT FROM NEW.rating THEN
        NEW.is_edited = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER review_updated_at
    BEFORE UPDATE ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_review_updated_at();

-- Función auxiliar para updated_at simple
CREATE OR REPLACE FUNCTION update_simple_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER review_response_updated_at
    BEFORE UPDATE ON public.review_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_simple_updated_at();


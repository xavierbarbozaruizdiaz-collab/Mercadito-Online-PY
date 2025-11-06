-- Migration: Marketplace Features Avanzadas
-- ============================================

-- Tabla para preguntas y respuestas de productos
CREATE TABLE IF NOT EXISTS public.product_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    answer_text TEXT,
    answered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Vendedor que respondió
    answered_at TIMESTAMP WITH TIME ZONE,
    is_public BOOLEAN DEFAULT true,
    upvotes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla para alertas de precio
CREATE TABLE IF NOT EXISTS public.price_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    target_price NUMERIC(10, 2) NOT NULL,
    current_price NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    notified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, product_id) -- Un usuario solo puede tener una alerta por producto
);

-- Tabla para búsquedas guardadas
CREATE TABLE IF NOT EXISTS public.saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    search_query TEXT NOT NULL,
    filters JSONB, -- Filtros aplicados (categoría, precio, etc.)
    notifications_enabled BOOLEAN DEFAULT false, -- Notificar cuando haya nuevos resultados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla para historial de precios
CREATE TABLE IF NOT EXISTS public.price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    price NUMERIC(10, 2) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    recorded_date DATE -- Se actualizará vía trigger
);

-- Función para actualizar recorded_date antes de insertar
CREATE OR REPLACE FUNCTION set_price_history_date()
RETURNS TRIGGER AS $$
BEGIN
    NEW.recorded_date := NEW.recorded_at::DATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER price_history_set_date
    BEFORE INSERT OR UPDATE ON public.price_history
    FOR EACH ROW
    EXECUTE FUNCTION set_price_history_date();

-- Índice único para un precio por día por producto
CREATE UNIQUE INDEX IF NOT EXISTS idx_price_history_product_date 
ON public.price_history(product_id, recorded_date);

-- Índices
CREATE INDEX IF NOT EXISTS idx_product_questions_product ON public.product_questions(product_id);
CREATE INDEX IF NOT EXISTS idx_product_questions_user ON public.product_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_product_questions_answered ON public.product_questions(answered_by);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON public.price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_product ON public.price_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON public.price_alerts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON public.saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_price_history_product ON public.price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_date ON public.price_history(recorded_at DESC);

-- Habilitar RLS
ALTER TABLE public.product_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para product_questions
CREATE POLICY "Anyone can view public questions" ON public.product_questions
    FOR SELECT TO authenticated
    USING (is_public = true OR user_id = auth.uid() OR answered_by = auth.uid());

CREATE POLICY "Users can create questions" ON public.product_questions
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Sellers can answer questions for their products" ON public.product_questions
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.products p
            WHERE p.id = product_questions.product_id
            AND p.seller_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.products p
            WHERE p.id = product_questions.product_id
            AND p.seller_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own questions" ON public.product_questions
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Políticas RLS para price_alerts
CREATE POLICY "Users can view their own price alerts" ON public.price_alerts
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own price alerts" ON public.price_alerts
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own price alerts" ON public.price_alerts
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own price alerts" ON public.price_alerts
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Políticas RLS para saved_searches
CREATE POLICY "Users can view their own saved searches" ON public.saved_searches
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own saved searches" ON public.saved_searches
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para price_history
CREATE POLICY "Anyone can view price history" ON public.price_history
    FOR SELECT TO authenticated
    USING (true);

-- Función para registrar cambios de precio automáticamente
CREATE OR REPLACE FUNCTION record_price_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo registrar si el precio cambió
    IF OLD.price IS DISTINCT FROM NEW.price THEN
        INSERT INTO public.price_history (product_id, price)
        VALUES (NEW.id, NEW.price)
        ON CONFLICT (product_id, recorded_date) DO UPDATE
        SET price = EXCLUDED.price, recorded_at = now();
        
        -- Verificar alertas de precio
        UPDATE public.price_alerts
        SET current_price = NEW.price,
            notified = CASE 
                WHEN NEW.price <= target_price AND is_active AND NOT notified THEN true
                ELSE notified
            END
        WHERE product_id = NEW.id
        AND is_active = true
        AND NEW.price <= target_price
        AND NOT notified;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_price_change_trigger
    AFTER UPDATE OF price ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION record_price_change();

-- Función para obtener historial de precios
CREATE OR REPLACE FUNCTION get_price_history(
    product_id_param UUID,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    price NUMERIC,
    recorded_at TIMESTAMP WITH TIME ZONE,
    days_ago INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ph.price,
        ph.recorded_at,
        (CURRENT_DATE - ph.recorded_at::DATE)::INTEGER AS days_ago
    FROM public.price_history ph
    WHERE ph.product_id = product_id_param
    AND ph.recorded_at >= (CURRENT_DATE - (days_back || ' days')::INTERVAL)
    ORDER BY ph.recorded_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_price_history(UUID, INTEGER) TO authenticated;

-- Función para obtener preguntas más útiles (por upvotes)
CREATE OR REPLACE FUNCTION get_top_product_questions(
    product_id_param UUID,
    limit_count INTEGER DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    question_text TEXT,
    answer_text TEXT,
    answered_by UUID,
    answered_at TIMESTAMP WITH TIME ZONE,
    upvotes INTEGER,
    asker_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pq.id,
        pq.question_text,
        pq.answer_text,
        pq.answered_by,
        pq.answered_at,
        pq.upvotes,
        prof.full_name AS asker_name
    FROM public.product_questions pq
    LEFT JOIN public.profiles prof ON prof.id = pq.user_id
    WHERE pq.product_id = product_id_param
    AND pq.is_public = true
    AND pq.answer_text IS NOT NULL
    ORDER BY pq.upvotes DESC, pq.answered_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_top_product_questions(UUID, INTEGER) TO authenticated;

-- Trigger para updated_at
CREATE TRIGGER product_questions_updated_at
    BEFORE UPDATE ON public.product_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_simple_updated_at();

CREATE TRIGGER price_alerts_updated_at
    BEFORE UPDATE ON public.price_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_simple_updated_at();

CREATE TRIGGER saved_searches_updated_at
    BEFORE UPDATE ON public.saved_searches
    FOR EACH ROW
    EXECUTE FUNCTION update_simple_updated_at();


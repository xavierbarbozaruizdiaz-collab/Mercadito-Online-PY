-- Migration: Sistema de Cupones y Descuentos
-- ============================================

-- Tabla de cupones
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE, -- Código del cupón (ej. DESCUENTO20)
    name TEXT NOT NULL, -- Nombre descriptivo del cupón
    description TEXT, -- Descripción del cupón
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')), -- Tipo: porcentaje o monto fijo
    discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value > 0), -- Valor del descuento
    min_purchase_amount NUMERIC(10, 2) DEFAULT 0, -- Monto mínimo de compra para usar el cupón
    max_discount_amount NUMERIC(10, 2), -- Monto máximo de descuento (para porcentajes)
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL, -- Aplicable solo a una categoría
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL, -- Aplicable solo a una tienda
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL, -- Aplicable solo a un producto
    usage_limit INTEGER, -- Límite total de usos (NULL = ilimitado)
    usage_count INTEGER DEFAULT 0, -- Contador de usos actuales
    user_limit INTEGER DEFAULT 1, -- Límite de usos por usuario
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(), -- Fecha de inicio de validez
    valid_until TIMESTAMP WITH TIME ZONE, -- Fecha de expiración (NULL = sin expiración)
    is_active BOOLEAN DEFAULT true, -- Si el cupón está activo
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Creador del cupón
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla para tracking de uso de cupones por usuarios
CREATE TABLE IF NOT EXISTS public.coupon_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL, -- Orden donde se usó
    discount_amount NUMERIC(10, 2) NOT NULL, -- Monto del descuento aplicado
    used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(coupon_id, user_id, order_id) -- Un usuario no puede usar el mismo cupón dos veces en la misma orden
);

-- Tabla para promociones automáticas (descuentos sin cupón)
CREATE TABLE IF NOT EXISTS public.promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value > 0),
    min_purchase_amount NUMERIC(10, 2) DEFAULT 0,
    max_discount_amount NUMERIC(10, 2),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
    valid_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0, -- Prioridad cuando hay múltiples promociones (mayor = más prioridad)
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active, valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_coupons_category ON public.coupons(category_id);
CREATE INDEX IF NOT EXISTS idx_coupons_store ON public.coupons(store_id);
CREATE INDEX IF NOT EXISTS idx_coupons_product ON public.coupons(product_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON public.coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user ON public.coupon_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_order ON public.coupon_usage(order_id);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON public.promotions(is_active, valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_promotions_priority ON public.promotions(priority DESC);

-- Habilitar RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para coupons
CREATE POLICY "Anyone can view active coupons" ON public.coupons
    FOR SELECT TO authenticated
    USING (is_active = true);

CREATE POLICY "Admins and store owners can manage coupons" ON public.coupons
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') OR
        EXISTS (SELECT 1 FROM public.stores WHERE id = coupons.store_id AND seller_id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') OR
        EXISTS (SELECT 1 FROM public.stores WHERE id = coupons.store_id AND seller_id = auth.uid())
    );

-- Políticas RLS para coupon_usage
CREATE POLICY "Users can view their own coupon usage" ON public.coupon_usage
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Anyone can create coupon usage (when applying coupon)" ON public.coupon_usage
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para promotions
CREATE POLICY "Anyone can view active promotions" ON public.promotions
    FOR SELECT TO authenticated
    USING (is_active = true);

CREATE POLICY "Admins and store owners can manage promotions" ON public.promotions
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') OR
        EXISTS (SELECT 1 FROM public.stores WHERE id = promotions.store_id AND seller_id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') OR
        EXISTS (SELECT 1 FROM public.stores WHERE id = promotions.store_id AND seller_id = auth.uid())
    );

-- Función para validar un cupón
CREATE OR REPLACE FUNCTION validate_coupon(
    coupon_code TEXT,
    user_id_param UUID,
    order_amount NUMERIC
)
RETURNS TABLE (
    valid BOOLEAN,
    coupon_id UUID,
    discount_amount NUMERIC,
    message TEXT
) AS $$
DECLARE
    coupon_record RECORD;
    user_usage_count INTEGER;
    discount_calc NUMERIC;
BEGIN
    -- Buscar el cupón
    SELECT * INTO coupon_record
    FROM public.coupons
    WHERE code = coupon_code
    AND is_active = true;

    -- Verificar si existe
    IF NOT FOUND THEN
        RETURN QUERY SELECT false::BOOLEAN, NULL::UUID, 0::NUMERIC, 'Cupón no encontrado'::TEXT;
        RETURN;
    END IF;

    -- Verificar fecha de validez
    IF coupon_record.valid_from > now() OR 
       (coupon_record.valid_until IS NOT NULL AND coupon_record.valid_until < now()) THEN
        RETURN QUERY SELECT false::BOOLEAN, coupon_record.id, 0::NUMERIC, 'Cupón expirado o no válido aún'::TEXT;
        RETURN;
    END IF;

    -- Verificar monto mínimo de compra
    IF coupon_record.min_purchase_amount > order_amount THEN
        RETURN QUERY SELECT false::BOOLEAN, coupon_record.id, 0::NUMERIC, 
            format('El monto mínimo de compra es %s', coupon_record.min_purchase_amount)::TEXT;
        RETURN;
    END IF;

    -- Verificar límite total de usos
    IF coupon_record.usage_limit IS NOT NULL AND coupon_record.usage_count >= coupon_record.usage_limit THEN
        RETURN QUERY SELECT false::BOOLEAN, coupon_record.id, 0::NUMERIC, 'Cupón agotado'::TEXT;
        RETURN;
    END IF;

    -- Verificar límite de usos por usuario
    SELECT COUNT(*) INTO user_usage_count
    FROM public.coupon_usage
    WHERE coupon_id = coupon_record.id
    AND user_id = user_id_param;

    IF user_usage_count >= coupon_record.user_limit THEN
        RETURN QUERY SELECT false::BOOLEAN, coupon_record.id, 0::NUMERIC, 'Has alcanzado el límite de usos para este cupón'::TEXT;
        RETURN;
    END IF;

    -- Calcular descuento
    IF coupon_record.discount_type = 'percentage' THEN
        discount_calc := (order_amount * coupon_record.discount_value / 100);
        -- Aplicar máximo si existe
        IF coupon_record.max_discount_amount IS NOT NULL THEN
            discount_calc := LEAST(discount_calc, coupon_record.max_discount_amount);
        END IF;
    ELSE
        discount_calc := LEAST(coupon_record.discount_value, order_amount);
    END IF;

    RETURN QUERY SELECT true::BOOLEAN, coupon_record.id, discount_calc, 'Cupón válido'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION validate_coupon(TEXT, UUID, NUMERIC) TO authenticated;

-- Función para obtener promociones activas para un producto/tienda/categoría
CREATE OR REPLACE FUNCTION get_active_promotions(
    product_id_param UUID DEFAULT NULL,
    store_id_param UUID DEFAULT NULL,
    category_id_param UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    discount_type TEXT,
    discount_value NUMERIC,
    min_purchase_amount NUMERIC,
    max_discount_amount NUMERIC,
    priority INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.description,
        p.discount_type,
        p.discount_value,
        p.min_purchase_amount,
        p.max_discount_amount,
        p.priority
    FROM public.promotions p
    WHERE p.is_active = true
    AND p.valid_from <= now()
    AND (p.valid_until IS NULL OR p.valid_until >= now())
    AND (
        (product_id_param IS NOT NULL AND p.product_id = product_id_param) OR
        (store_id_param IS NOT NULL AND p.store_id = store_id_param) OR
        (category_id_param IS NOT NULL AND p.category_id = category_id_param) OR
        (p.product_id IS NULL AND p.store_id IS NULL AND p.category_id IS NULL) -- Promociones globales
    )
    ORDER BY p.priority DESC, p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_active_promotions(UUID, UUID, UUID) TO authenticated;

-- Función para aplicar cupón a una orden (se llamará desde el proceso de checkout)
CREATE OR REPLACE FUNCTION apply_coupon_to_order(
    coupon_code_param TEXT,
    order_id_param UUID,
    user_id_param UUID
)
RETURNS TABLE (
    success BOOLEAN,
    discount_amount NUMERIC,
    message TEXT
) AS $$
DECLARE
    order_record RECORD;
    validation_result RECORD;
BEGIN
    -- Obtener información de la orden
    SELECT * INTO order_record
    FROM public.orders
    WHERE id = order_id_param
    AND buyer_id = user_id_param;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false::BOOLEAN, 0::NUMERIC, 'Orden no encontrada'::TEXT;
        RETURN;
    END IF;

    -- Validar cupón
    SELECT * INTO validation_result
    FROM validate_coupon(coupon_code_param, user_id_param, order_record.total_amount);

    IF NOT (validation_result.valid) THEN
        RETURN QUERY SELECT false::BOOLEAN, 0::NUMERIC, validation_result.message;
        RETURN;
    END IF;

    -- Registrar uso del cupón
    INSERT INTO public.coupon_usage (coupon_id, user_id, order_id, discount_amount)
    VALUES (validation_result.coupon_id, user_id_param, order_id_param, validation_result.discount_amount);

    -- Actualizar contador de usos del cupón
    UPDATE public.coupons
    SET usage_count = usage_count + 1
    WHERE id = validation_result.coupon_id;

    RETURN QUERY SELECT true::BOOLEAN, validation_result.discount_amount, 'Cupón aplicado exitosamente'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION apply_coupon_to_order(TEXT, UUID, UUID) TO authenticated;

-- Trigger para updated_at
CREATE TRIGGER coupons_updated_at
    BEFORE UPDATE ON public.coupons
    FOR EACH ROW
    EXECUTE FUNCTION update_simple_updated_at();

CREATE TRIGGER promotions_updated_at
    BEFORE UPDATE ON public.promotions
    FOR EACH ROW
    EXECUTE FUNCTION update_simple_updated_at();


-- Migration: Funciones de Analytics para Vendedores
-- ============================================

-- Función para obtener estadísticas de ventas por período
CREATE OR REPLACE FUNCTION get_sales_stats_by_period(
    seller_id_param UUID,
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
    total_orders BIGINT,
    total_revenue NUMERIC,
    average_order_value NUMERIC,
    completed_orders BIGINT,
    pending_orders BIGINT,
    cancelled_orders BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_orders,
        COALESCE(SUM(total_amount), 0) AS total_revenue,
        COALESCE(AVG(total_amount), 0) AS average_order_value,
        COUNT(*) FILTER (WHERE status = 'completed')::BIGINT AS completed_orders,
        COUNT(*) FILTER (WHERE status = 'pending')::BIGINT AS pending_orders,
        COUNT(*) FILTER (WHERE status = 'cancelled')::BIGINT AS cancelled_orders
    FROM public.orders
    WHERE seller_id = seller_id_param
    AND created_at >= period_start
    AND created_at <= period_end;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_sales_stats_by_period(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;

-- Función para obtener ventas por día/mes
CREATE OR REPLACE FUNCTION get_sales_trend(
    seller_id_param UUID,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    group_by TEXT DEFAULT 'day' -- 'day' o 'month'
)
RETURNS TABLE (
    period_date DATE,
    total_revenue NUMERIC,
    order_count BIGINT
) AS $$
BEGIN
    IF group_by = 'month' THEN
        RETURN QUERY
        SELECT
            DATE_TRUNC('month', created_at::DATE)::DATE AS period_date,
            COALESCE(SUM(total_amount), 0) AS total_revenue,
            COUNT(*)::BIGINT AS order_count
        FROM public.orders
        WHERE seller_id = seller_id_param
        AND created_at >= start_date
        AND created_at <= end_date
        AND status IN ('completed', 'delivered')
        GROUP BY DATE_TRUNC('month', created_at::DATE)
        ORDER BY period_date;
    ELSE
        RETURN QUERY
        SELECT
            created_at::DATE AS period_date,
            COALESCE(SUM(total_amount), 0) AS total_revenue,
            COUNT(*)::BIGINT AS order_count
        FROM public.orders
        WHERE seller_id = seller_id_param
        AND created_at >= start_date
        AND created_at <= end_date
        AND status IN ('completed', 'delivered')
        GROUP BY created_at::DATE
        ORDER BY period_date;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_sales_trend(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, TEXT) TO authenticated;

-- Función para obtener productos más vendidos
CREATE OR REPLACE FUNCTION get_top_selling_products(
    seller_id_param UUID,
    period_start TIMESTAMP WITH TIME ZONE DEFAULT (now() - INTERVAL '30 days'),
    period_end TIMESTAMP WITH TIME ZONE DEFAULT now(),
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    product_id UUID,
    product_title TEXT,
    total_quantity BIGINT,
    total_revenue NUMERIC,
    order_count BIGINT,
    average_rating NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id AS product_id,
        p.title AS product_title,
        COALESCE(SUM(oi.quantity), 0)::BIGINT AS total_quantity,
        COALESCE(SUM(oi.quantity * oi.price), 0) AS total_revenue,
        COUNT(DISTINCT o.id)::BIGINT AS order_count,
        COALESCE(AVG(r.rating), 0) AS average_rating
    FROM public.products p
    LEFT JOIN public.order_items oi ON oi.product_id = p.id
    LEFT JOIN public.orders o ON o.id = oi.order_id
        AND o.status IN ('completed', 'delivered')
        AND o.created_at >= period_start
        AND o.created_at <= period_end
    LEFT JOIN public.reviews r ON r.product_id = p.id AND r.status = 'published'
    WHERE p.seller_id = seller_id_param
    GROUP BY p.id, p.title
    HAVING COALESCE(SUM(oi.quantity), 0) > 0
    ORDER BY total_revenue DESC, total_quantity DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_top_selling_products(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, INTEGER) TO authenticated;

-- Función para obtener estadísticas de categorías
CREATE OR REPLACE FUNCTION get_category_sales_stats(
    seller_id_param UUID,
    period_start TIMESTAMP WITH TIME ZONE DEFAULT (now() - INTERVAL '30 days'),
    period_end TIMESTAMP WITH TIME ZONE DEFAULT now()
)
RETURNS TABLE (
    category_id UUID,
    category_name TEXT,
    total_products BIGINT,
    total_sales BIGINT,
    total_revenue NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id AS category_id,
        c.name AS category_name,
        COUNT(DISTINCT p.id)::BIGINT AS total_products,
        COALESCE(SUM(oi.quantity), 0)::BIGINT AS total_sales,
        COALESCE(SUM(oi.quantity * oi.price), 0) AS total_revenue
    FROM public.categories c
    INNER JOIN public.products p ON p.category_id = c.id AND p.seller_id = seller_id_param
    LEFT JOIN public.order_items oi ON oi.product_id = p.id
    LEFT JOIN public.orders o ON o.id = oi.order_id
        AND o.status IN ('completed', 'delivered')
        AND o.created_at >= period_start
        AND o.created_at <= period_end
    GROUP BY c.id, c.name
    HAVING COALESCE(SUM(oi.quantity), 0) > 0
    ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_category_sales_stats(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;

-- Función para obtener métricas de conversión
CREATE OR REPLACE FUNCTION get_conversion_metrics(
    seller_id_param UUID,
    period_start TIMESTAMP WITH TIME ZONE DEFAULT (now() - INTERVAL '30 days'),
    period_end TIMESTAMP WITH TIME ZONE DEFAULT now()
)
RETURNS TABLE (
    total_product_views BIGINT,
    total_adds_to_cart BIGINT,
    total_checkouts BIGINT,
    total_orders BIGINT,
    cart_conversion_rate NUMERIC,
    checkout_conversion_rate NUMERIC,
    overall_conversion_rate NUMERIC
) AS $$
BEGIN
    -- Nota: Esto requiere datos de analytics. Por ahora retornamos estimaciones basadas en órdenes.
    -- En el futuro, esto podría usar la tabla analytics_events
    RETURN QUERY
    SELECT
        (COUNT(DISTINCT o.id) * 20)::BIGINT AS total_product_views, -- Estimación
        (COUNT(DISTINCT o.id) * 5)::BIGINT AS total_adds_to_cart, -- Estimación
        (COUNT(DISTINCT o.id) * 3)::BIGINT AS total_checkouts, -- Estimación
        COUNT(DISTINCT o.id)::BIGINT AS total_orders,
        CASE 
            WHEN COUNT(DISTINCT o.id) > 0 THEN (COUNT(DISTINCT o.id)::NUMERIC / (COUNT(DISTINCT o.id) * 5::NUMERIC)) * 100
            ELSE 0
        END AS cart_conversion_rate,
        CASE 
            WHEN COUNT(DISTINCT o.id) > 0 THEN (COUNT(DISTINCT o.id)::NUMERIC / (COUNT(DISTINCT o.id) * 3::NUMERIC)) * 100
            ELSE 0
        END AS checkout_conversion_rate,
        CASE 
            WHEN COUNT(DISTINCT o.id) > 0 THEN (COUNT(DISTINCT o.id)::NUMERIC / (COUNT(DISTINCT o.id) * 20::NUMERIC)) * 100
            ELSE 0
        END AS overall_conversion_rate
    FROM public.orders o
    WHERE o.seller_id = seller_id_param
    AND o.created_at >= period_start
    AND o.created_at <= period_end
    AND o.status IN ('completed', 'delivered');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_conversion_metrics(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;

-- Función para obtener clientes recurrentes
CREATE OR REPLACE FUNCTION get_repeat_customers(
    seller_id_param UUID,
    period_start TIMESTAMP WITH TIME ZONE DEFAULT (now() - INTERVAL '90 days'),
    period_end TIMESTAMP WITH TIME ZONE DEFAULT now()
)
RETURNS TABLE (
    customer_id UUID,
    customer_name TEXT,
    order_count BIGINT,
    total_spent NUMERIC,
    last_order_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.buyer_id AS customer_id,
        COALESCE(prof.full_name, 'Cliente') AS customer_name,
        COUNT(*)::BIGINT AS order_count,
        SUM(o.total_amount) AS total_spent,
        MAX(o.created_at) AS last_order_date
    FROM public.orders o
    LEFT JOIN public.profiles prof ON prof.id = o.buyer_id
    WHERE o.seller_id = seller_id_param
    AND o.created_at >= period_start
    AND o.created_at <= period_end
    AND o.status IN ('completed', 'delivered')
    GROUP BY o.buyer_id, prof.full_name
    HAVING COUNT(*) > 1
    ORDER BY order_count DESC, total_spent DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_repeat_customers(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;


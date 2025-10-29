-- ============================================
-- MERCADITO ONLINE PY - ANALYTICS MIGRATION
-- Tabla para eventos de analytics y métricas
-- ============================================

-- Crear tabla de eventos de analytics
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}'::jsonb,
    page_url TEXT NOT NULL,
    user_agent TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON public.analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON public.analytics_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_page_url ON public.analytics_events(page_url);

-- Crear tabla de métricas de rendimiento
CREATE TABLE IF NOT EXISTS public.performance_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    page_url TEXT NOT NULL,
    page_load_time INTEGER, -- en milisegundos
    first_contentful_paint INTEGER,
    largest_contentful_paint INTEGER,
    cumulative_layout_shift DECIMAL(5,3),
    first_input_delay INTEGER,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para métricas de rendimiento
CREATE INDEX IF NOT EXISTS idx_performance_metrics_page_url ON public.performance_metrics(page_url);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON public.performance_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_session_id ON public.performance_metrics(session_id);

-- Crear tabla de errores de aplicación
CREATE TABLE IF NOT EXISTS public.error_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    page_url TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para logs de errores
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON public.error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON public.error_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON public.error_logs(user_id);

-- Habilitar RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS para analytics_events
CREATE POLICY "Allow public insert for analytics events" ON public.analytics_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow users to view their own analytics events" ON public.analytics_events
    FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

-- Crear políticas RLS para performance_metrics
CREATE POLICY "Allow public insert for performance metrics" ON public.performance_metrics
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow users to view their own performance metrics" ON public.performance_metrics
    FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

-- Crear políticas RLS para error_logs
CREATE POLICY "Allow public insert for error logs" ON public.error_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow users to view their own error logs" ON public.error_logs
    FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

-- Función para limpiar datos antiguos (mantener solo últimos 90 días)
CREATE OR REPLACE FUNCTION cleanup_old_analytics_data()
RETURNS void AS $$
BEGIN
    -- Limpiar eventos de analytics antiguos
    DELETE FROM public.analytics_events 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Limpiar métricas de rendimiento antiguas
    DELETE FROM public.performance_metrics 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Limpiar logs de errores antiguos
    DELETE FROM public.error_logs 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Crear función para obtener estadísticas de analytics
CREATE OR REPLACE FUNCTION get_analytics_stats(
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_events', COUNT(*),
        'unique_users', COUNT(DISTINCT user_id),
        'unique_sessions', COUNT(DISTINCT session_id),
        'events_by_type', (
            SELECT json_object_agg(event_type, count)
            FROM (
                SELECT event_type, COUNT(*) as count
                FROM public.analytics_events
                WHERE timestamp BETWEEN start_date AND end_date
                GROUP BY event_type
            ) t
        ),
        'top_pages', (
            SELECT json_object_agg(page_name, count)
            FROM (
                SELECT 
                    CASE 
                        WHEN event_data->>'page_name' IS NOT NULL 
                        THEN event_data->>'page_name'
                        ELSE 'unknown'
                    END as page_name,
                    COUNT(*) as count
                FROM public.analytics_events
                WHERE timestamp BETWEEN start_date AND end_date
                AND event_type = 'page_view'
                GROUP BY page_name
                ORDER BY count DESC
                LIMIT 10
            ) t
        )
    ) INTO result
    FROM public.analytics_events
    WHERE timestamp BETWEEN start_date AND end_date;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Crear función para obtener métricas de rendimiento
CREATE OR REPLACE FUNCTION get_performance_stats(
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'avg_page_load_time', AVG(page_load_time),
        'avg_first_contentful_paint', AVG(first_contentful_paint),
        'avg_largest_contentful_paint', AVG(largest_contentful_paint),
        'avg_cumulative_layout_shift', AVG(cumulative_layout_shift),
        'avg_first_input_delay', AVG(first_input_delay),
        'total_measurements', COUNT(*)
    ) INTO result
    FROM public.performance_metrics
    WHERE timestamp BETWEEN start_date AND end_date;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para limpiar datos automáticamente (ejecutar diariamente)
-- Nota: Esto requeriría configurar un cron job en el servidor
-- Por ahora, se puede ejecutar manualmente o desde la aplicación

-- Insertar datos de ejemplo para testing
INSERT INTO public.analytics_events (event_type, event_data, page_url, session_id) VALUES
('page_view', '{"page_name": "home"}', 'https://mercadito-online-py.vercel.app/', 'session_test_1'),
('product_view', '{"product_id": "test-product-1"}', 'https://mercadito-online-py.vercel.app/products/test-product-1', 'session_test_1'),
('search', '{"search_term": "iPhone", "results_count": 5}', 'https://mercadito-online-py.vercel.app/search?q=iPhone', 'session_test_1');

INSERT INTO public.performance_metrics (page_url, page_load_time, first_contentful_paint, session_id) VALUES
('https://mercadito-online-py.vercel.app/', 1200, 800, 'session_test_1'),
('https://mercadito-online-py.vercel.app/products/test-product-1', 1500, 900, 'session_test_1');

-- Migration: Sistema de Envíos y Tracking
-- ============================================

-- Tabla de envíos
CREATE TABLE IF NOT EXISTS public.shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    tracking_number TEXT UNIQUE,
    carrier TEXT NOT NULL, -- correo_paraguayo, oca, dhl, fedex, etc.
    status TEXT NOT NULL DEFAULT 'pending', -- pending, in_transit, delivered, failed, returned
    shipping_address JSONB NOT NULL,
    shipping_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
    estimated_delivery_date TIMESTAMP WITH TIME ZONE,
    actual_delivery_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla de eventos de tracking
CREATE TABLE IF NOT EXISTS public.shipment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    location TEXT,
    description TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    metadata JSONB DEFAULT '{}'
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON public.shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number ON public.shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON public.shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipment_events_shipment_id ON public.shipment_events(shipment_id);

-- Habilitar RLS
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_events ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para shipments
CREATE POLICY "Users can view shipments for their orders" ON public.shipments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = shipments.order_id
            AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
        )
    );

CREATE POLICY "Sellers can create shipments for their orders" ON public.shipments
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = shipments.order_id
            AND orders.seller_id = auth.uid()
        )
    );

CREATE POLICY "Sellers can update shipments for their orders" ON public.shipments
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = shipments.order_id
            AND orders.seller_id = auth.uid()
        )
    );

-- Políticas RLS para shipment_events
CREATE POLICY "Users can view events for their shipments" ON public.shipment_events
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.shipments
            JOIN public.orders ON orders.id = shipments.order_id
            WHERE shipment_events.shipment_id = shipments.id
            AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
        )
    );

CREATE POLICY "Sellers can add events to their shipments" ON public.shipment_events
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.shipments
            JOIN public.orders ON orders.id = shipments.order_id
            WHERE shipment_events.shipment_id = shipments.id
            AND orders.seller_id = auth.uid()
        )
    );

-- Función para calcular costo de envío (ejemplo básico)
CREATE OR REPLACE FUNCTION calculate_shipping_cost(
    origin_city TEXT,
    destination_city TEXT,
    weight_kg DECIMAL DEFAULT 1.0,
    carrier TEXT DEFAULT 'correo_paraguayo'
)
RETURNS DECIMAL AS $$
DECLARE
    base_cost DECIMAL := 10000; -- Costo base en Gs.
    per_kg_cost DECIMAL := 5000; -- Costo por kg adicional
    distance_multiplier DECIMAL := 1.0;
BEGIN
    -- Lógica simplificada para calcular costo
    -- En producción, esto se integraría con APIs de carriers
    IF origin_city = destination_city THEN
        distance_multiplier := 0.5;
    END IF;

    RETURN base_cost + (weight_kg * per_kg_cost * distance_multiplier);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION calculate_shipping_cost(TEXT, TEXT, DECIMAL, TEXT) TO authenticated;

-- Función para obtener tracking updates
CREATE OR REPLACE FUNCTION get_shipment_tracking(shipment_id_param UUID)
RETURNS TABLE (
    id UUID,
    status TEXT,
    location TEXT,
    description TEXT,
    event_timestamp TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        shipment_events.id,
        shipment_events.status,
        shipment_events.location,
        shipment_events.description,
        shipment_events.timestamp AS event_timestamp
    FROM public.shipment_events
    WHERE shipment_events.shipment_id = shipment_id_param
    ORDER BY shipment_events.timestamp DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_shipment_tracking(UUID) TO authenticated;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_shipment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shipment_updated_at
    BEFORE UPDATE ON public.shipments
    FOR EACH ROW
    EXECUTE FUNCTION update_shipment_updated_at();


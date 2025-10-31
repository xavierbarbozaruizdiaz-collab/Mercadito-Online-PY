-- Migration: Sistema de Pagos
-- ============================================

-- Tabla de payment intents
CREATE TABLE IF NOT EXISTS public.payment_intents (
    id TEXT PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'PYG',
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, succeeded, failed, canceled
    payment_method TEXT NOT NULL, -- stripe, paypal, cash_on_delivery, bank_transfer, crypto, local_bank
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_payment_intents_order_id ON public.payment_intents(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON public.payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_payment_intents_payment_method ON public.payment_intents(payment_method);

-- Habilitar RLS
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own payment intents" ON public.payment_intents
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = payment_intents.order_id
            AND orders.buyer_id = auth.uid()
        )
    );

CREATE POLICY "Users can create payment intents for their orders" ON public.payment_intents
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = payment_intents.order_id
            AND orders.buyer_id = auth.uid()
        )
    );

CREATE POLICY "Sellers can view payment intents for their orders" ON public.payment_intents
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = payment_intents.order_id
            AND orders.seller_id = auth.uid()
        )
    );

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_payment_intent_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
CREATE TRIGGER payment_intent_updated_at
    BEFORE UPDATE ON public.payment_intents
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_intent_updated_at();


-- ============================================
-- MERCADITO ONLINE PY - OPTIMIZACIÓN PROCESAMIENTO DE PUJAS
-- Optimizaciones para 100K usuarios simultáneos
-- ============================================

-- 1. Índice compuesto para place_bid (optimizar SELECT FOR UPDATE SKIP LOCKED)
CREATE INDEX IF NOT EXISTS idx_products_auction_bid_lookup 
ON public.products(id, sale_type, auction_status) 
WHERE sale_type = 'auction';

-- 2. Índice para rate limiting (contar pujas recientes)
CREATE INDEX IF NOT EXISTS idx_auction_bids_rate_limit 
ON public.auction_bids(bidder_id, product_id, bid_time DESC) 
WHERE is_retracted = false;

-- 3. Índice para idempotency check (muy frecuente)
CREATE INDEX IF NOT EXISTS idx_auction_bids_idempotency 
ON public.auction_bids(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- 4. Índice para obtener pujas de una subasta (historial)
CREATE INDEX IF NOT EXISTS idx_auction_bids_product_time 
ON public.auction_bids(product_id, bid_time DESC, is_retracted) 
WHERE is_retracted = false;

-- 5. Índice para calcular posición del usuario (optimizar query de posición)
CREATE INDEX IF NOT EXISTS idx_auction_bids_position_calc 
ON public.auction_bids(product_id, amount DESC, bid_time ASC) 
WHERE is_retracted = false;

-- 6. Optimizar función place_bid: reducir queries innecesarias
-- (La función ya está optimizada, pero estos índices mejoran el rendimiento)

-- 7. Índice para verificar si usuario es ganador
CREATE INDEX IF NOT EXISTS idx_products_winner_lookup 
ON public.products(id, winner_id) 
WHERE sale_type = 'auction' AND winner_id IS NOT NULL;

-- 8. Índice para cron jobs (actualizar estados de subastas)
CREATE INDEX IF NOT EXISTS idx_products_auction_status_time 
ON public.products(auction_status, auction_start_at, auction_end_at) 
WHERE sale_type = 'auction';

-- Comentarios
COMMENT ON INDEX idx_products_auction_bid_lookup IS 'Optimiza SELECT FOR UPDATE SKIP LOCKED en place_bid';
COMMENT ON INDEX idx_auction_bids_rate_limit IS 'Optimiza rate limiting (contar pujas recientes)';
COMMENT ON INDEX idx_auction_bids_idempotency IS 'Optimiza verificación de idempotencia';
COMMENT ON INDEX idx_auction_bids_product_time IS 'Optimiza obtención de historial de pujas';
COMMENT ON INDEX idx_auction_bids_position_calc IS 'Optimiza cálculo de posición del usuario';
COMMENT ON INDEX idx_products_winner_lookup IS 'Optimiza verificación de ganador';
COMMENT ON INDEX idx_products_auction_status_time IS 'Optimiza cron jobs de actualización de estados';



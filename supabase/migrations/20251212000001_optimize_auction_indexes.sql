-- ============================================
-- OPTIMIZACIÓN DE ÍNDICES PARA 10K USUARIOS
-- Índices compuestos para mejorar performance de queries frecuentes
-- ============================================

-- 1. Índice compuesto para queries de pujas por subasta
-- Query frecuente: WHERE product_id = X AND is_retracted = false ORDER BY amount DESC
CREATE INDEX IF NOT EXISTS idx_auction_bids_product_active_amount 
ON public.auction_bids(product_id, is_retracted, amount DESC) 
WHERE is_retracted = false;

-- 2. Índice compuesto para queries de subastas activas
-- Query frecuente: WHERE sale_type = 'auction' AND auction_status = 'active'
CREATE INDEX IF NOT EXISTS idx_products_auction_active 
ON public.products(sale_type, auction_status, auction_end_at) 
WHERE sale_type = 'auction' AND auction_status = 'active';

-- 3. Índice para queries de subastas programadas que deben activarse
-- Query frecuente: WHERE sale_type = 'auction' AND auction_status = 'scheduled' AND auction_start_at <= NOW()
CREATE INDEX IF NOT EXISTS idx_products_auction_scheduled_start 
ON public.products(sale_type, auction_status, auction_start_at) 
WHERE sale_type = 'auction' AND auction_status = 'scheduled' AND auction_start_at IS NOT NULL;

-- 4. Índice para winner_id (ya se usa frecuentemente)
CREATE INDEX IF NOT EXISTS idx_products_winner_id 
ON public.products(winner_id) 
WHERE winner_id IS NOT NULL;

-- Comentarios
COMMENT ON INDEX idx_auction_bids_product_active_amount IS 'Optimiza queries de pujas activas ordenadas por monto';
COMMENT ON INDEX idx_products_auction_active IS 'Optimiza queries de subastas activas';
COMMENT ON INDEX idx_products_auction_scheduled_start IS 'Optimiza queries de subastas programadas que deben activarse';
COMMENT ON INDEX idx_products_winner_id IS 'Optimiza queries que buscan por ganador';




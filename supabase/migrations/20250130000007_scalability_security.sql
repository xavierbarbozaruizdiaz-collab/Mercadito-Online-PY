-- ============================================
-- MERCADITO ONLINE PY - ESCALABILIDAD Y SEGURIDAD
-- Mejoras críticas para escalar de 100 a 1000+ tiendas
-- ============================================

-- ============================================
-- 1. ÍNDICES COMPUESTOS PARA QUERIES EFICIENTES
-- ============================================

-- Índice compuesto para listados de productos por vendedor con estado
CREATE INDEX IF NOT EXISTS idx_products_seller_status_updated 
ON public.products(seller_id, status, updated_at DESC) 
WHERE status IN ('active', 'paused');

-- Índice compuesto para listados de productos por tienda con estado
CREATE INDEX IF NOT EXISTS idx_products_store_status_created 
ON public.products(store_id, status, created_at DESC) 
WHERE store_id IS NOT NULL AND status IN ('active', 'paused');

-- Índice para subastas activas (muy común en queries)
CREATE INDEX IF NOT EXISTS idx_products_auction_active 
ON public.products(sale_type, auction_status, auction_end_at) 
WHERE sale_type = 'auction' AND auction_status = 'active';

-- Índice para búsqueda de texto (usando GIN para trigram)
-- Esto mejora búsquedas por título/descripción
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_products_title_trgm 
ON public.products USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_description_trgm 
ON public.products USING gin(description gin_trgm_ops);

-- Índice compuesto para filtros comunes (categoría + precio + estado)
CREATE INDEX IF NOT EXISTS idx_products_category_price_status 
ON public.products(category_id, price, status) 
WHERE status = 'active';

-- Índice para productos por fecha de creación (para listados recientes)
CREATE INDEX IF NOT EXISTS idx_products_created_status 
ON public.products(created_at DESC, status) 
WHERE status = 'active';

-- ============================================
-- 2. MEJORAS EN RLS (ROW LEVEL SECURITY)
-- ============================================

-- Asegurar que las políticas RLS sean más estrictas para UPDATE
-- Los usuarios solo pueden actualizar sus propios productos
DROP POLICY IF EXISTS "Users can update own products" ON public.products;
CREATE POLICY "Users can update own products" ON public.products 
FOR UPDATE
TO authenticated
USING (
  auth.uid() = seller_id
  OR (
    store_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.stores 
      WHERE id = products.store_id 
      AND seller_id = auth.uid()
    )
  )
)
WITH CHECK (
  auth.uid() = seller_id
  OR (
    store_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.stores 
      WHERE id = products.store_id 
      AND seller_id = auth.uid()
    )
  )
);

-- Política mejorada para DELETE (asegurar que no se borren productos de otras tiendas)
DROP POLICY IF EXISTS "Users can delete own products" ON public.products;
CREATE POLICY "Users can delete own products" ON public.products 
FOR DELETE
TO authenticated
USING (
  auth.uid() = seller_id
  OR (
    store_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.stores 
      WHERE id = products.store_id 
      AND seller_id = auth.uid()
    )
  )
);

-- ============================================
-- 3. ÍNDICES PARA TABLA DE PUJAS (AUCTION_BIDS)
-- ============================================

-- Índice compuesto para obtener la puja más alta por producto
CREATE INDEX IF NOT EXISTS idx_bids_product_active_amount 
ON public.auction_bids(product_id, amount DESC, is_retracted) 
WHERE is_retracted = false;

-- Índice para obtener pujas recientes de un usuario
CREATE INDEX IF NOT EXISTS idx_bids_bidder_time 
ON public.auction_bids(bidder_id, bid_time DESC) 
WHERE is_retracted = false;

-- ============================================
-- 4. FUNCIÓN PARA LIMITAR PAGINACIÓN (HARD LIMIT)
-- ============================================

-- Función helper para validar límites de paginación
CREATE OR REPLACE FUNCTION validate_pagination_limit(
  requested_limit INTEGER,
  max_limit INTEGER DEFAULT 60
) RETURNS INTEGER AS $$
BEGIN
  -- Si el límite solicitado es mayor al máximo, usar el máximo
  IF requested_limit > max_limit THEN
    RETURN max_limit;
  END IF;
  
  -- Si es menor o igual a 0, usar 20 como default
  IF requested_limit <= 0 THEN
    RETURN 20;
  END IF;
  
  RETURN requested_limit;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 5. ÍNDICES PARA STORES (TIENDAS)
-- ============================================

-- Índice compuesto para tiendas activas por vendedor
CREATE INDEX IF NOT EXISTS idx_stores_seller_active 
ON public.stores(seller_id, is_active, created_at DESC) 
WHERE is_active = true;

-- Índice para búsqueda de tiendas por slug (ya debería existir como UNIQUE, pero agregamos b-tree para performance)
CREATE INDEX IF NOT EXISTS idx_stores_slug_btree 
ON public.stores(slug);

-- ============================================
-- 6. TABLA DE AUDITORÍA BÁSICA (OPCIONAL PERO RECOMENDADO)
-- ============================================

-- Tabla para registrar cambios importantes (crear/editar/borrar productos)
CREATE TABLE IF NOT EXISTS public.product_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'status_change')),
  old_values JSONB,
  new_values JSONB,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices para auditoría
CREATE INDEX IF NOT EXISTS idx_audit_product ON public.product_audit_log(product_id);
CREATE INDEX IF NOT EXISTS idx_audit_seller ON public.product_audit_log(seller_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.product_audit_log(created_at DESC);

-- Habilitar RLS en auditoría
ALTER TABLE public.product_audit_log ENABLE ROW LEVEL SECURITY;

-- Política: Los vendedores pueden ver sus propios logs
CREATE POLICY "Sellers can view own audit logs" ON public.product_audit_log
FOR SELECT
TO authenticated
USING (auth.uid() = seller_id OR auth.uid() = changed_by);

-- ============================================
-- 7. TRIGGER PARA AUDITORÍA AUTOMÁTICA
-- ============================================

-- Función para registrar cambios en productos
CREATE OR REPLACE FUNCTION log_product_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.product_audit_log (
      product_id,
      seller_id,
      action,
      new_values,
      changed_by
    ) VALUES (
      NEW.id,
      NEW.seller_id,
      'create',
      to_jsonb(NEW),
      auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Solo registrar si hay cambios significativos
    IF OLD.title IS DISTINCT FROM NEW.title 
       OR OLD.price IS DISTINCT FROM NEW.price 
       OR OLD.status IS DISTINCT FROM NEW.status 
       OR OLD.sale_type IS DISTINCT FROM NEW.sale_type THEN
      INSERT INTO public.product_audit_log (
        product_id,
        seller_id,
        action,
        old_values,
        new_values,
        changed_by
      ) VALUES (
        NEW.id,
        NEW.seller_id,
        CASE 
          WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'status_change'
          ELSE 'update'
        END,
        to_jsonb(OLD),
        to_jsonb(NEW),
        auth.uid()
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.product_audit_log (
      product_id,
      seller_id,
      action,
      old_values,
      changed_by
    ) VALUES (
      OLD.id,
      OLD.seller_id,
      'delete',
      to_jsonb(OLD),
      auth.uid()
    );
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger solo si no existe
DROP TRIGGER IF EXISTS trigger_product_audit ON public.products;
CREATE TRIGGER trigger_product_audit
AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW
EXECUTE FUNCTION log_product_changes();

-- ============================================
-- 8. COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================

COMMENT ON INDEX idx_products_seller_status_updated IS 'Índice compuesto para listados eficientes por vendedor con estado';
COMMENT ON INDEX idx_products_store_status_created IS 'Índice compuesto para listados eficientes por tienda con estado';
COMMENT ON INDEX idx_products_auction_active IS 'Índice para subastas activas (queries frecuentes)';
COMMENT ON INDEX idx_products_title_trgm IS 'Índice GIN para búsqueda de texto en títulos';
COMMENT ON INDEX idx_products_description_trgm IS 'Índice GIN para búsqueda de texto en descripciones';
COMMENT ON FUNCTION validate_pagination_limit IS 'Valida y limita el tamaño de paginación (máximo 60 items)';
COMMENT ON TABLE product_audit_log IS 'Log de auditoría para cambios en productos';



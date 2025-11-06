-- ============================================
-- MERCADITO ONLINE PY - SISTEMA DE PRECIOS MAYORISTAS
-- Permite a las tiendas configurar descuentos por cantidad
-- ============================================

-- ============================================
-- 1. AGREGAR CAMPOS A PRODUCTS
-- ============================================

ALTER TABLE products
ADD COLUMN IF NOT EXISTS wholesale_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS wholesale_min_quantity INTEGER,
ADD COLUMN IF NOT EXISTS wholesale_discount_percent DECIMAL(5,2);

-- Comentarios
COMMENT ON COLUMN products.wholesale_enabled IS 'Si true, el producto tiene precio mayorista disponible';
COMMENT ON COLUMN products.wholesale_min_quantity IS 'Cantidad mínima para aplicar precio mayorista';
COMMENT ON COLUMN products.wholesale_discount_percent IS 'Porcentaje de descuento para precio mayorista (ej: 15.00 = 15%)';

-- ============================================
-- 2. AGREGAR CAMPOS A ORDER_ITEMS
-- Para registrar si se aplicó precio mayorista
-- ============================================

ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS applied_wholesale BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS wholesale_discount_amount DECIMAL(10,2) DEFAULT 0;

-- Comentarios
COMMENT ON COLUMN order_items.applied_wholesale IS 'Si true, se aplicó precio mayorista en esta orden';
COMMENT ON COLUMN order_items.wholesale_discount_amount IS 'Monto de descuento aplicado por unidad (precio_normal - precio_mayorista)';

-- ============================================
-- 3. FUNCIÓN: CALCULAR PRECIO MAYORISTA
-- ============================================

CREATE OR REPLACE FUNCTION calculate_wholesale_price(
  p_product_id UUID,
  p_quantity INTEGER
)
RETURNS TABLE (
  unit_price DECIMAL(10,2),
  total_price DECIMAL(10,2),
  is_wholesale BOOLEAN,
  discount_amount DECIMAL(10,2),
  original_price DECIMAL(10,2)
) AS $$
DECLARE
  v_product RECORD;
  v_wholesale_price DECIMAL(10,2);
  v_discount DECIMAL(5,2);
BEGIN
  -- Obtener información del producto
  SELECT 
    price,
    wholesale_enabled,
    wholesale_min_quantity,
    wholesale_discount_percent
  INTO v_product
  FROM products
  WHERE id = p_product_id;
  
  IF v_product IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;
  
  -- Verificar si se aplica precio mayorista
  IF v_product.wholesale_enabled = true 
     AND v_product.wholesale_min_quantity IS NOT NULL 
     AND v_product.wholesale_discount_percent IS NOT NULL
     AND p_quantity >= v_product.wholesale_min_quantity THEN
    
    -- Calcular precio mayorista
    v_discount := v_product.wholesale_discount_percent / 100.0;
    v_wholesale_price := v_product.price * (1.0 - v_discount);
    
    RETURN QUERY SELECT
      v_wholesale_price as unit_price,
      v_wholesale_price * p_quantity as total_price,
      true as is_wholesale,
      (v_product.price - v_wholesale_price) as discount_amount,
      v_product.price as original_price;
  ELSE
    -- Precio normal
    RETURN QUERY SELECT
      v_product.price as unit_price,
      v_product.price * p_quantity as total_price,
      false as is_wholesale,
      0.0 as discount_amount,
      v_product.price as original_price;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_wholesale_price IS 'Calcula el precio unitario y total considerando descuentos mayoristas por cantidad';

-- ============================================
-- 4. ÍNDICES PARA MEJORAR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_products_wholesale_enabled 
ON products(wholesale_enabled) 
WHERE wholesale_enabled = true;

CREATE INDEX IF NOT EXISTS idx_order_items_wholesale 
ON order_items(applied_wholesale) 
WHERE applied_wholesale = true;


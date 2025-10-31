-- ============================================
-- Agregar campo para atributos específicos por categoría
-- ============================================

ALTER TABLE products
ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}';

-- Crear índice GIN para búsquedas eficientes en atributos
CREATE INDEX IF NOT EXISTS idx_products_attributes ON products USING GIN (attributes);


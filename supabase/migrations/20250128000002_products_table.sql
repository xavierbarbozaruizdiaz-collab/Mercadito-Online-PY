-- ============================================
-- Tabla Principal de Productos - Mercadito Online PY
-- ============================================

-- 1. Crear tabla products
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price > 0),
  cover_url TEXT, -- URL de la imagen principal
  condition TEXT NOT NULL DEFAULT 'usado' CHECK (condition IN ('nuevo', 'usado', 'usado_como_nuevo')),
  sale_type TEXT NOT NULL DEFAULT 'direct' CHECK (sale_type IN ('direct', 'auction')),
  category_id UUID REFERENCES public.categories(id),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Habilitar RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 3. Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON public.products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at);
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products(price);
CREATE INDEX IF NOT EXISTS idx_products_sale_type ON public.products(sale_type);
CREATE INDEX IF NOT EXISTS idx_products_condition ON public.products(condition);

-- 4. Políticas RLS para products
-- SELECT: Público puede ver todos los productos
DROP POLICY IF EXISTS "Public can view products" ON public.products;
CREATE POLICY "Public can view products" ON public.products FOR SELECT
TO public
USING (true);

-- INSERT: Solo usuarios autenticados pueden crear productos
DROP POLICY IF EXISTS "Users can create products" ON public.products;
CREATE POLICY "Users can create products" ON public.products FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = seller_id);

-- UPDATE: Solo el vendedor puede actualizar sus productos
DROP POLICY IF EXISTS "Users can update own products" ON public.products;
CREATE POLICY "Users can update own products" ON public.products FOR UPDATE
TO authenticated
USING (auth.uid() = seller_id)
WITH CHECK (auth.uid() = seller_id);

-- DELETE: Solo el vendedor puede eliminar sus productos
DROP POLICY IF EXISTS "Users can delete own products" ON public.products;
CREATE POLICY "Users can delete own products" ON public.products FOR DELETE
TO authenticated
USING (auth.uid() = seller_id);

-- 5. Trigger para updated_at
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Comentarios para documentación
COMMENT ON TABLE public.products IS 'Tabla principal de productos del marketplace';
COMMENT ON COLUMN public.products.id IS 'UUID único del producto';
COMMENT ON COLUMN public.products.title IS 'Título del producto';
COMMENT ON COLUMN public.products.description IS 'Descripción detallada del producto';
COMMENT ON COLUMN public.products.price IS 'Precio en guaraníes paraguayos';
COMMENT ON COLUMN public.products.cover_url IS 'URL de la imagen principal del producto';
COMMENT ON COLUMN public.products.condition IS 'Condición del producto: nuevo, usado, usado_como_nuevo';
COMMENT ON COLUMN public.products.sale_type IS 'Tipo de venta: direct (directa) o auction (subasta)';
COMMENT ON COLUMN public.products.category_id IS 'ID de la categoría del producto';
COMMENT ON COLUMN public.products.seller_id IS 'ID del vendedor (usuario que creó el producto)';
COMMENT ON COLUMN public.products.created_at IS 'Fecha de creación del producto';
COMMENT ON COLUMN public.products.updated_at IS 'Fecha de última actualización del producto';

-- ============================================
-- Corrección de Estructura Existente - Mercadito Online PY
-- ============================================

-- Esta migración corrige la estructura existente de la tabla products

-- 1. Verificar si la tabla products existe y tiene la estructura correcta
DO $$
BEGIN
  -- Si la tabla products existe pero no tiene seller_id, agregarlo
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products' AND table_schema = 'public') THEN
    -- Agregar columna seller_id si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'seller_id' AND table_schema = 'public') THEN
      ALTER TABLE public.products ADD COLUMN seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    -- Renombrar created_by a seller_id si existe
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'created_by' AND table_schema = 'public') THEN
      -- Copiar datos de created_by a seller_id si seller_id está vacío
      UPDATE public.products SET seller_id = created_by WHERE seller_id IS NULL;
      -- Eliminar columna created_by
      ALTER TABLE public.products DROP COLUMN created_by;
    END IF;
    
    -- Si aún hay productos sin seller_id, asignar un usuario por defecto o eliminar
    -- Por ahora, vamos a eliminar productos sin seller_id
    DELETE FROM public.products WHERE seller_id IS NULL;
    
    -- Ahora sí hacer seller_id NOT NULL
    ALTER TABLE public.products ALTER COLUMN seller_id SET NOT NULL;
    
    -- Agregar columna cover_url si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'cover_url' AND table_schema = 'public') THEN
      ALTER TABLE public.products ADD COLUMN cover_url TEXT;
    END IF;
    
    -- Renombrar image_url a cover_url si existe
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'image_url' AND table_schema = 'public') THEN
      -- Copiar datos de image_url a cover_url si cover_url está vacío
      UPDATE public.products SET cover_url = image_url WHERE cover_url IS NULL;
      -- Eliminar columna image_url
      ALTER TABLE public.products DROP COLUMN image_url;
    END IF;
    
    -- Agregar columnas faltantes si no existen
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'condition' AND table_schema = 'public') THEN
      ALTER TABLE public.products ADD COLUMN condition TEXT DEFAULT 'usado' CHECK (condition IN ('nuevo', 'usado', 'usado_como_nuevo'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'sale_type' AND table_schema = 'public') THEN
      ALTER TABLE public.products ADD COLUMN sale_type TEXT DEFAULT 'direct' CHECK (sale_type IN ('direct', 'auction'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'category_id' AND table_schema = 'public') THEN
      ALTER TABLE public.products ADD COLUMN category_id UUID REFERENCES public.categories(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'updated_at' AND table_schema = 'public') THEN
      ALTER TABLE public.products ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;
    END IF;
    
    -- Agregar índices si no existen
    CREATE INDEX IF NOT EXISTS idx_products_seller_id ON public.products(seller_id);
    CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at);
    CREATE INDEX IF NOT EXISTS idx_products_price ON public.products(price);
    CREATE INDEX IF NOT EXISTS idx_products_sale_type ON public.products(sale_type);
    CREATE INDEX IF NOT EXISTS idx_products_condition ON public.products(condition);
    
    -- Habilitar RLS si no está habilitado
    ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
    
  END IF;
END $$;

-- 2. Crear políticas RLS para products
DROP POLICY IF EXISTS "products_select_public" ON public.products;
CREATE POLICY "products_select_public" ON public.products FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "products_insert_authenticated" ON public.products;
CREATE POLICY "products_insert_authenticated" ON public.products FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "products_update_owner" ON public.products;
CREATE POLICY "products_update_owner" ON public.products FOR UPDATE
TO authenticated
USING (auth.uid() = seller_id)
WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "products_delete_owner" ON public.products;
CREATE POLICY "products_delete_owner" ON public.products FOR DELETE
TO authenticated
USING (auth.uid() = seller_id);

-- 3. Crear trigger para updated_at si no existe
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Comentarios
COMMENT ON TABLE public.products IS 'Tabla principal de productos del marketplace';
COMMENT ON COLUMN public.products.seller_id IS 'ID del vendedor (usuario que creó el producto)';
COMMENT ON COLUMN public.products.cover_url IS 'URL de la imagen principal del producto';
COMMENT ON COLUMN public.products.condition IS 'Condición del producto: nuevo, usado, usado_como_nuevo';
COMMENT ON COLUMN public.products.sale_type IS 'Tipo de venta: direct (directa) o auction (subasta)';

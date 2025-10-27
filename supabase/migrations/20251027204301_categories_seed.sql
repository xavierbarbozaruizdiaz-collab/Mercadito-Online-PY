-- Crear tabla categories si no existe
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Agregar columna category_id a products si no existe
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id);

-- Crear índice para mejorar consultas de productos por categoría
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);

-- Insertar semillas de manera idempotente
INSERT INTO public.categories (name) VALUES
  ('Autos'),
  ('Motos'),
  ('Electrónica'),
  ('Hogar'),
  ('Ropa y Calzado'),
  ('Accesorios'),
  ('Deportes')
ON CONFLICT (name) DO NOTHING;

-- Comentarios para documentación
COMMENT ON TABLE public.categories IS 'Tabla de categorías de productos';
COMMENT ON COLUMN public.categories.id IS 'UUID único de la categoría';
COMMENT ON COLUMN public.categories.name IS 'Nombre de la categoría (único)';
COMMENT ON COLUMN public.categories.created_at IS 'Fecha de creación de la categoría';


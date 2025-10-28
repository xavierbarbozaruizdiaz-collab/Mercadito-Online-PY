-- Asegurar que las categorías sean accesibles públicamente
-- Habilitar RLS para categories si no está habilitado
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Crear política para permitir lectura pública de categorías
DROP POLICY IF EXISTS "categories_select_public" ON public.categories;
CREATE POLICY "categories_select_public" ON public.categories FOR SELECT TO public USING (true);

-- Verificar que las categorías existan
INSERT INTO public.categories (name) VALUES
  ('Electrónicos'),
  ('Ropa y Accesorios'),
  ('Hogar y Jardín'),
  ('Deportes y Fitness'),
  ('Libros y Música'),
  ('Juguetes y Juegos'),
  ('Automotriz'),
  ('Belleza y Salud'),
  ('Alimentos y Bebidas'),
  ('Otros')
ON CONFLICT (name) DO NOTHING;

-- Deshabilitar temporalmente RLS para categories para debug
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;

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

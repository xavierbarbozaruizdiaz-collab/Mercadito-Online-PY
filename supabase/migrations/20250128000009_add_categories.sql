-- Asegurar que las categorías estén disponibles
INSERT INTO public.categories (name) VALUES
  ('Autos'),
  ('Motos'),
  ('Electrónica'),
  ('Hogar'),
  ('Ropa y Calzado'),
  ('Accesorios'),
  ('Deportes'),
  ('Libros'),
  ('Juguetes'),
  ('Herramientas')
ON CONFLICT (name) DO NOTHING;

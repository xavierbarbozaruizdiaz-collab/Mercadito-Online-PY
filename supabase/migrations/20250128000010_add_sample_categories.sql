-- Agregar categorías de ejemplo
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

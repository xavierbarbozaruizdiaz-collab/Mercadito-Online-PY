-- Habilitar RLS para categories con política correcta
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Crear política para permitir lectura pública de categorías
DROP POLICY IF EXISTS "categories_select_public" ON public.categories;
CREATE POLICY "categories_select_public" ON public.categories FOR SELECT TO public USING (true);

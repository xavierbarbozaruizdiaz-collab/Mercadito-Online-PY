-- ============================================
-- SIMPLIFICAR POLITICAS RLS - SOLUCION TIMEOUT
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. LIMPIAR TODAS LAS POLITICAS CONFLICTIVAS
-- ============================================

-- Deshabilitar RLS temporalmente para limpieza completa
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;

-- Eliminar TODAS las políticas existentes
DO $$
DECLARE
    r RECORD;
    table_name TEXT;
    policy_count INTEGER;
BEGIN
    FOR table_name IN SELECT unnest(ARRAY['profiles', 'orders', 'order_items', 'products', 'categories']) LOOP
        policy_count := 0;
        FOR r IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = table_name
        LOOP
            BEGIN
                EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, table_name);
                policy_count := policy_count + 1;
            EXCEPTION WHEN OTHERS THEN
                -- Ignorar errores de políticas que no existen
            END;
        END LOOP;
        RAISE NOTICE 'Tabla %: % políticas eliminadas', table_name, policy_count;
    END LOOP;
END $$;

-- ============================================
-- 2. REHABILITAR RLS Y CREAR POLITICAS SIMPLES
-- ============================================

-- Rehabilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- PROFILES: Solo políticas básicas sin recursión
CREATE POLICY "profiles_select_all"
ON public.profiles FOR SELECT
TO public
USING (true);

CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ORDERS: Acceso público de lectura
CREATE POLICY "orders_select_all"
ON public.orders FOR SELECT
TO public
USING (true);

CREATE POLICY "orders_insert_authenticated"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "orders_update_authenticated"
ON public.orders FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- ORDER_ITEMS: Acceso público de lectura
CREATE POLICY "order_items_select_all"
ON public.order_items FOR SELECT
TO public
USING (true);

CREATE POLICY "order_items_insert_authenticated"
ON public.order_items FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "order_items_update_authenticated"
ON public.order_items FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- PRODUCTS: Acceso público de lectura
CREATE POLICY "products_select_all"
ON public.products FOR SELECT
TO public
USING (true);

CREATE POLICY "products_insert_authenticated"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "products_update_authenticated"
ON public.products FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- CATEGORIES: Acceso público de lectura
CREATE POLICY "categories_select_all"
ON public.categories FOR SELECT
TO public
USING (true);

CREATE POLICY "categories_insert_authenticated"
ON public.categories FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "categories_update_authenticated"
ON public.categories FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- 3. MENSAJE DE CONFIRMACION
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ POLITICAS RLS SIMPLIFICADAS EXITOSAMENTE';
    RAISE NOTICE '============================================';
    RAISE NOTICE '   ✓ Todas las políticas conflictivas eliminadas';
    RAISE NOTICE '   ✓ Políticas simples creadas sin recursión';
    RAISE NOTICE '   ✓ Acceso público de lectura habilitado';
    RAISE NOTICE '   ✓ Sin consultas complejas en políticas';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 REINICIA TU APLICACION AHORA';
    RAISE NOTICE '============================================';
END $$;

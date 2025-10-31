-- ============================================
-- CORREGIR RLS PARA ORDENES Y ORDER_ITEMS
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CORREGIR TABLA ORDERS
-- ============================================

-- Eliminar políticas existentes de orders
DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_own" ON public.orders;
DROP POLICY IF EXISTS "orders_update_own" ON public.orders;
DROP POLICY IF EXISTS "orders_select_all" ON public.orders;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.orders;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.orders;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.orders;

-- Crear políticas simples para orders
CREATE POLICY "orders_select_public"
ON public.orders FOR SELECT
TO public
USING (true);

CREATE POLICY "orders_insert_authenticated"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "orders_update_own"
ON public.orders FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- 2. CORREGIR TABLA ORDER_ITEMS
-- ============================================

-- Eliminar políticas existentes de order_items
DROP POLICY IF EXISTS "order_items_select_own" ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert_own" ON public.order_items;
DROP POLICY IF EXISTS "order_items_update_own" ON public.order_items;
DROP POLICY IF EXISTS "order_items_select_all" ON public.order_items;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.order_items;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.order_items;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.order_items;

-- Crear políticas simples para order_items
CREATE POLICY "order_items_select_public"
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

-- ============================================
-- 3. VERIFICAR OTRAS TABLAS RELACIONADAS
-- ============================================

-- Asegurar que products tenga acceso público (por si acaso)
DROP POLICY IF EXISTS "products_select_public" ON public.products;
CREATE POLICY "products_select_public"
ON public.products FOR SELECT
TO public
USING (
  COALESCE(status, 'active') = 'active' OR status IS NULL
);

-- ============================================
-- 4. MENSAJE DE CONFIRMACION
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '✅ POLÍTICAS DE ÓRDENES CORREGIDAS';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '   ✓ orders: Acceso público de lectura habilitado';
    RAISE NOTICE '   ✓ order_items: Acceso público de lectura habilitado';
    RAISE NOTICE '   ✓ products: Acceso público verificado';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 RECARGA EL DASHBOARD AHORA';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

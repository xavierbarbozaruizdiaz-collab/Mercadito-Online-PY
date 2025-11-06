-- ============================================
-- CORREGIR RLS PARA CART_ITEMS (INSERCIÓN)
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. ELIMINAR TODAS LAS POLÍTICAS DE CART_ITEMS
-- ============================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'cart_items'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.cart_items', r.policyname);
            RAISE NOTICE '✅ Política eliminada: %', r.policyname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ No se pudo eliminar política: % - %', r.policyname, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================
-- 2. CREAR POLÍTICAS SIMPLES Y FUNCIONALES
-- ============================================

-- SELECT: Usuarios autenticados pueden ver sus propios items
CREATE POLICY "cart_items_select_own"
ON public.cart_items FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- INSERT: Usuarios autenticados pueden agregar items a su carrito
CREATE POLICY "cart_items_insert_own"
ON public.cart_items FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Usuarios autenticados pueden actualizar sus propios items
CREATE POLICY "cart_items_update_own"
ON public.cart_items FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: Usuarios autenticados pueden eliminar sus propios items
CREATE POLICY "cart_items_delete_own"
ON public.cart_items FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- 3. VERIFICAR FOREIGN KEY A PRODUCTS
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'cart_items_product_id_fkey' 
        AND table_name = 'cart_items'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.cart_items 
        ADD CONSTRAINT cart_items_product_id_fkey 
        FOREIGN KEY (product_id) 
        REFERENCES public.products(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Foreign key agregado: cart_items_product_id_fkey';
    ELSE
        RAISE NOTICE '✅ Foreign key ya existe: cart_items_product_id_fkey';
    END IF;
END $$;

-- ============================================
-- 4. MENSAJE DE CONFIRMACIÓN
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '✅ POLÍTICAS RLS DE CART_ITEMS CORREGIDAS';
    RAISE NOTICE '   - SELECT: Usuarios ven solo sus items';
    RAISE NOTICE '   - INSERT: Usuarios pueden agregar items';
    RAISE NOTICE '   - UPDATE: Usuarios pueden actualizar items';
    RAISE NOTICE '   - DELETE: Usuarios pueden eliminar items';
    RAISE NOTICE '   - Foreign key verificado/creado';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 RECARGA TU APLICACIÓN Y PRUEBA AGREGAR AL CARRITO';
    RAISE NOTICE '';
END $$;


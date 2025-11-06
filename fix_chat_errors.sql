-- ============================================
-- CORREGIR ERRORES DE CHAT Y CART
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CORREGIR FUNCIÓN create_conversation (conversation_id ambiguo)
-- ============================================

CREATE OR REPLACE FUNCTION create_conversation(
    p_buyer_id UUID,
    p_seller_id UUID,
    p_product_id UUID DEFAULT NULL,
    p_store_id UUID DEFAULT NULL,
    p_subject TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_conversation_id UUID;
BEGIN
    -- Verificar que el buyer y seller sean diferentes
    IF p_buyer_id = p_seller_id THEN
        RAISE EXCEPTION 'Buyer and seller cannot be the same user';
    END IF;
    
    -- Crear la conversación
    INSERT INTO public.conversations (buyer_id, seller_id, product_id, store_id, subject)
    VALUES (p_buyer_id, p_seller_id, p_product_id, p_store_id, p_subject)
    ON CONFLICT (buyer_id, seller_id, product_id) 
    DO UPDATE SET 
        status = 'active',
        updated_at = NOW()
    RETURNING id INTO v_conversation_id;
    
    -- Agregar participantes
    -- IMPORTANTE: Usar v_conversation_id en VALUES, pero especificar que ON CONFLICT se refiere a las columnas de la tabla
    -- Usar INSERT con WHERE NOT EXISTS para evitar ON CONFLICT con ambigüedad
    INSERT INTO public.conversation_participants (conversation_id, user_id, role)
    SELECT v_conversation_id, p_buyer_id, 'buyer'
    WHERE NOT EXISTS (
        SELECT 1 FROM public.conversation_participants 
        WHERE conversation_id = v_conversation_id AND user_id = p_buyer_id
    );
    
    INSERT INTO public.conversation_participants (conversation_id, user_id, role)
    SELECT v_conversation_id, p_seller_id, 'seller'
    WHERE NOT EXISTS (
        SELECT 1 FROM public.conversation_participants 
        WHERE conversation_id = v_conversation_id AND user_id = p_seller_id
    );
    
    RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. VERIFICAR Y CREAR FOREIGN KEYS FALTANTES PARA RELACIONES
-- ============================================

-- Verificar si cart_items tiene foreign key a products
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'cart_items_product_id_fkey' 
        AND table_name = 'cart_items'
    ) THEN
        ALTER TABLE public.cart_items 
        ADD CONSTRAINT cart_items_product_id_fkey 
        FOREIGN KEY (product_id) 
        REFERENCES public.products(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================
-- 3. CORREGIR POLÍTICAS RLS DE CART_ITEMS
-- ============================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view own cart" ON public.cart_items;
DROP POLICY IF EXISTS "Users can add to own cart" ON public.cart_items;
DROP POLICY IF EXISTS "Users can update own cart" ON public.cart_items;
DROP POLICY IF EXISTS "Users can delete from own cart" ON public.cart_items;

-- Crear políticas simples
CREATE POLICY "cart_items_select_own"
ON public.cart_items FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "cart_items_insert_own"
ON public.cart_items FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cart_items_update_own"
ON public.cart_items FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cart_items_delete_own"
ON public.cart_items FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- 4. MENSAJE DE CONFIRMACION
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ ERRORES DE CHAT Y CART CORREGIDOS';
    RAISE NOTICE '============================================';
    RAISE NOTICE '   ✓ Función create_conversation corregida';
    RAISE NOTICE '   ✓ Foreign keys verificados';
    RAISE NOTICE '   ✓ Políticas RLS de cart_items corregidas';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 RECARGA TU APLICACION AHORA';
    RAISE NOTICE '============================================';
END $$;


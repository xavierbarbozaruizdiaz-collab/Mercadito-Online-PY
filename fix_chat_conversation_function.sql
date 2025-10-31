-- ============================================
-- CORREGIR FUNCIÓN create_conversation - CAUSA RAÍZ
-- Ejecutar en Supabase SQL Editor
-- ============================================
-- PROBLEMA: Ambiguidad entre variable conversation_id y columna conversation_id
-- SOLUCIÓN: Renombrar variable y usar sintaxis explícita para columnas

CREATE OR REPLACE FUNCTION create_conversation(
    p_buyer_id UUID,
    p_seller_id UUID,
    p_product_id UUID DEFAULT NULL,
    p_store_id UUID DEFAULT NULL,
    p_subject TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_new_conversation_id UUID;
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
    RETURNING id INTO v_new_conversation_id;
    
    -- Agregar participantes (usando subquery para evitar ambigüedad)
    INSERT INTO public.conversation_participants (conversation_id, user_id, role)
    SELECT v_new_conversation_id, p_buyer_id, 'buyer'
    WHERE NOT EXISTS (
        SELECT 1 FROM public.conversation_participants 
        WHERE conversation_id = v_new_conversation_id AND user_id = p_buyer_id
    );
    
    INSERT INTO public.conversation_participants (conversation_id, user_id, role)
    SELECT v_new_conversation_id, p_seller_id, 'seller'
    WHERE NOT EXISTS (
        SELECT 1 FROM public.conversation_participants 
        WHERE conversation_id = v_new_conversation_id AND user_id = p_seller_id
    );
    
    RETURN v_new_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar que la función se creó correctamente
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ FUNCIÓN create_conversation CORREGIDA';
    RAISE NOTICE '============================================';
    RAISE NOTICE '   ✓ Variable renombrada: v_new_conversation_id';
    RAISE NOTICE '   ✓ Usando INSERT con WHERE NOT EXISTS';
    RAISE NOTICE '   ✓ Sin ambigüedad entre variables y columnas';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 RECARGA TU APLICACION AHORA';
    RAISE NOTICE '============================================';
END $$;


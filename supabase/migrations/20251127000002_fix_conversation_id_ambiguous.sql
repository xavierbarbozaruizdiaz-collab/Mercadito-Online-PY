-- ============================================
-- MERCADITO ONLINE PY - FIX AMBIGUOUS conversation_id
-- Corregir políticas RLS que causan error de columna ambigua
-- ============================================

-- Corregir política de SELECT en messages
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants cp
            WHERE cp.conversation_id = public.messages.conversation_id
            AND cp.user_id = auth.uid()
        )
    );

-- Corregir política de INSERT en messages
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
CREATE POLICY "Users can send messages in their conversations" ON public.messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.conversation_participants cp
            WHERE cp.conversation_id = public.messages.conversation_id
            AND cp.user_id = auth.uid()
        )
    );























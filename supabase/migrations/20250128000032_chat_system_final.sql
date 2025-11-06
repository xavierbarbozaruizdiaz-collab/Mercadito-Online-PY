-- ============================================
-- MERCADITO ONLINE PY - CHAT SYSTEM MIGRATION (FINAL)
-- Sistema de chat en tiempo real - Versión final
-- ============================================

-- Verificar estructura de tabla messages existente
DO $$
BEGIN
    -- Si la tabla messages existe pero no tiene conversation_id, la eliminamos y recreamos
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages' AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'conversation_id' AND table_schema = 'public') THEN
            DROP TABLE IF EXISTS public.messages CASCADE;
        END IF;
    END IF;
END $$;

-- Crear tabla de conversaciones
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    subject TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Evitar conversaciones duplicadas
    UNIQUE(buyer_id, seller_id, product_id)
);

-- Crear tabla de mensajes
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de participantes
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'participant' CHECK (role IN ('buyer', 'seller', 'admin')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    UNIQUE(conversation_id, user_id)
);

-- Crear tabla de notificaciones
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('message', 'order', 'review', 'system')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de user_status
CREATE TABLE IF NOT EXISTS public.user_status (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline')),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_typing BOOLEAN DEFAULT FALSE,
    typing_in_conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_conversations_buyer_id ON public.conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_seller_id ON public.conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_conversations_product_id ON public.conversations(product_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON public.messages(is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Crear funciones
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations 
    SET last_message_at = NEW.created_at 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION create_conversation(
    p_buyer_id UUID,
    p_seller_id UUID,
    p_product_id UUID DEFAULT NULL,
    p_store_id UUID DEFAULT NULL,
    p_subject TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    conversation_id UUID;
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
    RETURNING id INTO conversation_id;
    
    -- Agregar participantes
    INSERT INTO public.conversation_participants (conversation_id, user_id, role)
    VALUES 
        (conversation_id, p_buyer_id, 'buyer'),
        (conversation_id, p_seller_id, 'seller')
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
    
    RETURN conversation_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION send_message(
    p_conversation_id UUID,
    p_sender_id UUID,
    p_content TEXT,
    p_message_type TEXT DEFAULT 'text',
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    message_id UUID;
    recipient_id UUID;
BEGIN
    -- Verificar que el sender sea participante de la conversación
    IF NOT EXISTS (
        SELECT 1 FROM public.conversation_participants 
        WHERE conversation_id = p_conversation_id AND user_id = p_sender_id
    ) THEN
        RAISE EXCEPTION 'User is not a participant in this conversation';
    END IF;
    
    -- Crear el mensaje
    INSERT INTO public.messages (conversation_id, sender_id, content, message_type, metadata)
    VALUES (p_conversation_id, p_sender_id, p_content, p_message_type, p_metadata)
    RETURNING id INTO message_id;
    
    -- Obtener el ID del destinatario para crear notificación
    SELECT user_id INTO recipient_id
    FROM public.conversation_participants 
    WHERE conversation_id = p_conversation_id AND user_id != p_sender_id
    LIMIT 1;
    
    -- Crear notificación para el destinatario
    INSERT INTO public.notifications (user_id, type, title, content, data)
    VALUES (
        recipient_id,
        'message',
        'Nuevo mensaje',
        LEFT(p_content, 100),
        jsonb_build_object('conversation_id', p_conversation_id, 'message_id', message_id)
    );
    
    RETURN message_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION mark_messages_as_read(
    p_conversation_id UUID,
    p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.messages 
    SET is_read = TRUE, read_at = NOW()
    WHERE conversation_id = p_conversation_id 
    AND sender_id != p_user_id 
    AND is_read = FALSE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Actualizar last_seen_at del participante
    UPDATE public.conversation_participants 
    SET last_seen_at = NOW()
    WHERE conversation_id = p_conversation_id AND user_id = p_user_id;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers
DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON public.conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at 
    BEFORE UPDATE ON public.messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_status_updated_at ON public.user_status;
CREATE TRIGGER update_user_status_updated_at 
    BEFORE UPDATE ON public.user_status 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversation_last_message_trigger ON public.messages;
CREATE TRIGGER update_conversation_last_message_trigger
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- Habilitar RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
CREATE POLICY "Users can view their own conversations" ON public.conversations
    FOR SELECT USING (
        buyer_id = auth.uid() OR seller_id = auth.uid()
    );

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations" ON public.conversations
    FOR INSERT WITH CHECK (
        buyer_id = auth.uid() OR seller_id = auth.uid()
    );

DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;
CREATE POLICY "Users can update their own conversations" ON public.conversations
    FOR UPDATE USING (
        buyer_id = auth.uid() OR seller_id = auth.uid()
    );

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants cp
            WHERE cp.conversation_id = messages.conversation_id
            AND cp.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
CREATE POLICY "Users can send messages in their conversations" ON public.messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.conversation_participants cp
            WHERE cp.conversation_id = messages.conversation_id
            AND cp.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
CREATE POLICY "Users can update their own messages" ON public.messages
    FOR UPDATE USING (sender_id = auth.uid());

DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
CREATE POLICY "Users can view participants in their conversations" ON public.conversation_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_participants.conversation_id
            AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can update their own participant status" ON public.conversation_participants;
CREATE POLICY "Users can update their own participant status" ON public.conversation_participants
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view all user status" ON public.user_status;
CREATE POLICY "Users can view all user status" ON public.user_status
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own status" ON public.user_status;
CREATE POLICY "Users can update their own status" ON public.user_status
    FOR ALL USING (user_id = auth.uid());

-- Insertar datos de ejemplo para usuarios existentes
INSERT INTO public.user_status (user_id, status, last_seen_at) 
SELECT id, 'offline', NOW() 
FROM auth.users 
ON CONFLICT (user_id) DO NOTHING;

// ============================================
// MERCADITO ONLINE PY - CHAT SERVICE
// Servicio para manejar la lógica de chat en tiempo real
// ============================================

import { supabase } from '@/lib/supabase/client';
import { Database } from '@/types/database';
import { 
  Conversation, 
  Message, 
  ConversationParticipant, 
  Notification, 
  UserStatus,
  ConversationSchema,
  MessageSchema 
} from '@/types';

// ============================================
// TIPOS DEL SERVICIO
// ============================================

export interface CreateConversationParams {
  buyer_id: string;
  seller_id: string;
  product_id?: string;
  store_id?: string;
  subject?: string;
}

export interface SendMessageParams {
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type?: 'text' | 'image' | 'file' | 'system';
  metadata?: Record<string, any>;
}

export interface ChatFilters {
  status?: 'active' | 'closed' | 'archived';
  product_id?: string;
  store_id?: string;
  user_id?: string;
}

// ============================================
// FUNCIONES DEL SERVICIO
// ============================================

/**
 * Crear una nueva conversación
 */
export async function createConversation(params: CreateConversationParams): Promise<Conversation | null> {
  try {
    const { data, error } = await supabase.rpc('create_conversation', {
      p_buyer_id: params.buyer_id,
      p_seller_id: params.seller_id,
      p_product_id: params.product_id || null,
      p_store_id: params.store_id || null,
      p_subject: params.subject || null,
    });

    if (error) {
      console.error('Error creating conversation:', error);
      throw new Error(error.message);
    }

    if (!data) return null;

    // Obtener la conversación completa con relaciones
    return await getConversationById(data);
  } catch (error) {
    console.error('Error in createConversation:', error);
    throw error;
  }
}

/**
 * Obtener una conversación por ID
 */
export async function getConversationById(conversationId: string): Promise<Conversation | null> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        buyer:profiles!conversations_buyer_id_fkey(*),
        seller:profiles!conversations_seller_id_fkey(*),
        product:products(*),
        store:stores(*),
        participants:conversation_participants(*),
        messages:messages(*)
      `)
      .eq('id', conversationId)
      .single();

    if (error) {
      console.error('Error fetching conversation:', error);
      return null;
    }

    return data as Conversation;
  } catch (error) {
    console.error('Error in getConversationById:', error);
    return null;
  }
}

/**
 * Obtener conversaciones del usuario
 */
export async function getUserConversations(
  userId: string, 
  filters: ChatFilters = {}
): Promise<Conversation[]> {
  try {
    let query = supabase
      .from('conversations')
      .select(`
        *,
        buyer:profiles!conversations_buyer_id_fkey(*),
        seller:profiles!conversations_seller_id_fkey(*),
        product:products(*),
        store:stores(*),
        participants:conversation_participants(*)
      `)
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    // Aplicar filtros
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.product_id) {
      query = query.eq('product_id', filters.product_id);
    }
    if (filters.store_id) {
      query = query.eq('store_id', filters.store_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }

    // Calcular conteo de mensajes no leídos para cada conversación
    const conversationsWithUnread = await Promise.all(
      (data || []).map(async (conversation) => {
        const unreadCount = await getUnreadMessageCount(conversation.id, userId);
        return { ...conversation, unread_count: unreadCount };
      })
    );

    return conversationsWithUnread as Conversation[];
  } catch (error) {
    console.error('Error in getUserConversations:', error);
    return [];
  }
}

/**
 * Enviar un mensaje
 */
export async function sendMessage(params: SendMessageParams): Promise<Message | null> {
  try {
    const { data, error } = await supabase.rpc('send_message', {
      p_conversation_id: params.conversation_id,
      p_sender_id: params.sender_id,
      p_content: params.content,
      p_message_type: params.message_type || 'text',
      p_metadata: params.metadata || {},
    });

    if (error) {
      console.error('Error sending message:', error);
      throw new Error(error.message);
    }

    if (!data) return null;

    // Obtener el mensaje completo con relaciones
    return await getMessageById(data);
  } catch (error) {
    console.error('Error in sendMessage:', error);
    throw error;
  }
}

/**
 * Obtener mensajes de una conversación
 */
export async function getConversationMessages(
  conversationId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Message[]> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(*)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    return (data || []).reverse() as Message[]; // Revertir para mostrar cronológicamente
  } catch (error) {
    console.error('Error in getConversationMessages:', error);
    return [];
  }
}

/**
 * Obtener un mensaje por ID
 */
export async function getMessageById(messageId: string): Promise<Message | null> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(*)
      `)
      .eq('id', messageId)
      .single();

    if (error) {
      console.error('Error fetching message:', error);
      return null;
    }

    return data as Message;
  } catch (error) {
    console.error('Error in getMessageById:', error);
    return null;
  }
}

/**
 * Marcar mensajes como leídos
 */
export async function markMessagesAsRead(
  conversationId: string,
  userId: string
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('mark_messages_as_read', {
      p_conversation_id: conversationId,
      p_user_id: userId,
    });

    if (error) {
      console.error('Error marking messages as read:', error);
      return 0;
    }

    return data || 0;
  } catch (error) {
    console.error('Error in markMessagesAsRead:', error);
    return 0;
  }
}

/**
 * Obtener conteo de mensajes no leídos
 */
export async function getUnreadMessageCount(
  conversationId: string,
  userId: string
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getUnreadMessageCount:', error);
    return 0;
  }
}

/**
 * Obtener notificaciones del usuario
 */
export async function getUserNotifications(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<Notification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserNotifications:', error);
    return [];
  }
}

/**
 * Marcar notificación como leída
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markNotificationAsRead:', error);
    return false;
  }
}

/**
 * Actualizar estado del usuario
 */
export async function updateUserStatus(
  userId: string,
  status: 'online' | 'away' | 'busy' | 'offline',
  isTyping?: boolean,
  typingInConversationId?: string
): Promise<boolean> {
  try {
    const updateData: any = {
      status,
      last_seen_at: new Date().toISOString(),
    };

    if (isTyping !== undefined) {
      updateData.is_typing = isTyping;
    }
    if (typingInConversationId !== undefined) {
      updateData.typing_in_conversation_id = typingInConversationId;
    }

    const { error } = await supabase
      .from('user_status')
      .upsert({
        user_id: userId,
        ...updateData,
      });

    if (error) {
      console.error('Error updating user status:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateUserStatus:', error);
    return false;
  }
}

/**
 * Obtener estado de usuarios
 */
export async function getUserStatuses(userIds: string[]): Promise<UserStatus[]> {
  try {
    const { data, error } = await supabase
      .from('user_status')
      .select('*')
      .in('user_id', userIds);

    if (error) {
      console.error('Error fetching user statuses:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserStatuses:', error);
    return [];
  }
}

/**
 * Suscribirse a cambios en tiempo real
 */
export function subscribeToConversation(
  conversationId: string,
  callback: (payload: any) => void
) {
  return supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      callback
    )
    .subscribe();
}

/**
 * Suscribirse a notificaciones del usuario
 */
export function subscribeToUserNotifications(
  userId: string,
  callback: (payload: any) => void
) {
  return supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();
}

/**
 * Suscribirse a cambios de estado de usuarios
 */
export function subscribeToUserStatuses(
  userIds: string[],
  callback: (payload: any) => void
) {
  return supabase
    .channel('user_statuses')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_status',
        filter: `user_id=in.(${userIds.join(',')})`,
      },
      callback
    )
    .subscribe();
}

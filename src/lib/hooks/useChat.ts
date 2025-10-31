// ============================================
// MERCADITO ONLINE PY - USE CHAT HOOK
// Hook personalizado para manejar la lógica de chat
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  createConversation,
  getUserConversations,
  sendMessage,
  getConversationMessages,
  markMessagesAsRead,
  getUnreadMessageCount,
  getUserNotifications,
  markNotificationAsRead,
  updateUserStatus,
  getUserStatuses,
  subscribeToConversation,
  subscribeToUserNotifications,
  subscribeToUserStatuses,
  CreateConversationParams,
  SendMessageParams,
  ChatFilters,
} from '@/lib/services/chatService';
import { Conversation, Message, Notification, UserStatus } from '@/types';

// ============================================
// TIPOS DEL HOOK
// ============================================

interface UseChatOptions {
  autoLoadConversations?: boolean;
  autoLoadNotifications?: boolean;
  enableRealtime?: boolean;
}

interface UseChatResult {
  // Estado
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  notifications: Notification[];
  userStatuses: UserStatus[];
  loading: boolean;
  error: string | null;
  
  // Acciones
  createNewConversation: (params: CreateConversationParams) => Promise<Conversation | null>;
  selectConversation: (conversationId: string) => Promise<void>;
  sendNewMessage: (content: string, messageType?: 'text' | 'image' | 'file' | 'system') => Promise<Message | null>;
  markAsRead: () => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  refreshConversations: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  
  // Notificaciones
  markNotificationAsRead: (notificationId: string) => Promise<boolean>;
  getUnreadNotificationCount: () => number;
  
  // Estado de usuario
  updateStatus: (status: 'online' | 'away' | 'busy' | 'offline') => Promise<void>;
  setTyping: (isTyping: boolean) => Promise<void>;
  
  // Utilidades
  getOtherParticipant: () => Conversation['buyer'] | Conversation['seller'] | null;
  isOnline: (userId: string) => boolean;
  isTyping: (userId: string) => boolean;
}

// ============================================
// HOOK
// ============================================

export function useChat(options: UseChatOptions = {}): UseChatResult {
  const { user } = useAuth();
  const {
    autoLoadConversations = true,
    autoLoadNotifications = true,
    enableRealtime = true,
  } = options;

  // Estado principal
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userStatuses, setUserStatuses] = useState<UserStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Referencias para suscripciones
  const conversationSubscription = useRef<any>(null);
  const notificationsSubscription = useRef<any>(null);
  const statusSubscription = useRef<any>(null);
  const messagesOffset = useRef(0);
  const hasMoreMessages = useRef(true);

  // ============================================
  // FUNCIONES PRINCIPALES
  // ============================================

  const createNewConversation = useCallback(async (params: CreateConversationParams): Promise<Conversation | null> => {
    if (!user) return null;

    setLoading(true);
    setError(null);

    try {
      const conversation = await createConversation(params);
      if (conversation) {
        setConversations(prev => [conversation, ...prev]);
        setCurrentConversation(conversation);
        await loadConversationMessages(conversation.id);
      }
      return conversation;
    } catch (err) {
      setError('Error al crear la conversación');
      console.error('Error creating conversation:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const selectConversation = useCallback(async (conversationId: string): Promise<void> => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Buscar la conversación en el estado actual
      let conversation = conversations.find(c => c.id === conversationId);
      
      if (!conversation) {
        // Si no está en el estado, cargarla desde la base de datos
        conversation = await getUserConversations(user.id).then(convs => 
          convs.find(c => c.id === conversationId)
        );
      }

      if (conversation) {
        setCurrentConversation(conversation);
        await loadConversationMessages(conversationId);
        await markAsRead();
      }
    } catch (err) {
      setError('Error al cargar la conversación');
      console.error('Error selecting conversation:', err);
    } finally {
      setLoading(false);
    }
  }, [user, conversations]);

  const sendNewMessage = useCallback(async (
    content: string, 
    messageType: 'text' | 'image' | 'file' | 'system' = 'text'
  ): Promise<Message | null> => {
    if (!user || !currentConversation) return null;

    setError(null);

    try {
      const message = await sendMessage({
        conversation_id: currentConversation.id,
        sender_id: user.id,
        content,
        message_type: messageType,
      });

      if (message) {
        setMessages(prev => [...prev, message]);
        
        // Actualizar la conversación en la lista
        setConversations(prev => 
          prev.map(conv => 
            conv.id === currentConversation.id 
              ? { ...conv, last_message_at: message.created_at }
              : conv
          )
        );
      }

      return message;
    } catch (err) {
      setError('Error al enviar el mensaje');
      console.error('Error sending message:', err);
      return null;
    }
  }, [user, currentConversation]);

  const markAsRead = useCallback(async (): Promise<void> => {
    if (!user || !currentConversation) return;

    try {
      await markMessagesAsRead(currentConversation.id, user.id);
      
      // Actualizar el estado local
      setMessages(prev => 
        prev.map(msg => 
          msg.sender_id !== user.id ? { ...msg, is_read: true } : msg
        )
      );

      setConversations(prev => 
        prev.map(conv => 
          conv.id === currentConversation.id 
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  }, [user, currentConversation]);

  const loadMoreMessages = useCallback(async (): Promise<void> => {
    if (!currentConversation || !hasMoreMessages.current) return;

    setLoading(true);

    try {
      const newMessages = await getConversationMessages(
        currentConversation.id,
        20,
        messagesOffset.current
      );

      if (newMessages.length < 20) {
        hasMoreMessages.current = false;
      }

      setMessages(prev => [...newMessages, ...prev]);
      messagesOffset.current += newMessages.length;
    } catch (err) {
      console.error('Error loading more messages:', err);
    } finally {
      setLoading(false);
    }
  }, [currentConversation]);

  const refreshConversations = useCallback(async (): Promise<void> => {
    if (!user) return;

    setLoading(true);

    try {
      const newConversations = await getUserConversations(user.id);
      setConversations(newConversations);
    } catch (err) {
      setError('Error al cargar las conversaciones');
      console.error('Error refreshing conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refreshNotifications = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      const newNotifications = await getUserNotifications(user.id);
      setNotifications(newNotifications);
    } catch (err) {
      console.error('Error refreshing notifications:', err);
    }
  }, [user]);

  // ============================================
  // FUNCIONES DE NOTIFICACIONES
  // ============================================

  const markNotificationAsReadHandler = useCallback(async (notificationId: string): Promise<boolean> => {
    try {
      const success = await markNotificationAsRead(notificationId);
      if (success) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, is_read: true, read_at: new Date().toISOString() }
              : notif
          )
        );
      }
      return success;
    } catch (err) {
      console.error('Error marking notification as read:', err);
      return false;
    }
  }, []);

  const getUnreadNotificationCount = useCallback((): number => {
    return notifications.filter(notif => !notif.is_read).length;
  }, [notifications]);

  // ============================================
  // FUNCIONES DE ESTADO DE USUARIO
  // ============================================

  const updateStatus = useCallback(async (status: 'online' | 'away' | 'busy' | 'offline'): Promise<void> => {
    if (!user) return;

    try {
      await updateUserStatus(user.id, status);
    } catch (err) {
      console.error('Error updating user status:', err);
    }
  }, [user]);

  const setTyping = useCallback(async (isTyping: boolean): Promise<void> => {
    if (!user || !currentConversation) return;

    try {
      await updateUserStatus(
        user.id,
        'online',
        isTyping,
        isTyping ? currentConversation.id : undefined
      );
    } catch (err) {
      console.error('Error setting typing status:', err);
    }
  }, [user, currentConversation]);

  // ============================================
  // FUNCIONES AUXILIARES
  // ============================================

  const loadConversationMessages = useCallback(async (conversationId: string): Promise<void> => {
    try {
      const conversationMessages = await getConversationMessages(conversationId, 50, 0);
      setMessages(conversationMessages);
      messagesOffset.current = conversationMessages.length;
      hasMoreMessages.current = conversationMessages.length === 50;
    } catch (err) {
      console.error('Error loading conversation messages:', err);
    }
  }, []);

  const getOtherParticipant = useCallback((): Conversation['buyer'] | Conversation['seller'] | null => {
    if (!user || !currentConversation) return null;
    
    return currentConversation.buyer_id === user.id 
      ? currentConversation.seller 
      : currentConversation.buyer;
  }, [user, currentConversation]);

  const isOnline = useCallback((userId: string): boolean => {
    const status = userStatuses.find(s => s.user_id === userId);
    return status?.status === 'online' || false;
  }, [userStatuses]);

  const isTyping = useCallback((userId: string): boolean => {
    const status = userStatuses.find(s => s.user_id === userId);
    return status?.is_typing && status.typing_in_conversation_id === currentConversation?.id || false;
  }, [userStatuses, currentConversation]);

  // ============================================
  // EFECTOS
  // ============================================

  // Cargar datos iniciales
  useEffect(() => {
    if (!user) return;

    const loadInitialData = async () => {
      if (autoLoadConversations) {
        await refreshConversations();
      }
      if (autoLoadNotifications) {
        await refreshNotifications();
      }
    };

    loadInitialData();
  }, [user, autoLoadConversations, autoLoadNotifications, refreshConversations, refreshNotifications]);

  // Configurar suscripciones en tiempo real
  useEffect(() => {
    if (!user || !enableRealtime) return;

    // Suscribirse a notificaciones del usuario
    notificationsSubscription.current = subscribeToUserNotifications(user.id, (payload) => {
      if (payload.eventType === 'INSERT') {
        setNotifications(prev => [payload.new, ...prev]);
      }
    });

    // Suscribirse a cambios de estado de usuarios
    const userIds = conversations.flatMap(conv => [conv.buyer_id, conv.seller_id]);
    if (userIds.length > 0) {
      statusSubscription.current = subscribeToUserStatuses(userIds, (payload) => {
        setUserStatuses(prev => {
          const filtered = prev.filter(s => s.user_id !== payload.new.user_id);
          return [...filtered, payload.new];
        });
      });
    }

    return () => {
      if (notificationsSubscription.current) {
        notificationsSubscription.current.unsubscribe();
      }
      if (statusSubscription.current) {
        statusSubscription.current.unsubscribe();
      }
    };
  }, [user, enableRealtime, conversations]);

  // Suscribirse a mensajes de la conversación actual
  useEffect(() => {
    if (!currentConversation || !enableRealtime) return;

    conversationSubscription.current = subscribeToConversation(currentConversation.id, (payload) => {
      if (payload.eventType === 'INSERT') {
        setMessages(prev => [...prev, payload.new]);
      }
    });

    return () => {
      if (conversationSubscription.current) {
        conversationSubscription.current.unsubscribe();
      }
    };
  }, [currentConversation, enableRealtime]);

  // Actualizar estado del usuario al montar/desmontar
  useEffect(() => {
    if (!user) return;

    // Marcar como en línea al montar
    updateUserStatus(user.id, 'online');

    // Marcar como fuera de línea al desmontar
    return () => {
      updateUserStatus(user.id, 'offline');
    };
  }, [user]);

  return {
    // Estado
    conversations,
    currentConversation,
    messages,
    notifications,
    userStatuses,
    loading,
    error,
    
    // Acciones
    createNewConversation,
    selectConversation,
    sendNewMessage,
    markAsRead,
    loadMoreMessages,
    refreshConversations,
    refreshNotifications,
    
    // Notificaciones
    markNotificationAsRead: markNotificationAsReadHandler,
    getUnreadNotificationCount,
    
    // Estado de usuario
    updateStatus,
    setTyping,
    
    // Utilidades
    getOtherParticipant,
    isOnline,
    isTyping,
  };
}

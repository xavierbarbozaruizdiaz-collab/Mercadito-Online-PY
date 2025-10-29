// ============================================
// MERCADITO ONLINE PY - CHAT COMPONENT
// Componente principal de chat
// ============================================

'use client';

import { useState, useEffect, useRef } from 'react';
import { useChat } from '@/lib/hooks/useChat';
import { useAuth } from '@/lib/hooks/useAuth';
import { Conversation, Message } from '@/types';
import { 
  MessageCircle, 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical,
  Phone,
  Video,
  Info,
  Search,
  Archive,
  Trash2,
  X
} from 'lucide-react';
import { Button, Input, Avatar, Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { cn } from '@/lib/utils';

// ============================================
// TIPOS
// ============================================

interface ChatProps {
  conversationId?: string;
  onClose?: () => void;
  className?: string;
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  showTime?: boolean;
}

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

// ============================================
// COMPONENTES AUXILIARES
// ============================================

function MessageBubble({ message, isOwn, showAvatar = false, showTime = true }: MessageBubbleProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-PY', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={cn(
      'flex items-end space-x-2 mb-4',
      isOwn ? 'flex-row-reverse space-x-reverse' : ''
    )}>
      {showAvatar && !isOwn && (
        <Avatar
          src={message.sender?.avatar_url}
          fallback={message.sender?.full_name?.charAt(0) || 'U'}
          size="sm"
          className="flex-shrink-0"
        />
      )}
      
      <div className={cn(
        'max-w-xs lg:max-w-md px-4 py-2 rounded-lg',
        isOwn 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-100 text-gray-900'
      )}>
        <p className="text-sm">{message.content}</p>
        {showTime && (
          <p className={cn(
            'text-xs mt-1',
            isOwn ? 'text-blue-100' : 'text-gray-500'
          )}>
            {formatTime(message.created_at)}
          </p>
        )}
      </div>
      
      {showAvatar && isOwn && (
        <Avatar
          src={message.sender?.avatar_url}
          fallback={message.sender?.full_name?.charAt(0) || 'U'}
          size="sm"
          className="flex-shrink-0"
        />
      )}
    </div>
  );
}

function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  const otherParticipant = conversation.buyer_id === conversation.buyer_id 
    ? conversation.seller 
    : conversation.buyer;

  const formatLastMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('es-PY', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString('es-PY', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors',
        isActive 
          ? 'bg-blue-50 border border-blue-200' 
          : 'hover:bg-gray-50'
      )}
    >
      <div className="relative">
        <Avatar
          src={otherParticipant?.avatar_url}
          fallback={otherParticipant?.full_name?.charAt(0) || 'U'}
          size="md"
        />
        {conversation.unread_count && conversation.unread_count > 0 && (
          <Badge 
            variant="error" 
            size="sm" 
            className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center"
          >
            {conversation.unread_count}
          </Badge>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900 truncate">
            {otherParticipant?.full_name || 'Usuario'}
          </h4>
          <span className="text-xs text-gray-500">
            {formatLastMessageTime(conversation.last_message_at)}
          </span>
        </div>
        
        {conversation.subject && (
          <p className="text-sm text-gray-600 truncate">
            {conversation.subject}
          </p>
        )}
        
        {conversation.product && (
          <p className="text-xs text-blue-600 truncate">
            {conversation.product.title}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function Chat({ conversationId, onClose, className }: ChatProps) {
  const { user } = useAuth();
  const {
    conversations,
    currentConversation,
    messages,
    loading,
    error,
    selectConversation,
    sendNewMessage,
    markAsRead,
    getOtherParticipant,
    isOnline,
    isTyping,
    setTyping,
  } = useChat();

  const [messageInput, setMessageInput] = useState('');
  const [showConversations, setShowConversations] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Seleccionar conversación inicial
  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        selectConversation(conversationId);
      }
    }
  }, [conversationId, conversations, selectConversation]);

  // Scroll automático a nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Marcar mensajes como leídos cuando se abre la conversación
  useEffect(() => {
    if (currentConversation) {
      markAsRead();
    }
  }, [currentConversation, markAsRead]);

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;

    const message = await sendNewMessage(messageInput.trim());
    if (message) {
      setMessageInput('');
      setTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);

    // Indicar que está escribiendo
    if (!isTyping(user?.id || '')) {
      setTyping(true);
    }

    // Limpiar timeout anterior
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Dejar de indicar que está escribiendo después de 2 segundos
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 2000);
  };

  const otherParticipant = getOtherParticipant();

  return (
    <div className={cn('flex h-full bg-white rounded-lg shadow-lg', className)}>
      {/* Lista de conversaciones */}
      {showConversations && (
        <div className="w-80 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Mensajes</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConversations(false)}
                className="lg:hidden"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar conversaciones..."
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                Cargando conversaciones...
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No tienes conversaciones aún
              </div>
            ) : (
              <div className="p-2">
                {conversations.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isActive={currentConversation?.id === conversation.id}
                    onClick={() => {
                      selectConversation(conversation.id);
                      setShowConversations(false);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Área de chat */}
      <div className="flex-1 flex flex-col">
        {currentConversation ? (
          <>
            {/* Header de la conversación */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConversations(true)}
                  className="lg:hidden"
                >
                  <MessageCircle className="w-4 h-4" />
                </Button>
                
                <div className="relative">
                  <Avatar
                    src={otherParticipant?.avatar_url}
                    fallback={otherParticipant?.full_name?.charAt(0) || 'U'}
                    size="md"
                  />
                  {isOnline(otherParticipant?.id || '') && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                  )}
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {otherParticipant?.full_name || 'Usuario'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {isOnline(otherParticipant?.id || '') ? 'En línea' : 'Desconectado'}
                    {isTyping(otherParticipant?.id || '') && ' • Escribiendo...'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Video className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Info className="w-4 h-4" />
                </Button>
                {onClose && (
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No hay mensajes aún. ¡Envía el primero!
                </div>
              ) : (
                messages.map((message, index) => {
                  const isOwn = message.sender_id === user?.id;
                  const prevMessage = messages[index - 1];
                  const showAvatar = !prevMessage || prevMessage.sender_id !== message.sender_id;
                  
                  return (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isOwn={isOwn}
                      showAvatar={showAvatar}
                    />
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de mensaje */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm">
                  <Paperclip className="w-4 h-4" />
                </Button>
                
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    value={messageInput}
                    onChange={handleTyping}
                    onKeyPress={handleKeyPress}
                    placeholder="Escribe un mensaje..."
                    className="pr-10"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2"
                  >
                    <Smile className="w-4 h-4" />
                  </Button>
                </div>
                
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  size="sm"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Selecciona una conversación</h3>
              <p>Elige una conversación para comenzar a chatear</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

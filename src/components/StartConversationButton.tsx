// ============================================
// MERCADITO ONLINE PY - START CONVERSATION BUTTON
// Botón para iniciar conversación desde un producto
// ============================================

'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useChat } from '@/lib/hooks/useChat';
import { Product } from '@/types';
import { MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';

// ============================================
// TIPOS
// ============================================

interface StartConversationButtonProps {
  product: Product;
  sellerId: string;
  sellerName?: string;
  onConversationStarted?: (conversationId: string) => void;
  className?: string;
}

// ============================================
// COMPONENTE
// ============================================

export default function StartConversationButton({
  product,
  sellerId,
  sellerName,
  onConversationStarted,
  className = '',
}: StartConversationButtonProps) {
  const { user } = useAuth();
  const { createNewConversation } = useChat();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartConversation = async () => {
    if (!user) {
      setError('Debes iniciar sesión para chatear');
      return;
    }

    if (user.id === sellerId) {
      setError('No puedes chatear contigo mismo');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const conversation = await createNewConversation({
        buyer_id: user.id,
        seller_id: sellerId,
        product_id: product.id,
        store_id: product.store_id,
        subject: `Consulta sobre: ${product.title}`,
      });

      if (conversation) {
        onConversationStarted?.(conversation.id);
      } else {
        setError('No se pudo crear la conversación');
      }
    } catch (err) {
      setError('Error al iniciar la conversación');
      console.error('Error starting conversation:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Button
        variant="outline"
        className={`w-full ${className}`}
        disabled
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        Inicia sesión para chatear
      </Button>
    );
  }

  if (user.id === sellerId) {
    return null; // No mostrar el botón si es el propio vendedor
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleStartConversation}
        disabled={loading}
        className={`w-full ${className}`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <MessageCircle className="w-4 h-4 mr-2" />
        )}
        {loading ? 'Iniciando chat...' : 'Chatear con el vendedor'}
      </Button>
      
      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}

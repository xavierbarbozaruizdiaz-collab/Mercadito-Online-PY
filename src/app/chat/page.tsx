// ============================================
// MERCADITO ONLINE PY - CHAT PAGE
// Página principal del chat
// ============================================

'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Chat from '@/components/Chat';
import NotificationsPanel from '@/components/NotificationsPanel';
import { Bell, MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui';

function ChatContent() {
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('conversation');
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                Mensajes
              </h1>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(true)}
              >
                <Bell className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="h-[calc(100vh-8rem)]">
          <Chat conversationId={conversationId || undefined} />
        </div>
      </div>

      {/* Notifications Panel */}
      {/* <NotificationsPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      /> */}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando chat...</p>
        </div>
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}

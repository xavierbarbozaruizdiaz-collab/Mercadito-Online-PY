// ============================================
// MERCADITO ONLINE PY - NOTIFICATIONS PANEL
// Panel para mostrar notificaciones del usuario
// ============================================

'use client';

import React, { useState, useEffect } from 'react';
import { Bell, X, MessageSquare, ShoppingBag, Star, Info } from 'lucide-react';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  EmptyState,
  LoadingSpinner
} from '@/components/ui';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { formatDistanceToNowStrict } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Notification } from '@/lib/services/notificationService';

// ============================================
// TIPOS
// ============================================

// Usar el tipo exportado del servicio

// ============================================
// COMPONENTE
// ============================================

export default function NotificationsPanel() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Iconos para tipos de notificación
  const notificationIcons = {
    message: <MessageSquare className="w-5 h-5 text-blue-600" />,
    order: <ShoppingBag className="w-5 h-5 text-green-600" />,
    review: <Star className="w-5 h-5 text-yellow-600" />,
    system: <Info className="w-5 h-5 text-gray-600" />,
  };

  // Cargar notificaciones iniciales
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchNotifications = async () => {
      setLoading(true);
      setError(null);
      try {
        const { NotificationService } = await import('@/lib/services/notificationService');
        const result = await NotificationService.getUserNotifications(user.id, { limit: 20 });
        
        setNotifications(result.notifications);
        setUnreadCount(result.notifications.filter((n) => !n.is_read).length);
      } catch (err: any) {
        console.error('Error fetching notifications:', err.message);
        setError('No se pudieron cargar las notificaciones.');
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Suscribirse a notificaciones en tiempo real
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev].slice(0, 20)); // Mantener límite
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Marcar notificación como leída
  const markAsRead = async (notificationId: string) => {
    try {
      const { NotificationService } = await import('@/lib/services/notificationService');
      await NotificationService.markAsRead(notificationId);
      
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  // Marcar todas como leídas
  const markAllAsRead = async () => {
    if (!user) return;
    
    try {
      const { NotificationService } = await import('@/lib/services/notificationService');
      await NotificationService.markAllAsRead(user.id);
      
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const togglePanel = () => {
    setIsOpen(!isOpen);
  };

  if (!user) {
    return null; // No mostrar panel si no hay usuario
  }

  return (
    <div className="relative">
      <Button variant="ghost" size="sm" onClick={togglePanel} className="relative">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute right-0 mt-2 w-80 md:w-96 bg-white shadow-lg rounded-lg z-50">
          <CardHeader className="flex flex-row items-center justify-between border-b">
            <CardTitle className="text-lg font-semibold">Notificaciones</CardTitle>
            <Button variant="ghost" size="sm" onClick={togglePanel}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="py-8">
                <LoadingSpinner text="Cargando notificaciones..." />
              </div>
            ) : error ? (
              <div className="py-8">
                <EmptyState
                  title="Error"
                  description={error}
                  icon={<X className="w-12 h-12" />}
                />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8">
                <EmptyState
                  title="No hay notificaciones"
                  description="Estás al día con tus alertas."
                  icon={<Bell className="w-12 h-12" />}
                />
              </div>
            ) : (
              <div>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start p-4 border-b last:border-b-0 ${
                      !notification.is_read ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex-shrink-0 mr-3">
                      {notificationIcons[notification.type as keyof typeof notificationIcons] || notificationIcons.system}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{notification.title}</h4>
                      <p className="text-sm text-gray-600">{notification.content}</p>
                      <span className="text-xs text-gray-400 mt-1 block">
                        {formatDistanceToNowStrict(new Date(notification.created_at), { addSuffix: true, locale: es })}
                      </span>
                    </div>
                    {!notification.is_read && (
                      <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full ml-2" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          {notifications.length > 0 && (
            <CardContent className="p-4 border-t">
              <Button variant="ghost" className="w-full" onClick={markAllAsRead}>
                Marcar todas como leídas
              </Button>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
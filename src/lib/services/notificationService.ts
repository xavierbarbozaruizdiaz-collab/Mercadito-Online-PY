// src/lib/services/notificationService.ts
// Servicio completo para gestión de notificaciones

import { supabase } from '@/lib/supabaseClient';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message?: string;
  content?: string;
  data?: Record<string, any>;
  is_read: boolean;
  category?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  action_url?: string;
  expires_at?: string;
  created_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  sms_enabled: boolean;
  order_notifications: boolean;
  message_notifications: boolean;
  review_notifications: boolean;
  promotion_notifications: boolean;
  system_notifications: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

export interface NotificationStats {
  total_notifications: number;
  unread_notifications: number;
  read_notifications: number;
  notifications_by_type: Record<string, number>;
  notifications_by_category: Record<string, number>;
}

export interface CreateNotificationInput {
  user_id: string;
  type: string;
  title: string;
  message?: string;
  content?: string;
  data?: Record<string, any>;
  category?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  action_url?: string;
  expires_at?: string;
}

export class NotificationService {
  /**
   * Crea una nueva notificación
   */
  static async createNotification(
    input: CreateNotificationInput
  ): Promise<Notification | null> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: input.user_id,
          type: input.type,
          title: input.title,
          message: input.message || input.content,
          content: input.content || input.message,
          data: input.data || null,
          category: input.category || 'general',
          priority: input.priority || 'normal',
          action_url: input.action_url || null,
          expires_at: input.expires_at || null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data as Notification;
    } catch (error: any) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Obtiene las notificaciones de un usuario
   */
  static async getUserNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      type?: string;
      category?: string;
    } = {}
  ): Promise<{ notifications: Notification[]; total: number }> {
    try {
      let query = supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options.unreadOnly) {
        query = query.eq('is_read', false);
      }

      if (options.type) {
        query = query.eq('type', options.type);
      }

      if (options.category) {
        query = query.eq('category', options.category);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        notifications: (data || []) as Notification[],
        total: count || 0,
      };
    } catch (error) {
      console.error('Error getting notifications:', error);
      return { notifications: [], total: 0 };
    }
  }

  /**
   * Marca una notificación como leída
   */
  static async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true } as any)
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  static async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true } as any)
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking all as read:', error);
      return false;
    }
  }

  /**
   * Elimina una notificación
   */
  static async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }

  /**
   * Obtiene el conteo de notificaciones no leídas
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Obtiene o crea las preferencias de notificaciones
   */
  static async getNotificationPreferences(
    userId: string
  ): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await supabase.rpc('get_or_create_notification_preferences', {
        user_id_param: userId,
      } as any);

      if (error) throw error;
      return (data && data[0]) ? (data[0] as NotificationPreferences) : null;
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return null;
    }
  }

  /**
   * Actualiza las preferencias de notificaciones
   */
  static async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences | null> {
    try {
      // Asegurar que existan las preferencias
      await this.getNotificationPreferences(userId);

      const { data, error } = await supabase
        .from('notification_preferences')
        .update(preferences as any)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data as NotificationPreferences;
    } catch (error: any) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de notificaciones
   */
  static async getNotificationStats(
    userId: string
  ): Promise<NotificationStats | null> {
    try {
      const { data, error } = await supabase.rpc('get_notification_stats', {
        user_id_param: userId,
      } as any);

      if (error) throw error;
      return (data && data[0]) ? (data[0] as NotificationStats) : null;
    } catch (error) {
      console.error('Error getting notification stats:', error);
      return null;
    }
  }

  /**
   * Verifica si se debe enviar una notificación según preferencias
   */
  static async shouldSendNotification(
    userId: string,
    type: string,
    category: string = 'general'
  ): Promise<{
    send_email: boolean;
    send_push: boolean;
    send_sms: boolean;
    is_quiet_hour: boolean;
  } | null> {
    try {
      const { data, error } = await supabase.rpc('should_send_notification', {
        user_id_param: userId,
        notification_type_param: type,
        notification_category_param: category,
      } as any);

      if (error) throw error;
      return (data && data[0]) ? data[0] : null;
    } catch (error) {
      console.error('Error checking should send notification:', error);
      return null;
    }
  }

  /**
   * Suscribe a nuevas notificaciones en tiempo real
   */
  static subscribeToNotifications(
    userId: string,
    callback: (notification: Notification) => void
  ) {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          callback(payload.new as Notification);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}


// ============================================
// MERCADITO ONLINE PY - BULK NOTIFICATION SERVICE
// Servicio para notificaciones masivas desde admin
// ============================================

import { supabase } from '@/lib/supabase/client';
import { NotificationService, type CreateNotificationInput } from './notificationService';

export type NotificationRecipient = 
  | 'all'           // Todos los usuarios
  | 'buyers'        // Solo compradores
  | 'sellers'       // Solo vendedores
  | 'admins'        // Solo administradores
  | 'custom';       // Lista personalizada de IDs

export type NotificationChannel = 'in_app' | 'email' | 'push';

export interface BulkNotificationInput {
  title: string;
  message: string;
  type: 'promotion' | 'system' | 'announcement' | 'urgent';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  action_url?: string;
  expires_at?: string;
  recipient_type: NotificationRecipient;
  recipient_ids?: string[]; // Para tipo 'custom'
  channels: NotificationChannel[];
  scheduled_at?: string; // Si está programada
  send_immediately: boolean;
}

export interface BulkNotificationResult {
  success_count: number;
  failed_count: number;
  total_recipients: number;
  notification_ids: string[];
  errors?: string[];
}

/**
 * Crea notificaciones masivas
 */
export async function sendBulkNotification(
  input: BulkNotificationInput
): Promise<BulkNotificationResult> {
  try {
    // 1. Obtener lista de destinatarios según el tipo
    const recipients = await getRecipients(input.recipient_type, input.recipient_ids);

    if (recipients.length === 0) {
      throw new Error('No hay destinatarios para enviar la notificación');
    }

    // 2. Si está programada, guardar en tabla de notificaciones programadas
    if (input.scheduled_at && !input.send_immediately) {
      return await scheduleBulkNotification(input, recipients);
    }

    // 3. Crear notificaciones en la base de datos
    const notificationInputs: CreateNotificationInput[] = recipients.map((userId) => ({
      user_id: userId,
      type: input.type,
      title: input.title,
      content: input.message,
      category: input.type,
      priority: input.priority || 'normal',
      action_url: input.action_url,
      expires_at: input.expires_at,
    }));

    // 4. Insertar todas las notificaciones en batch
    const { data: notifications, error } = await supabase
      .from('notifications')
      .insert(notificationInputs as any[])
      .select('id, user_id');

    if (error) {
      throw error;
    }

    // 5. Si incluye email, procesar envío
    let emailResults = { sent: 0, failed: 0 };
    if (input.channels.includes('email')) {
      try {
        const { EmailService } = await import('./emailService');
        
        // Obtener emails de los destinatarios
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name')
          .in('id', recipients)
          .eq('is_active', true)
          .is('banned_at', null);

        const emailRecipients = (profiles || []).map((p: any) => ({
          email: p.email,
          name: p.first_name || p.last_name ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : undefined,
        }));

        emailResults = await EmailService.sendBulkNotificationEmail(emailRecipients, {
          title: input.title,
          message: input.message,
          type: input.type,
          action_url: input.action_url,
        });
      } catch (error: any) {
        console.error('Error sending emails:', error);
        emailResults.failed = recipients.length;
      }
    }

    // 6. Si incluye push, procesar notificaciones push
    if (input.channels.includes('push')) {
      // TODO: Implementar notificaciones push masivas cuando esté configurado
      console.log(`[Push] Preparado para enviar ${recipients.length} push notifications`);
    }

    // 7. Guardar log de notificación masiva
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('bulk_notifications').insert({
        title: input.title,
        message: input.message,
        notification_type: input.type,
        recipient_type: input.recipient_type,
        recipient_count: recipients.length,
        success_count: notifications?.length || 0,
        failed_count: recipients.length - (notifications?.length || 0),
        channels: input.channels,
        sent_by: user?.id,
        sent_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error saving bulk notification log:', error);
    }

    return {
      success_count: notifications?.length || 0,
      failed_count: recipients.length - (notifications?.length || 0),
      total_recipients: recipients.length,
      notification_ids: (notifications || []).map((n: any) => n.id),
    };
  } catch (error: any) {
    console.error('Error sending bulk notification:', error);
    throw new Error(error.message || 'Error al enviar notificaciones masivas');
  }
}

/**
 * Obtiene la lista de destinatarios según el tipo
 */
async function getRecipients(
  recipientType: NotificationRecipient,
  customIds?: string[]
): Promise<string[]> {
  let query = supabase.from('profiles').select('id');

  switch (recipientType) {
    case 'all':
      // Todos los usuarios activos y no baneados
      query = query.eq('is_active', true).is('banned_at', null);
      break;
    case 'buyers':
      query = query.eq('role', 'buyer').eq('is_active', true).is('banned_at', null);
      break;
    case 'sellers':
      query = query.eq('role', 'seller').eq('is_active', true).is('banned_at', null);
      break;
    case 'admins':
      query = query.eq('role', 'admin').eq('is_active', true);
      break;
    case 'custom':
      if (!customIds || customIds.length === 0) {
        return [];
      }
      query = query.in('id', customIds);
      break;
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching recipients:', error);
    return [];
  }

  return (data || []).map((profile: any) => profile.id);
}

/**
 * Programa una notificación masiva para el futuro
 */
async function scheduleBulkNotification(
  input: BulkNotificationInput,
  recipients: string[]
): Promise<BulkNotificationResult> {
  // Guardar en tabla de notificaciones programadas (si existe)
  // Por ahora, solo devolvemos info
  const scheduledCount = recipients.length;
  
  return {
    success_count: 0,
    failed_count: 0,
    total_recipients: scheduledCount,
    notification_ids: [],
  };
}

/**
 * Obtiene el historial de notificaciones masivas enviadas
 */
export async function getBulkNotificationHistory(): Promise<any[]> {
  const { data, error } = await supabase
    .from('bulk_notifications')
    .select('*, sent_by, sender:profiles!bulk_notifications_sent_by_fkey(email, first_name, last_name)')
    .order('sent_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching bulk notification history:', error);
    return [];
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    title: item.title,
    message: item.message,
    type: item.notification_type,
    recipient_type: item.recipient_type,
    recipient_count: item.recipient_count,
    success_count: item.success_count,
    failed_count: item.failed_count,
    channels: item.channels,
    sent_at: item.sent_at,
    sent_by: item.sender ? (item.sender.first_name || item.sender.last_name ? `${item.sender.first_name || ''} ${item.sender.last_name || ''}`.trim() : item.sender.email) : 'Sistema',
  }));
}

/**
 * Obtiene estadísticas de notificaciones masivas
 */
export async function getBulkNotificationStats(): Promise<{
  total_sent: number;
  total_recipients: number;
  by_type: Record<string, number>;
  recent_count: number;
}> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [allData, recentData] = await Promise.all([
    supabase.from('bulk_notifications').select('notification_type, recipient_count'),
    supabase
      .from('bulk_notifications')
      .select('id')
      .gte('sent_at', thirtyDaysAgo.toISOString())
      .select('id', { count: 'exact', head: true }),
  ]);

  const all = allData.data || [];
  const by_type: Record<string, number> = {};

  all.forEach((item: any) => {
    by_type[item.notification_type] = (by_type[item.notification_type] || 0) + 1;
  });

  return {
    total_sent: all.length,
    total_recipients: all.reduce((sum: number, item: any) => sum + (item.recipient_count || 0), 0),
    by_type,
    recent_count: recentData.count || 0,
  };
}

/**
 * Cancela una notificación programada
 */
export async function cancelScheduledNotification(notificationId: string): Promise<void> {
  // TODO: Implementar cuando tengamos tabla de notificaciones programadas
  console.log('Cancel scheduled notification:', notificationId);
}


// src/lib/services/pushNotificationService.ts
// Servicio para gestionar notificaciones push

import { supabase } from '@/lib/supabase/client';

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string;
}

export interface PushNotification {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
}

export class PushNotificationService {
  /**
   * Solicita permiso para notificaciones y registra la suscripción
   */
  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  /**
   * Registra una suscripción push
   */
  static async subscribe(
    userId: string,
    subscription: PushSubscription
  ): Promise<boolean> {
    try {
      const { error } = await (supabase as any)
        .from('push_subscriptions')
        .insert({
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.p256dh,
          auth: subscription.auth,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        } as any);

      if (error) {
        // Si ya existe, actualizar en lugar de insertar
        if (error.code === '23505') {
          const { error: updateError } = await (supabase as any)
            .from('push_subscriptions')
            .update({
              p256dh: subscription.p256dh,
              auth: subscription.auth,
              user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
              updated_at: new Date().toISOString(),
            } as any)
            .eq('user_id', userId)
            .eq('endpoint', subscription.endpoint);

          if (updateError) throw updateError;
          return true;
        }
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return false;
    }
  }

  /**
   * Desregistra una suscripción push
   */
  static async unsubscribe(userId: string, endpoint: string): Promise<boolean> {
    try {
      const { error } = await (supabase as any)
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', endpoint);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    }
  }

  /**
   * Obtiene todas las suscripciones de un usuario
   */
  static async getUserSubscriptions(
    userId: string
  ): Promise<PushSubscription[]> {
    try {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      return (data || []) as PushSubscription[];
    } catch (error) {
      console.error('Error getting user subscriptions:', error);
      return [];
    }
  }

  /**
   * Crea un service worker registration para push
   * NOTA: Service Worker deshabilitado temporalmente para evitar problemas de página en blanco
   * TODO: Reactivar cuando se implemente correctamente el SW con mejor manejo de errores
   */
  static async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    // Deshabilitado temporalmente - el SW está causando problemas de carga
    console.warn('[PushNotifications] Service Worker registration deshabilitado temporalmente');
    return null;
    
    /* Código original comentado:
    if (!('serviceWorker' in navigator)) {
      console.warn('Este navegador no soporta service workers');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      return registration;
    } catch (error) {
      console.error('Error registering service worker:', error);
      return null;
    }
    */
  }

  /**
   * Obtiene o crea una suscripción push usando la API del navegador
   */
  static async getBrowserSubscription(
    registration: ServiceWorkerRegistration,
    vapidPublicKey: string
  ): Promise<PushSubscription | null> {
    try {
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const key = this.urlBase64ToUint8Array(vapidPublicKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key.buffer as ArrayBuffer,
        });
      }

      const key = subscription.getKey('p256dh');
      const auth = subscription.getKey('auth');

      if (!key || !auth) {
        throw new Error('Could not get subscription keys');
      }

      const keyArray = new Uint8Array(key);
      const authArray = new Uint8Array(auth);

      return {
        id: '',
        user_id: '',
        endpoint: subscription.endpoint,
        p256dh: btoa(String.fromCharCode(...Array.from(keyArray))),
        auth: btoa(String.fromCharCode(...Array.from(authArray))),
      };
    } catch (error) {
      console.error('Error getting browser subscription:', error);
      return null;
    }
  }

  /**
   * Convierte una clave VAPID de base64 a Uint8Array
   */
  private static urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }
}


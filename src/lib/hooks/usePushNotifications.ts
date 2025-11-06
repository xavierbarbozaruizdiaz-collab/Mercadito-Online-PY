// src/lib/hooks/usePushNotifications.ts
// Hook para gestionar notificaciones push

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { PushNotificationService, PushSubscription } from '@/lib/services/pushNotificationService';

export interface UsePushNotificationsReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission;
  subscription: PushSubscription | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  loading: boolean;
}

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

export function usePushNotifications(): UsePushNotificationsReturn {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);

  // Verificar soporte y permisos
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkSupport = async () => {
      const supported =
        'Notification' in window &&
        'serviceWorker' in navigator &&
        'PushManager' in window;

      setIsSupported(supported);

      if (supported && 'Notification' in window) {
        setPermission(Notification.permission);

        // Registrar service worker
        try {
          const reg = await PushNotificationService.registerServiceWorker();
          setRegistration(reg);

          if (reg && user) {
            // Verificar si ya está suscrito
            const browserSubscription = await PushNotificationService.getBrowserSubscription(
              reg,
              VAPID_PUBLIC_KEY
            );

            if (browserSubscription) {
              const userSubscriptions = await PushNotificationService.getUserSubscriptions(
                user.id
              );

              const isUserSubscribed = userSubscriptions.some(
                (sub) => sub.endpoint === browserSubscription.endpoint
              );

              setIsSubscribed(isUserSubscribed);
              if (isUserSubscribed) {
                setSubscription(browserSubscription);
              }
            }
          }
        } catch (error) {
          console.error('Error checking push notification support:', error);
        }
      }
    };

    checkSupport();
  }, [user]);

  // Suscribirse a notificaciones push
  const subscribe = async (): Promise<boolean> => {
    if (!user || !registration) return false;

    setLoading(true);

    try {
      // Solicitar permiso
      const hasPermission = await PushNotificationService.requestPermission();
      if (!hasPermission) {
        setLoading(false);
        return false;
      }

      setPermission(Notification.permission);

      // Obtener suscripción del navegador
      const browserSubscription = await PushNotificationService.getBrowserSubscription(
        registration,
        VAPID_PUBLIC_KEY
      );

      if (!browserSubscription) {
        setLoading(false);
        return false;
      }

      // Registrar en la base de datos
      const success = await PushNotificationService.subscribe(user.id, {
        ...browserSubscription,
        user_id: user.id,
      });

      if (success) {
        setIsSubscribed(true);
        setSubscription(browserSubscription);
      }

      setLoading(false);
      return success;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      setLoading(false);
      return false;
    }
  };

  // Desuscribirse de notificaciones push
  const unsubscribe = async (): Promise<boolean> => {
    if (!user || !subscription) return false;

    setLoading(true);

    try {
      const success = await PushNotificationService.unsubscribe(
        user.id,
        subscription.endpoint
      );

      if (success) {
        // Desuscribirse también del navegador
        if (registration) {
          const browserSubscription = await registration.pushManager.getSubscription();
          if (browserSubscription) {
            await browserSubscription.unsubscribe();
          }
        }

        setIsSubscribed(false);
        setSubscription(null);
      }

      setLoading(false);
      return success;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      setLoading(false);
      return false;
    }
  };

  return {
    isSupported,
    isSubscribed,
    permission,
    subscription,
    subscribe,
    unsubscribe,
    loading,
  };
}


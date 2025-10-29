// ============================================
// MERCADITO ONLINE PY - AUTHENTICATION HOOKS
// Custom hooks para autenticación
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { supabase, getCurrentUser, AuthUser } from '@/lib/supabase/client';

// ============================================
// HOOK PRINCIPAL DE AUTENTICACIÓN
// ============================================

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Función para cargar el usuario actual
  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar usuario al montar el componente
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Escuchar cambios en la autenticación
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await loadUser();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadUser]);

  // Función para cerrar sesión
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cerrar sesión');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    loading,
    error,
    signOut,
    refetch: loadUser,
  };
}

// ============================================
// HOOK PARA VERIFICAR ROLES
// ============================================

export function useRole() {
  const { user, loading } = useAuth();

  const isAdmin = user?.role === 'admin';
  const isSeller = user?.role === 'seller' || user?.role === 'admin';
  const isBuyer = user?.role === 'buyer';

  return {
    isAdmin,
    isSeller,
    isBuyer,
    role: user?.role,
    loading,
  };
}

// ============================================
// HOOK PARA VERIFICAR MEMBRESÍA
// ============================================

export function useMembership() {
  const { user, loading } = useAuth();

  const membershipLevel = user?.membership_level || 'free';
  const hasActiveMembership = user ? 
    (user.membership_level === 'free' || 
     (user.membership_expires_at && new Date(user.membership_expires_at) > new Date())) : 
    false;

  const getBidLimit = useCallback((level: string) => {
    switch (level) {
      case 'free':
        return 500000;
      case 'bronze':
        return 2500000;
      case 'silver':
        return 10000000;
      case 'gold':
        return Infinity;
      default:
        return 500000;
    }
  }, []);

  const bidLimit = getBidLimit(membershipLevel);

  return {
    membershipLevel,
    hasActiveMembership,
    bidLimit,
    loading,
  };
}

// ============================================
// HOOK PARA GESTIÓN DE TIENDA
// ============================================

export function useStore() {
  const { user, loading } = useAuth();
  const [store, setStore] = useState<any>(null);
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);

  // Cargar tienda del usuario
  const loadStore = useCallback(async () => {
    if (!user || user.role !== 'seller') {
      setStore(null);
      return;
    }

    try {
      setStoreLoading(true);
      setStoreError(null);
      
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('seller_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No hay tienda creada
          setStore(null);
        } else {
          throw error;
        }
      } else {
        setStore(data);
      }
    } catch (err) {
      setStoreError(err instanceof Error ? err.message : 'Error al cargar tienda');
      setStore(null);
    } finally {
      setStoreLoading(false);
    }
  }, [user]);

  // Cargar tienda cuando el usuario cambie
  useEffect(() => {
    loadStore();
  }, [loadStore]);

  // Función para crear tienda
  const createStore = useCallback(async (storeData: {
    name: string;
    slug: string;
    description?: string;
    location?: string;
    contact_email?: string;
    contact_phone?: string;
  }) => {
    if (!user || user.role !== 'seller') {
      throw new Error('Solo los vendedores pueden crear tiendas');
    }

    try {
      setStoreLoading(true);
      setStoreError(null);

      const { data, error } = await supabase
        .from('stores')
        .insert({
          seller_id: user.id,
          ...storeData,
        })
        .select()
        .single();

      if (error) throw error;
      
      setStore(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear tienda';
      setStoreError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setStoreLoading(false);
    }
  }, [user]);

  // Función para actualizar tienda
  const updateStore = useCallback(async (updates: any) => {
    if (!store) {
      throw new Error('No hay tienda para actualizar');
    }

    try {
      setStoreLoading(true);
      setStoreError(null);

      const { data, error } = await supabase
        .from('stores')
        .update(updates)
        .eq('id', store.id)
        .select()
        .single();

      if (error) throw error;
      
      setStore(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar tienda';
      setStoreError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setStoreLoading(false);
    }
  }, [store]);

  return {
    store,
    loading: loading || storeLoading,
    error: storeError,
    createStore,
    updateStore,
    refetch: loadStore,
  };
}

// ============================================
// HOOK PARA NOTIFICACIONES
// ============================================

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar notificaciones
  const loadNotifications = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Cargar notificaciones cuando el usuario cambie
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Función para marcar notificación como leída
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      // Actualizar estado local
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  // Función para marcar todas como leídas
  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      // Actualizar estado local
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true }))
      );
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refetch: loadNotifications,
  };
}

// ============================================
// HOOK PARA ANALYTICS
// ============================================

export function useAnalytics() {
  const { user } = useAuth();

  // Función para registrar evento
  const trackEvent = useCallback(async (
    eventType: string,
    eventData?: Record<string, any>,
    pageUrl?: string
  ) => {
    try {
      await supabase
        .from('analytics_events')
        .insert({
          user_id: user?.id,
          event_type: eventType,
          event_data: eventData,
          page_url: pageUrl || (typeof window !== 'undefined' ? window.location.href : undefined),
          user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        });
    } catch (err) {
      console.error('Error tracking event:', err);
    }
  }, [user]);

  return {
    trackEvent,
  };
}

// ============================================
// HOOK PARA PROTECCIÓN DE RUTAS
// ============================================

export function useRequireAuth(requiredRole?: 'admin' | 'seller' | 'buyer') {
  const { user, loading } = useAuth();
  const { isAdmin, isSeller, isBuyer } = useRole();

  const hasAccess = useCallback(() => {
    if (loading) return false;
    if (!user) return false;
    if (!requiredRole) return true;

    switch (requiredRole) {
      case 'admin':
        return isAdmin;
      case 'seller':
        return isSeller;
      case 'buyer':
        return isBuyer;
      default:
        return true;
    }
  }, [user, loading, requiredRole, isAdmin, isSeller, isBuyer]);

  return {
    hasAccess: hasAccess(),
    loading,
    user,
  };
}

// ============================================
// MERCADITO ONLINE PY - USER SERVICE
// Servicio para gestión de usuarios desde admin
// ============================================

import { supabase } from '@/lib/supabase/client';

// ============================================
// TIPOS
// ============================================

export type UserProfile = {
  id: string;
  email: string;
  role: 'buyer' | 'seller' | 'admin';
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_active: boolean;
  last_seen: string | null;
  login_count: number | null;
  last_login_at: string | null;
  total_products: number | null;
  total_orders: number | null;
  banned_at: string | null;
  ban_reason: string | null;
  created_at: string;
};

export type UserStats = {
  total_users: number;
  active_users: number;
  total_sellers: number;
  online_users: number;
  online_sellers: number;
};

export type UserFilter = 'all' | 'buyers' | 'sellers' | 'admins' | 'active' | 'inactive' | 'online';

// ============================================
// FUNCIONES DEL SERVICIO
// ============================================

/**
 * Obtiene todos los usuarios con filtros
 */
export async function getAllUsers(options: {
  page?: number;
  limit?: number;
  filter?: UserFilter;
  search?: string;
}): Promise<{ users: UserProfile[]; total: number; total_pages: number }> {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('profiles')
    .select('id, email, role, first_name, last_name, phone, avatar_url, bio, is_active, last_seen, login_count, last_login_at, total_products, total_orders, banned_at, ban_reason, created_at', { count: 'exact' });

  // Aplicar filtros
  if (options.filter) {
    switch (options.filter) {
      case 'buyers':
        query = query.eq('role', 'buyer');
        break;
      case 'sellers':
        query = query.eq('role', 'seller');
        break;
      case 'admins':
        query = query.eq('role', 'admin');
        break;
      case 'active':
        query = query.eq('is_active', true);
        break;
      case 'inactive':
        query = query.eq('is_active', false);
        break;
      case 'online':
        // Usuarios activos en últimos 5 minutos
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        query = query.gte('last_seen', fiveMinutesAgo);
        break;
    }
  }

  // Búsqueda por nombre o email
  if (options.search) {
    query = query.or(
      `email.ilike.%${options.search}%,first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%`
    );
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching users:', error);
    return { users: [], total: 0, total_pages: 0 };
  }

  const total = count || 0;
  const total_pages = Math.ceil(total / limit);

  return {
    users: (data || []) as UserProfile[],
    total,
    total_pages,
  };
}

/**
 * Obtiene un usuario por ID
 */
export async function getUserById(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }

  return data as UserProfile;
}

/**
 * Actualiza un usuario (admin only)
 */
export async function updateUser(
  userId: string,
  updates: Partial<Pick<UserProfile, 'role' | 'is_active' | 'first_name' | 'last_name' | 'phone' | 'bio' | 'banned_at' | 'ban_reason'>>
): Promise<UserProfile | null> {
  // Using 'as any' to bypass Supabase strict type constraint for updates
  const { data, error } = await (supabase as any)
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user:', error);
    throw new Error(error.message);
  }

  return data as UserProfile;
}

/**
 * Banea un usuario
 */
export async function banUser(userId: string, reason: string, adminId: string): Promise<UserProfile | null> {
  // Using 'as any' to bypass Supabase strict type constraint for updates
  const { data, error } = await (supabase as any)
    .from('profiles')
    .update({
      banned_at: new Date().toISOString(),
      ban_reason: reason,
      is_active: false,
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error banning user:', error);
    throw new Error(error.message);
  }

  return data as UserProfile;
}

/**
 * Desbanea un usuario
 */
export async function unbanUser(userId: string): Promise<UserProfile | null> {
  // Using 'as any' to bypass Supabase strict type constraint for updates
  const { data, error } = await (supabase as any)
    .from('profiles')
    .update({
      banned_at: null,
      ban_reason: null,
      is_active: true,
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error unbanning user:', error);
    throw new Error(error.message);
  }

  return data as UserProfile;
}

/**
 * Obtiene estadísticas de usuarios
 */
export async function getUserStats(): Promise<UserStats | null> {
  try {
    const { data, error } = await supabase.rpc('get_user_stats');

    if (error) {
      console.error('Error fetching user stats:', error);
      // Fallback manual si la función RPC no existe
      return await getUserStatsFallback();
    }

    return data as UserStats;
  } catch (error) {
    console.error('Error in getUserStats:', error);
    return await getUserStatsFallback();
  }
}

/**
 * Fallback para obtener estadísticas manualmente
 */
async function getUserStatsFallback(): Promise<UserStats> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const [totalResult, activeResult, sellersResult, onlineResult, onlineSellersResult] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'seller').eq('is_active', true),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('last_seen', fiveMinutesAgo),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'seller')
      .eq('is_active', true)
      .gte('last_seen', fiveMinutesAgo),
  ]);

  return {
    total_users: totalResult.count || 0,
    active_users: activeResult.count || 0,
    total_sellers: sellersResult.count || 0,
    online_users: onlineResult.count || 0,
    online_sellers: onlineSellersResult.count || 0,
  };
}

/**
 * Obtiene usuarios en línea
 */
export async function getOnlineUsers(): Promise<UserProfile[]> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .gte('last_seen', fiveMinutesAgo)
    .order('last_seen', { ascending: false });

  if (error) {
    console.error('Error fetching online users:', error);
    return [];
  }

  return (data || []) as UserProfile[];
}

/**
 * Obtiene vendedores en línea
 */
export async function getOnlineSellers(): Promise<UserProfile[]> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'seller')
    .eq('is_active', true)
    .gte('last_seen', fiveMinutesAgo)
    .order('last_seen', { ascending: false });

  if (error) {
    console.error('Error fetching online sellers:', error);
    return [];
  }

  return (data || []) as UserProfile[];
}

/**
 * Actualiza last_seen del usuario actual
 */
export async function updateLastSeen(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Using 'as any' to bypass Supabase strict type constraint for updates
    await (supabase as any)
      .from('profiles')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', user.id);
  } catch (error) {
    // Silenciar errores de last_seen
    console.debug('Error updating last_seen:', error);
  }
}


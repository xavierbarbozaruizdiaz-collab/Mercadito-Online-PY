// ============================================
// MERCADITO ONLINE PY - RAFFLE SERVICE
// Servicio para gestionar sorteos
// ============================================

import { supabase } from '@/lib/supabaseClient';

// ============================================
// TIPOS
// ============================================

export interface Raffle {
  id: string;
  title: string;
  description?: string | null;
  product_id?: string | null;
  seller_id: string;
  raffle_type: 'purchase_based' | 'seller_raffle' | 'direct_purchase';
  min_purchase_amount: number;
  tickets_per_purchase: number;
  tickets_per_amount: number;
  max_tickets_per_user?: number | null;
  start_date: string;
  end_date: string;
  draw_date: string;
  status: 'draft' | 'active' | 'ended' | 'cancelled' | 'drawn';
  is_enabled: boolean;
  admin_approved: boolean;
  admin_approved_at?: string | null;
  admin_approved_by?: string | null;
  winner_id?: string | null;
  winner_ticket_id?: string | null;
  drawn_at?: string | null;
  total_tickets: number;
  total_participants: number;
  created_at: string;
  updated_at: string;
  cover_url?: string | null;
  allow_direct_purchase?: boolean;
  ticket_price?: number | null;
  // Relaciones
  product?: {
    id: string;
    title: string;
    price: number;
    cover_url?: string | null;
  } | null;
  seller?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  };
  winner?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  };
}

export interface RaffleTicket {
  id: string;
  raffle_id: string;
  user_id: string;
  order_id?: string | null;
  ticket_number: string;
  ticket_type: 'purchase' | 'seller_bonus' | 'admin_bonus' | 'manual';
  purchase_amount?: number | null;
  created_at: string;
}

export interface RaffleStats {
  total_tickets: number;
  active_raffles_count: number;
  participated_raffles_count: number;
  won_raffles_count: number;
}

export interface CreateRaffleData {
  title: string;
  description?: string;
  product_id?: string;
  raffle_type: 'purchase_based' | 'seller_raffle' | 'direct_purchase';
  min_purchase_amount?: number;
  tickets_per_amount?: number;
  max_tickets_per_user?: number;
  start_date: string;
  end_date: string;
  draw_date: string;
  cover_url?: string;
  allow_direct_purchase?: boolean;
  ticket_price?: number;
}

// ============================================
// FUNCIONES DEL SERVICIO
// ============================================

/**
 * Obtiene todos los sorteos activos
 */
export async function getActiveRaffles(options?: {
  include_ended?: boolean;
}): Promise<Raffle[]> {
  try {
    let query = supabase
      .from('raffles')
      .select(`
        *,
        product:products(id, title, price, cover_url),
        seller:profiles!raffles_seller_id_fkey(id, first_name, last_name, email)
      `)
      .eq('is_enabled', true);
    
    if (options?.include_ended) {
      query = query.in('status', ['active', 'ended']);
    } else {
      query = query.eq('status', 'active');
    }
    
    const { data, error } = await query
      .order('draw_date', { ascending: true });
    
    if (error) throw error;
    
    return (data || []) as Raffle[];
  } catch (error) {
    console.error('Error loading active raffles:', error);
    throw error;
  }
}

/**
 * Obtiene un sorteo por ID
 */
export async function getRaffleById(raffleId: string): Promise<Raffle | null> {
  try {
    const { data, error } = await supabase
      .from('raffles')
      .select(`
        *,
        product:products(id, title, price, cover_url, description),
        seller:profiles!raffles_seller_id_fkey(id, first_name, last_name, email),
        winner:profiles!raffles_winner_id_fkey(id, first_name, last_name, email)
      `)
      .eq('id', raffleId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // No encontrado
      throw error;
    }
    
    return data as Raffle;
  } catch (error) {
    console.error('Error loading raffle:', error);
    throw error;
  }
}

/**
 * Obtiene los tickets de un usuario en un sorteo
 */
export async function getUserTicketsInRaffle(
  raffleId: string,
  userId: string
): Promise<RaffleTicket[]> {
  try {
    const { data, error } = await supabase
      .from('raffle_tickets')
      .select('*')
      .eq('raffle_id', raffleId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []) as RaffleTicket[];
  } catch (error) {
    console.error('Error loading user tickets:', error);
    throw error;
  }
}

/**
 * Obtiene todos los tickets de un usuario
 */
export async function getUserTickets(userId: string): Promise<Array<RaffleTicket & { raffle: Raffle }>> {
  try {
    const { data, error } = await supabase
      .from('raffle_tickets')
      .select(`
        *,
        raffle:raffles(
          id,
          title,
          product_id,
          draw_date,
          status,
          product:products(id, title, cover_url)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []) as Array<RaffleTicket & { raffle: Raffle }>;
  } catch (error) {
    console.error('Error loading user tickets:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de sorteos del usuario
 */
export async function getUserRaffleStats(userId: string): Promise<RaffleStats> {
  try {
    const { data, error } = await supabase.rpc('get_user_raffle_stats', {
      p_user_id: userId
    });
    
    if (error) throw error;
    
    return data[0] as RaffleStats;
  } catch (error) {
    console.error('Error loading raffle stats:', error);
    // Retornar valores por defecto en caso de error
    return {
      total_tickets: 0,
      active_raffles_count: 0,
      participated_raffles_count: 0,
      won_raffles_count: 0
    };
  }
}

/**
 * Crea un sorteo (vendedor o admin)
 */
export async function createRaffle(data: CreateRaffleData, userId: string): Promise<Raffle> {
  try {
    // Verificar que el producto existe y pertenece al vendedor (si es seller_raffle)
    if (data.raffle_type === 'seller_raffle') {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, seller_id')
        .eq('id', data.product_id)
        .single();
      
      if (productError || !product) {
        throw new Error('Producto no encontrado');
      }
      
      // Verificar que el usuario es el vendedor del producto
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (profile?.role !== 'admin' && product.seller_id !== userId) {
        throw new Error('No puedes sortear productos que no te pertenecen');
      }
    }
    
    const { data: raffle, error } = await supabase
      .from('raffles')
      .insert({
        title: data.title,
        description: data.description,
        product_id: data.product_id,
        seller_id: userId,
        raffle_type: data.raffle_type,
        min_purchase_amount: data.min_purchase_amount || 0,
        tickets_per_amount: data.tickets_per_amount || 100000,
        max_tickets_per_user: data.max_tickets_per_user,
        start_date: data.start_date,
        end_date: data.end_date,
        draw_date: data.draw_date,
        status: 'draft',
        is_enabled: false,
        admin_approved: data.raffle_type === 'purchase_based' // Los sorteos automáticos se aprueban automáticamente
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return raffle as Raffle;
  } catch (error) {
    console.error('Error creating raffle:', error);
    throw error;
  }
}

/**
 * Aprobar y activar un sorteo (solo admin)
 */
export async function approveRaffle(raffleId: string, adminId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('raffles')
      .update({
        admin_approved: true,
        admin_approved_at: new Date().toISOString(),
        admin_approved_by: adminId,
        is_enabled: true,
        status: 'active'
      })
      .eq('id', raffleId);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error approving raffle:', error);
    throw error;
  }
}

/**
 * Rechazar un sorteo (solo admin)
 */
export async function rejectRaffle(raffleId: string, reason?: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('raffles')
      .update({
        status: 'cancelled',
        admin_approved: false,
        is_enabled: false
      })
      .eq('id', raffleId);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error rejecting raffle:', error);
    throw error;
  }
}

/**
 * Realizar sorteo (seleccionar ganador)
 */
export async function drawRaffleWinner(raffleId: string): Promise<{
  winner_id: string;
  winner_ticket_id: string;
  ticket_number: string;
  winner_email: string;
  winner_name: string;
}> {
  try {
    const { data, error } = await supabase.rpc('draw_raffle_winner', {
      p_raffle_id: raffleId
    });
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      throw new Error('No se pudo seleccionar ganador');
    }
    
    return data[0];
  } catch (error) {
    console.error('Error drawing raffle winner:', error);
    throw error;
  }
}

/**
 * Obtiene sorteos pendientes de aprobación (admin)
 */
export async function getPendingRaffles(): Promise<Raffle[]> {
  try {
    const { data, error } = await supabase
      .from('raffles')
      .select(`
        *,
        product:products(id, title, price, cover_url),
        seller:profiles!raffles_seller_id_fkey(id, first_name, last_name, email)
      `)
      .eq('status', 'draft')
      .eq('admin_approved', false)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []) as Raffle[];
  } catch (error) {
    console.error('Error loading pending raffles:', error);
    throw error;
  }
}

/**
 * Obtiene configuración global de sorteos
 */
export async function getRaffleSettings(): Promise<Record<string, any>> {
  try {
    const { data, error } = await supabase
      .from('raffle_settings')
      .select('key, value');
    
    if (error) throw error;
    
    const settings: Record<string, any> = {};
    (data || []).forEach((item: any) => {
      settings[item.key] = item.value;
    });
    
    return settings;
  } catch (error) {
    console.error('Error loading raffle settings:', error);
    return {};
  }
}

/**
 * Actualiza configuración global (solo admin)
 */
export async function updateRaffleSetting(
  key: string,
  value: any,
  adminId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('raffle_settings')
      .upsert({
        key,
        value,
        updated_by: adminId,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      });
    
    if (error) throw error;
  } catch (error) {
    console.error('Error updating raffle setting:', error);
    throw error;
  }
}


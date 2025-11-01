// ============================================
// MERCADITO ONLINE PY - BANNER SERVICE
// Servicio para gestión de banners y promociones
// ============================================

import { supabase } from '@/lib/supabase/client';

export type Banner = {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  link_url: string | null;
  position: 'hero' | 'sidebar' | 'footer' | 'top';
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

/**
 * Obtiene todos los banners
 */
export async function getAllBanners(position?: string): Promise<Banner[]> {
  let query = supabase
    .from('banners')
    .select('*')
    .order('sort_order', { ascending: true });

  if (position) {
    query = query.eq('position', position);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching banners:', error);
    return [];
  }

  return (data || []) as Banner[];
}

/**
 * Obtiene banners activos
 */
export async function getActiveBanners(position?: string): Promise<Banner[]> {
  const now = new Date().toISOString();
  let query = supabase
    .from('banners')
    .select('*')
    .eq('is_active', true)
    .or(`start_date.is.null,start_date.lte.${now}`)
    .or(`end_date.is.null,end_date.gte.${now}`)
    .order('sort_order', { ascending: true });

  if (position) {
    query = query.eq('position', position);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching active banners:', error);
    return [];
  }

  return (data || []) as Banner[];
}

/**
 * Crea un nuevo banner
 */
export async function createBanner(
  banner: Omit<Banner, 'id' | 'created_at' | 'updated_at'>
): Promise<Banner | null> {
  // Using 'as any' to bypass Supabase strict type constraint for inserts
  const { data, error } = await (supabase as any)
    .from('banners')
    .insert(banner)
    .select()
    .single();

  if (error) {
    console.error('Error creating banner:', error);
    throw new Error(error.message);
  }

  return data as Banner;
}

/**
 * Actualiza un banner
 */
export async function updateBanner(
  id: string,
  updates: Partial<Banner>
): Promise<Banner | null> {
  // Using 'as any' to bypass Supabase strict type constraint for updates
  const { data, error } = await (supabase as any)
    .from('banners')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating banner:', error);
    throw new Error(error.message);
  }

  return data as Banner;
}

/**
 * Elimina un banner
 */
export async function deleteBanner(id: string): Promise<void> {
  const { error } = await supabase.from('banners').delete().eq('id', id);

  if (error) {
    console.error('Error deleting banner:', error);
    throw new Error(error.message);
  }
}


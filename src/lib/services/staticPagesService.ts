// ============================================
// MERCADITO ONLINE PY - STATIC PAGES SERVICE
// Servicio para gestión de páginas estáticas
// ============================================

import { supabase } from '@/lib/supabase/client';

export type StaticPage = {
  id: string;
  slug: string;
  title: string;
  content: string;
  meta_description: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Obtiene todas las páginas
 */
export async function getAllPages(includeUnpublished = false): Promise<StaticPage[]> {
  let query = supabase
    .from('static_pages')
    .select('*')
    .order('created_at', { ascending: false });

  if (!includeUnpublished) {
    query = query.eq('is_published', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching pages:', error);
    return [];
  }

  return (data || []) as StaticPage[];
}

/**
 * Obtiene una página por slug
 */
export async function getPageBySlug(slug: string): Promise<StaticPage | null> {
  const { data, error } = await supabase
    .from('static_pages')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (error || !data) {
    return null;
  }

  return data as StaticPage;
}

/**
 * Crea una nueva página
 */
export async function createPage(
  slug: string,
  title: string,
  content: string,
  meta_description: string | null,
  is_published: boolean,
  adminId: string
): Promise<StaticPage | null> {
  const { data, error } = await supabase
    .from('static_pages')
    .insert({
      slug,
      title,
      content,
      meta_description,
      is_published,
      created_by: adminId,
      updated_by: adminId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating page:', error);
    throw new Error(error.message);
  }

  return data as StaticPage;
}

/**
 * Actualiza una página
 */
export async function updatePage(
  id: string,
  updates: {
    slug?: string;
    title?: string;
    content?: string;
    meta_description?: string | null;
    is_published?: boolean;
  },
  adminId: string
): Promise<StaticPage | null> {
  const { data, error } = await supabase
    .from('static_pages')
    .update({
      ...updates,
      updated_by: adminId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating page:', error);
    throw new Error(error.message);
  }

  return data as StaticPage;
}

/**
 * Elimina una página
 */
export async function deletePage(id: string): Promise<void> {
  const { error } = await supabase.from('static_pages').delete().eq('id', id);

  if (error) {
    console.error('Error deleting page:', error);
    throw new Error(error.message);
  }
}


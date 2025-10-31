import { supabase } from '@/lib/supabaseClient';

export function heroPublicUrlFromPath(path?: string | null) {
  if (!path) return null;
  const { data } = supabase.storage.from('hero-banners').getPublicUrl(path);
  return data.publicUrl ?? null;
}






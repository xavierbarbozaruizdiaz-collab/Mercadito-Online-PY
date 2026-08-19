// ============================================
// MERCADITO ONLINE PY - SUPABASE SERVER CLIENT
// Cliente de Supabase específico para uso en el servidor (API routes, Server Components)
// Usa fallback a NEXT_PUBLIC_* cuando las variables server no existan
// ============================================

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/config';

const url = getSupabaseUrl();
const anon = getSupabaseAnonKey();

export const supabase = createClient<Database>(url, anon, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});


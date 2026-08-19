// ============================================
// MERCADITO ONLINE PY - SUPABASE SERVER CLIENT
// Cliente de Supabase específico para uso en el servidor (API routes, Server Components)
// Usa fallback a NEXT_PUBLIC_* cuando las variables server no existan
// ============================================

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/config';

// Preferir env reales; dummy solo para CI/build si faltan (las rutas críticas ya lo manejan).
const url =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  (() => {
    try {
      return getSupabaseUrl();
    } catch {
      return 'http://localhost';
    }
  })();

const anon =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  (() => {
    try {
      return getSupabaseAnonKey();
    } catch {
      return 'public-anon-key';
    }
  })();

// Cliente de Supabase para uso en servidor
// No persiste sesiones (servidor no tiene localStorage/cookies de usuario)
export const supabase = createClient<Database>(url, anon, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});













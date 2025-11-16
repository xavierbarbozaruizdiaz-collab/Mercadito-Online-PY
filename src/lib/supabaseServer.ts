// ============================================
// MERCADITO ONLINE PY - SUPABASE SERVER CLIENT
// Cliente de Supabase específico para uso en el servidor (API routes, Server Components)
// Usa fallback a NEXT_PUBLIC_* cuando las variables server no existan
// ============================================

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const url =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  'http://localhost';

const anon =
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'public-anon-key';

export const supabase = createClient<Database>(url, anon, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});


// ============================================
// MERCADITO ONLINE PY - SUPABASE SERVER CLIENT
// Cliente de Supabase específico para uso en el servidor (API routes, Server Components)
// Usa fallback a NEXT_PUBLIC_* cuando las variables server no existan
// ============================================

import { createClient } from '@supabase/supabase-js';

// Usar variables de servidor si existen, sino fallback a NEXT_PUBLIC_*
const url = 
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;

const anon = 
  process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Validar que al menos tengamos las variables necesarias
if (!url) {
  throw new Error('Missing Supabase URL. Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
}

if (!anon) {
  throw new Error('Missing Supabase Anon Key. Set SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Cliente de Supabase para uso en servidor
// No persiste sesiones (servidor no tiene localStorage/cookies de usuario)
export const supabase = createClient(url, anon, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});


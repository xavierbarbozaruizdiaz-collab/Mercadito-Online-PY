// ============================================
// MERCADITO ONLINE PY - SUPABASE SERVER CLIENT
// Cliente de Supabase específico para uso en el servidor (API routes, Server Components)
// Usa fallback a NEXT_PUBLIC_* cuando las variables server no existan
// ============================================

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// Usar variables de servidor si existen, sino fallback a NEXT_PUBLIC_*.
// En entornos como CI, donde estas variables pueden no estar configuradas,
// usamos valores dummy para evitar que el build falle. Las rutas críticas
// (health, hero-slides, marketing, etc.) ya tienen manejo explícito cuando
// Supabase no está configurado.
const url =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  'http://localhost';

const anon =
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'public-anon-key';

// Cliente de Supabase para uso en servidor
// No persiste sesiones (servidor no tiene localStorage/cookies de usuario)
export const supabase = createClient<Database>(url, anon, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});













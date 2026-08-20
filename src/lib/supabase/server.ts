// ============================================
// MERCADITO ONLINE PY - SUPABASE SERVER CLIENT
// Cliente de Supabase para componentes del servidor (Next.js App Router)
// ============================================

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/config';

const supabaseUrl = getSupabaseUrl();
const supabaseKey = getSupabaseAnonKey();

/**
 * Crea un cliente de Supabase para el servidor
 * Este cliente usa cookies para mantener la sesión del usuario
 */
export async function createServerClient() {
  const cookieStore = await cookies();
  
  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
      storage: {
        getItem: (key: string) => {
          return cookieStore.get(key)?.value ?? null;
        },
        setItem: (key: string, value: string) => {
          cookieStore.set(key, value, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
          });
        },
        removeItem: (key: string) => {
          cookieStore.delete(key);
        },
      },
    },
    global: {
      headers: {
        'x-client-info': 'mercadito-online-py-server@1.0.0',
      },
    },
  });
}

// Nota: En Next.js 15+ App Router, cookies() es asíncrono
// Cada request debe crear su propio cliente usando createServerClient()


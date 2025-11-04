// ============================================
// MERCADITO ONLINE PY - SUPABASE SERVER CLIENT
// Cliente de Supabase para componentes del servidor (Next.js App Router)
// ============================================

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hqdatzhliaordlsqtjea.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZGF0emhsaWFvcmRsc3F0amVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MTk1NzQsImV4cCI6MjA3NzA5NTU3NH0.u1VFWCN4yHZ_v_bR4MNw5wt7jTPdfpIwjhDRYfQ5qRw';

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


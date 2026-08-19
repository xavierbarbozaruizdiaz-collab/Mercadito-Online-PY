'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { syncAccessTokenCookie } from '@/lib/auth/clientAuthHeaders';

/**
 * Mantiene la cookie de acceso alineada con la sesión de Supabase (localStorage),
 * para que middleware y APIs puedan validar /admin sin perder el login.
 */
export default function AuthCookieSync() {
  useEffect(() => {
    let mounted = true;

    const sync = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      syncAccessTokenCookie(
        data.session?.access_token ?? null,
        data.session?.expires_at ?? null
      );
    };

    void sync();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        syncAccessTokenCookie(
          session?.access_token ?? null,
          session?.expires_at ?? null
        );
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}

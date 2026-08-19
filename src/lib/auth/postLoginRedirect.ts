'use client';

import { supabase } from '@/lib/supabaseClient';
import { syncAccessTokenCookie } from '@/lib/auth/clientAuthHeaders';

function safeInternalPath(path: string | null | undefined): string | null {
  if (!path) return null;
  if (!path.startsWith('/')) return null;
  if (path.startsWith('//')) return null;
  return path;
}

/**
 * Tras login exitoso: sincroniza cookie y resuelve a dónde ir.
 * Admin → /admin (salvo redirect explícito seguro).
 */
export async function resolvePostLoginPath(
  preferredRedirect?: string | null
): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;

  syncAccessTokenCookie(
    session?.access_token ?? null,
    session?.expires_at ?? null
  );

  const explicit = safeInternalPath(preferredRedirect);
  if (explicit && explicit !== '/auth/sign-in') {
    return explicit;
  }

  const userId = session?.user?.id;
  if (!userId) return '/';

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  const role = (profile as { role?: string } | null)?.role;
  if (role === 'admin') return '/admin';
  if (role === 'seller') return '/dashboard';
  return '/';
}

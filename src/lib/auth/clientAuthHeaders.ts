'use client';

import { supabase } from '@/lib/supabaseClient';
import { ACCESS_COOKIE } from '@/lib/auth/constants';

/** Headers Authorization para fetch a APIs protegidas */
export async function getAuthHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/** Sincroniza access token a cookie legible por middleware */
export function syncAccessTokenCookie(accessToken: string | null, expiresAt?: number | null) {
  if (typeof document === 'undefined') return;

  if (!accessToken) {
    document.cookie = `${ACCESS_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }

  const maxAge =
    expiresAt && Number.isFinite(expiresAt)
      ? Math.max(60, expiresAt - Math.floor(Date.now() / 1000))
      : 60 * 60 * 8;

  // No usar encodeURIComponent: el JWT debe llegar intacto a middleware/getUser
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${ACCESS_COOKIE}=${accessToken}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

// Auth helpers for API routes (Bearer token or cookie session)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { ACCESS_COOKIE } from '@/lib/auth/constants';

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
}

function getAnonKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  );
}

function getServiceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

export function extractAccessToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (auth?.toLowerCase().startsWith('bearer ')) {
    const token = auth.slice(7).trim();
    if (token) return token;
  }

  const fromCookie = req.cookies.get(ACCESS_COOKIE)?.value;
  if (fromCookie) {
    try {
      return decodeURIComponent(fromCookie);
    } catch {
      return fromCookie;
    }
  }

  // Legacy / Supabase default cookie names
  for (const cookie of req.cookies.getAll()) {
    if (
      cookie.name.includes('access-token') ||
      cookie.name.endsWith('-auth-token')
    ) {
      try {
        const parsed = JSON.parse(cookie.value);
        if (parsed?.access_token) return parsed.access_token as string;
      } catch {
        if (cookie.value.split('.').length >= 3) return cookie.value;
      }
    }
  }

  return null;
}

export async function getRequestUser(
  req: NextRequest
): Promise<{ user: User | null; error: string | null }> {
  const url = getSupabaseUrl();
  const anon = getAnonKey();
  if (!url || !anon) {
    return { user: null, error: 'Supabase no configurado' };
  }

  const token = extractAccessToken(req);
  if (!token) {
    return { user: null, error: 'No autenticado' };
  }

  const supabase = createClient<Database>(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { user: null, error: error?.message || 'Sesión inválida' };
  }

  return { user: data.user, error: null };
}

export async function getUserRole(
  userId: string,
  accessToken?: string | null
): Promise<string | null> {
  const url = getSupabaseUrl();
  if (!url) return null;

  // Prefer service role; otherwise use anon + user JWT (RLS: own profile)
  const serviceKey = getServiceKey();
  const anon = getAnonKey();
  const key = serviceKey || anon;
  if (!key) return null;

  const supabase = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global:
      !serviceKey && accessToken
        ? { headers: { Authorization: `Bearer ${accessToken}` } }
        : undefined,
  });

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (error) return null;
  return (data as { role?: string } | null)?.role ?? null;
}

export async function requireUser(req: NextRequest): Promise<
  | { ok: true; user: User }
  | { ok: false; response: NextResponse }
> {
  const { user, error } = await getRequestUser(req);
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: error || 'Unauthorized' },
        { status: 401 }
      ),
    };
  }
  return { ok: true, user };
}

export async function requireAdmin(req: NextRequest): Promise<
  | { ok: true; user: User; role: string }
  | { ok: false; response: NextResponse }
> {
  const auth = await requireUser(req);
  if (!auth.ok) return auth;

  const token = extractAccessToken(req);
  const role = await getUserRole(auth.user.id, token);
  if (role !== 'admin') {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: 'Forbidden — se requiere rol admin' },
        { status: 403 }
      ),
    };
  }

  return { ok: true, user: auth.user, role };
}

export async function requireSellerOrAdmin(
  req: NextRequest
): Promise<
  | { ok: true; user: User; role: string }
  | { ok: false; response: NextResponse }
> {
  const auth = await requireUser(req);
  if (!auth.ok) return auth;

  const token = extractAccessToken(req);
  const role = await getUserRole(auth.user.id, token);
  if (role !== 'admin' && role !== 'seller') {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: 'Forbidden — se requiere rol seller o admin' },
        { status: 403 }
      ),
    };
  }

  return { ok: true, user: auth.user, role: role || 'buyer' };
}

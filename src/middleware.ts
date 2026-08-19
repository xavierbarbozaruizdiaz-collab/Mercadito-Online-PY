// ============================================
// Middleware: rate limit APIs + gate /admin pages
// ============================================

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ACCESS_COOKIE } from '@/lib/auth/constants';

type Bucket = { count: number; resetTime: number };

const rateLimitMap: Map<string, Bucket> =
  (globalThis as any).__rateLimitMap ?? new Map<string, Bucket>();
(globalThis as any).__rateLimitMap = rateLimitMap;

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  message?: string;
}

const rateLimitConfigs: Record<string, RateLimitConfig> = {
  '/api/auth': { maxRequests: 5, windowMs: 15 * 60 * 1000, message: 'Demasiados intentos de login' },
  '/api/checkout': { maxRequests: 10, windowMs: 60 * 1000, message: 'Demasiadas solicitudes de checkout' },
  '/api/search': { maxRequests: 30, windowMs: 60 * 1000, message: 'Demasiadas búsquedas' },
  '/api/chat': { maxRequests: 50, windowMs: 60 * 1000, message: 'Demasiados mensajes' },
  default: { maxRequests: 100, windowMs: 60 * 1000, message: 'Demasiadas solicitudes' },
};

function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
  const ua = (request.headers.get('user-agent') || '').slice(0, 60);
  return `${ip}|${ua}`;
}

function getRateLimitConfig(pathname: string): RateLimitConfig {
  for (const [prefix, cfg] of Object.entries(rateLimitConfigs)) {
    if (prefix !== 'default' && pathname.startsWith(prefix)) return cfg;
  }
  return rateLimitConfigs.default;
}

function checkAndUpdateBucket(key: string, cfg: RateLimitConfig) {
  const now = Date.now();
  const existing = rateLimitMap.get(key);

  if (!existing || now > existing.resetTime) {
    const resetTime = now + cfg.windowMs;
    rateLimitMap.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: cfg.maxRequests - 1, resetTime };
  }

  if (existing.count < cfg.maxRequests) {
    existing.count += 1;
    return {
      allowed: true,
      remaining: cfg.maxRequests - existing.count,
      resetTime: existing.resetTime,
    };
  }

  return { allowed: false, remaining: 0, resetTime: existing.resetTime };
}

async function requireAdminSession(request: NextRequest): Promise<NextResponse | null> {
  let token =
    request.cookies.get(ACCESS_COOKIE)?.value ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    null;

  if (token) {
    try {
      token = decodeURIComponent(token);
    } catch {
      // keep raw
    }
  }

  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/sign-in';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anon) {
    return null; // no bloquear si env incompleto en build
  }

  const supabase = createClient(supabaseUrl, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error } = await supabase.auth.getUser(token);
  if (error || !userData.user) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/sign-in';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle();

  // Si no podemos leer perfil (RLS), dejamos pasar al layout client como fallback
  if (profile && (profile as { role?: string }).role !== 'admin') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.searchParams.set('error', 'admin_required');
    return NextResponse.redirect(url);
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (request.method === 'OPTIONS') {
    return NextResponse.next();
  }

  // Gate páginas admin (y editor hero del dashboard)
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/dashboard/admin')
  ) {
    const denied = await requireAdminSession(request);
    if (denied) return denied;
    return NextResponse.next();
  }

  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const cfg = getRateLimitConfig(pathname);
  const id = getClientIdentifier(request);
  const key = `${pathname}:${id}`;
  const res = checkAndUpdateBucket(key, cfg);

  const headers = new Headers();
  headers.set('X-RateLimit-Limit', String(cfg.maxRequests));
  headers.set('X-RateLimit-Remaining', String(res.remaining));
  headers.set('X-RateLimit-Reset', String(Math.floor(res.resetTime / 1000)));

  if (res.allowed) {
    return NextResponse.next({ headers });
  }

  const retryAfterSec = Math.max(1, Math.floor((res.resetTime - Date.now()) / 1000));
  headers.set('Retry-After', String(retryAfterSec));
  headers.set('Content-Type', 'application/json; charset=utf-8');
  const origin = request.headers.get('origin') || '*';
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Vary', 'Origin');

  return new Response(
    JSON.stringify({
      error: 'rate_limited',
      message: cfg.message ?? 'Demasiadas solicitudes',
      retryAfter: retryAfterSec,
    }),
    { status: 429, headers }
  );
}

export const config = {
  matcher: ['/api/:path*', '/admin/:path*', '/dashboard/admin/:path*'],
};

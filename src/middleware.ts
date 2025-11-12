// ============================================
// RATE LIMITING MIDDLEWARE
// Middleware para limitar requests por IP/usuario (solo /api)
// ============================================

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Cache en memoria para rate limiting (simple; en prod real usar Redis)
type Bucket = { count: number; resetTime: number };

// Reutiliza un Map global para evitar reinicios entre hot reloads
const rateLimitMap: Map<string, Bucket> =
  (globalThis as any).__rateLimitMap ?? new Map<string, Bucket>();
(globalThis as any).__rateLimitMap = rateLimitMap;

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  message?: string;
}

// Config por prefijos de ruta
const rateLimitConfigs: Record<string, RateLimitConfig> = {
  '/api/auth': { maxRequests: 5, windowMs: 15 * 60 * 1000, message: 'Demasiados intentos de login' }, // 5/15m
  '/api/checkout': { maxRequests: 10, windowMs: 60 * 1000, message: 'Demasiadas solicitudes de checkout' }, // 10/min
  '/api/search': { maxRequests: 30, windowMs: 60 * 1000, message: 'Demasiadas búsquedas' }, // 30/min
  '/api/chat': { maxRequests: 50, windowMs: 60 * 1000, message: 'Demasiados mensajes' }, // 50/min
  default: { maxRequests: 100, windowMs: 60 * 1000, message: 'Demasiadas solicitudes' }, // 100/min
};

function getClientIdentifier(request: NextRequest): string {
  // Intentar IP de proxy (x-forwarded-for) o real-ip; fallback 'unknown'
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
  // Añadir un recorte del user-agent para distinguir mejor clientes
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Preflight CORS pasa directo
  if (request.method === 'OPTIONS') {
    return NextResponse.next();
  }

  // Sólo /api/* (el matcher también lo limita, esto es defensivo)
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
    return NextResponse.next({
      headers,
    });
  }

  const retryAfterSec = Math.max(1, Math.floor((res.resetTime - Date.now()) / 1000));

  headers.set('Retry-After', String(retryAfterSec));
  headers.set('Content-Type', 'application/json; charset=utf-8');

  // CORS básicos para respuestas de error
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

// Limita el middleware explícitamente a /api/*
export const config = {
  matcher: ['/api/:path*'],
};

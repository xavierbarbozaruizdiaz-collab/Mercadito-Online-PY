// ============================================
// RATE LIMITING MIDDLEWARE
// Middleware para limitar requests por IP/usuario
// ============================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Cache en memoria para rate limiting (simple, para producción usar Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  message?: string;
}

// Configuraciones por ruta
const rateLimitConfigs: Record<string, RateLimitConfig> = {
  '/api/auth': { maxRequests: 5, windowMs: 15 * 60 * 1000, message: 'Demasiados intentos de login' }, // 5 por 15 min
  '/api/checkout': { maxRequests: 10, windowMs: 60 * 1000, message: 'Demasiadas solicitudes de checkout' }, // 10 por minuto
  '/api/search': { maxRequests: 30, windowMs: 60 * 1000, message: 'Demasiadas búsquedas' }, // 30 por minuto
  '/api/chat': { maxRequests: 50, windowMs: 60 * 1000, message: 'Demasiados mensajes' }, // 50 por minuto
  default: { maxRequests: 100, windowMs: 60 * 1000, message: 'Demasiadas solicitudes' }, // 100 por minuto por defecto
};

function getClientIdentifier(request: NextRequest): string {
  // Intentar obtener IP del header X-Forwarded-For o X-Real-IP (Vercel/proxy)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
  
  // También considerar user-agent para identificar mejor
  const userAgent = request.headers.get('user-agent') || '';
  
  return `${ip}-${userAgent.slice(0, 50)}`;
}

function getRateLimitConfig(pathname: string): RateLimitConfig {
  for (const [path, config] of Object.entries(rateLimitConfigs)) {
    if (pathname.startsWith(path)) {
      return config;
    }
  }
  return rateLimitConfigs.default;
}

function checkRateLimit(identifier: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    // Nueva ventana de tiempo
    const resetTime = now + config.windowMs;
    rateLimitMap.set(identifier, { count: 1, resetTime });
    return { allowed: true, remaining: config.maxRequests - 1, resetTime };
  }

  if (record.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  // Incrementar contador
  record.count++;
  rateLimitMap.set(identifier, record);
  return { allowed: true, remaining: config.maxRequests - record.count, resetTime: record.resetTime };
}

// Limpiar registros expirados cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function middleware(request: NextRequest) {
  // Solo aplicar rate limiting a rutas API
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const config = getRateLimitConfig(request.nextUrl.pathname);
  const identifier = getClientIdentifier(request);
  const { allowed, remaining, resetTime } = checkRateLimit(identifier, config);

  // Crear respuesta
  const response = allowed
    ? NextResponse.next()
    : NextResponse.json(
        {
          error: config.message || 'Demasiadas solicitudes',
          message: 'Por favor espera antes de intentar nuevamente',
        },
        { status: 429 }
      );

  // Agregar headers de rate limit
  response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', new Date(resetTime).toISOString());

  if (!allowed) {
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
    response.headers.set('Retry-After', retryAfter.toString());
  }

  return response;
}

// Aplicar middleware excluyendo rutas estáticas/PWA
export const config = {
  matcher: [
    '/((?!_next/|icons/|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|images/|api/).*)',
  ],
};


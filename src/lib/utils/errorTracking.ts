// ============================================
// ERROR TRACKING UTILITY
// Utilidades para tracking de errores con Sentry
// ============================================

/**
 * Captura un error en Sentry (si está configurado)
 */
export function captureError(
  error: Error | string,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
    user?: {
      id?: string;
      email?: string;
      username?: string;
    };
    level?: 'error' | 'warning' | 'info';
  }
): void {
  if (typeof window === 'undefined') {
    // Server-side
    try {
      const Sentry = require('@sentry/nextjs');
      if (Sentry && process.env.NEXT_PUBLIC_SENTRY_DSN) {
        if (context?.user) {
          Sentry.setUser(context.user);
        }
        if (context?.tags) {
          Sentry.setTags(context.tags);
        }
        if (context?.extra) {
          Sentry.setExtras(context.extra);
        }
        Sentry.captureException(error instanceof Error ? error : new Error(error));
      }
    } catch (e) {
      // Sentry no disponible
      console.error('Error tracking (server):', error);
    }
  } else {
    // Client-side
    try {
      const Sentry = (window as any).__SENTRY__;
      if (Sentry && process.env.NEXT_PUBLIC_SENTRY_DSN) {
        if (context?.user) {
          Sentry.setUser(context.user);
        }
        if (context?.tags) {
          Sentry.setTags(context.tags);
        }
        if (context?.extra) {
          Sentry.setExtras(context.extra);
        }
        Sentry.captureException(error instanceof Error ? error : new Error(error));
      }
    } catch (e) {
      // Sentry no disponible
      console.error('Error tracking (client):', error);
    }
  }
}

/**
 * Captura un mensaje informativo en Sentry
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
  }
): void {
  if (typeof window === 'undefined') {
    try {
      const Sentry = require('@sentry/nextjs');
      if (Sentry && process.env.NEXT_PUBLIC_SENTRY_DSN) {
        if (context?.tags) {
          Sentry.setTags(context.tags);
        }
        if (context?.extra) {
          Sentry.setExtras(context.extra);
        }
        Sentry.captureMessage(message, level);
      }
    } catch (e) {
      console.log(`[${level.toUpperCase()}]`, message);
    }
  } else {
    try {
      const Sentry = (window as any).__SENTRY__;
      if (Sentry && process.env.NEXT_PUBLIC_SENTRY_DSN) {
        if (context?.tags) {
          Sentry.setTags(context.tags);
        }
        if (context?.extra) {
          Sentry.setExtras(context.extra);
        }
        Sentry.captureMessage(message, level);
      }
    } catch (e) {
      console.log(`[${level.toUpperCase()}]`, message);
    }
  }
}

/**
 * Establece el contexto del usuario en Sentry
 */
export function setUserContext(user: {
  id?: string;
  email?: string;
  username?: string;
  role?: string;
}): void {
  if (typeof window === 'undefined') {
    try {
      const Sentry = require('@sentry/nextjs');
      if (Sentry && process.env.NEXT_PUBLIC_SENTRY_DSN) {
        Sentry.setUser(user);
      }
    } catch (e) {
      // Sentry no disponible
    }
  } else {
    try {
      const Sentry = (window as any).__SENTRY__;
      if (Sentry && process.env.NEXT_PUBLIC_SENTRY_DSN) {
        Sentry.setUser(user);
      }
    } catch (e) {
      // Sentry no disponible
    }
  }
}

/**
 * Limpia el contexto del usuario en Sentry
 */
export function clearUserContext(): void {
  if (typeof window === 'undefined') {
    try {
      const Sentry = require('@sentry/nextjs');
      if (Sentry && process.env.NEXT_PUBLIC_SENTRY_DSN) {
        Sentry.setUser(null);
      }
    } catch (e) {
      // Sentry no disponible
    }
  } else {
    try {
      const Sentry = (window as any).__SENTRY__;
      if (Sentry && process.env.NEXT_PUBLIC_SENTRY_DSN) {
        Sentry.setUser(null);
      }
    } catch (e) {
      // Sentry no disponible
    }
  }
}


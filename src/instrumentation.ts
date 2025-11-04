// src/instrumentation.ts
// Archivo de instrumentación para Sentry

export async function register() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
}


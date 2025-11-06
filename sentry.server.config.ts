// sentry.server.config.ts
import * as Sentry from "@sentry/nextjs";

// Solo inicializar si DSN está configurado
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    
    // Ajustar el porcentaje de transacciones que se rastrean
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Ignorar errores comunes
    ignoreErrors: [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
    ],
    
    // Filtrar eventos antes de enviar
    beforeSend(event, hint) {
      // Ignorar errores en desarrollo local
      if (process.env.NODE_ENV === 'development') {
        console.warn('Error capturado (no enviado a Sentry en desarrollo):', hint.originalException || hint.syntheticException);
        return null;
      }
      return event;
    },
  });
}


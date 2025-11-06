// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

// Solo inicializar si DSN está configurado
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    
    // Ajustar el porcentaje de transacciones que se rastrean
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Ignorar errores comunes que no son críticos
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'ChunkLoadError',
      'Loading chunk',
      'Failed to fetch dynamically imported',
    ],
    
    // Filtrar URLs de desarrollo
    beforeSend(event, hint) {
      // Ignorar errores en desarrollo local
      if (process.env.NODE_ENV === 'development' && window.location.hostname === 'localhost') {
        console.warn('Error capturado (no enviado a Sentry en desarrollo):', hint.originalException || hint.syntheticException);
        return null;
      }
      return event;
    },
    
    // Integración con React
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    
    // Configuración de replay (solo en producción)
    replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
  });
}


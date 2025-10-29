// sentry.server.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  
  // Ajustar el porcentaje de transacciones que se rastrean
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Capturar excepciones no manejadas
  captureUnhandledRejections: true,
  
  // Integraciones
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
  ],
});


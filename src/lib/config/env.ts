// ============================================
// MERCADITO ONLINE PY - ENVIRONMENT VARIABLES VALIDATION
// Validación centralizada de variables de entorno
// ============================================

import { z } from 'zod';

// Schema de validación
const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL debe ser una URL válida'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY es requerido'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Resend (Email)
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY es requerido').optional(),
  RESEND_FROM_EMAIL: z.string().email('RESEND_FROM_EMAIL debe ser un email válido').optional(),

  // URLs
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL debe ser una URL válida').optional(),
  NEXT_PUBLIC_BASE_URL: z.string().url('NEXT_PUBLIC_BASE_URL debe ser una URL válida').optional(),

  // Cron
  CRON_SECRET: z.string().min(32, 'CRON_SECRET debe tener al menos 32 caracteres').optional(),

  // WhatsApp (opcional)
  WHATSAPP_API_ENABLED: z.enum(['true', 'false']).optional(),
  WHATSAPP_API_KEY: z.string().optional(),
  WHATSAPP_API_URL: z.string().url().optional(),

  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Tipo inferido del schema
type Env = z.infer<typeof envSchema>;

// Función para validar y obtener variables de entorno
function getEnv(): Env {
  try {
    return envSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hqdatzhliaordlsqtjea.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZGF0emhsaWFvcmRsc3F0amVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MTk1NzQsImV4cCI6MjA3NzA5NTU3NH0.u1VFWCN4yHZ_v_bR4MNw5wt7jTPdfpIwjhDRYfQ5qRw',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
      CRON_SECRET: process.env.CRON_SECRET,
      WHATSAPP_API_ENABLED: process.env.WHATSAPP_API_ENABLED,
      WHATSAPP_API_KEY: process.env.WHATSAPP_API_KEY,
      WHATSAPP_API_URL: process.env.WHATSAPP_API_URL,
      NODE_ENV: process.env.NODE_ENV,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('\n');
      throw new Error(
        `❌ Variables de entorno faltantes o inválidas:\n${missingVars}\n\n` +
        `Asegúrate de configurar todas las variables requeridas en tu archivo .env.local`
      );
    }
    throw error;
  }
}

// Exportar variables validadas
export const env = getEnv();

// Helpers para verificar características opcionales
export const features = {
  email: {
    enabled: !!env.RESEND_API_KEY,
    from: env.RESEND_FROM_EMAIL || 'noreply@mercadito-online-py.com',
  },
  whatsapp: {
    enabled: env.WHATSAPP_API_ENABLED === 'true' && !!env.WHATSAPP_API_KEY,
    apiKey: env.WHATSAPP_API_KEY,
    apiUrl: env.WHATSAPP_API_URL,
  },
  cron: {
    enabled: !!env.CRON_SECRET,
  },
} as const;


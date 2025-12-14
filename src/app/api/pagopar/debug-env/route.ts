// ============================================
// MERCADITO ONLINE PY - API: DEBUG ENV PAGOPAR
// Endpoint de debug para verificar variables de entorno de Pagopar
// NO expone valores, solo flags booleanos
// ============================================

import { NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

// Variables de entorno que Pagopar necesita
const REQUIRED_ENVS = [
  'NEXT_PUBLIC_PAGOPAR_PUBLIC_TOKEN',
  'PAGOPAR_PRIVATE_TOKEN',
] as const;

// Variables de entorno opcionales
const OPTIONAL_ENVS = [
  'PAGOPAR_PUBLIC_TOKEN', // Alias alternativo
  'PAGOPAR_PUBLIC_KEY', // Alias alternativo
  'PAGOPAR_PRIVATE_KEY', // Alias alternativo
  'PAGOPAR_ENVIRONMENT',
] as const;

export async function GET() {
  try {
    logger.info('[pagopar][debug-env] checking environment variables');

    // Verificar variables requeridas
    const envStatus: Record<string, boolean> = {};
    let allRequiredPresent = true;

    // Verificar principales (requeridas)
    for (const envKey of REQUIRED_ENVS) {
      const exists = Boolean(process.env[envKey]?.trim());
      envStatus[envKey] = exists;
      if (!exists) {
        allRequiredPresent = false;
        logger.warn(`[pagopar][debug-env] Missing required env: ${envKey}`);
      } else {
        logger.info(`[pagopar][debug-env] Found required env: ${envKey}`);
      }
    }

    // Verificar aliases alternativos (pueden existir como fallback)
    for (const envKey of OPTIONAL_ENVS) {
      const exists = Boolean(process.env[envKey]?.trim());
      envStatus[envKey] = exists;
      if (exists) {
        logger.info(`[pagopar][debug-env] Found optional/env alias: ${envKey}`);
      }
    }

    // Información adicional útil (sin valores)
    const additionalInfo = {
      nodeEnv: process.env.NODE_ENV || 'undefined',
      vercelEnv: process.env.VERCEL_ENV || 'undefined',
      // Indicar si al menos UNA de las variantes existe (para debugging)
      hasPublicTokenVariant: Boolean(
        process.env.NEXT_PUBLIC_PAGOPAR_PUBLIC_TOKEN?.trim() ||
        process.env.PAGOPAR_PUBLIC_TOKEN?.trim() ||
        process.env.PAGOPAR_PUBLIC_KEY?.trim()
      ),
      hasPrivateTokenVariant: Boolean(
        process.env.PAGOPAR_PRIVATE_TOKEN?.trim() ||
        process.env.PAGOPAR_PRIVATE_KEY?.trim()
      ),
    };

    // Determinar status HTTP
    const status = allRequiredPresent ? 200 : 500;

    logger.info('[pagopar][debug-env] check complete', {
      allRequiredPresent,
      status,
      envStatus,
    });

    return NextResponse.json(
      {
        success: allRequiredPresent,
        message: allRequiredPresent
          ? 'All required Pagopar environment variables are configured'
          : 'Some required Pagopar environment variables are missing',
        envs: envStatus,
        info: additionalInfo,
      },
      { status }
    );
  } catch (error: any) {
    logger.error('[pagopar][debug-env] unexpected error', {
      error: error?.message,
      stack: error?.stack,
    });
    return NextResponse.json(
      {
        success: false,
        error: 'Internal error checking environment variables',
      },
      { status: 500 }
    );
  }
}

// No permitir métodos POST/PUT/DELETE por seguridad
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}















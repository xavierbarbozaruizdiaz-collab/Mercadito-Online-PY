// ============================================
// MERCADITO ONLINE PY - OAUTH 2.0 TOKEN ENDPOINT
// Endpoint para intercambiar código de autorización por access token
// IMPORTANTE: No modifica el flujo de Supabase Auth existente
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { 
  validateClientCredentials,
  validateRedirectUri,
  exchangeCodeForToken,
} from '@/lib/auth/oauth';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

// ============================================
// ENDPOINT POST /oauth/token
// ============================================

export async function POST(request: NextRequest) {
  try {
    // OAuth requiere Content-Type: application/x-www-form-urlencoded
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/x-www-form-urlencoded')) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Content-Type debe ser application/x-www-form-urlencoded' },
        { status: 400 }
      );
    }

    // Leer body como form data
    const formData = await request.formData();
    const grantType = formData.get('grant_type');
    const code = formData.get('code');
    const redirectUri = formData.get('redirect_uri');
    const clientId = formData.get('client_id');
    const clientSecret = formData.get('client_secret');
    const codeVerifier = formData.get('code_verifier'); // Para PKCE (opcional)

    // Validaciones básicas
    if (grantType !== 'authorization_code') {
      return NextResponse.json(
        { error: 'unsupported_grant_type', error_description: 'grant_type debe ser "authorization_code"' },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'code es requerido' },
        { status: 400 }
      );
    }

    if (!redirectUri) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'redirect_uri es requerido' },
        { status: 400 }
      );
    }

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'invalid_client', error_description: 'client_id y client_secret son requeridos' },
        { status: 401 }
      );
    }

    // Validar credenciales del cliente OAuth (client_id + client_secret)
    const client = await validateClientCredentials(clientId as string, clientSecret as string);
    if (!client) {
      // ⚠️ SEGURIDAD: No revelar si el client_id existe o si el secret es incorrecto
      // Usar mensaje genérico para ambos casos (timing attack protection)
      logger.debug('Cliente OAuth inválido');
      return NextResponse.json(
        { error: 'invalid_client', error_description: 'Cliente no encontrado o secret inválido' },
        { status: 401 }
      );
    }

    // Validar redirect_uri
    if (!validateRedirectUri(client, redirectUri as string)) {
      // ⚠️ SEGURIDAD: No loguear redirect_uri completo
      logger.debug('Redirect URI no permitido');
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'redirect_uri no permitido' },
        { status: 400 }
      );
    }

    // Intercambiar código por token usando función refactorizada
    const tokenResult = await exchangeCodeForToken(
      code as string,
      clientId as string,
      redirectUri as string,
      codeVerifier as string | undefined
    );

    if (!tokenResult) {
      // ⚠️ SEGURIDAD: No revelar el motivo exacto (código expirado, usado, etc.)
      logger.debug('Error intercambiando código por token');
      return NextResponse.json(
        { error: 'invalid_grant', error_description: 'Código de autorización inválido o expirado' },
        { status: 400 }
      );
    }

    // ⚠️ SEGURIDAD: No loguear el access_token completo ni detalles sensibles
    logger.info('Access token generado', { 
      clientId: (clientId as string).substring(0, 8) + '...',
      scopes: tokenResult.scopes.join(', ')
    });

    // Retornar token según RFC 6749
    return NextResponse.json({
      access_token: tokenResult.access_token,
      token_type: 'Bearer',
      expires_in: tokenResult.expires_in,
      scope: tokenResult.scopes.join(' '),
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Pragma': 'no-cache',
      },
    });

  } catch (error: any) {
    logger.error('Error en /oauth/token', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}



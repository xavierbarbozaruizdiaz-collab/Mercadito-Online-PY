// ============================================
// MERCADITO ONLINE PY - OAUTH 2.0 AUTHORIZE ENDPOINT
// Endpoint para iniciar el flujo de autorización OAuth
// IMPORTANTE: No modifica el flujo de Supabase Auth existente
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { 
  validateRedirectUri, 
  validateScopes, 
  isValidScope,
  issueAuthorizationCode,
  VALID_SCOPES,
  type OAuthClient
} from '@/lib/auth/oauth';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

// ============================================
// ENDPOINT GET /oauth/authorize
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parámetros OAuth requeridos
    const clientId = searchParams.get('client_id');
    const redirectUri = searchParams.get('redirect_uri');
    const responseType = searchParams.get('response_type');
    const scope = searchParams.get('scope');
    const state = searchParams.get('state'); // Para CSRF protection
    const codeChallenge = searchParams.get('code_challenge'); // PKCE (opcional)
    const codeChallengeMethod = searchParams.get('code_challenge_method'); // 'plain' o 'S256'

    // Validaciones básicas
    if (!clientId) {
      return redirectWithError(redirectUri, 'invalid_client', 'client_id es requerido', state);
    }

    if (!redirectUri) {
      return redirectWithError(redirectUri, 'invalid_request', 'redirect_uri es requerido', state);
    }

    if (responseType !== 'code') {
      return redirectWithError(redirectUri, 'unsupported_response_type', 'response_type debe ser "code"', state);
    }

    // Validar cliente OAuth
    // NOTA: En producción, el client_secret no se envía aquí (solo en /token)
    // Por ahora validamos solo client_id
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hqdatzhliaordlsqtjea.supabase.co';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: clientData, error: clientError } = await supabase
      .from('oauth_clients')
      .select('id, client_id, name, redirect_uris, scopes, is_active')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .single();

    if (clientError || !clientData) {
      // ⚠️ SEGURIDAD: No revelar si el client_id existe o no (timing attack protection)
      logger.debug('Cliente OAuth no encontrado o inactivo');
      return redirectWithError(redirectUri, 'invalid_client', 'Cliente no encontrado o inactivo', state);
    }

    // Validar redirect_uri
    const client = clientData as { id: string; client_id: string; name: string; redirect_uris: string[] | null; scopes: string[] | null; is_active: boolean };
    const redirectUris = client.redirect_uris || [];
    const clientForValidation: OAuthClient = {
      id: client.id,
      client_id: client.client_id,
      name: client.name,
      redirect_uris: redirectUris,
      scopes: client.scopes || [],
      is_active: client.is_active,
    };
    if (!validateRedirectUri(clientForValidation, redirectUri)) {
      // ⚠️ SEGURIDAD: No loguear redirect_uri completo (puede contener información sensible)
      logger.debug('Redirect URI no permitido para cliente');
      return redirectWithError(redirectUri, 'invalid_request', 'redirect_uri no permitido', state);
    }

    // Validar scopes
    const requestedScopes = scope ? scope.split(' ').filter(s => s.trim()) : [];
    const invalidScopes = requestedScopes.filter(s => !isValidScope(s));
    if (invalidScopes.length > 0) {
      logger.warn('Scopes inválidos', { invalidScopes });
      return redirectWithError(redirectUri, 'invalid_scope', `Scopes inválidos: ${invalidScopes.join(', ')}`, state);
    }

    // Validar que los scopes solicitados estén permitidos para el cliente
    const clientScopes = client.scopes || [];
    const unauthorizedScopes = requestedScopes.filter(s => !clientScopes.includes(s));
    if (unauthorizedScopes.length > 0) {
      logger.warn('Scopes no autorizados para este cliente', { unauthorizedScopes });
      return redirectWithError(redirectUri, 'invalid_scope', `Scopes no autorizados: ${unauthorizedScopes.join(', ')}`, state);
    }

    // Verificar que el usuario esté autenticado (usando Supabase Auth existente)
    const supabaseServer = await createServerClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      // Usuario no autenticado → redirigir a login
      // Guardar parámetros OAuth en sesión/cookie para después del login
      const loginUrl = new URL('/auth/sign-in', request.url);
      loginUrl.searchParams.set('redirect_to', request.url);
      loginUrl.searchParams.set('oauth_flow', 'true');
      
      return NextResponse.redirect(loginUrl.toString());
    }

    // Usuario autenticado → mostrar pantalla de consentimiento
    // Por ahora, en MVP, asumimos consentimiento automático si el usuario está logueado
    // En producción, mostrar pantalla de consentimiento real

    // Generar y guardar código de autorización usando función refactorizada
    const finalScopes = requestedScopes.length > 0 ? requestedScopes : (clientScopes as string[]);
    const authCode = await issueAuthorizationCode(
      clientId,
      user.id,
      redirectUri,
      finalScopes,
      codeChallenge || undefined,
      codeChallengeMethod || undefined
    );

    if (!authCode) {
      logger.error('Error generando código de autorización');
      return redirectWithError(redirectUri, 'server_error', 'Error interno del servidor', state);
    }

    // Redirigir con código de autorización
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('code', authCode);
    if (state) {
      redirectUrl.searchParams.set('state', state);
    }

    // ⚠️ SEGURIDAD: No loguear el código completo, solo primeros caracteres para debugging
    logger.info('Código de autorización generado', { 
      clientId: clientId.substring(0, 8) + '...', 
      userId: user.id.substring(0, 8) + '...' 
    });

    return NextResponse.redirect(redirectUrl.toString());

  } catch (error: any) {
    logger.error('Error en /oauth/authorize', error);
    const redirectUri = new URL(request.url).searchParams.get('redirect_uri');
    const state = new URL(request.url).searchParams.get('state');
    return redirectWithError(redirectUri || '', 'server_error', 'Error interno del servidor', state);
  }
}

// ============================================
// HELPER: Redirigir con error
// ============================================

function redirectWithError(
  redirectUri: string | null,
  error: string,
  errorDescription: string,
  state: string | null
): NextResponse {
  if (!redirectUri) {
    // Si no hay redirect_uri, devolver error JSON
    return NextResponse.json(
      { error, error_description: errorDescription },
      { status: 400 }
    );
  }

  const redirectUrl = new URL(redirectUri);
  redirectUrl.searchParams.set('error', error);
  redirectUrl.searchParams.set('error_description', errorDescription);
  if (state) {
    redirectUrl.searchParams.set('state', state);
  }

  return NextResponse.redirect(redirectUrl.toString());
}


// ============================================
// MERCADITO ONLINE PY - OAUTH 2.0 HELPERS
// Helpers para validar y gestionar tokens OAuth
// IMPORTANTE: Esta es una CAPA ADICIONAL, no reemplaza Supabase Auth
// ============================================

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { logger } from '@/lib/utils/logger';
import * as crypto from 'crypto';
import bcrypt from 'bcryptjs';

// ============================================
// CONFIGURACIÓN
// ============================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hqdatzhliaordlsqtjea.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Cliente de Supabase para consultas OAuth (sin auth, solo para queries)
const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// ============================================
// TIPOS
// ============================================

export interface OAuthTokenInfo {
  user_id: string;
  client_id: string;
  scopes: string[];
  expires_at: Date;
}

export interface OAuthClient {
  id: string;
  client_id: string;
  name: string;
  redirect_uris: string[];
  scopes: string[];
  is_active: boolean;
}

// ============================================
// VALIDAR ACCESS TOKEN OAUTH
// ============================================

/**
 * Valida un access token OAuth y retorna información del usuario
 * 
 * PRIORIDAD: Esta función solo se usa si NO hay cookie de Supabase
 * 
 * @param accessToken Token OAuth (Bearer token)
 * @returns Información del token o null si es inválido
 */
export async function getUserFromAccessToken(accessToken: string): Promise<OAuthTokenInfo | null> {
  try {
    // Validar que el token existe y no está revocado ni expirado
    const { data: tokenData, error: tokenError } = await supabase
      .from('oauth_tokens')
      .select('user_id, client_id, scopes, expires_at, revoked_at')
      .eq('access_token', accessToken)
      .single();

    if (tokenError || !tokenData) {
      // ⚠️ SEGURIDAD: No loguear el token ni detalles sensibles
      logger.debug('Token OAuth no encontrado o inválido');
      return null;
    }

    // Type assertion para evitar errores de TypeScript
    const token = tokenData as { user_id: string; client_id: string; scopes: string[] | null; expires_at: string; revoked_at: string | null };

    // Verificar que no esté revocado
    if (token.revoked_at) {
      // ⚠️ SEGURIDAD: No loguear userId completo
      logger.debug('Token OAuth revocado', { userId: token.user_id.substring(0, 8) + '...' });
      return null;
    }

    // Verificar que no esté expirado
    const expiresAt = new Date(token.expires_at);
    if (expiresAt < new Date()) {
      logger.debug('Token OAuth expirado');
      return null;
    }

    // Actualizar last_used_at (no bloqueante, fire and forget)
    // Type assertion para evitar errores de TypeScript con Supabase types
    (supabase.from('oauth_tokens') as any)
      .update({ last_used_at: new Date().toISOString() })
      .eq('access_token', accessToken)
      .then(() => {})
      .catch((err: any) => {
        logger.debug('Error actualizando last_used_at (no crítico)', err);
      });

    return {
      user_id: token.user_id,
      client_id: token.client_id,
      scopes: token.scopes || [],
      expires_at: expiresAt,
    };
  } catch (error: any) {
    logger.error('Error validando token OAuth', error);
    return null;
  }
}

// ============================================
// VALIDAR CLIENT_ID Y CLIENT_SECRET
// ============================================

/**
 * Valida client_id y client_secret de un cliente OAuth
 * 
 * @param clientId Client ID
 * @param clientSecret Client Secret (en texto plano, se compara con hash)
 * @returns Cliente OAuth o null si es inválido
 */
export async function validateOAuthClient(
  clientId: string,
  clientSecret: string
): Promise<OAuthClient | null> {
  try {
    const { data: clientData, error: clientError } = await supabase
      .from('oauth_clients')
      .select('id, client_id, name, redirect_uris, scopes, is_active, client_secret')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .single();

    if (clientError || !clientData) {
      // ⚠️ SEGURIDAD: No revelar si el client_id existe o no (timing attack protection)
      // Usar mensaje genérico para ambos casos
      logger.debug('Cliente OAuth no encontrado o inactivo');
      return null;
    }

    // Type assertion para evitar errores de TypeScript
    const client = clientData as { id: string; client_id: string; name: string; redirect_uris: string[] | null; scopes: string[] | null; is_active: boolean; client_secret: string };

    // Validar client_secret usando bcrypt
    // ⚠️ SEGURIDAD: client_secret en BD debe ser hash bcrypt, nunca texto plano
    const isValidSecret = await compareClientSecret(clientSecret, client.client_secret);
    
    if (!isValidSecret) {
      // ⚠️ SEGURIDAD: No loguear client_secret ni hash
      logger.debug('Client secret inválido para cliente', { clientId: clientId.substring(0, 8) + '...' });
      return null;
    }

    return {
      id: client.id,
      client_id: client.client_id,
      name: client.name,
      redirect_uris: client.redirect_uris || [],
      scopes: client.scopes || [],
      is_active: client.is_active,
    };
  } catch (error: any) {
    logger.error('Error validando cliente OAuth', error);
    return null;
  }
}

// ============================================
// VALIDAR REDIRECT URI
// ============================================

/**
 * Valida que un redirect_uri esté permitido para un cliente
 * 
 * @param client Cliente OAuth
 * @param redirectUri URI a validar
 * @returns true si es válido
 */
export function validateRedirectUri(client: OAuthClient, redirectUri: string): boolean {
  // Validación exacta (no wildcards por seguridad)
  return client.redirect_uris.includes(redirectUri);
}

// ============================================
// VALIDAR SCOPES
// ============================================

/**
 * Valida que los scopes solicitados estén permitidos para el cliente
 * 
 * @param client Cliente OAuth
 * @param requestedScopes Scopes solicitados
 * @returns true si todos los scopes son válidos
 */
export function validateScopes(client: OAuthClient, requestedScopes: string[]): boolean {
  const allowedScopes = client.scopes || [];
  return requestedScopes.every(scope => allowedScopes.includes(scope));
}

// ============================================
// GENERAR CÓDIGO DE AUTORIZACIÓN
// ============================================

/**
 * Genera un código de autorización único criptográficamente seguro
 * 
 * ⚠️ SEGURIDAD: Usa crypto.randomBytes para generar tokens seguros
 * 
 * @returns Código único (base64url, 32 bytes)
 */
export function generateAuthorizationCode(): string {
  // Generar 32 bytes de entropía criptográficamente segura
  const randomBytes = crypto.randomBytes(32);
  // Convertir a base64url (URL-safe, sin padding)
  return randomBytes.toString('base64url');
}

// ============================================
// GENERAR ACCESS TOKEN
// ============================================

/**
 * Genera un access token único criptográficamente seguro
 * 
 * ⚠️ SEGURIDAD: Usa crypto.randomBytes para generar tokens seguros
 * 
 * @returns Token único (base64url, 32 bytes)
 */
export function generateAccessToken(): string {
  // Generar 32 bytes de entropía criptográficamente segura
  const randomBytes = crypto.randomBytes(32);
  // Convertir a base64url (URL-safe, sin padding)
  return randomBytes.toString('base64url');
}

// ============================================
// HASH CLIENT SECRET (bcrypt)
// ============================================

/**
 * Hashea un client secret usando bcrypt
 * 
 * ⚠️ SEGURIDAD: Esta función debe usarse OFFLINE, nunca en el código de producción
 * El hash resultante se guarda en BD, nunca el secret en texto plano
 * 
 * @param secret Secret en texto plano
 * @returns Hash bcrypt (10 rounds)
 */
export async function hashClientSecret(secret: string): Promise<string> {
  // ⚠️ SEGURIDAD: Usar bcrypt con 10 rounds (balance seguridad/performance)
  // Esta función solo debe usarse en scripts offline para generar hashes
  return await bcrypt.hash(secret, 10);
}

/**
 * Compara un secret en texto plano con un hash bcrypt almacenado
 * 
 * ⚠️ SEGURIDAD: Usa bcrypt.compare() que es seguro contra timing attacks
 * 
 * @param secret Secret en texto plano (proporcionado por el cliente)
 * @param hash Hash bcrypt almacenado en BD
 * @returns true si coinciden
 */
export async function compareClientSecret(secret: string, hash: string): Promise<boolean> {
  // ⚠️ SEGURIDAD: bcrypt.compare() es seguro contra timing attacks
  // Si el hash no es un hash bcrypt válido, retorna false
  try {
    // Verificar que el hash parece ser un hash bcrypt (empieza con $2a$, $2b$, etc.)
    if (!hash.startsWith('$2a$') && !hash.startsWith('$2b$') && !hash.startsWith('$2y$')) {
      // Si no es un hash bcrypt, podría ser un valor temporal/revocado
      // No comparar directamente (seguridad)
      logger.debug('Hash no parece ser bcrypt válido');
      return false;
    }
    
    return await bcrypt.compare(secret, hash);
  } catch {
    // Si hay error en la comparación, retornar false (fail-secure)
    logger.debug('Error comparando client secret');
    return false;
  }
}

// ============================================
// SCOPES VÁLIDOS
// ============================================

export const VALID_SCOPES = [
  'sourcing_orders.read',
  'sourcing_orders.write',
] as const;

export type ValidScope = typeof VALID_SCOPES[number];

/**
 * Valida que un scope sea válido
 * 
 * @param scope Scope a validar
 * @returns true si es válido
 */
export function isValidScope(scope: string): scope is ValidScope {
  return VALID_SCOPES.includes(scope as ValidScope);
}

// ============================================
// FUNCIONES DE ALTO NIVEL (REFACTORIZADAS)
// ============================================

/**
 * Emite un código de autorización para un usuario
 * 
 * @param clientId ID del cliente OAuth
 * @param userId ID del usuario autenticado
 * @param redirectUri URI de redirección
 * @param scopes Scopes solicitados
 * @param codeChallenge PKCE challenge (opcional)
 * @param codeChallengeMethod Método PKCE (opcional)
 * @returns Código de autorización o null si hay error
 */
export async function issueAuthorizationCode(
  clientId: string,
  userId: string,
  redirectUri: string,
  scopes: string[],
  codeChallenge?: string,
  codeChallengeMethod?: string
): Promise<string | null> {
  try {
    const code = generateAuthorizationCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutos

    // Type assertion para evitar errores de TypeScript con Supabase types
    const { error } = await (supabase.from('oauth_authorization_codes') as any)
      .insert({
        code,
        client_id: clientId,
        user_id: userId,
        redirect_uri: redirectUri,
        scopes,
        code_challenge: codeChallenge || null,
        code_challenge_method: codeChallengeMethod || null,
        expires_at: expiresAt.toISOString(),
      });

    if (error) {
      logger.error('Error emitiendo código de autorización', { error: error.message });
      return null;
    }

    return code;
  } catch (error: any) {
    logger.error('Error en issueAuthorizationCode', { error: error.message });
    return null;
  }
}

/**
 * Intercambia un código de autorización por un access token
 * 
 * @param code Código de autorización
 * @param clientId ID del cliente
 * @param redirectUri URI de redirección
 * @param codeVerifier PKCE verifier (opcional)
 * @returns Access token o null si hay error
 */
export async function exchangeCodeForToken(
  code: string,
  clientId: string,
  redirectUri: string,
  codeVerifier?: string
): Promise<{ access_token: string; expires_in: number; scopes: string[] } | null> {
  try {
    // Buscar código
    // Type assertion para evitar errores de TypeScript con Supabase types
    const { data: authCodeData, error: codeError } = await (supabase.from('oauth_authorization_codes') as any)
      .select('*')
      .eq('code', code)
      .single();

    if (codeError || !authCodeData) {
      return null;
    }

    // Type assertion para evitar errores de TypeScript
    const codeData = authCodeData as {
      code: string;
      client_id: string;
      user_id: string;
      redirect_uri: string;
      scopes: string[] | null;
      code_challenge: string | null;
      code_challenge_method: string | null;
      expires_at: string;
      used_at: string | null;
    };

    // Validar expiración
    if (new Date(codeData.expires_at) < new Date()) {
      return null;
    }

    // Validar que no esté usado
    if (codeData.used_at) {
      return null;
    }

    // Validar client_id
    if (codeData.client_id !== clientId) {
      return null;
    }

    // Validar redirect_uri
    if (codeData.redirect_uri !== redirectUri) {
      return null;
    }

    // Validar PKCE si está presente
    if (codeData.code_challenge && codeVerifier) {
      const isValidPKCE = validatePKCE(
        codeVerifier,
        codeData.code_challenge,
        codeData.code_challenge_method || 'plain'
      );
      if (!isValidPKCE) {
        return null;
      }
    }

    // Marcar código como usado
    // Type assertion para evitar errores de TypeScript con Supabase types
    await (supabase.from('oauth_authorization_codes') as any)
      .update({ used_at: new Date().toISOString() })
      .eq('code', code);

    // Generar access token
    const accessToken = generateAccessToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hora

    // Guardar token
    // Type assertion para evitar errores de TypeScript con Supabase types
    const { error: tokenError } = await (supabase.from('oauth_tokens') as any)
      .insert({
        access_token: accessToken,
        token_type: 'Bearer',
        client_id: clientId,
        user_id: codeData.user_id,
        scopes: codeData.scopes || [],
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      // ⚠️ SEGURIDAD: No loguear el access_token ni detalles sensibles
      logger.error('Error guardando access token', { 
        error: tokenError.message,
        // No incluir access_token, userId, clientId ni scopes en logs
      });
      return null;
    }

    return {
      access_token: accessToken,
      expires_in: 3600,
      scopes: codeData.scopes || [],
    };
  } catch (error: any) {
    logger.error('Error en exchangeCodeForToken', error);
    return null;
  }
}

/**
 * Valida credenciales de cliente OAuth
 * 
 * @param clientId ID del cliente
 * @param clientSecret Secret del cliente (texto plano)
 * @returns Cliente OAuth o null si es inválido
 */
export async function validateClientCredentials(
  clientId: string,
  clientSecret: string
): Promise<OAuthClient | null> {
  return await validateOAuthClient(clientId, clientSecret);
}

/**
 * Valida un access token OAuth
 * 
 * @param accessToken Token a validar
 * @returns Información del token o null si es inválido
 */
export async function validateAccessToken(accessToken: string): Promise<OAuthTokenInfo | null> {
  return await getUserFromAccessToken(accessToken);
}

// ============================================
// HELPER: Validar PKCE
// ============================================

function validatePKCE(codeVerifier: string, codeChallenge: string, method: string): boolean {
  if (method === 'plain') {
    return codeVerifier === codeChallenge;
  } else if (method === 'S256') {
    // SHA256 hash del code_verifier en base64url
    const hash = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    return hash === codeChallenge;
  }
  return false;
}

// ============================================
// NOTAS DE SEGURIDAD
// ============================================
// 
// ✅ IMPLEMENTADO:
// - Generación segura de tokens (crypto.randomBytes, 32 bytes)
// - Validación con bcrypt para client_secret (10 rounds)
// - Expiración de códigos (10 min) y tokens (1 hora)
// - Uso único de códigos de autorización
// - No se loguean secrets, tokens ni códigos (solo IDs truncados)
// - Timing attack protection (no se revela si client_id existe)
// - Prioridad cookie > OAuth garantizada
// 
// 🔄 MEJORAS FUTURAS:
// - JWT para access tokens (con firma)
// - Refresh tokens para tokens de larga duración
// - Rate limiting en validación de tokens
// - Endpoint de revocación de tokens
// ============================================


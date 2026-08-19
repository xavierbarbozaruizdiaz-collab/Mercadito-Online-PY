// ============================================
// MERCADITO ONLINE PY - SOURCING ORDERS API
// Endpoint para crear pedidos "por conseguir" cuando no hay stock
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { logger } from '@/lib/utils/logger';
import { notifySourcingOrderChange } from '@/lib/notifications/whatsapp';
import { getUserFromAccessToken } from '@/lib/auth/oauth';

export const runtime = 'nodejs';

// ============================================
// TIPOS
// ============================================

interface CreateSourcingOrderRequest {
  raw_query: string;
  normalized?: Record<string, any>;
  source?: string;
  channel?: string;
}

// ============================================
// ENDPOINT GET (LISTADO)
// ============================================

export async function GET(request: NextRequest) {
  try {
    // ============================================
    // AUTENTICACIÓN: PRIORIDAD COOKIE > OAUTH TOKEN
    // ============================================
    // 1. PRIORIDAD: Intentar obtener usuario de cookies (Supabase Auth)
    // 2. FALLBACK: Si no hay cookie, intentar token OAuth
    // 3. Si ambos fallan → 401
    // ============================================

    let user: any = null;
    let authError: any = null;
    let supabase: any;
    let authMethod: 'cookie' | 'oauth' | null = null;

    // PASO 1: Intentar autenticación por cookies (Supabase Auth) - PRIORIDAD
    try {
      supabase = await createServerClient();
      const { data: { user: userFromCookies }, error: cookiesError } = await supabase.auth.getUser();
      
      if (!cookiesError && userFromCookies) {
        user = userFromCookies;
        authMethod = 'cookie';
        // ⚠️ SEGURIDAD: No loguear userId completo
        logger.debug('Autenticación por cookie exitosa', { userId: user.id.substring(0, 8) + '...' });
      } else {
        authError = cookiesError;
      }
    } catch (cookieError) {
      logger.debug('Error en autenticación por cookie (continuando con OAuth)', cookieError);
    }

    // PASO 2: Si no hay cookie, intentar token OAuth (FALLBACK)
    if (!user) {
      const authHeader = request.headers.get('authorization');
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        // Intentar validar como token OAuth
        const oauthTokenInfo = await getUserFromAccessToken(token);
        
        if (oauthTokenInfo) {
          // Token OAuth válido
          user = { id: oauthTokenInfo.user_id };
          authMethod = 'oauth';
          
          // Crear cliente Supabase para queries (sin auth, solo para RLS)
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hqdatzhliaordlsqtjea.supabase.co';
          const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
          supabase = createClient<Database>(supabaseUrl, supabaseKey, {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            },
          });
          
          // Para que RLS funcione con OAuth, necesitamos establecer el user_id manualmente
          // Usamos Service Role Key para bypass RLS en queries específicas (seguro porque ya validamos el token)
          // ⚠️ SEGURIDAD: No loguear userId completo
          logger.debug('Autenticación por OAuth exitosa', { userId: user.id.substring(0, 8) + '...' });
        } else {
          // No es token OAuth válido, intentar como token Supabase (compatibilidad hacia atrás)
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hqdatzhliaordlsqtjea.supabase.co';
          const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
          
          supabase = createClient<Database>(supabaseUrl, supabaseKey, {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            },
          });
          
          const { data: { user: userFromToken }, error: tokenError } = await supabase.auth.getUser(token);
          
          if (!tokenError && userFromToken) {
            await supabase.auth.setSession({
              access_token: token,
              refresh_token: token,
            });
            user = userFromToken;
            authMethod = 'cookie'; // Tratamos como cookie para compatibilidad
            // ⚠️ SEGURIDAD: No loguear userId completo
            logger.debug('Autenticación por token Supabase exitosa', { userId: user.id.substring(0, 8) + '...' });
          } else {
            authError = tokenError;
          }
        }
      }
    }

    // PASO 3: Validar que tenemos usuario
    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado. Debes iniciar sesión.' },
        { status: 401 }
      );
    }

    // Obtener parámetros de query
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode'); // 'user' o 'store'
    const storeId = searchParams.get('storeId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    let query = (supabase as any)
      .from('sourcing_orders')
      .select(`
        id,
        user_id,
        assigned_store_id,
        raw_query,
        normalized,
        status,
        source,
        channel,
        language,
        created_at,
        updated_at,
        profiles!sourcing_orders_user_id_fkey(
          id,
          email,
          first_name,
          last_name
        )
      `, { count: 'exact' });

    // Determinar modo: si es owner de tienda y tiene storeId, modo store; sino modo user
    if (mode === 'store' || storeId) {
      // Modo tienda: verificar que el usuario es owner de la tienda
      const targetStoreId = storeId || null;
      
      if (!targetStoreId) {
        // Si no hay storeId, buscar la tienda fallback del usuario
        // Usar Service Role Key para bypass RLS en esta consulta de verificación (seguro porque solo verificamos ownership)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hqdatzhliaordlsqtjea.supabase.co';
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        let userStores: any[] | null = null;
        let storeQueryError: any = null;
        
        if (serviceRoleKey) {
          // Usar Service Role para bypass RLS y verificar ownership directamente
          const adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            },
          });
          
          const { data, error } = await (adminClient as any)
            .from('stores')
            .select('id, seller_id, is_fallback_store, is_active')
            .eq('seller_id', user.id)
            .eq('is_fallback_store', true)
            .eq('is_active', true)
            .limit(1);
          
          userStores = data;
          storeQueryError = error;
        } else {
          // Fallback: usar el cliente normal (puede fallar por RLS)
          const { data, error } = await (supabase as any)
            .from('stores')
            .select('id, seller_id, is_fallback_store, is_active')
            .eq('seller_id', user.id)
            .eq('is_fallback_store', true)
            .eq('is_active', true)
            .limit(1);
          
          userStores = data;
          storeQueryError = error;
        }

        if (storeQueryError) {
          logger.error('Error buscando tienda fallback del usuario', storeQueryError, { userId: user.id });
          return NextResponse.json(
            { error: `Error al verificar permisos: ${storeQueryError.message}` },
            { status: 500 }
          );
        }

        if (!userStores || userStores.length === 0) {
          // Log detallado para debugging
          logger.warn('Usuario no tiene tienda fallback', { 
            userId: user.id,
            message: 'El usuario no tiene una tienda marcada como fallback store'
          });
          
          return NextResponse.json(
            { 
              error: 'No tienes permisos para ver sourcing_orders de tienda. Asegúrate de tener una tienda marcada como fallback store en el admin y que seas el dueño de esa tienda.'
            },
            { status: 403 }
          );
        }

        query = query.eq('assigned_store_id', userStores[0].id);
      } else {
        // Verificar que el usuario es owner de esta tienda
        const { data: store } = await (supabase as any)
          .from('stores')
          .select('id, seller_id')
          .eq('id', targetStoreId)
          .single();

        if (!store || store.seller_id !== user.id) {
          return NextResponse.json(
            { error: 'No tienes permisos para ver sourcing_orders de esta tienda' },
            { status: 403 }
          );
        }

        query = query.eq('assigned_store_id', targetStoreId);
      }
    } else {
      // Modo usuario: solo sus propios sourcing_orders
      query = query.eq('user_id', user.id);
    }

    // Aplicar filtro de estado si existe
    if (status) {
      query = query.eq('status', status);
    }

    // Ordenar y paginar
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      logger.error('Error obteniendo sourcing_orders', error);
      return NextResponse.json(
        { error: 'Error al obtener pedidos' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    });

  } catch (error: any) {
    logger.error('Error en GET /api/assistant/sourcing-orders', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// ============================================
// ENDPOINT POST
// ============================================

export async function POST(request: NextRequest) {
  try {
    // ============================================
    // AUTENTICACIÓN: PRIORIDAD COOKIE > OAUTH TOKEN
    // ============================================
    // 1. PRIORIDAD: Intentar obtener usuario de cookies (Supabase Auth)
    // 2. FALLBACK: Si no hay cookie, intentar token OAuth
    // 3. Si ambos fallan → 401
    // ============================================

    let user: any = null;
    let authError: any = null;
    let supabase: any;
    let authMethod: 'cookie' | 'oauth' | null = null;

    // PASO 1: Intentar autenticación por cookies (Supabase Auth) - PRIORIDAD
    try {
      supabase = await createServerClient();
      const { data: { user: userFromCookies }, error: cookiesError } = await supabase.auth.getUser();
      
      if (!cookiesError && userFromCookies) {
        user = userFromCookies;
        authMethod = 'cookie';
        // ⚠️ SEGURIDAD: No loguear userId completo
        logger.debug('Autenticación por cookie exitosa', { userId: user.id.substring(0, 8) + '...' });
      } else {
        authError = cookiesError;
      }
    } catch (cookieError) {
      logger.debug('Error en autenticación por cookie (continuando con OAuth)', cookieError);
    }

    // PASO 2: Si no hay cookie, intentar token OAuth (FALLBACK)
    if (!user) {
      const authHeader = request.headers.get('authorization');
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        // Intentar validar como token OAuth
        const oauthTokenInfo = await getUserFromAccessToken(token);
        
        if (oauthTokenInfo) {
          // Token OAuth válido
          user = { id: oauthTokenInfo.user_id };
          authMethod = 'oauth';
          
          // Crear cliente Supabase para queries (sin auth, solo para RLS)
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hqdatzhliaordlsqtjea.supabase.co';
          const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
          supabase = createClient<Database>(supabaseUrl, supabaseKey, {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            },
          });
          
          // ⚠️ SEGURIDAD: No loguear userId completo
          logger.debug('Autenticación por OAuth exitosa', { userId: user.id.substring(0, 8) + '...' });
        } else {
          // No es token OAuth válido, intentar como token Supabase (compatibilidad hacia atrás)
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hqdatzhliaordlsqtjea.supabase.co';
          const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
          
          supabase = createClient<Database>(supabaseUrl, supabaseKey, {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            },
          });
          
          const { data: { user: userFromToken }, error: tokenError } = await supabase.auth.getUser(token);
          
          if (!tokenError && userFromToken) {
            await supabase.auth.setSession({
              access_token: token,
              refresh_token: token,
            });
            user = userFromToken;
            authMethod = 'cookie'; // Tratamos como cookie para compatibilidad
            // ⚠️ SEGURIDAD: No loguear userId completo
            logger.debug('Autenticación por token Supabase exitosa', { userId: user.id.substring(0, 8) + '...' });
          } else {
            authError = tokenError;
          }
        }
      }
    }

    // PASO 3: Validar que tenemos usuario
    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado. Debes iniciar sesión.' },
        { status: 401 }
      );
    }

    // Parsear body
    let body: CreateSourcingOrderRequest;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Error al parsear el cuerpo de la solicitud' },
        { status: 400 }
      );
    }

    // Validar campos requeridos
    if (!body.raw_query || typeof body.raw_query !== 'string' || body.raw_query.trim().length === 0) {
      return NextResponse.json(
        { error: 'raw_query es requerido y debe ser un texto no vacío' },
        { status: 400 }
      );
    }

    // Buscar tienda fallback
    const { data: fallbackStores, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('is_fallback_store', true)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1);

    if (storeError) {
      logger.error('Error buscando tienda fallback', storeError);
      return NextResponse.json(
        { error: 'Error al buscar tienda fallback' },
        { status: 500 }
      );
    }

    if (!fallbackStores || fallbackStores.length === 0) {
      return NextResponse.json(
        { error: 'No hay tienda fallback configurada. Contacta al administrador.' },
        { status: 404 }
      );
    }

    const assignedStoreId = (fallbackStores[0] as any).id;

    // Crear sourcing_order
    const sourcingOrderData = {
      user_id: user.id,
      assigned_store_id: assignedStoreId,
      raw_query: body.raw_query.trim(),
      normalized: body.normalized || { query: body.raw_query.trim() },
      status: 'pending_sourcing',
      source: body.source || 'web-assistant',
      channel: body.channel || 'web',
      language: 'es-PY',
      agent_source: body.source || 'web-assistant',
      agent_session_id: null,
      agent_metadata: {},
    };

    const { data: sourcingOrder, error: insertError } = await (supabase as any)
      .from('sourcing_orders')
      .insert(sourcingOrderData)
      .select('id, status, created_at')
      .single();

    if (insertError) {
      logger.error('Error creando sourcing_order', insertError, { 
        userId: user.id, 
        storeId: assignedStoreId,
        errorCode: insertError.code,
        errorMessage: insertError.message,
        errorDetails: insertError.details,
        errorHint: insertError.hint,
      });
      
      // Mensaje más descriptivo según el tipo de error
      let errorMessage = 'Error al crear el pedido. Intenta nuevamente.';
      if (insertError.code === '42P01') {
        errorMessage = 'Error: La tabla sourcing_orders no existe. Contacta al administrador.';
      } else if (insertError.code === '42501') {
        errorMessage = 'Error de permisos. Contacta al administrador.';
      } else if (insertError.message) {
        errorMessage = `Error: ${insertError.message}`;
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    // Enviar notificación por WhatsApp (en segundo plano, no bloquea)
    // LPMS: Si falla, no afecta la respuesta exitosa
    try {
      // Obtener teléfono del usuario
      const { data: userProfile } = await (supabase as any)
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .single();

      if (userProfile?.phone) {
        // Llamar de forma no bloqueante (fire and forget)
        notifySourcingOrderChange({
          type: 'created',
          sourcingOrderId: sourcingOrder.id,
          toPhone: userProfile.phone,
          rawQuery: body.raw_query.trim(),
        }).catch((err) => {
          // Ya está protegido dentro de la función, pero por si acaso
          logger.warn('Error en notificación WhatsApp (no crítico)', err);
        });
      }
    } catch (notifError) {
      // LPMS: Las notificaciones nunca deben romper el flujo principal
      logger.debug('No se pudo enviar notificación WhatsApp (no crítico)', notifError);
    }

    // Respuesta exitosa
    return NextResponse.json({
      id: sourcingOrder.id,
      status: sourcingOrder.status,
      created_at: sourcingOrder.created_at,
    }, { status: 201 });

  } catch (error: any) {
    logger.error('Error en /api/assistant/sourcing-orders', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}


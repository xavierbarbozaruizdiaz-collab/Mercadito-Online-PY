// ============================================
// MERCADITO ONLINE PY - SOURCING ORDERS API (BY ID)
// Endpoint para obtener y actualizar sourcing_orders específicos
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

interface UpdateSourcingOrderRequest {
  status?: 'pending_sourcing' | 'sourcing' | 'found' | 'completed' | 'cancelled';
}

// Estados válidos y transiciones permitidas
const VALID_STATUSES = ['pending_sourcing', 'sourcing', 'found', 'completed', 'cancelled'] as const;
const FINAL_STATUSES = ['completed', 'cancelled'] as const;

// Transiciones válidas
const VALID_TRANSITIONS: Record<string, string[]> = {
  'pending_sourcing': ['sourcing', 'cancelled'],
  'sourcing': ['found', 'cancelled'],
  'found': ['completed', 'cancelled'],
  'completed': [], // Estado final
  'cancelled': [], // Estado final
};

// ============================================
// HELPER: Verificar permisos sobre tienda
// ============================================

async function checkStorePermission(supabase: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store } = await (supabase as any)
    .from('stores')
    .select('id, seller_id')
    .eq('id', storeId)
    .single();

  return store && store.seller_id === userId;
}

// ============================================
// HELPER: Validar transición de estado
// ============================================

function isValidTransition(currentStatus: string, newStatus: string): boolean {
  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  return allowed.includes(newStatus);
}

// ============================================
// ENDPOINT GET (DETALLE)
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ============================================
    // AUTENTICACIÓN: PRIORIDAD COOKIE > OAUTH TOKEN
    // ============================================
    let user: any = null;
    let authError: any = null;
    let supabase: any;
    const { id: sourcingOrderId } = await params;

    // PASO 1: Intentar autenticación por cookies (Supabase Auth) - PRIORIDAD
    try {
      supabase = await createServerClient();
      const { data: { user: userFromCookies }, error: cookiesError } = await supabase.auth.getUser();
      
      if (!cookiesError && userFromCookies) {
        user = userFromCookies;
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
          user = { id: oauthTokenInfo.user_id };
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hqdatzhliaordlsqtjea.supabase.co';
          const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
          supabase = createClient<Database>(supabaseUrl, supabaseKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          // ⚠️ SEGURIDAD: No loguear userId completo
          logger.debug('Autenticación por OAuth exitosa', { userId: user.id.substring(0, 8) + '...' });
        } else {
          // Intentar como token Supabase (compatibilidad)
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hqdatzhliaordlsqtjea.supabase.co';
          const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
          supabase = createClient<Database>(supabaseUrl, supabaseKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data: { user: userFromToken }, error: tokenError } = await supabase.auth.getUser(token);
          if (!tokenError && userFromToken) {
            await supabase.auth.setSession({ access_token: token, refresh_token: token });
            user = userFromToken;
            // ⚠️ SEGURIDAD: No loguear userId completo
            logger.debug('Autenticación por token Supabase exitosa', { userId: user.id.substring(0, 8) + '...' });
          } else {
            authError = tokenError;
          }
        }
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado. Debes iniciar sesión.' },
        { status: 401 }
      );
    }

    // Obtener sourcing_order
    const { data: sourcingOrder, error: fetchError } = await (supabase as any)
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
        agent_source,
        agent_session_id,
        agent_metadata,
        created_at,
        updated_at,
        profiles!sourcing_orders_user_id_fkey(
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('id', sourcingOrderId)
      .single();

    if (fetchError) {
      logger.error('Error obteniendo sourcing_order', fetchError);
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      );
    }

    if (!sourcingOrder) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      );
    }

    // Verificar permisos: usuario creador o owner de tienda asignada
    const isCreator = sourcingOrder.user_id === user.id;
    const isStoreOwner = await checkStorePermission(
      supabase,
      user.id,
      sourcingOrder.assigned_store_id
    );

    if (!isCreator && !isStoreOwner) {
      return NextResponse.json(
        { error: 'No tienes permisos para ver este pedido' },
        { status: 403 }
      );
    }

    return NextResponse.json({ data: sourcingOrder });

  } catch (error: any) {
    logger.error('Error en GET /api/assistant/sourcing-orders/[id]', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// ============================================
// ENDPOINT PATCH (ACTUALIZAR ESTADO)
// ============================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ============================================
    // AUTENTICACIÓN: PRIORIDAD COOKIE > OAUTH TOKEN
    // ============================================
    let user: any = null;
    let authError: any = null;
    let supabase: any;
    const { id: sourcingOrderId } = await params;

    // PASO 1: Intentar autenticación por cookies (Supabase Auth) - PRIORIDAD
    try {
      supabase = await createServerClient();
      const { data: { user: userFromCookies }, error: cookiesError } = await supabase.auth.getUser();
      
      if (!cookiesError && userFromCookies) {
        user = userFromCookies;
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
          user = { id: oauthTokenInfo.user_id };
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hqdatzhliaordlsqtjea.supabase.co';
          const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
          supabase = createClient<Database>(supabaseUrl, supabaseKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          // ⚠️ SEGURIDAD: No loguear userId completo
          logger.debug('Autenticación por OAuth exitosa', { userId: user.id.substring(0, 8) + '...' });
        } else {
          // Intentar como token Supabase (compatibilidad)
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hqdatzhliaordlsqtjea.supabase.co';
          const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
          supabase = createClient<Database>(supabaseUrl, supabaseKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data: { user: userFromToken }, error: tokenError } = await supabase.auth.getUser(token);
          if (!tokenError && userFromToken) {
            await supabase.auth.setSession({ access_token: token, refresh_token: token });
            user = userFromToken;
            // ⚠️ SEGURIDAD: No loguear userId completo
            logger.debug('Autenticación por token Supabase exitosa', { userId: user.id.substring(0, 8) + '...' });
          } else {
            authError = tokenError;
          }
        }
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado. Debes iniciar sesión.' },
        { status: 401 }
      );
    }

    // Parsear body
    let body: UpdateSourcingOrderRequest;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Error al parsear el cuerpo de la solicitud' },
        { status: 400 }
      );
    }

    // Validar que se está actualizando el status
    if (!body.status) {
      return NextResponse.json(
        { error: 'status es requerido' },
        { status: 400 }
      );
    }

    // Validar que el status es válido
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: `status inválido. Debe ser uno de: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // Obtener sourcing_order actual
    const { data: currentOrder, error: fetchError } = await (supabase as any)
      .from('sourcing_orders')
      .select('id, user_id, assigned_store_id, status')
      .eq('id', sourcingOrderId)
      .single();

    if (fetchError || !currentOrder) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      );
    }

    // Verificar permisos: solo el owner de la tienda asignada puede actualizar
    const isStoreOwner = await checkStorePermission(
      supabase,
      user.id,
      currentOrder.assigned_store_id
    );

    if (!isStoreOwner) {
      return NextResponse.json(
        { error: 'Solo el dueño de la tienda asignada puede actualizar el estado' },
        { status: 403 }
      );
    }

    // Validar transición de estado
    if (!isValidTransition(currentOrder.status, body.status)) {
      return NextResponse.json(
        { 
          error: `Transición inválida. No se puede cambiar de "${currentOrder.status}" a "${body.status}". Transiciones permitidas: ${VALID_TRANSITIONS[currentOrder.status]?.join(', ') || 'ninguna'}` 
        },
        { status: 400 }
      );
    }

    // Prevenir cambios en estados finales (a menos que sea necesario en el futuro)
    if (FINAL_STATUSES.includes(currentOrder.status as any)) {
      return NextResponse.json(
        { error: 'No se puede modificar un pedido en estado final' },
        { status: 400 }
      );
    }

    // Guardar estado anterior para comparar
    const oldStatus = currentOrder.status;

    // Actualizar estado
    const { data: updatedOrder, error: updateError } = await (supabase as any)
      .from('sourcing_orders')
      .update({ 
        status: body.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sourcingOrderId)
      .select('id, status, updated_at, user_id, raw_query')
      .single();

    if (updateError) {
      logger.error('Error actualizando sourcing_order', updateError);
      return NextResponse.json(
        { error: 'Error al actualizar el pedido' },
        { status: 500 }
      );
    }

    // Enviar notificación por WhatsApp solo si el status realmente cambió
    // LPMS: Si falla, no afecta la respuesta exitosa
    if (oldStatus !== updatedOrder.status) {
      try {
        // Obtener teléfono del usuario dueño del sourcing_order
        const { data: userProfile } = await (supabase as any)
          .from('profiles')
          .select('phone')
          .eq('id', updatedOrder.user_id)
          .single();

        if (userProfile?.phone) {
          // Llamar de forma no bloqueante (fire and forget)
          notifySourcingOrderChange({
            type: 'status_changed',
            sourcingOrderId: updatedOrder.id,
            toPhone: userProfile.phone,
            status: updatedOrder.status as any,
            rawQuery: updatedOrder.raw_query,
          }).catch((err) => {
            // Ya está protegido dentro de la función, pero por si acaso
            logger.warn('Error en notificación WhatsApp (no crítico)', err);
          });
        }
      } catch (notifError) {
        // LPMS: Las notificaciones nunca deben romper el flujo principal
        logger.debug('No se pudo enviar notificación WhatsApp (no crítico)', notifError);
      }
    }

    return NextResponse.json({
      data: updatedOrder,
      message: 'Estado actualizado exitosamente',
    });

  } catch (error: any) {
    logger.error('Error en PATCH /api/assistant/sourcing-orders/[id]', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

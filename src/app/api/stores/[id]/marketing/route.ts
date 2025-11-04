// ============================================
// API: UPDATE STORE MARKETING INTEGRATIONS
// Permite a los owners actualizar sus IDs de marketing
// ============================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { MarketingIntegrationsSchema } from '@/lib/marketing/schema';
import { logger } from '@/lib/utils/logger';
import { Database } from '@/types/database';

type StoreRow = Database['public']['Tables']['stores']['Row'];
type StoreUpdate = Database['public']['Tables']['stores']['Update'];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const storeId = id;

    // Crear cliente de Supabase para esta request
    const supabase = await createServerClient();

    // Verificar autenticación
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.session?.user?.id) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const userId = session.session.user.id;

    // Verificar que el store existe y pertenece al usuario
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, seller_id')
      .eq('id', storeId)
      .single<Pick<StoreRow, 'id' | 'seller_id'>>();

    if (storeError || !store) {
      logger.error('Store not found', { storeId, error: storeError });
      return NextResponse.json(
        { error: 'Tienda no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que el usuario es el owner
    if (store.seller_id !== userId) {
      logger.warn('Unauthorized store update attempt', { storeId, userId, ownerId: store.seller_id });
      return NextResponse.json(
        { error: 'No tienes permisos para actualizar esta tienda' },
        { status: 403 }
      );
    }

    // Validar body con Zod
    const body = await request.json();
    const validatedData = MarketingIntegrationsSchema.parse(body);

    // Actualizar solo los campos de marketing
    const updateData = {
      fb_pixel_id: validatedData.fb_pixel_id ?? null,
      ga_measurement_id: validatedData.ga_measurement_id ?? null,
      gtm_id: validatedData.gtm_id ?? null,
    };

    // Type assertion para evitar problemas de inferencia de tipos en Supabase
    const queryResult = await (supabase
      .from('stores') as any)
      .update(updateData)
      .eq('id', storeId)
      .select('fb_pixel_id, ga_measurement_id, gtm_id')
      .single();
    
    const { data: updatedStore, error: updateError } = queryResult as {
      data: Pick<StoreRow, 'fb_pixel_id' | 'ga_measurement_id' | 'gtm_id'> | null;
      error: any;
    };

    if (updateError) {
      logger.error('Error updating store marketing', { storeId, error: updateError });
      return NextResponse.json(
        { error: 'Error al actualizar la configuración de marketing' },
        { status: 500 }
      );
    }

    logger.info('Store marketing updated', { storeId, userId });

    return NextResponse.json({
      success: true,
      data: updatedStore,
    });
  } catch (error) {
    logger.error('Unhandled error in marketing update', error);

    // Si es error de validación Zod
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}


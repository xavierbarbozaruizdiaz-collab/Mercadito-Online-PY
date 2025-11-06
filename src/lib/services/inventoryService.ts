// ============================================
// MERCADITO ONLINE PY - INVENTORY SERVICE
// Servicio para gestión de inventario
// ============================================

import { supabase } from '@/lib/supabase/client';
import { logger } from '@/lib/utils/logger';

// ============================================
// TIPOS
// ============================================

export interface StockReservation {
  id: string;
  product_id: string;
  user_id: string;
  quantity: number;
  expires_at: string;
  created_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: 'sale' | 'restock' | 'adjustment' | 'return' | 'expired_reservation' | 'cancellation';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  order_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

// ============================================
// FUNCIONES
// ============================================

/**
 * Obtiene el stock disponible considerando reservas
 * Retorna -1 si el stock es ilimitado
 */
export async function getAvailableStock(productId: string): Promise<number> {
  try {
    const { data, error } = await (supabase as any).rpc('get_available_stock', {
      p_product_id: productId,
    });

    if (error) {
      logger.error('Error getting available stock', error, { productId });
      // Si falla, intentar obtener stock directo
      const { data: product } = await supabase
        .from('products')
        .select('stock_quantity, stock_management_enabled')
        .eq('id', productId)
        .single();

      if (product && !(product as any).stock_management_enabled) {
        return -1; // Ilimitado
      }

      return (product as any)?.stock_quantity || 0;
    }

    return (data as number) ?? 0;
  } catch (err) {
    logger.error('Exception getting available stock', err, { productId });
    return 0;
  }
}

/**
 * Verifica si hay stock suficiente disponible
 */
export async function checkStockAvailability(
  productId: string,
  requestedQuantity: number
): Promise<{ available: boolean; availableStock: number; message?: string }> {
  try {
    // Validaciones
    if (!productId) {
      return {
        available: false,
        availableStock: 0,
        message: 'ID de producto inválido',
      };
    }
    
    if (requestedQuantity <= 0) {
      return {
        available: false,
        availableStock: 0,
        message: 'La cantidad solicitada debe ser mayor a 0',
      };
    }
    
    const availableStock = await getAvailableStock(productId);

    // Stock ilimitado
    if (availableStock === -1) {
      return { available: true, availableStock: -1 };
    }

    if (availableStock >= requestedQuantity) {
      return { 
        available: true, 
        availableStock,
        message: `Stock disponible: ${availableStock} unidades`,
      };
    }

    return {
      available: false,
      availableStock,
      message: `Stock insuficiente. Disponible: ${availableStock}, Solicitado: ${requestedQuantity}`,
    };
  } catch (err) {
    logger.error('Exception checking stock availability', err, { productId, requestedQuantity });
    return {
      available: false,
      availableStock: 0,
      message: 'Error al verificar stock',
    };
  }
}

/**
 * Reserva stock temporalmente cuando se agrega al carrito
 */
export async function reserveStock(
  productId: string,
  userId: string,
  quantity: number,
  expiresInMinutes: number = 15
): Promise<{ success: boolean; reservationId?: string; message?: string }> {
  try {
    // Verificar disponibilidad
    const check = await checkStockAvailability(productId, quantity);
    
    if (!check.available) {
      return {
        success: false,
        message: check.message || 'Stock insuficiente',
      };
    }

    // Si es ilimitado, no crear reserva
    if (check.availableStock === -1) {
      return {
        success: true,
        message: 'Stock ilimitado, no se requiere reserva',
      };
    }

    // Crear reserva
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

    const { data, error } = await (supabase as any)
      .from('cart_reservations')
      .insert({
        product_id: productId,
        user_id: userId,
        quantity,
        expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Error creating stock reservation', error, { productId, userId, quantity });
      return {
        success: false,
        message: 'Error al reservar stock',
      };
    }

    logger.debug('Stock reserved', { 
      productId, 
      userId, 
      quantity, 
      reservationId: data.id 
    });

    return {
      success: true,
      reservationId: data.id,
      message: 'Stock reservado exitosamente',
    };
  } catch (err) {
    logger.error('Exception reserving stock', err, { productId, userId, quantity });
    return {
      success: false,
      message: 'Error al reservar stock',
    };
  }
}

/**
 * Libera una reserva de stock
 */
export async function releaseReservation(reservationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('cart_reservations')
      .delete()
      .eq('id', reservationId);

    if (error) {
      logger.error('Error releasing reservation', error, { reservationId });
      return false;
    }

    return true;
  } catch (err) {
    logger.error('Exception releasing reservation', err, { reservationId });
    return false;
  }
}

/**
 * Libera todas las reservas de un usuario
 */
export async function releaseUserReservations(userId: string): Promise<number> {
  try {
    const { error, count } = await supabase
      .from('cart_reservations')
      .delete()
      .eq('user_id', userId);

    if (error) {
      logger.error('Error releasing user reservations', error, { userId });
      return 0;
    }

    return count || 0;
  } catch (err) {
    logger.error('Exception releasing user reservations', err, { userId });
    return 0;
  }
}

/**
 * Obtiene el historial de movimientos de stock
 */
export async function getStockMovements(
  productId: string,
  limit: number = 50
): Promise<StockMovement[]> {
  try {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Error getting stock movements', error, { productId });
      return [];
    }

    return data || [];
  } catch (err) {
    logger.error('Exception getting stock movements', err, { productId });
    return [];
  }
}

/**
 * Aumenta stock (reabastecimiento o devolución)
 */
export async function increaseStock(
  productId: string,
  quantity: number,
  movementType: 'restock' | 'return' = 'restock',
  orderId?: string,
  notes?: string,
  createdBy?: string
): Promise<boolean> {
  try {
    const { error } = await (supabase as any).rpc('increase_stock', {
      p_product_id: productId,
      p_quantity: quantity,
      p_movement_type: movementType,
      p_order_id: orderId || null,
      p_movement_notes: notes || null,
      p_created_by: createdBy || null,
    });

    if (error) {
      logger.error('Error increasing stock', error, { productId, quantity, movementType });
      return false;
    }

    logger.info('Stock increased', { productId, quantity, movementType });
    return true;
  } catch (err) {
    logger.error('Exception increasing stock', err, { productId, quantity });
    return false;
  }
}

/**
 * Reducir stock (venta)
 */
export async function decreaseStock(
  productId: string,
  quantity: number,
  orderId?: string,
  notes?: string,
  createdBy?: string
): Promise<boolean> {
  try {
    const { error } = await (supabase as any).rpc('decrease_stock', {
      p_product_id: productId,
      p_quantity: quantity,
      p_order_id: orderId || null,
      p_movement_notes: notes || null,
      p_created_by: createdBy || null,
    });

    if (error) {
      logger.error('Error decreasing stock', error, { productId, quantity });
      return false;
    }

    logger.info('Stock decreased', { productId, quantity, orderId });
    return true;
  } catch (err) {
    logger.error('Exception decreasing stock', err, { productId, quantity });
    return false;
  }
}

/**
 * Limpia reservas expiradas (tarea de mantenimiento)
 */
export async function cleanupExpiredReservations(): Promise<number> {
  try {
    const { data, error } = await (supabase as any).rpc('cleanup_expired_reservations');

    if (error) {
      logger.error('Error cleaning up expired reservations', error);
      return 0;
    }

    return data || 0;
  } catch (err) {
    logger.error('Exception cleaning up expired reservations', err);
    return 0;
  }
}


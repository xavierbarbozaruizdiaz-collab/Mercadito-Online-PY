// ============================================
// MERCADITO ONLINE PY - ORDER ADMIN SERVICE
// Servicio para gestión de órdenes desde admin
// ============================================

import { supabase } from '@/lib/supabase/client';

// ============================================
// TIPOS
// ============================================

export type OrderStatus = 'pending' | 'confirmed' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type DisputeStatus = 'none' | 'pending' | 'under_review' | 'resolved' | 'rejected';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';

export type OrderAdmin = {
  id: string;
  order_number: string;
  buyer_id: string;
  seller_id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  dispute_status: DisputeStatus;
  subtotal: number;
  shipping_cost: number;
  tax_amount: number;
  total_amount: number;
  payment_method: string;
  shipping_address: any;
  billing_address: any;
  notes: string | null;
  internal_notes: string | null;
  dispute_reason: string | null;
  dispute_resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  buyer: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
  } | null;
  seller: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  items: Array<{
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    product: {
      id: string;
      title: string;
      cover_url: string | null;
    } | null;
  }>;
};

export type OrderFilter = 'all' | 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded' | 'disputed';

export type OrderStats = {
  total: number;
  pending: number;
  paid: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  refunded: number;
  disputed: number;
  total_revenue: number;
  total_refunds: number;
  average_order_value: number;
};

// ============================================
// FUNCIONES DEL SERVICIO
// ============================================

/**
 * Obtiene todas las órdenes con filtros (admin)
 */
export async function getAllOrders(options: {
  page?: number;
  limit?: number;
  filter?: OrderFilter;
  search?: string;
  seller_id?: string;
  buyer_id?: string;
  date_from?: string;
  date_to?: string;
}): Promise<{ orders: OrderAdmin[]; total: number; total_pages: number }> {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('orders')
    .select(`
      id,
      order_number,
      buyer_id,
      seller_id,
      status,
      payment_status,
      dispute_status,
      subtotal,
      shipping_cost,
      tax_amount,
      total_amount,
      payment_method,
      shipping_address,
      billing_address,
      notes,
      internal_notes,
      dispute_reason,
      dispute_resolution_notes,
      created_at,
      updated_at
    `, { count: 'exact' });

  // Aplicar filtros
  if (options.filter) {
    switch (options.filter) {
      case 'pending':
        query = query.eq('status', 'pending');
        break;
      case 'paid':
        query = query.eq('payment_status', 'paid');
        break;
      case 'shipped':
        query = query.eq('status', 'shipped');
        break;
      case 'delivered':
        query = query.eq('status', 'delivered');
        break;
      case 'cancelled':
        query = query.eq('status', 'cancelled');
        break;
      case 'refunded':
        query = query.eq('payment_status', 'refunded');
        break;
      case 'disputed':
        query = query.neq('dispute_status', 'none');
        break;
    }
  }

  if (options.seller_id) {
    query = query.eq('seller_id', options.seller_id);
  }

  if (options.buyer_id) {
    query = query.eq('buyer_id', options.buyer_id);
  }

  if (options.date_from) {
    query = query.gte('created_at', options.date_from);
  }

  if (options.date_to) {
    query = query.lte('created_at', options.date_to);
  }

  // Búsqueda por número de orden
  if (options.search) {
    query = query.ilike('order_number', `%${options.search}%`);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching orders:', error);
    return { orders: [], total: 0, total_pages: 0 };
  }

  const total = count || 0;
  const total_pages = Math.ceil(total / limit);

  // Enriquecer con información de buyer, seller e items
  // Limitar a 20 órdenes para evitar demasiadas consultas simultáneas
  const ordersToEnrich = (data || []).slice(0, 20);
  
  const enrichedOrders = await Promise.allSettled(
    ordersToEnrich.map(async (order: any) => {
      try {
        const [buyerRes, sellerRes, itemsRes] = await Promise.all([
          order.buyer_id
            ? supabase
                .from('profiles')
                .select('id, email, first_name, last_name, phone')
                .eq('id', order.buyer_id)
                .single()
            : Promise.resolve({ data: null, error: null }),
          order.seller_id
            ? supabase
                .from('profiles')
                .select('id, email, first_name, last_name')
                .eq('id', order.seller_id)
                .single()
            : Promise.resolve({ data: null, error: null }),
          supabase
            .from('order_items')
            .select(`
              id,
              product_id,
              quantity,
              unit_price,
              total_price,
              product:products(id, title, cover_url)
            `)
            .eq('order_id', order.id),
        ]);

        return {
          ...order,
          buyer: buyerRes.data,
          seller: sellerRes.data,
          items: itemsRes.data || [],
        };
      } catch (err: any) {
        console.error(`Error enriqueciendo orden ${order.id}:`, err);
        // Devolver orden sin enriquecer en caso de error
        return {
          ...order,
          buyer: null,
          seller: null,
          items: [],
        };
      }
    })
  );

  // Filtrar solo las promesas cumplidas exitosamente
  const successfulOrders = enrichedOrders
    .filter((result) => result.status === 'fulfilled')
    .map((result) => (result as PromiseFulfilledResult<any>).value);

  return {
    orders: successfulOrders as OrderAdmin[],
    total,
    total_pages,
  };
}

/**
 * Obtiene una orden por ID
 */
export async function getOrderById(orderId: string): Promise<OrderAdmin | null> {
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (error || !order) {
    return null;
  }

  // Type assertion needed due to Supabase strict typing
  type OrderData = { id: string; buyer_id: string; seller_id?: string | null };
  const orderTyped = order as unknown as OrderData;

  // Enriquecer con información adicional
  const [buyerRes, sellerRes, itemsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, first_name, last_name, phone')
      .eq('id', orderTyped.buyer_id)
      .single(),
    orderTyped.seller_id
      ? supabase
          .from('profiles')
          .select('id, email, first_name, last_name')
          .eq('id', orderTyped.seller_id!)
          .single()
      : { data: null },
    supabase
      .from('order_items')
      .select(`
        id,
        product_id,
        quantity,
        unit_price,
        total_price,
        product:products(id, title, cover_url)
      `)
      .eq('order_id', orderTyped.id),
  ]);

  return {
    ...(order as Record<string, any>),
    buyer: buyerRes.data,
    seller: sellerRes.data,
    items: itemsRes.data || [],
  } as unknown as OrderAdmin;
}

/**
 * Actualiza el estado de una orden
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  adminId: string,
  notes?: string
): Promise<void> {
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (notes) {
    updateData.internal_notes = notes;
  }

  // Si se cancela, registrar quién la canceló
  if (status === 'cancelled') {
    updateData.cancelled_by = adminId;
  }

  // Using 'as any' to bypass Supabase strict type constraint for updates
  const { error } = await (supabase as any)
    .from('orders')
    .update(updateData)
    .eq('id', orderId);

  if (error) {
    console.error('Error updating order status:', error);
    throw new Error(error.message);
  }
}

/**
 * Resuelve una disputa
 */
export async function resolveDispute(
  orderId: string,
  resolution: 'resolved' | 'rejected',
  adminId: string,
  resolutionNotes: string
): Promise<void> {
  // Using 'as any' to bypass Supabase strict type constraint for updates
  const { error } = await (supabase as any)
    .from('orders')
    .update({
      dispute_status: resolution,
      dispute_resolved_by: adminId,
      dispute_resolved_at: new Date().toISOString(),
      dispute_resolution_notes: resolutionNotes,
    })
    .eq('id', orderId);

  if (error) {
    console.error('Error resolving dispute:', error);
    throw new Error(error.message);
  }
}

/**
 * Actualiza el estado de pago
 */
export async function updatePaymentStatus(
  orderId: string,
  paymentStatus: PaymentStatus,
  adminId: string
): Promise<void> {
  // Using 'as any' to bypass Supabase strict type constraint for updates
  const { error } = await (supabase as any)
    .from('orders')
    .update({
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (error) {
    console.error('Error updating payment status:', error);
    throw new Error(error.message);
  }
}

/**
 * Agrega notas internas
 */
export async function addInternalNotes(
  orderId: string,
  notes: string
): Promise<void> {
  // Obtener notas existentes
  const { data: order } = await supabase
    .from('orders')
    .select('internal_notes')
    .eq('id', orderId)
    .single();

  const existingNotes = (order as any)?.internal_notes || '';
  const newNotes = existingNotes
    ? `${existingNotes}\n\n[${new Date().toLocaleString('es-PY')}] ${notes}`
    : `[${new Date().toLocaleString('es-PY')}] ${notes}`;

  // Using 'as any' to bypass Supabase strict type constraint for updates
  const { error } = await (supabase as any)
    .from('orders')
    .update({ internal_notes: newNotes })
    .eq('id', orderId);

  if (error) {
    console.error('Error adding internal notes:', error);
    throw new Error(error.message);
  }
}

/**
 * Obtiene estadísticas de órdenes
 */
export async function getOrderStats(dateFrom?: string, dateTo?: string): Promise<OrderStats> {
  try {
    // Using 'as any' to bypass Supabase strict type constraint
    let baseQuery = (supabase as any).from('orders');
    let filteredQuery = baseQuery;

    if (dateFrom) {
      filteredQuery = filteredQuery.gte('created_at', dateFrom);
    }
    if (dateTo) {
      filteredQuery = filteredQuery.lte('created_at', dateTo);
    }

    const [
      totalResult,
      pendingResult,
      paidResult,
      shippedResult,
      deliveredResult,
      cancelledResult,
      refundedResult,
      disputedResult,
      revenueResult,
    ] = await Promise.all([
      filteredQuery.select('id', { count: 'exact', head: true }),
      filteredQuery.select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      filteredQuery.select('id', { count: 'exact', head: true }).eq('payment_status', 'paid'),
      filteredQuery.select('id', { count: 'exact', head: true }).eq('status', 'shipped'),
      filteredQuery.select('id', { count: 'exact', head: true }).eq('status', 'delivered'),
      filteredQuery.select('id', { count: 'exact', head: true }).eq('status', 'cancelled'),
      filteredQuery.select('id', { count: 'exact', head: true }).eq('payment_status', 'refunded'),
      filteredQuery.select('id', { count: 'exact', head: true }).neq('dispute_status', 'none'),
      filteredQuery.select('total_amount').eq('payment_status', 'paid'),
    ]);

    const revenueData = revenueResult.data || [];
    const total_revenue = revenueData.reduce((sum: number, order: any) => sum + (parseFloat(order.total_amount) || 0), 0);

    const total = totalResult.count || 0;
    const average_order_value = total > 0 ? total_revenue / total : 0;

    return {
      total,
      pending: pendingResult.count || 0,
      paid: paidResult.count || 0,
      shipped: shippedResult.count || 0,
      delivered: deliveredResult.count || 0,
      cancelled: cancelledResult.count || 0,
      refunded: refundedResult.count || 0,
      disputed: disputedResult.count || 0,
      total_revenue,
      total_refunds: 0, // TODO: calcular desde órdenes refunded
      average_order_value,
    };
  } catch (error) {
    console.error('Error fetching order stats:', error);
    return {
      total: 0,
      pending: 0,
      paid: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      refunded: 0,
      disputed: 0,
      total_revenue: 0,
      total_refunds: 0,
      average_order_value: 0,
    };
  }
}


// ============================================
// MERCADITO ONLINE PY - DATA LAYER UNIFICADO
// Sistema centralizado de tracking para GTM, GA4, Meta Pixel y TikTok Pixel
// ============================================

/**
 * Tipos de eventos de tracking soportados
 */
export type TrackingEventName =
  | 'pageview'
  | 'signup'
  | 'login'
  | 'view_product'
  | 'publish_product'
  | 'bid'
  | 'win'
  | 'lose'
  | 'purchase'
  | 'membership_activated';

/**
 * Declaración global para window.dataLayer
 */
declare global {
  interface Window {
    dataLayer?: any[];
  }
}

/**
 * Obtiene o inicializa el dataLayer de forma segura (SSR-safe)
 * @returns El dataLayer o null si estamos en servidor
 */
export function getDataLayer(): any[] | null {
  if (typeof window === 'undefined') return null;
  
  if (!window.dataLayer) {
    window.dataLayer = [];
  }
  
  return window.dataLayer;
}

/**
 * Función central para trackear eventos al dataLayer
 * Todos los eventos pasan por aquí y luego GTM/Meta/TikTok los procesan
 * 
 * @param event - Nombre del evento
 * @param payload - Datos adicionales del evento
 */
export function track(event: TrackingEventName, payload: Record<string, any> = {}): void {
  const dl = getDataLayer();
  if (!dl) return;

  const eventData = {
    event,
    ...payload,
  };

  dl.push(eventData);

  // Debug logging si está habilitado
  if (process.env.NEXT_PUBLIC_TRACKING_DEBUG === 'true') {
    console.log(`[TRACK] ${event}`, payload);
  }
}

// ============================================
// HELPERS PARA EVENTOS ESPECÍFICOS
// ============================================

/**
 * Trackea vista de página
 */
export function trackPageview(path: string, extra: Record<string, any> = {}): void {
  track('pageview', {
    page_path: path,
    page_title: typeof document !== 'undefined' ? document.title : '',
    ...extra,
  });
}

/**
 * Trackea registro de usuario
 */
export function trackSignup(userId: string, method: string = 'email', extra: Record<string, any> = {}): void {
  track('signup', {
    user_id: userId,
    method, // 'email', 'google', 'facebook'
    ...extra,
  });
}

/**
 * Trackea inicio de sesión
 */
export function trackLogin(userId: string, method: string = 'email', extra: Record<string, any> = {}): void {
  track('login', {
    user_id: userId,
    method, // 'email', 'google', 'facebook'
    ...extra,
  });
}

/**
 * Trackea vista de producto
 */
export function trackViewProduct(
  productId: string,
  productName: string,
  price: number,
  extra: Record<string, any> = {}
): void {
  track('view_product', {
    product_id: productId,
    name: productName,
    price,
    currency: 'PYG',
    ...extra,
  });
}

/**
 * Trackea publicación de producto
 */
export function trackPublishProduct(
  productId: string,
  productName: string,
  price: number,
  storeId?: string | null,
  category?: string,
  extra: Record<string, any> = {}
): void {
  track('publish_product', {
    product_id: productId,
    name: productName,
    price,
    currency: 'PYG',
    store_id: storeId,
    category,
    ...extra,
  });
}

/**
 * Trackea puja en subasta
 */
export function trackBid(
  auctionId: string,
  bidAmount: number,
  userId: string,
  currentBid?: number,
  extra: Record<string, any> = {}
): void {
  track('bid', {
    auction_id: auctionId,
    amount: bidAmount,
    user_id: userId,
    current_bid: currentBid,
    currency: 'PYG',
    ...extra,
  });
}

/**
 * Trackea ganar subasta
 */
export function trackWin(
  auctionId: string,
  finalPrice: number,
  userId: string,
  extra: Record<string, any> = {}
): void {
  track('win', {
    auction_id: auctionId,
    final_price: finalPrice,
    user_id: userId,
    currency: 'PYG',
    ...extra,
  });
}

/**
 * Trackea perder subasta
 */
export function trackLose(
  auctionId: string,
  userId: string,
  winningBid?: number,
  winnerId?: string,
  extra: Record<string, any> = {}
): void {
  track('lose', {
    auction_id: auctionId,
    user_id: userId,
    winning_bid: winningBid,
    winner_id: winnerId,
    ...extra,
  });
}

/**
 * Trackea compra completada
 */
export function trackPurchase(
  orderId: string,
  total: number,
  items?: Array<{
    item_id: string;
    item_name: string;
    price: number;
    quantity: number;
    category?: string;
  }>,
  extra: Record<string, any> = {}
): void {
  track('purchase', {
    transaction_id: orderId,
    value: total,
    currency: 'PYG',
    items: items || [],
    ...extra,
  });
}

/**
 * Trackea activación de membresía
 */
export function trackMembershipActivated(
  subscriptionId: string,
  planId: string,
  planName: string,
  planType: string,
  subscriptionType: string,
  amount: number,
  userId: string,
  extra: Record<string, any> = {}
): void {
  track('membership_activated', {
    subscription_id: subscriptionId,
    plan_id: planId,
    plan_name: planName,
    plan_type: planType,
    subscription_type: subscriptionType,
    value: amount,
    currency: 'PYG',
    user_id: userId,
    ...extra,
  });
}






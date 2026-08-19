/**
 * @deprecated Este archivo está deprecado.
 * Por favor usa @/lib/tracking/dataLayer en su lugar.
 * 
 * Migración:
 * - dlPush() → track() de dataLayer.ts
 * - trackViewItem() → trackViewItem() de dataLayer.ts
 * - trackAddToCart() → trackAddToCart() de dataLayer.ts
 * - trackBeginCheckout() → trackBeginCheckout() de dataLayer.ts
 * - trackPurchase() → trackPurchase() de dataLayer.ts
 */

// ============================================
// MERCADITO ONLINE PY - GTM ANALYTICS HELPER
// Helper para eventos e-commerce vía Google Tag Manager
// ============================================

// Configuración centralizada
export const ANALYTICS_CONFIG = {
  currency: 'PYG',
  debug: process.env.NEXT_PUBLIC_TRACKING_DEBUG === 'true',
} as const;

// Tipos para items de e-commerce
export type Item = {
  item_id: string;
  item_name: string;
  price?: number;
  quantity?: number;
  item_category?: string;
  item_brand?: string;
};

// Tipo para dataLayer
declare global {
  interface Window {
    dataLayer?: any[];
  }
}

// ============================================
// FUNCIÓN BASE PARA PUSH AL DATALAYER
// ============================================

/**
 * Función base para hacer push al dataLayer de GTM
 * @param evt - Nombre del evento
 * @param payload - Datos del evento
 */
export function dlPush(evt: string, payload: any = {}): void {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];
  
  const eventData = {
    event: evt,
    ...payload,
  };

  window.dataLayer.push(eventData);

  // Debug logging si está habilitado
  if (ANALYTICS_CONFIG.debug) {
    console.log(`[TRACK] ${evt}`, payload);
  }
}

// ============================================
// EVENTOS DE E-COMMERCE
// ============================================

/**
 * Trackea cuando un usuario ve un producto
 * @param item - Información del producto
 */
export function trackViewItem(item: Item): void {
  dlPush('view_item', {
    ecommerce: {
      currency: ANALYTICS_CONFIG.currency,
      value: item.price ?? 0,
      items: [
        {
          item_id: item.item_id,
          item_name: item.item_name,
          price: item.price ?? 0,
          quantity: item.quantity ?? 1,
          item_category: item.item_category,
          item_brand: item.item_brand,
        },
      ],
    },
  });
}

/**
 * Trackea cuando un usuario agrega un producto al carrito
 * @param item - Información del producto
 */
export function trackAddToCart(item: Item): void {
  dlPush('add_to_cart', {
    ecommerce: {
      currency: ANALYTICS_CONFIG.currency,
      value: (item.price ?? 0) * (item.quantity ?? 1),
      items: [
        {
          item_id: item.item_id,
          item_name: item.item_name,
          price: item.price ?? 0,
          quantity: item.quantity ?? 1,
          item_category: item.item_category,
          item_brand: item.item_brand,
        },
      ],
    },
  });
}

/**
 * Trackea cuando un usuario inicia el checkout
 * @param items - Lista de items en el carrito
 * @param total - Total del carrito
 */
export function trackBeginCheckout(items: Item[], total: number): void {
  dlPush('begin_checkout', {
    ecommerce: {
      currency: ANALYTICS_CONFIG.currency,
      value: total,
      items: items.map((item) => ({
        item_id: item.item_id,
        item_name: item.item_name,
        price: item.price ?? 0,
        quantity: item.quantity ?? 1,
        item_category: item.item_category,
        item_brand: item.item_brand,
      })),
    },
  });
}

/**
 * Trackea cuando se completa una compra
 * @param orderId - ID de la orden
 * @param items - Lista de items comprados
 * @param total - Total de la compra
 */
export function trackPurchase(orderId: string, items: Item[], total: number): void {
  dlPush('purchase', {
    ecommerce: {
      transaction_id: orderId,
      currency: ANALYTICS_CONFIG.currency,
      value: total,
      items: items.map((item) => ({
        item_id: item.item_id,
        item_name: item.item_name,
        price: item.price ?? 0,
        quantity: item.quantity ?? 1,
        item_category: item.item_category,
        item_brand: item.item_brand,
      })),
    },
  });
}


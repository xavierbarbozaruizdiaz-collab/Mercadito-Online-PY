// ============================================
// MARKETING EVENTS - UNIFIED API
// API unificada para trackear eventos a GA4 y Facebook Pixel
// Soporta múltiples pixels (global + store)
// ============================================

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
    fbq?: (
      action: string,
      eventName: string,
      eventData?: Record<string, any>,
      namespace?: string
    ) => void;
  }
}

interface ViewItemParams {
  id: string;
  name: string;
  price: number;
  currency?: string;
  category?: string;
  storeId?: string;
}

interface AddToCartParams {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  currency?: string;
  category?: string;
}

interface BeginCheckoutParams {
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    category?: string;
  }>;
  value: number;
  currency?: string;
}

interface PurchaseParams {
  transaction_id: string;
  value: number;
  currency: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    category?: string;
  }>;
}

/**
 * Trackea vista de página
 */
export function trackPageView(path?: string) {
  if (typeof window === 'undefined') return;

  const pagePath = path || window.location.pathname;

  // GA4
  if (window.gtag) {
    window.gtag('config', window.dataLayer?.[0]?.config?.id || '', {
      page_path: pagePath,
      page_title: document.title,
    });
  }

  // Facebook Pixel (ambos si existen)
  if (window.fbq) {
    // Global pixel
    window.fbq('track', 'PageView');
    
    // Store pixel (si existe con namespace)
    try {
      window.fbq('track', 'PageView', {}, 'store');
    } catch (e) {
      // Ignorar si no existe store pixel
    }
  }
}

/**
 * Trackea vista de producto
 */
export function trackViewItem(params: ViewItemParams) {
  if (typeof window === 'undefined') return;

  // GA4
  if (window.gtag) {
    window.gtag('event', 'view_item', {
      currency: params.currency || 'PYG',
      value: params.price,
      items: [
        {
          item_id: params.id,
          item_name: params.name,
          item_category: params.category,
          price: params.price,
          quantity: 1,
        },
      ],
    });
  }

  // Facebook Pixel
  if (window.fbq) {
    const pixelParams = {
      content_name: params.name,
      content_category: params.category,
      content_ids: [params.id],
      value: params.price,
      currency: params.currency || 'PYG',
      content_type: 'product',
    };

    // Global pixel
    window.fbq('track', 'ViewContent', pixelParams);
    
    // Store pixel (si existe)
    try {
      window.fbq('track', 'ViewContent', pixelParams, 'store');
    } catch (e) {
      // Ignorar si no existe store pixel
    }
  }
}

/**
 * Trackea agregar al carrito
 */
export function trackAddToCart(params: AddToCartParams) {
  if (typeof window === 'undefined') return;

  const quantity = params.quantity || 1;
  const value = params.price * quantity;

  // GA4
  if (window.gtag) {
    window.gtag('event', 'add_to_cart', {
      currency: params.currency || 'PYG',
      value,
      items: [
        {
          item_id: params.id,
          item_name: params.name,
          item_category: params.category,
          price: params.price,
          quantity,
        },
      ],
    });
  }

  // Facebook Pixel
  if (window.fbq) {
    const pixelParams = {
      content_name: params.name,
      content_category: params.category,
      content_ids: [params.id],
      contents: [
        {
          id: params.id,
          quantity,
          item_price: params.price,
        },
      ],
      value,
      currency: params.currency || 'PYG',
    };

    // Global pixel
    window.fbq('track', 'AddToCart', pixelParams);
    
    // Store pixel (si existe)
    try {
      window.fbq('track', 'AddToCart', pixelParams, 'store');
    } catch (e) {
      // Ignorar si no existe store pixel
    }
  }
}

/**
 * Trackea inicio de checkout
 */
export function trackBeginCheckout(params: BeginCheckoutParams) {
  if (typeof window === 'undefined') return;

  // GA4
  if (window.gtag) {
    window.gtag('event', 'begin_checkout', {
      currency: params.currency || 'PYG',
      value: params.value,
      items: params.items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        item_category: item.category,
        price: item.price,
        quantity: item.quantity,
      })),
    });
  }

  // Facebook Pixel
  if (window.fbq) {
    const pixelParams = {
      contents: params.items.map(item => ({
        id: item.id,
        quantity: item.quantity,
        item_price: item.price,
      })),
      value: params.value,
      currency: params.currency || 'PYG',
      num_items: params.items.reduce((sum, item) => sum + item.quantity, 0),
    };

    // Global pixel
    window.fbq('track', 'InitiateCheckout', pixelParams);
    
    // Store pixel (si existe)
    try {
      window.fbq('track', 'InitiateCheckout', pixelParams, 'store');
    } catch (e) {
      // Ignorar si no existe store pixel
    }
  }
}

/**
 * Trackea compra completada
 */
export function trackPurchase(params: PurchaseParams) {
  if (typeof window === 'undefined') return;

  // GA4
  if (window.gtag) {
    window.gtag('event', 'purchase', {
      transaction_id: params.transaction_id,
      value: params.value,
      currency: params.currency,
      items: params.items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        item_category: item.category,
        price: item.price,
        quantity: item.quantity,
      })),
    });
  }

  // Facebook Pixel
  if (window.fbq) {
    const pixelParams = {
      content_ids: params.items.map(item => item.id),
      contents: params.items.map(item => ({
        id: item.id,
        quantity: item.quantity,
        item_price: item.price,
      })),
      value: params.value,
      currency: params.currency,
      num_items: params.items.reduce((sum, item) => sum + item.quantity, 0),
    };

    // Global pixel
    window.fbq('track', 'Purchase', pixelParams);
    
    // Store pixel (si existe)
    try {
      window.fbq('track', 'Purchase', pixelParams, 'store');
    } catch (e) {
      // Ignorar si no existe store pixel
    }
  }
}

/**
 * Trackea búsqueda
 */
export function trackSearch(searchTerm: string) {
  if (typeof window === 'undefined') return;

  // GA4
  if (window.gtag) {
    window.gtag('event', 'search', {
      search_term: searchTerm,
    });
  }

  // Facebook Pixel
  if (window.fbq) {
    const pixelParams = {
      search_string: searchTerm,
    };

    // Global pixel
    window.fbq('track', 'Search', pixelParams);
    
    // Store pixel (si existe)
    try {
      window.fbq('track', 'Search', pixelParams, 'store');
    } catch (e) {
      // Ignorar si no existe store pixel
    }
  }
}

/**
 * Trackea lead (ej: click en WhatsApp)
 */
export function trackLead(source?: string) {
  if (typeof window === 'undefined') return;

  // GA4
  if (window.gtag) {
    window.gtag('event', 'generate_lead', {
      ...(source && { source }),
    });
  }

  // Facebook Pixel
  if (window.fbq) {
    const pixelParams = {
      ...(source && { content_name: source }),
    };

    // Global pixel
    window.fbq('track', 'Lead', pixelParams);
    
    // Store pixel (si existe)
    try {
      window.fbq('track', 'Lead', pixelParams, 'store');
    } catch (e) {
      // Ignorar si no existe store pixel
    }
  }
}


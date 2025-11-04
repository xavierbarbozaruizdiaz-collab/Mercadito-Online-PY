// ============================================
// GOOGLE ANALYTICS 4 SERVICE
// Implementación completa de GA4
// ============================================

declare global {
  interface Window {
    gtag?: (
      command: string,
      targetId: string,
      config?: Record<string, any>
    ) => void;
    dataLayer?: any[];
  }
}

export interface GA4Event {
  event_category?: string;
  event_label?: string;
  value?: number;
  currency?: string;
  items?: Array<{
    item_id: string;
    item_name: string;
    item_category?: string;
    quantity?: number;
    price?: number;
  }>;
  [key: string]: any;
}

class GoogleAnalyticsService {
  private measurementId: string | null = null;
  private initialized: boolean = false;

  /**
   * Inicializa Google Analytics 4
   */
  initialize(measurementId: string): void {
    if (typeof window === 'undefined' || this.initialized) return;

    this.measurementId = measurementId;

    // Crear dataLayer
    if (!window.dataLayer) {
      window.dataLayer = [];
    }

    // Script de Google Analytics
    const script1 = document.createElement('script');
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script1);

    // Script de inicialización
    const script2 = document.createElement('script');
    script2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${measurementId}', {
        page_path: window.location.pathname,
        send_page_view: true
      });
    `;
    document.head.appendChild(script2);

    this.initialized = true;
  }

  /**
   * Trackea un evento
   */
  trackEvent(eventName: string, eventData?: GA4Event): void {
    if (typeof window === 'undefined' || !window.gtag) {
      console.warn('Google Analytics no está inicializado');
      return;
    }

    window.gtag('event', eventName, eventData || {});
  }

  /**
   * Trackea vista de página
   */
  trackPageView(pagePath?: string, pageTitle?: string): void {
    if (typeof window === 'undefined' || !window.gtag) return;

    window.gtag('config', this.measurementId!, {
      page_path: pagePath || window.location.pathname,
      page_title: pageTitle || document.title,
    });
  }

  /**
   * Trackea vista de producto
   */
  trackViewItem(product: {
    id: string;
    name: string;
    category?: string;
    price?: number;
    currency?: string;
  }): void {
    this.trackEvent('view_item', {
      currency: product.currency || 'PYG',
      value: product.price || 0,
      items: [
        {
          item_id: product.id,
          item_name: product.name,
          item_category: product.category,
          price: product.price || 0,
          quantity: 1,
        },
      ],
    });
  }

  /**
   * Trackea agregar al carrito
   */
  trackAddToCart(product: {
    id: string;
    name: string;
    category?: string;
    price: number;
    quantity?: number;
    currency?: string;
  }): void {
    this.trackEvent('add_to_cart', {
      currency: product.currency || 'PYG',
      value: product.price * (product.quantity || 1),
      items: [
        {
          item_id: product.id,
          item_name: product.name,
          item_category: product.category,
          price: product.price,
          quantity: product.quantity || 1,
        },
      ],
    });
  }

  /**
   * Trackea inicio de checkout
   */
  trackBeginCheckout(products: Array<{
    id: string;
    name: string;
    category?: string;
    price: number;
    quantity: number;
  }>, total: number, currency?: string): void {
    this.trackEvent('begin_checkout', {
      currency: currency || 'PYG',
      value: total,
      items: products.map(p => ({
        item_id: p.id,
        item_name: p.name,
        item_category: p.category,
        price: p.price,
        quantity: p.quantity,
      })),
    });
  }

  /**
   * Trackea compra completada
   */
  trackPurchase(order: {
    transactionId: string;
    products: Array<{
      id: string;
      name: string;
      category?: string;
      price: number;
      quantity: number;
    }>;
    total: number;
    currency?: string;
    shipping?: number;
    tax?: number;
  }): void {
    this.trackEvent('purchase', {
      transaction_id: order.transactionId,
      currency: order.currency || 'PYG',
      value: order.total,
      shipping: order.shipping || 0,
      tax: order.tax || 0,
      items: order.products.map(p => ({
        item_id: p.id,
        item_name: p.name,
        item_category: p.category,
        price: p.price,
        quantity: p.quantity,
      })),
    });
  }

  /**
   * Trackea vista de lista de productos
   */
  trackViewItemList(products: Array<{
    id: string;
    name: string;
    category?: string;
    price?: number;
  }>, listName?: string): void {
    this.trackEvent('view_item_list', {
      item_list_name: listName || 'Product List',
      items: products.map(p => ({
        item_id: p.id,
        item_name: p.name,
        item_category: p.category,
        price: p.price || 0,
        quantity: 1,
      })),
    });
  }

  /**
   * Trackea selección de producto
   */
  trackSelectItem(product: {
    id: string;
    name: string;
    category?: string;
    price?: number;
    listName?: string;
  }): void {
    this.trackEvent('select_item', {
      item_list_name: product.listName || 'Product List',
      items: [
        {
          item_id: product.id,
          item_name: product.name,
          item_category: product.category,
          price: product.price || 0,
          quantity: 1,
        },
      ],
    });
  }

  /**
   * Trackea búsqueda
   */
  trackSearch(query: string, resultsCount?: number): void {
    this.trackEvent('search', {
      search_term: query,
      ...(resultsCount !== undefined && { number_of_results: resultsCount }),
    });
  }

  /**
   * Trackea vista de tienda
   */
  trackStoreView(store: {
    id: string;
    name: string;
  }): void {
    this.trackEvent('view_store', {
      store_id: store.id,
      store_name: store.name,
    });
  }

  /**
   * Trackea vista de subasta
   */
  trackAuctionView(auction: {
    id: string;
    title: string;
    currentBid?: number;
  }): void {
    this.trackEvent('view_auction', {
      auction_id: auction.id,
      auction_title: auction.title,
      ...(auction.currentBid && { current_bid: auction.currentBid }),
    });
  }

  /**
   * Establece propiedades de usuario
   */
  setUserProperties(properties: {
    userId?: string;
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    [key: string]: any;
  }): void {
    if (typeof window === 'undefined' || !window.gtag) return;

    window.gtag('set', 'user_properties', properties);
  }

  /**
   * Establece ID de usuario
   */
  setUserId(userId: string): void {
    if (typeof window === 'undefined' || !window.gtag) return;

    window.gtag('config', this.measurementId!, {
      user_id: userId,
    });
  }

  /**
   * Trackea conversión
   */
  trackConversion(conversionId: string, value?: number, currency?: string): void {
    this.trackEvent('conversion', {
      conversion_id: conversionId,
      ...(value !== undefined && { value }),
      ...(currency && { currency }),
    });
  }
}

// Exportar instancia singleton
export const googleAnalytics = new GoogleAnalyticsService();

// Hook de React
export function useGoogleAnalytics() {
  return {
    trackEvent: googleAnalytics.trackEvent.bind(googleAnalytics),
    trackPageView: googleAnalytics.trackPageView.bind(googleAnalytics),
    trackViewItem: googleAnalytics.trackViewItem.bind(googleAnalytics),
    trackAddToCart: googleAnalytics.trackAddToCart.bind(googleAnalytics),
    trackBeginCheckout: googleAnalytics.trackBeginCheckout.bind(googleAnalytics),
    trackPurchase: googleAnalytics.trackPurchase.bind(googleAnalytics),
    trackViewItemList: googleAnalytics.trackViewItemList.bind(googleAnalytics),
    trackSelectItem: googleAnalytics.trackSelectItem.bind(googleAnalytics),
    trackSearch: googleAnalytics.trackSearch.bind(googleAnalytics),
    trackStoreView: googleAnalytics.trackStoreView.bind(googleAnalytics),
    trackAuctionView: googleAnalytics.trackAuctionView.bind(googleAnalytics),
    setUserProperties: googleAnalytics.setUserProperties.bind(googleAnalytics),
    setUserId: googleAnalytics.setUserId.bind(googleAnalytics),
    trackConversion: googleAnalytics.trackConversion.bind(googleAnalytics),
  };
}


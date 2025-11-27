/**
 * @deprecated Este servicio está deprecado.
 * NO cargues Facebook Pixel directamente. GTM debe cargarlo.
 * NO uses fbq() directamente. Usa track() de @/lib/tracking/dataLayer.
 * 
 * Este archivo se mantiene temporalmente para compatibilidad,
 * pero será removido en futuras versiones.
 */

// ============================================
// FACEBOOK PIXEL SERVICE
// Tracking completo de eventos para Facebook Pixel
// ============================================

declare global {
  interface Window {
    fbq?: (
      action: string,
      eventName: string,
      eventData?: Record<string, any>,
      namespace?: string
    ) => void;
    _fbq?: any;
  }
}

export interface FacebookPixelEvent {
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  contents?: Array<{
    id: string;
    quantity: number;
    item_price: number;
  }>;
  value?: number;
  currency?: string;
  num_items?: number;
  search_string?: string;
  content_type?: string;
  [key: string]: any;
}

class FacebookPixelService {
  private pixelId: string | null = null;
  private initialized: boolean = false;

  /**
   * Inicializa Facebook Pixel
   */
  initialize(pixelId: string): void {
    if (typeof window === 'undefined' || this.initialized) return;

    this.pixelId = pixelId;

    // Crear script de Facebook Pixel
    const script = document.createElement('script');
    script.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${pixelId}');
      fbq('track', 'PageView');
    `;
    document.head.appendChild(script);

    // Noscript fallback
    const noscript = document.createElement('noscript');
    noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/>`;
    document.body.appendChild(noscript);

    this.initialized = true;
  }

  /**
   * Trackea un evento personalizado
   */
  track(eventName: string, eventData?: FacebookPixelEvent): void {
    if (typeof window === 'undefined' || !window.fbq) {
      console.warn('Facebook Pixel no está inicializado');
      return;
    }

    window.fbq('track', eventName, eventData || {});
  }

  /**
   * Trackea vista de página
   */
  trackPageView(): void {
    this.track('PageView');
  }

  /**
   * Trackea vista de contenido (producto)
   */
  trackViewContent(product: {
    id: string;
    title: string;
    price: number;
    category?: string;
    currency?: string;
  }): void {
    this.track('ViewContent', {
      content_name: product.title,
      content_category: product.category,
      content_ids: [product.id],
      value: product.price,
      currency: product.currency || 'PYG',
      content_type: 'product',
    });
  }

  /**
   * Trackea agregar al carrito
   */
  trackAddToCart(product: {
    id: string;
    title: string;
    price: number;
    quantity?: number;
    category?: string;
    currency?: string;
  }): void {
    this.track('AddToCart', {
      content_name: product.title,
      content_category: product.category,
      content_ids: [product.id],
      contents: [
        {
          id: product.id,
          quantity: product.quantity || 1,
          item_price: product.price,
        },
      ],
      value: product.price * (product.quantity || 1),
      currency: product.currency || 'PYG',
    });
  }

  /**
   * Trackea inicio de checkout
   */
  trackInitiateCheckout(products: Array<{
    id: string;
    quantity: number;
    price: number;
  }>, total: number, currency?: string): void {
    this.track('InitiateCheckout', {
      content_ids: products.map(p => p.id),
      contents: products.map(p => ({
        id: p.id,
        quantity: p.quantity,
        item_price: p.price,
      })),
      value: total,
      currency: currency || 'PYG',
      num_items: products.reduce((sum, p) => sum + p.quantity, 0),
    });
  }

  /**
   * Trackea compra completada
   */
  trackPurchase(order: {
    orderId: string;
    products: Array<{
      id: string;
      quantity: number;
      price: number;
    }>;
    total: number;
    currency?: string;
  }): void {
    this.track('Purchase', {
      content_ids: order.products.map(p => p.id),
      contents: order.products.map(p => ({
        id: p.id,
        quantity: p.quantity,
        item_price: p.price,
      })),
      value: order.total,
      currency: order.currency || 'PYG',
      num_items: order.products.reduce((sum, p) => sum + p.quantity, 0),
    });
  }

  /**
   * Trackea búsqueda
   */
  trackSearch(query: string, resultsCount?: number): void {
    this.track('Search', {
      search_string: query,
      content_type: 'product',
      ...(resultsCount !== undefined && { num_results: resultsCount }),
    });
  }

  /**
   * Trackea vista de tienda
   */
  trackStoreView(store: {
    id: string;
    name: string;
  }): void {
    this.track('ViewContent', {
      content_name: store.name,
      content_ids: [store.id],
      content_type: 'store',
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
    this.track('ViewContent', {
      content_name: auction.title,
      content_ids: [auction.id],
      content_type: 'auction',
      ...(auction.currentBid && { value: auction.currentBid }),
    });
  }

  /**
   * Trackea participación en sorteo
   */
  trackRaffleParticipate(raffle: {
    id: string;
    title: string;
    ticketPrice?: number;
  }): void {
    this.track('Lead', {
      content_name: raffle.title,
      content_ids: [raffle.id],
      content_type: 'raffle',
      ...(raffle.ticketPrice && { value: raffle.ticketPrice }),
    });
  }

  /**
   * Trackea seguir tienda
   */
  trackStoreFollow(store: {
    id: string;
    name: string;
  }): void {
    this.track('Lead', {
      content_name: store.name,
      content_ids: [store.id],
      content_type: 'store_follow',
    });
  }

  /**
   * Trackea evento personalizado
   */
  trackCustomEvent(eventName: string, eventData?: FacebookPixelEvent): void {
    this.track(eventName, eventData);
  }

  /**
   * Identifica usuario (para tracking mejorado)
   */
  identify(userId: string, userData?: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
  }): void {
    if (typeof window === 'undefined' || !window.fbq) return;

    window.fbq('track', 'CompleteRegistration', {
      ...userData,
    });
  }
}

// Exportar instancia singleton
export const facebookPixel = new FacebookPixelService();

// Hook de React para usar en componentes
export function useFacebookPixel() {
  return {
    track: facebookPixel.track.bind(facebookPixel),
    trackPageView: facebookPixel.trackPageView.bind(facebookPixel),
    trackViewContent: facebookPixel.trackViewContent.bind(facebookPixel),
    trackAddToCart: facebookPixel.trackAddToCart.bind(facebookPixel),
    trackInitiateCheckout: facebookPixel.trackInitiateCheckout.bind(facebookPixel),
    trackPurchase: facebookPixel.trackPurchase.bind(facebookPixel),
    trackSearch: facebookPixel.trackSearch.bind(facebookPixel),
    trackStoreView: facebookPixel.trackStoreView.bind(facebookPixel),
    trackAuctionView: facebookPixel.trackAuctionView.bind(facebookPixel),
    trackRaffleParticipate: facebookPixel.trackRaffleParticipate.bind(facebookPixel),
    trackStoreFollow: facebookPixel.trackStoreFollow.bind(facebookPixel),
    trackCustomEvent: facebookPixel.trackCustomEvent.bind(facebookPixel),
    identify: facebookPixel.identify.bind(facebookPixel),
  };
}


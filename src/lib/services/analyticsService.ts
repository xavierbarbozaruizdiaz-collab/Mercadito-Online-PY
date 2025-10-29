// ============================================
// MERCADITO ONLINE PY - ANALYTICS SERVICE
// Servicio de analytics y monitoreo
// ============================================

import { supabase } from '@/lib/supabase/client';

// ============================================
// TIPOS DE EVENTOS
// ============================================

export interface AnalyticsEvent {
  event_type: string;
  event_data: Record<string, any>;
  page_url: string;
  user_agent?: string;
  user_id?: string;
  session_id?: string;
  timestamp?: string;
}

export interface PerformanceMetrics {
  page_load_time: number;
  first_contentful_paint: number;
  largest_contentful_paint: number;
  cumulative_layout_shift: number;
  first_input_delay: number;
}

// ============================================
// SERVICIO DE ANALYTICS
// ============================================

class AnalyticsService {
  private sessionId: string;
  private userId?: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.loadUserId();
  }

  private generateSessionId(): string {
    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  private loadUserId(): void {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          this.userId = user.id;
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
    }
  }

  // ============================================
  // MÉTODOS DE TRACKING
  // ============================================

  async trackEvent(eventType: string, eventData: Record<string, any> = {}): Promise<void> {
    try {
      const event: AnalyticsEvent = {
        event_type: eventType,
        event_data: eventData,
        page_url: typeof window !== 'undefined' ? window.location.href : '',
        user_agent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
        user_id: this.userId,
        session_id: this.sessionId,
        timestamp: new Date().toISOString(),
      };

      // Enviar a Supabase
      await (supabase as any)
        .from('analytics_events')
        .insert(event);

      // También enviar a Google Analytics si está configurado
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', eventType, {
          event_category: eventData.category || 'general',
          event_label: eventData.label || '',
          value: eventData.value || 0,
        });
      }
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }

  async trackPageView(pageName: string, pageData: Record<string, any> = {}): Promise<void> {
    await this.trackEvent('page_view', {
      page_name: pageName,
      ...pageData,
    });
  }

  async trackProductView(productId: string, productData: Record<string, any> = {}): Promise<void> {
    await this.trackEvent('product_view', {
      product_id: productId,
      ...productData,
    });
  }

  async trackProductPurchase(productId: string, orderId: string, value: number): Promise<void> {
    await this.trackEvent('purchase', {
      product_id: productId,
      order_id: orderId,
      value: value,
      currency: 'PYG',
    });
  }

  async trackSearch(query: string, resultsCount: number, filters: Record<string, any> = {}): Promise<void> {
    await this.trackEvent('search', {
      search_term: query,
      results_count: resultsCount,
      filters: filters,
    });
  }

  async trackChatMessage(conversationId: string, messageType: string = 'text'): Promise<void> {
    await this.trackEvent('chat_message', {
      conversation_id: conversationId,
      message_type: messageType,
    });
  }

  async trackUserRegistration(userData: Record<string, any> = {}): Promise<void> {
    await this.trackEvent('user_registration', userData);
  }

  async trackUserLogin(method: string = 'email'): Promise<void> {
    await this.trackEvent('user_login', {
      login_method: method,
    });
  }

  // ============================================
  // MÉTRICAS DE RENDIMIENTO
  // ============================================

  async trackPerformanceMetrics(metrics: PerformanceMetrics): Promise<void> {
    await this.trackEvent('performance_metrics', {
      page_load_time: metrics.page_load_time,
      first_contentful_paint: metrics.first_contentful_paint,
      largest_contentful_paint: metrics.largest_contentful_paint,
      cumulative_layout_shift: metrics.cumulative_layout_shift,
      first_input_delay: metrics.first_input_delay,
    });
  }

  // ============================================
  // MÉTODOS DE UTILIDAD
  // ============================================

  setUserId(userId: string): void {
    this.userId = userId;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  // ============================================
  // REPORTES Y ANÁLISIS
  // ============================================

  async getAnalyticsReport(startDate: string, endDate: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      // Procesar datos para generar reportes
      const report = this.processAnalyticsData(data || []);
      return report;
    } catch (error) {
      console.error('Error generating analytics report:', error);
      return null;
    }
  }

  private processAnalyticsData(events: AnalyticsEvent[]): any {
    const report = {
      total_events: events.length,
      unique_users: new Set(events.map(e => e.user_id).filter(Boolean)).size,
      unique_sessions: new Set(events.map(e => e.session_id)).size,
      events_by_type: {} as Record<string, number>,
      events_by_hour: {} as Record<string, number>,
      top_pages: {} as Record<string, number>,
    };

    events.forEach(event => {
      // Contar eventos por tipo
      report.events_by_type[event.event_type] = (report.events_by_type[event.event_type] || 0) + 1;

      // Contar eventos por hora
      const hour = new Date(event.timestamp || '').getHours();
      report.events_by_hour[hour] = (report.events_by_hour[hour] || 0) + 1;

      // Contar páginas más visitadas
      if (event.event_type === 'page_view') {
        const page = event.event_data.page_name || 'unknown';
        report.top_pages[page] = (report.top_pages[page] || 0) + 1;
      }
    });

    return report;
  }
}

// ============================================
// INSTANCIA SINGLETON
// ============================================

export const analytics = new AnalyticsService();

// ============================================
// HOOKS DE REACT
// ============================================

export function useAnalytics() {
  return {
    trackEvent: analytics.trackEvent.bind(analytics),
    trackPageView: analytics.trackPageView.bind(analytics),
    trackProductView: analytics.trackProductView.bind(analytics),
    trackProductPurchase: analytics.trackProductPurchase.bind(analytics),
    trackSearch: analytics.trackSearch.bind(analytics),
    trackChatMessage: analytics.trackChatMessage.bind(analytics),
    trackUserRegistration: analytics.trackUserRegistration.bind(analytics),
    trackUserLogin: analytics.trackUserLogin.bind(analytics),
    trackPerformanceMetrics: analytics.trackPerformanceMetrics.bind(analytics),
    setUserId: analytics.setUserId.bind(analytics),
    getSessionId: analytics.getSessionId.bind(analytics),
  };
}

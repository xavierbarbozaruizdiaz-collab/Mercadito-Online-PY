// ============================================
// MERCADITO ONLINE PY - ERROR MONITORING
// Sistema de monitoreo de errores para producción
// ============================================

import { supabase } from '@/lib/supabase/client';

// ============================================
// TIPOS DE ERRORES
// ============================================

export interface ErrorReport {
  id?: string;
  error_type: 'javascript' | 'api' | 'network' | 'validation' | 'auth' | 'database' | 'unknown';
  error_message: string;
  error_stack?: string;
  error_code?: string;
  url: string;
  user_agent: string;
  user_id?: string;
  session_id?: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
  resolved?: boolean;
  created_at?: string;
}

export interface PerformanceReport {
  id?: string;
  metric_type: 'page_load' | 'api_response' | 'database_query' | 'image_load' | 'bundle_size';
  metric_name: string;
  metric_value: number;
  metric_unit: 'ms' | 'bytes' | 'count';
  url: string;
  user_agent: string;
  user_id?: string;
  session_id?: string;
  timestamp: string;
  threshold_exceeded?: boolean;
  context?: Record<string, any>;
  created_at?: string;
}

// ============================================
// CLASE PRINCIPAL DE MONITOREO
// ============================================

class ErrorMonitoringService {
  private static instance: ErrorMonitoringService;
  private sessionId: string;
  private userId?: string;
  private errorQueue: ErrorReport[] = [];
  private performanceQueue: PerformanceReport[] = [];
  private isOnline: boolean = true;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupOnlineOfflineHandlers();
    this.setupUnhandledErrorHandlers();
    this.setupPerformanceMonitoring();
  }

  static getInstance(): ErrorMonitoringService {
    if (!ErrorMonitoringService.instance) {
      ErrorMonitoringService.instance = new ErrorMonitoringService();
    }
    return ErrorMonitoringService.instance;
  }

  // ============================================
  // CONFIGURACIÓN INICIAL
  // ============================================

  private generateSessionId(): string {
    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  private setupOnlineOfflineHandlers(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.flushQueues();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  private setupUnhandledErrorHandlers(): void {
    if (typeof window !== 'undefined') {
      // Errores de JavaScript no capturados
      window.addEventListener('error', (event) => {
        this.reportError({
          error_type: 'javascript',
          error_message: event.message,
          error_stack: event.error?.stack,
          url: event.filename || window.location.href,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          severity: this.determineSeverity(event.error),
          context: {
            line: event.lineno,
            column: event.colno,
            filename: event.filename,
          },
        });
      });

      // Promesas rechazadas no capturadas
      window.addEventListener('unhandledrejection', (event) => {
        this.reportError({
          error_type: 'javascript',
          error_message: event.reason?.message || 'Unhandled Promise Rejection',
          error_stack: event.reason?.stack,
          url: window.location.href,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          severity: 'medium',
          context: {
            reason: event.reason,
            promise: event.promise,
          },
        });
      });
    }
  }

  private setupPerformanceMonitoring(): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      // Monitorear Core Web Vitals
      this.observePerformanceEntries();
      
      // Monitorear carga de recursos
      this.observeResourceTiming();
    }
  }

  // ============================================
  // REPORTE DE ERRORES
  // ============================================

  reportError(errorData: Omit<ErrorReport, 'session_id' | 'user_id'>): void {
    const errorReport: ErrorReport = {
      ...errorData,
      session_id: this.sessionId,
      user_id: this.userId,
    };

    // Agregar a cola local
    this.errorQueue.push(errorReport);

    // Intentar enviar inmediatamente si está online
    if (this.isOnline) {
      this.sendErrorReport(errorReport);
    }

    // Log en consola para desarrollo (solo si no es un error de webpack)
    if (process.env.NODE_ENV === 'development' && !errorReport.error_message?.includes('reading \'call\'')) {
      console.warn('Error Report:', errorReport);
    }
  }

  private async sendErrorReport(errorReport: ErrorReport): Promise<void> {
    try {
      // Adaptar el reporte para que no incluya 'context' si no existe en la tabla
      const adaptedReport: any = {
        error_type: errorReport.error_type,
        error_message: errorReport.error_message,
        error_stack: errorReport.error_stack || null,
        page_url: errorReport.url,
        user_id: errorReport.user_id || null,
        session_id: errorReport.session_id || this.sessionId,
        user_agent: errorReport.user_agent,
        timestamp: errorReport.timestamp || new Date().toISOString(),
        // No incluir 'context' si la columna no existe en la tabla
      };

      const { error } = await (supabase as any)
        .from('error_logs')
        .insert(adaptedReport);

      if (error) {
        // Solo log en desarrollo, no romper la app
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to send error report:', error);
        }
      } else {
        // Remover de la cola si se envió exitosamente
        this.errorQueue = this.errorQueue.filter(
          (err) => err !== errorReport
        );
      }
    } catch (err) {
      // Silencioso en producción
      if (process.env.NODE_ENV === 'development') {
        console.warn('Error sending error report:', err);
      }
    }
  }

  // ============================================
  // REPORTE DE RENDIMIENTO
  // ============================================

  reportPerformance(performanceData: Omit<PerformanceReport, 'session_id' | 'user_id'>): void {
    const performanceReport: PerformanceReport = {
      ...performanceData,
      session_id: this.sessionId,
      user_id: this.userId,
    };

    // Agregar a cola local
    this.performanceQueue.push(performanceReport);

    // Intentar enviar inmediatamente si está online
    if (this.isOnline) {
      this.sendPerformanceReport(performanceReport);
    }
  }

  private async sendPerformanceReport(performanceReport: PerformanceReport): Promise<void> {
    try {
      // Adaptar el formato del reporte al schema de la tabla performance_metrics
      const adaptedReport: any = {
        page_url: performanceReport.url,
        session_id: performanceReport.session_id || this.sessionId,
        user_id: performanceReport.user_id || this.userId || null,
        timestamp: performanceReport.timestamp || new Date().toISOString(),
      };

      // Mapear métricas según el tipo
      switch (performanceReport.metric_name) {
        case 'page_load_time':
          adaptedReport.page_load_time = Math.round(performanceReport.metric_value);
          break;
        case 'first_contentful_paint':
          adaptedReport.first_contentful_paint = Math.round(performanceReport.metric_value);
          break;
        case 'largest_contentful_paint':
          adaptedReport.largest_contentful_paint = Math.round(performanceReport.metric_value);
          break;
        case 'cumulative_layout_shift':
          adaptedReport.cumulative_layout_shift = performanceReport.metric_value;
          break;
        case 'first_input_delay':
          adaptedReport.first_input_delay = Math.round(performanceReport.metric_value);
          break;
        default:
          // Si no es una métrica conocida, no enviar (silenciosamente)
          return;
      }

      const { error } = await (supabase as any)
        .from('performance_metrics')
        .insert(adaptedReport);

      if (error) {
        // Solo log en desarrollo, no romper la app
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to send performance report:', error);
        }
      } else {
        // Remover de la cola si se envió exitosamente
        this.performanceQueue = this.performanceQueue.filter(
          (perf) => perf !== performanceReport
        );
      }
    } catch (err) {
      // Silencioso en producción, solo log en desarrollo
      if (process.env.NODE_ENV === 'development') {
        console.warn('Error sending performance report:', err);
      }
    }
  }

  // ============================================
  // MONITOREO DE RENDIMIENTO
  // ============================================

  private observePerformanceEntries(): void {
    if (typeof window === 'undefined') return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.processPerformanceEntry(entry);
      }
    });

    try {
      observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] });
    } catch (err) {
      console.warn('Performance Observer not supported:', err);
    }
  }

  private observeResourceTiming(): void {
    if (typeof window === 'undefined') return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          this.processResourceEntry(entry as PerformanceResourceTiming);
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['resource'] });
    } catch (err) {
      console.warn('Resource Timing Observer not supported:', err);
    }
  }

  private processPerformanceEntry(entry: PerformanceEntry): void {
    const url = window.location.href;
    const timestamp = new Date().toISOString();

    switch (entry.entryType) {
      case 'navigation':
        const navEntry = entry as PerformanceNavigationTiming;
        this.reportPerformance({
          metric_type: 'page_load',
          metric_name: 'page_load_time',
          metric_value: navEntry.loadEventEnd - navEntry.fetchStart,
          metric_unit: 'ms',
          url,
          user_agent: navigator.userAgent,
          timestamp,
          threshold_exceeded: (navEntry.loadEventEnd - navEntry.fetchStart) > 3000,
        });
        break;

      case 'paint':
        if (entry.name === 'first-contentful-paint') {
          this.reportPerformance({
            metric_type: 'page_load',
            metric_name: 'first_contentful_paint',
            metric_value: entry.startTime,
            metric_unit: 'ms',
            url,
            user_agent: navigator.userAgent,
            timestamp,
            threshold_exceeded: entry.startTime > 1800,
          });
        }
        break;

      case 'largest-contentful-paint':
        this.reportPerformance({
          metric_type: 'page_load',
          metric_name: 'largest_contentful_paint',
          metric_value: entry.startTime,
          metric_unit: 'ms',
          url,
          user_agent: navigator.userAgent,
          timestamp,
          threshold_exceeded: entry.startTime > 2500,
        });
        break;
    }
  }

  private processResourceEntry(entry: PerformanceResourceTiming): void {
    const url = window.location.href;
    const timestamp = new Date().toISOString();

    // Monitorear recursos que tardan mucho en cargar
    const loadTime = entry.responseEnd - entry.requestStart;
    if (loadTime > 1000) { // Más de 1 segundo
      this.reportPerformance({
        metric_type: 'image_load',
        metric_name: 'slow_resource_load',
        metric_value: loadTime,
        metric_unit: 'ms',
        url,
        user_agent: navigator.userAgent,
        timestamp,
        threshold_exceeded: true,
        context: {
          resource_url: entry.name,
          resource_type: this.getResourceType(entry.name),
        },
      });
    }
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'image';
    if (url.includes('api/')) return 'api';
    return 'other';
  }

  // ============================================
  // UTILIDADES
  // ============================================

  private determineSeverity(error: any): 'low' | 'medium' | 'high' | 'critical' {
    if (!error) return 'medium';

    const message = error.message?.toLowerCase() || '';
    
    // Errores críticos
    if (message.includes('network') || message.includes('fetch')) {
      return 'critical';
    }
    
    // Errores altos
    if (message.includes('auth') || message.includes('permission')) {
      return 'high';
    }
    
    // Errores medios
    if (message.includes('validation') || message.includes('type')) {
      return 'medium';
    }
    
    return 'low';
  }

  private async flushQueues(): Promise<void> {
    // Enviar errores pendientes
    for (const errorReport of this.errorQueue) {
      await this.sendErrorReport(errorReport);
    }

    // Enviar métricas pendientes
    for (const performanceReport of this.performanceQueue) {
      await this.sendPerformanceReport(performanceReport);
    }
  }

  // ============================================
  // API PÚBLICA
  // ============================================

  setUserId(userId: string): void {
    this.userId = userId;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  // Métodos de conveniencia para diferentes tipos de errores
  reportApiError(endpoint: string, error: any, statusCode?: number): void {
    this.reportError({
      error_type: 'api',
      error_message: error.message || 'API Error',
      error_code: statusCode?.toString(),
      url: endpoint,
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      severity: statusCode && statusCode >= 500 ? 'high' : 'medium',
      context: {
        endpoint,
        status_code: statusCode,
        error_details: error,
      },
    });
  }

  reportValidationError(field: string, value: any, rule: string): void {
    this.reportError({
      error_type: 'validation',
      error_message: `Validation failed for field: ${field}`,
      url: window.location.href,
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      severity: 'low',
      context: {
        field,
        value,
        rule,
      },
    });
  }

  reportAuthError(action: string, error: any): void {
    this.reportError({
      error_type: 'auth',
      error_message: `Authentication error during ${action}`,
      url: window.location.href,
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      severity: 'high',
      context: {
        action,
        error_details: error,
      },
    });
  }
}

// ============================================
// INSTANCIA SINGLETON
// ============================================

export const errorMonitoring = ErrorMonitoringService.getInstance();

// ============================================
// HOOK DE REACT
// ============================================

import { useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';

export function useErrorMonitoring() {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      errorMonitoring.setUserId(user.id);
    }
  }, [user?.id]);

  return {
    reportError: errorMonitoring.reportError.bind(errorMonitoring),
    reportApiError: errorMonitoring.reportApiError.bind(errorMonitoring),
    reportValidationError: errorMonitoring.reportValidationError.bind(errorMonitoring),
    reportAuthError: errorMonitoring.reportAuthError.bind(errorMonitoring),
    reportPerformance: errorMonitoring.reportPerformance.bind(errorMonitoring),
  };
}

export default ErrorMonitoringService;

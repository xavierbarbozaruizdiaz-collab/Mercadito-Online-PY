// ============================================
// MERCADITO ONLINE PY - ANALYTICS PROVIDER
// Provider para tracking de analytics en toda la app
// ============================================

'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { analytics } from '@/lib/services/analyticsService';
import { errorMonitoring } from '@/lib/monitoring/errorMonitoring';
import { useAuth } from '@/lib/hooks/useAuth';

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

// Componente interno que usa useSearchParams
function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // Track page views
  useEffect(() => {
    const url = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    
    // Determinar el nombre de la página basado en la ruta
    let pageName = 'unknown';
    if (pathname === '/') {
      pageName = 'home';
    } else if (pathname.startsWith('/products/')) {
      pageName = 'product_detail';
    } else if (pathname.startsWith('/store/')) {
      pageName = 'store_profile';
    } else if (pathname.startsWith('/stores')) {
      pageName = 'stores_list';
    } else if (pathname.startsWith('/search')) {
      pageName = 'search';
    } else if (pathname.startsWith('/dashboard')) {
      pageName = 'dashboard';
    } else if (pathname.startsWith('/chat')) {
      pageName = 'chat';
    } else if (pathname.startsWith('/auth')) {
      pageName = 'auth';
    }

    analytics.trackPageView(pageName, {
      url,
      pathname,
      search_params: searchParams.toString(),
    });
  }, [pathname, searchParams]);

  // Set user ID when user changes
  useEffect(() => {
    if (user?.id) {
      analytics.setUserId(user.id);
      errorMonitoring.setUserId(user.id);
    }
  }, [user?.id]);

  // Track performance metrics
  useEffect(() => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const trackPerformance = () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          const metrics = {
            page_load_time: Math.round(navigation.loadEventEnd - navigation.fetchStart),
            first_contentful_paint: 0,
            largest_contentful_paint: 0,
            cumulative_layout_shift: 0,
            first_input_delay: 0,
          };

          // Try to get Core Web Vitals if available
          if ('web-vitals' in window) {
            // This would require importing web-vitals library
            // For now, we'll track basic metrics
          }

          analytics.trackPerformanceMetrics(metrics);
        }
      };

      // Track performance after page load
      if (document.readyState === 'complete') {
        trackPerformance();
      } else {
        window.addEventListener('load', trackPerformance);
      }

      return () => {
        window.removeEventListener('load', trackPerformance);
      };
    }
  }, []);

  // Track errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      analytics.trackEvent('error', {
        error_type: 'javascript_error',
        error_message: event.message,
        error_stack: event.error?.stack,
        page_url: window.location.href,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      analytics.trackEvent('error', {
        error_type: 'unhandled_promise_rejection',
        error_message: event.reason?.message || 'Unknown promise rejection',
        error_stack: event.reason?.stack,
        page_url: window.location.href,
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}

// Componente principal con Suspense
export default function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  return (
    <>
      <Suspense fallback={null}>
        <AnalyticsTracker />
      </Suspense>
      {children}
    </>
  );
}
                 
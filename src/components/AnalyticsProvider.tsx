// ============================================
// MERCADITO ONLINE PY - ANALYTICS PROVIDER
// Provider para tracking de analytics en toda la app
// ============================================
// NOTA: GTM es la única fuente de carga de GA4.
// Este provider solo usa gtag si ya existe (cargado por GTM).

'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { googleAnalytics as googleAnalyticsService } from '@/lib/services/googleAnalyticsService';

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

// Componente interno que usa useSearchParams
function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Google Analytics: NO inicializar directamente.
  // GTM es la única fuente de carga. Si gtag ya existe (de GTM), solo configuramos el measurementId.
  useEffect(() => {
    const gaId = process.env.NEXT_PUBLIC_GA_ID;
    if (gaId && typeof window !== 'undefined') {
      // Solo usar gtag si ya existe (de GTM), nunca cargar gtag.js directamente
      if ((window as any).gtag) {
        googleAnalyticsService.initialize(gaId);
      } else {
        // Esperar a que GTM cargue gtag
        const checkGtag = setInterval(() => {
          if ((window as any).gtag) {
            googleAnalyticsService.initialize(gaId);
            clearInterval(checkGtag);
          }
        }, 100);
        
        // Timeout después de 5 segundos
        setTimeout(() => clearInterval(checkGtag), 5000);
      }
    }
  }, []);

  // Track page views vía GTM (dataLayer)
  useEffect(() => {
    // Usar dataLayer.push para eventos e-commerce (GTM maneja todo)
    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push({
        event: 'page_view',
        page_path: pathname,
        page_title: document.title,
      });
    }

    // Google Analytics: solo trackear si gtag existe (de GTM)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      googleAnalyticsService.trackPageView(pathname, document.title);
    }
  }, [pathname, searchParams]);

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
                 
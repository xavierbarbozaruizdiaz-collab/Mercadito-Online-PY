// ============================================
// STORE LAYOUT - MARKETING SCRIPTS INJECTION
// Inyecta scripts de tracking específicos de la tienda
// ============================================

import { Metadata } from 'next';
import Script from 'next/script';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { getTrackingIdsForStore } from '@/lib/marketing/getTrackingIdsForStore';

interface StoreLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: StoreLayoutProps): Promise<Metadata> {
  // Metadata básica, puede mejorarse después
  return {
    title: 'Tienda',
  };
}

export default async function StoreLayout({ children, params }: StoreLayoutProps) {
  const featureEnabled = process.env.NEXT_PUBLIC_FEATURE_MARKETING === '1';
  const { slug } = await params;

  const trackingIds = featureEnabled ? await getTrackingIdsForStore(slug) : null;
  const globalGTMId = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-PQ8Q6JGW';

  const storeGtmId = trackingIds?.gtmId && trackingIds.gtmId !== globalGTMId ? trackingIds.gtmId : null;
  const globalPixelId = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
  const hasGlobalPixel = featureEnabled && !!globalPixelId;
  const storePixelId = featureEnabled && trackingIds?.pixelId && trackingIds.pixelId !== globalPixelId ? trackingIds.pixelId : null;

  return (
    <>
      {storeGtmId && (
        <>
          <Script
            id={`gtm-store-${slug}`}
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${storeGtmId}');
              `,
            }}
          />
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${storeGtmId}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        </>
      )}

      {hasGlobalPixel && (
        <>
          <Script
            id="fb-pixel-global"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${globalPixelId}');
                fbq('track', 'PageView');
              `,
            }}
          />
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${globalPixelId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}

      {storePixelId && (
        <>
          <Script
            id="fb-pixel-store"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                if(typeof fbq !== 'undefined') {
                  fbq('init', '${storePixelId}', {}, 'store');
                  fbq('track', 'PageView', {}, 'store');
                } else {
                  !function(f,b,e,v,n,t,s)
                  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                  n.queue=[];t=b.createElement(e);t.async=!0;
                  t.src=v;s=b.getElementsByTagName(e)[0];
                  s.parentNode.insertBefore(t,s)}(window, document,'script',
                  'https://connect.facebook.net/en_US/fbevents.js');
                  fbq('init', '${storePixelId}', {}, 'store');
                  fbq('track', 'PageView', {}, 'store');
                }
              `,
            }}
          />
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${storePixelId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}

      <ErrorBoundary>
        <ThemeProvider>
          {children}
          <Script
            id="sw-cleanup-store"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    for (const registration of registrations) {
                      registration.unregister();
                    }
                  });
                  caches.keys().then(function(names) {
                    for (const name of names) {
                      caches.delete(name);
                    }
                  });
                }
              `,
            }}
          />
        </ThemeProvider>
      </ErrorBoundary>
    </>
  );
}


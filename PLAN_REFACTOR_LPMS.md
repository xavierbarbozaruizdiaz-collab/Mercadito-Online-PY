# 🔧 PLAN DE REFACTOR LPMS - TRACKING & ANALYTICS
## Mercadito Online PY - Pasos de Implementación

**Objetivo:** Unificar tracking bajo GTM como única fuente de verdad  
**Prioridad:** Crítica (P0)  
**Estimación:** 2-3 horas de desarrollo + testing

---

## 📋 PASOS DE REFACTOR

### **FASE 1: Preparación (30 min)**

#### Paso 1.1: Crear backup de archivos críticos
```bash
# No necesario si usas Git, pero recomendado para testing
cp src/app/layout.tsx src/app/layout.tsx.backup
cp src/components/AnalyticsProvider.tsx src/components/AnalyticsProvider.tsx.backup
```

#### Paso 1.2: Verificar GTM está configurado correctamente
- ✅ Ya verificado: GTM está en `src/app/layout.tsx:121-143`
- ✅ dataLayer inicializado antes de GTM
- ✅ ID: `GTM-PQ8Q6JGW`

---

### **FASE 2: Remover Facebook Pixel Directo (15 min)**

#### Paso 2.1: Remover script de Facebook Pixel de layout.tsx

**Archivo:** `src/app/layout.tsx`

**Cambio:**
- Remover líneas 148-177 (script inline de Facebook Pixel)
- Facebook Pixel debe cargarse SOLO vía GTM

**Diff:**
```diff
--- a/src/app/layout.tsx
+++ b/src/app/layout.tsx
@@ -145,7 +145,6 @@ export default function RootLayout({
           }}
         />
 
-        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
         <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
 
-        {/* Facebook Pixel */}
-        {fbPixelId && (
-          <>
-            <script
-              dangerouslySetInnerHTML={{
-                __html: `
-                  !function(f,b,e,v,n,t,s)
-                  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
-                  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
-                  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
-                  n.queue=[];t=b.createElement(e);t.async=!0;
-                  t.src=v;s=b.getElementsByTagName(e)[0];
-                  s.parentNode.insertBefore(t,s)}(window, document,'script',
-                  'https://connect.facebook.net/en_US/fbevents.js');
-                  fbq('init', '${fbPixelId}');
-                  fbq('track', 'PageView');
-                `,
-              }}
-            />
-            <noscript>
-              <img
-                height="1"
-                width="1"
-                style={{ display: 'none' }}
-                src={`https://www.facebook.com/tr?id=${fbPixelId}&ev=PageView&noscript=1`}
-                alt=""
-              />
-            </noscript>
-          </>
-        )}
       </head>
```

**También remover la variable fbPixelId si no se usa:**
```diff
@@ -114,7 +114,6 @@ export default function RootLayout({
   children,
 }: Readonly<{
   children: React.ReactNode;
 }>) {
-  const fbPixelId = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
   const gtmId = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-PQ8Q6JGW';
```

**Verificación:**
- ✅ No hay referencias a `fbPixelId` en layout.tsx
- ✅ Facebook Pixel debe configurarse en GTM (no en código)

---

### **FASE 3: Refactorizar AnalyticsProvider (30 min)**

#### Paso 3.1: Refactorizar AnalyticsProvider.tsx

**Archivo:** `src/components/AnalyticsProvider.tsx`

**Cambios:**
1. Remover dependencia de `googleAnalyticsService`
2. Usar solo `track()` de `dataLayer.ts`
3. Simplificar lógica de page view tracking
4. Remover inicialización de GA4 (GTM lo hace)

**Diff completo:**
```diff
--- a/src/components/AnalyticsProvider.tsx
+++ b/src/components/AnalyticsProvider.tsx
@@ -1,62 +1,32 @@
 // ============================================
 // MERCADITO ONLINE PY - ANALYTICS PROVIDER
-// Provider para tracking de analytics en toda la app
+// Provider para tracking de page views vía GTM dataLayer
 // ============================================
-// NOTA: GTM es la única fuente de carga de GA4.
-// Este provider solo usa gtag si ya existe (cargado por GTM).
+// GTM es la única fuente de verdad.
+// Este provider solo trackea page views vía track() de dataLayer.ts.
+// GTM maneja GA4, Facebook Pixel, y otros servicios.
 
 'use client';
 
 import { useEffect, Suspense } from 'react';
 import { usePathname, useSearchParams } from 'next/navigation';
-import { googleAnalytics as googleAnalyticsService } from '@/lib/services/googleAnalyticsService';
+import { trackPageview } from '@/lib/tracking/dataLayer';
 
 interface AnalyticsProviderProps {
   children: React.ReactNode;
 }
 
 // Componente interno que usa useSearchParams
 function AnalyticsTracker() {
   const pathname = usePathname();
   const searchParams = useSearchParams();
 
-  // Google Analytics: NO inicializar directamente.
-  // GTM es la única fuente de carga. Si gtag ya existe (de GTM), solo configuramos el measurementId.
-  useEffect(() => {
-    const gaId = process.env.NEXT_PUBLIC_GA_ID;
-    if (gaId && typeof window !== 'undefined') {
-      // Solo usar gtag si ya existe (de GTM), nunca cargar gtag.js directamente
-      if ((window as any).gtag) {
-        googleAnalyticsService.initialize(gaId);
-      } else {
-        // Esperar a que GTM cargue gtag
-        const checkGtag = setInterval(() => {
-          if ((window as any).gtag) {
-            googleAnalyticsService.initialize(gaId);
-            clearInterval(checkGtag);
-          }
-        }, 100);
-        
-        // Timeout después de 5 segundos
-        setTimeout(() => clearInterval(checkGtag), 5000);
-      }
-    }
-  }, []);
-
-  // Track page views vía GTM (dataLayer)
+  // Track page views vía GTM (dataLayer) - GTM maneja GA4 y Facebook Pixel
   useEffect(() => {
-    // Usar dataLayer.push para eventos e-commerce (GTM maneja todo)
-    if (typeof window !== 'undefined' && window.dataLayer) {
-      window.dataLayer.push({
-        event: 'page_view',
-        page_path: pathname,
-        page_title: document.title,
-      });
-    }
-
-    // Google Analytics: solo trackear si gtag existe (de GTM)
-    if (typeof window !== 'undefined' && (window as any).gtag) {
-      googleAnalyticsService.trackPageView(pathname, document.title);
-    }
+    // Trackear solo vía track() de dataLayer.ts
+    // GTM captura este evento y lo distribuye a GA4, Facebook Pixel, etc.
+    trackPageview(pathname, {
+      page_path: pathname,
+      page_title: typeof document !== 'undefined' ? document.title : '',
+    });
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
```

**Verificación:**
- ✅ No hay llamadas a `googleAnalyticsService`
- ✅ Usa solo `trackPageview()` de `dataLayer.ts`
- ✅ SSR-safe (verificación de `typeof document`)

---

#### Paso 3.2: Importar AnalyticsProvider en layout.tsx

**Archivo:** `src/app/layout.tsx`

**Cambio:**
- Importar y usar `AnalyticsProvider` para wrap children

**Diff:**
```diff
--- a/src/app/layout.tsx
+++ b/src/app/layout.tsx
@@ -12,6 +12,7 @@ import { ThemeProvider } from "@/contexts/ThemeContext";
 import ToastProvider from "@/components/ui/ToastProvider";
 import { ErrorBoundary } from "@/components/ErrorBoundary";
+import AnalyticsProvider from "@/components/AnalyticsProvider";
 import { Gavel, Ticket } from "lucide-react";
 import Logo from "@/components/Logo";
 import Footer from "@/components/Footer";
@@ -190,8 +191,10 @@ export default function RootLayout({
       <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
         {/* C) Noscript */}
         <noscript>
           <iframe
             src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
             height="0"
             width="0"
             style={{ display: 'none', visibility: 'hidden' }}
           />
         </noscript>
         
         <ErrorBoundary>
           <ThemeProvider>
+            <AnalyticsProvider>
             {/* Header mejorado */}
             <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-md">
@@ -257,6 +260,7 @@ export default function RootLayout({
                 {children}
               </main>
               <Footer />
             </div>
+            </AnalyticsProvider>
           </ThemeProvider>
         </ErrorBoundary>
       </body>
```

**Verificación:**
- ✅ AnalyticsProvider importado
- ✅ Wrap children con AnalyticsProvider
- ✅ Page views se trackean automáticamente

---

### **FASE 4: Migrar analytics.ts a dataLayer.ts (45 min)**

#### Paso 4.1: Verificar que dataLayer.ts tiene todas las funciones necesarias

**Archivo:** `src/lib/tracking/dataLayer.ts`

**Estado Actual:**
- ✅ Tiene `track()`, `trackPageview()`, `trackSignup()`, etc.
- ⚠️ NO tiene helpers para e-commerce (view_item, add_to_cart, etc.)

**Necesitamos agregar:** Helpers de e-commerce a dataLayer.ts

**Agregar a dataLayer.ts:**
```diff
--- a/src/lib/tracking/dataLayer.ts
+++ b/src/lib/tracking/dataLayer.ts
@@ -249,6 +249,95 @@ export function trackMembershipActivated(
   });
 }
 
+// ============================================
+// HELPERS PARA E-COMMERCE (GA4)
+// ============================================
+
+/**
+ * Trackea vista de producto (view_item)
+ */
+export function trackViewItem(item: {
+  item_id: string;
+  item_name: string;
+  price?: number;
+  quantity?: number;
+  item_category?: string;
+  item_brand?: string;
+  currency?: string;
+}): void {
+  track('view_item', {
+    ecommerce: {
+      currency: item.currency || 'PYG',
+      value: item.price ?? 0,
+      items: [
+        {
+          item_id: item.item_id,
+          item_name: item.item_name,
+          price: item.price ?? 0,
+          quantity: item.quantity ?? 1,
+          item_category: item.item_category,
+          item_brand: item.item_brand,
+        },
+      ],
+    },
+  });
+}
+
+/**
+ * Trackea agregar al carrito (add_to_cart)
+ */
+export function trackAddToCart(item: {
+  item_id: string;
+  item_name: string;
+  price: number;
+  quantity?: number;
+  item_category?: string;
+  item_brand?: string;
+  currency?: string;
+}): void {
+  track('add_to_cart', {
+    ecommerce: {
+      currency: item.currency || 'PYG',
+      value: (item.price ?? 0) * (item.quantity ?? 1),
+      items: [
+        {
+          item_id: item.item_id,
+          item_name: item.item_name,
+          price: item.price,
+          quantity: item.quantity ?? 1,
+          item_category: item.item_category,
+          item_brand: item.item_brand,
+        },
+      ],
+    },
+  });
+}
+
+/**
+ * Trackea inicio de checkout (begin_checkout)
+ */
+export function trackBeginCheckout(items: Array<{
+  item_id: string;
+  item_name: string;
+  price: number;
+  quantity: number;
+  item_category?: string;
+  item_brand?: string;
+}>, total: number, currency?: string): void {
+  track('begin_checkout', {
+    ecommerce: {
+      currency: currency || 'PYG',
+      value: total,
+      items: items.map(item => ({
+        item_id: item.item_id,
+        item_name: item.item_name,
+        price: item.price,
+        quantity: item.quantity,
+        item_category: item.item_category,
+        item_brand: item.item_brand,
+      })),
+    },
+  });
+}
+
+/**
+ * Trackea compra completada (purchase)
+ */
+export function trackPurchase(orderId: string, items: Array<{
+  item_id: string;
+  item_name: string;
+  price: number;
+  quantity: number;
+  item_category?: string;
+  item_brand?: string;
+}>, total: number, currency?: string): void {
+  track('purchase', {
+    ecommerce: {
+      transaction_id: orderId,
+      currency: currency || 'PYG',
+      value: total,
+      items: items.map(item => ({
+        item_id: item.item_id,
+        item_name: item.item_name,
+        price: item.price,
+        quantity: item.quantity,
+        item_category: item.item_category,
+        item_brand: item.item_brand,
+      })),
+    },
+  });
+}
```

---

#### Paso 4.2: Migrar usos de analytics.ts a dataLayer.ts

**Archivos a migrar:**

1. **src/app/checkout/page.tsx**
```diff
--- a/src/app/checkout/page.tsx
+++ b/src/app/checkout/page.tsx
-import { useGoogleAnalytics } from '@/lib/services/googleAnalyticsService';
-import { trackBeginCheckout } from '@/lib/analytics';
+import { trackBeginCheckout } from '@/lib/tracking/dataLayer';
@@ -365,17 +365,12 @@ export default function CheckoutPage() {
       // Trackear evento de inicio de checkout
-      googleAnalytics.trackBeginCheckout(
+      trackBeginCheckout(
         cartItems.map(item => ({
           item_id: item.product.id,
           item_name: item.product.title,
           category: item.product.category?.name,
           price: item.product.price,
           quantity: item.quantity,
         })),
         total,
-        'PYG'
-      );
-      trackBeginCheckout(
-        cartItems.map(item => ({
-          item_id: item.product.id,
-          item_name: item.product.title,
-          price: item.product.price,
-          quantity: item.quantity,
-        })),
-        total
       );
```

2. **src/app/checkout/success/page.tsx**
```diff
--- a/src/app/checkout/success/page.tsx
+++ b/src/app/checkout/success/page.tsx
-import { useGoogleAnalytics } from '@/lib/services/googleAnalyticsService';
-import { trackPurchase } from '@/lib/analytics';
+import { trackPurchase } from '@/lib/tracking/dataLayer';
@@ -91,25 +91,16 @@ export default function CheckoutSuccessPage() {
-      googleAnalytics.trackPurchase({
-        transactionId: orderId!,
-        products: products.map(p => ({
-          id: p.product.id,
-          name: p.product.title,
-          category: p.product.category?.name,
-          price: p.product.price,
-          quantity: p.quantity,
-        })),
-        total: total,
-        currency: 'PYG',
-      });
-      trackPurchase(orderId!, products.map(p => ({
+      trackPurchase(
+        orderId!,
+        products.map(p => ({
           item_id: p.product.id,
           item_name: p.product.title,
           price: p.product.price,
           quantity: p.quantity,
+          item_category: p.product.category?.name,
         })),
-        total
-      );
+        total,
+        'PYG'
+      );
```

3. **src/app/products/[id]/ProductPageClient.tsx**
```diff
--- a/src/app/products/[id]/ProductPageClient.tsx
+++ b/src/app/products/[id]/ProductPageClient.tsx
-import { trackViewItem } from '@/lib/analytics';
+import { trackViewItem } from '@/lib/tracking/dataLayer';
```

4. **src/components/AddToCartButton.tsx**
```diff
--- a/src/components/AddToCartButton.tsx
+++ b/src/components/AddToCartButton.tsx
-import { trackAddToCart } from '@/lib/analytics';
+import { trackAddToCart } from '@/lib/tracking/dataLayer';
```

---

#### Paso 4.3: Deprecar analytics.ts

**Archivo:** `src/lib/analytics.ts`

**Acción:** Agregar comentario de deprecación y redirigir a dataLayer.ts

```diff
--- a/src/lib/analytics.ts
+++ b/src/lib/analytics.ts
+/**
+ * @deprecated Este archivo está deprecado.
+ * Por favor usa @/lib/tracking/dataLayer en su lugar.
+ * 
+ * Migración:
+ * - dlPush() → track() de dataLayer.ts
+ * - trackViewItem() → trackViewItem() de dataLayer.ts
+ * - trackAddToCart() → trackAddToCart() de dataLayer.ts
+ * - trackBeginCheckout() → trackBeginCheckout() de dataLayer.ts
+ * - trackPurchase() → trackPurchase() de dataLayer.ts
+ */
+
 // ============================================
 // MERCADITO ONLINE PY - GTM ANALYTICS HELPER
 // Helper para eventos e-commerce vía Google Tag Manager
```

**Nota:** No eliminar el archivo inmediatamente para mantener compatibilidad temporal.

---

### **FASE 5: Marcar Servicios Como Deprecated (15 min)**

#### Paso 5.1: Marcar googleAnalyticsService.ts como deprecated

**Archivo:** `src/lib/services/googleAnalyticsService.ts`

**Acción:** Agregar comentario de deprecación al inicio del archivo

```diff
--- a/src/lib/services/googleAnalyticsService.ts
+++ b/src/lib/services/googleAnalyticsService.ts
+/**
+ * @deprecated Este servicio está deprecado.
+ * NO uses gtag() directamente. GTM es la única fuente de verdad.
+ * 
+ * Para tracking de eventos, usa track() de @/lib/tracking/dataLayer.
+ * 
+ * Este archivo se mantiene temporalmente para compatibilidad,
+ * pero será removido en futuras versiones.
+ */
+
 // ============================================
 // GOOGLE ANALYTICS 4 SERVICE
 // Implementación completa de GA4
```

---

#### Paso 5.2: Marcar facebookPixelService.ts como deprecated

**Archivo:** `src/lib/services/facebookPixelService.ts`

**Acción:** Agregar comentario de deprecación

```diff
--- a/src/lib/services/facebookPixelService.ts
+++ b/src/lib/services/facebookPixelService.ts
+/**
+ * @deprecated Este servicio está deprecado.
+ * NO cargues Facebook Pixel directamente. GTM debe cargarlo.
+ * NO uses fbq() directamente. Usa track() de @/lib/tracking/dataLayer.
+ * 
+ * Este archivo se mantiene temporalmente para compatibilidad,
+ * pero será removido en futuras versiones.
+ */
+
 // ============================================
 // FACEBOOK PIXEL SERVICE
```

---

#### Paso 5.3: Separar responsabilidades en analyticsService.ts

**Archivo:** `src/lib/services/analyticsService.ts`

**Acción:** Remover llamadas a gtag(), mantener solo persistencia en Supabase

```diff
--- a/src/lib/services/analyticsService.ts
+++ b/src/lib/services/analyticsService.ts
       // Enviar a Supabase
       await (supabase as any)
         .from('analytics_events')
         .insert(event);
 
-      // También enviar a Google Analytics si está configurado
-      if (typeof window !== 'undefined' && (window as any).gtag) {
-        (window as any).gtag('event', eventType, {
-          event_category: eventData.category || 'general',
-          event_label: eventData.label || '',
-          value: eventData.value || 0,
-        });
-      }
+      // NOTA: No llamamos gtag() directamente.
+      // Si necesitas tracking a GA4, usa track() de @/lib/tracking/dataLayer
+      // GTM manejará la distribución a GA4.
     } catch (error) {
       console.error('Error tracking event:', error);
     }
```

---

### **FASE 6: Limpieza y Verificación (30 min)**

#### Paso 6.1: Buscar referencias restantes

**Comandos:**
```bash
# Buscar referencias a gtag()
grep -r "window\.gtag\|\.gtag(" src --exclude-dir=node_modules

# Buscar referencias a fbq()
grep -r "window\.fbq\|\.fbq(" src --exclude-dir=node_modules

# Buscar referencias directas a dataLayer.push
grep -r "dataLayer\.push" src --exclude-dir=node_modules
```

**Acción:** Verificar que todas las referencias están en:
- ✅ `src/lib/tracking/dataLayer.ts` (track() internamente)
- ❌ NINGUNA otra referencia directa

---

#### Paso 6.2: Verificar que no hay imports no usados

**Comandos:**
```bash
# Verificar imports de googleAnalyticsService
grep -r "from.*googleAnalyticsService" src --exclude-dir=node_modules

# Verificar imports de analytics.ts
grep -r "from.*['\"]@/lib/analytics" src --exclude-dir=node_modules
```

**Acción:** Remover imports no usados de componentes migrados.

---

#### Paso 6.3: Testing

**Checklist de Testing:**

1. ✅ **PageView se trackea una sola vez**
   - Abrir página → Verificar en GTM Preview que se dispara 1 vez
   - Navegar a otra página → Verificar que se dispara 1 vez

2. ✅ **Eventos de e-commerce funcionan**
   - Ver producto → `view_item` se dispara
   - Agregar al carrito → `add_to_cart` se dispara
   - Ir a checkout → `begin_checkout` se dispara
   - Completar compra → `purchase` se dispara

3. ✅ **No hay errores en consola**
   - Verificar que no hay errores de `gtag is not defined`
   - Verificar que no hay errores de `fbq is not defined`

4. ✅ **SSR funciona correctamente**
   - Verificar que no hay errores en server-side rendering

---

## 🎯 ESTRUCTURA FINAL

### Archivos Core
```
src/
  lib/
    tracking/
      dataLayer.ts          ← ÚNICA API para tracking (track())
  components/
    AnalyticsProvider.tsx   ← Trackea page_view vía track()
  app/
    layout.tsx             ← Solo GTM, NO scripts directos
```

### Archivos Deprecated (Mantener temporalmente)
```
src/
  lib/
    analytics.ts                      ← @deprecated - usar dataLayer.ts
    services/
      googleAnalyticsService.ts      ← @deprecated - GTM maneja GA4
      facebookPixelService.ts        ← @deprecated - GTM maneja Pixel
```

### Archivos Mantenidos (Sin cambios)
```
src/
  lib/
    services/
      analyticsService.ts            ← Solo persistencia en Supabase
```

---

## 📊 VERIFICACIÓN POST-REFACTOR

### Checklist Final
- [ ] ✅ GTM es la única fuente de carga de GA4
- [ ] ✅ GTM es la única fuente de carga de Facebook Pixel
- [ ] ✅ NO hay llamadas directas a `window.gtag()`
- [ ] ✅ NO hay llamadas directas a `window.fbq()`
- [ ] ✅ NO hay referencias directas a `window.dataLayer.push` fuera de `track()`
- [ ] ✅ AnalyticsProvider está importado y funcionando
- [ ] ✅ PageView se trackea SOLO una vez
- [ ] ✅ Todos los eventos usan `track()` de dataLayer.ts
- [ ] ✅ Código SSR-safe
- [ ] ✅ No hay race conditions

---

**FIN DEL PLAN DE REFACTOR**




























# AUDITORÍA TÉCNICA: INTEGRACIÓN GOOGLE TAG MANAGER
## Contenedor: GTM-PQ8Q6JGW | GA4: G-52EMX80KW5

**Fecha:** 2025-01-27  
**Framework:** Next.js 16 (App Router)  
**Deploy:** Vercel

---

## RESUMEN BREVE

**ESTADO:** ⚠️ **ISSUES DETECTADOS**

### Problemas Críticos:
1. **DUPLICACIÓN DE GA4**: GA4 directo en `layout.tsx` + GA4 vía GTM = doble conteo de pageviews
2. **DUPLICACIÓN POTENCIAL DE GTM**: Layout de tienda puede cargar GTM adicional si la tienda tiene su propio `gtm_id`
3. **GA4 DINÁMICO**: `googleAnalyticsService` y `AnalyticsProvider` pueden cargar GA4 adicionalmente
4. **FALTA INICIALIZACIÓN DE DATALAYER**: El snippet de GTM inicializa `dataLayer`, pero no se garantiza antes del snippet

### Aspectos Correctos:
- ✅ GTM principal correctamente integrado en `src/app/layout.tsx`
- ✅ Script GTM en `<head>` con `next/script` y `strategy="afterInteractive"`
- ✅ Noscript iframe tras `<body>` presente
- ✅ GTM ID hardcodeado (GTM-PQ8Q6JGW) - no depende de env vars

---

## HALLAZGOS DETALLADOS

### 1. INTEGRACIÓN GTM PRINCIPAL (CORRECTO)

**Archivo:** `src/app/layout.tsx`  
**Líneas:** 118-130 (script), 188-195 (noscript)

**Script GTM en `<head>`:**
```tsx
<Script
  id="gtm-script"
  strategy="afterInteractive"
  dangerouslySetInnerHTML={{
    __html: `
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id=GTM-PQ8Q6JGW'+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','GTM-PQ8Q6JGW');
    `,
  }}
/>
```

**Noscript iframe tras `<body>`:**
```tsx
<noscript>
  <iframe
    src="https://www.googletagmanager.com/ns.html?id=GTM-PQ8Q6JGW"
    height="0"
    width="0"
    style={{ display: 'none', visibility: 'hidden' }}
  ></iframe>
</noscript>
```

**Validación:**
- ✅ Script está en `<head>`
- ✅ Noscript está inmediatamente tras `<body>`
- ✅ Strategy `afterInteractive` (correcto para GTM)
- ✅ GTM ID hardcodeado: `GTM-PQ8Q6JGW`
- ✅ Inicializa `dataLayer` correctamente: `w[l]=w[l]||[]`

---

### 2. PROBLEMA: GA4 DIRECTO (DUPLICACIÓN)

**Archivo:** `src/app/layout.tsx`  
**Líneas:** 133-153

**Código problemático:**
```tsx
{/* Google Analytics 4 */}
{gaId && (
  <>
    <script
      async
      src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
    />
    <script
      dangerouslySetInnerHTML={{
        __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', {
            page_path: window.location.pathname,
            send_page_view: true
          });
        `,
      }}
    />
  </>
)}
```

**Problema:**
- Si `NEXT_PUBLIC_GA_ID` está configurado, se carga GA4 directamente
- GTM también puede enviar eventos a GA4 (según configuración del contenedor)
- Esto genera **DOBLE CONTEO DE PAGEVIEWS** y eventos duplicados

**Impacto:**
- Métricas infladas en GA4
- Confusión en reportes
- Duplicación de eventos e-commerce

---

### 3. PROBLEMA: DUPLICACIÓN POTENCIAL DE GTM EN TIENDAS

**Archivo:** `src/app/(marketplace)/store/[slug]/layout.tsx`  
**Líneas:** 144-169

**Código problemático:**
```tsx
{/* Google Tag Manager */}
{hasGTM && (
  <>
    <Script
      id={`gtm-${trackingIds.gtmId}`}
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${trackingIds.gtmId}');
        `,
      }}
    />
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${trackingIds.gtmId}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
      />
    </noscript>
  </>
)}
```

**Problema:**
- Si una tienda tiene su propio `gtm_id` en la BD, se carga un GTM ADICIONAL
- El GTM principal (`GTM-PQ8Q6JGW`) ya está cargado en `layout.tsx`
- Esto genera **DOS CONTENEDORES GTM** en páginas de tienda

**Impacto:**
- Tag Assistant puede mostrar 2 contenedores
- Eventos duplicados
- Confusión en debugging

**Condición:**
- Solo se carga si `NEXT_PUBLIC_FEATURE_MARKETING === '1'`
- Requiere que la tienda tenga `gtm_id` en la BD

---

### 4. PROBLEMA: GA4 DINÁMICO EN SERVICIOS

**Archivos:**
- `src/lib/services/googleAnalyticsService.ts` (líneas 35-64)
- `src/components/AnalyticsProvider.tsx` (líneas 34-38)

**Código problemático:**
```typescript
// googleAnalyticsService.ts
initialize(measurementId: string): void {
  // ...
  const script1 = document.createElement('script');
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script1);
  
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
}
```

**Problema:**
- `AnalyticsProvider` intenta inicializar GA4 si no existe `window.gtag`
- `googleAnalyticsService` carga scripts dinámicamente
- Puede duplicar GA4 si ya está cargado en `layout.tsx`

**Impacto:**
- Posible triple carga de GA4 (layout.tsx + AnalyticsProvider + googleAnalyticsService)
- Scripts duplicados en `<head>`
- Eventos triplicados

---

### 5. VALIDACIÓN DE VARIABLES DE ENTORNO

**Variables encontradas:**
- `NEXT_PUBLIC_GA_ID` - Usado condicionalmente en `layout.tsx`
- `NEXT_PUBLIC_FACEBOOK_PIXEL_ID` - Usado condicionalmente en `layout.tsx`
- `NEXT_PUBLIC_GTM_ID` - **NO USADO** (GTM está hardcodeado)
- `NEXT_PUBLIC_FEATURE_MARKETING` - Controla carga de scripts per-store

**Problema:**
- GTM está hardcodeado, pero `NEXT_PUBLIC_GTM_ID` existe en código de tiendas
- Inconsistencia: GTM principal hardcodeado vs GTM de tiendas desde env var

---

## ANÁLISIS DE DUPLICADOS

### Conteo de Instancias GTM:

1. **GTM Principal (layout.tsx):**
   - Script: `gtm.js?id=GTM-PQ8Q6JGW` (línea 126)
   - Noscript: `ns.html?id=GTM-PQ8Q6JGW` (línea 190)
   - **Siempre presente** ✅

2. **GTM Tienda (store/[slug]/layout.tsx):**
   - Script: `gtm.js?id=${trackingIds.gtmId}` (línea 155)
   - Noscript: `ns.html?id=${trackingIds.gtmId}` (línea 162)
   - **Condicional**: Solo si `NEXT_PUBLIC_FEATURE_MARKETING === '1'` Y tienda tiene `gtm_id`
   - ⚠️ **POTENCIAL DUPLICADO**

### Conteo de Instancias GA4:

1. **GA4 Directo (layout.tsx):**
   - Script: `gtag/js?id=${gaId}` (línea 137)
   - Config: `gtag('config', '${gaId}')` (línea 145)
   - **Condicional**: Solo si `NEXT_PUBLIC_GA_ID` está configurado
   - ⚠️ **DUPLICA con GA4 vía GTM**

2. **GA4 Tienda (store/[slug]/layout.tsx):**
   - Script: `gtag/js?id=${trackingIds.gaId}` (línea 52)
   - Config: `gtag('config', '${trackingIds.gaId}')` (línea 63)
   - **Condicional**: Solo si `NEXT_PUBLIC_FEATURE_MARKETING === '1'` Y tienda tiene `ga_measurement_id`
   - ⚠️ **POTENCIAL DUPLICADO**

3. **GA4 Dinámico (googleAnalyticsService):**
   - Carga scripts dinámicamente
   - **Condicional**: Solo si `window.gtag` no existe
   - ⚠️ **POTENCIAL DUPLICADO**

4. **GA4 vía GTM:**
   - Si el contenedor GTM-PQ8Q6JGW tiene configurado GA4 (G-52EMX80KW5)
   - **Siempre presente** (si GTM está configurado correctamente)

---

## RIESGOS PARA TAG ASSISTANT

### Problemas que pueden ocultar GTM:

1. **Strategy `afterInteractive`:**
   - ✅ Correcto: GTM debe cargarse después de que la página sea interactiva
   - No debería ocultar GTM a Tag Assistant

2. **Scripts condicionales:**
   - ⚠️ GA4 y FB Pixel solo se cargan si existen env vars
   - No afecta GTM principal (hardcodeado)

3. **Feature Flag:**
   - Scripts de tienda solo si `NEXT_PUBLIC_FEATURE_MARKETING === '1'`
   - No afecta GTM principal en páginas normales

4. **Multiple dataLayer:**
   - Todos los scripts usan `dataLayer` (correcto)
   - No hay conflictos de nombres

---

## PRUEBAS SUGERIDAS

### 1. Tag Assistant (Producción)

**URL:** `https://mercadito-online-py.vercel.app`

**Qué deberías ver:**
- ✅ Container Loaded: `GTM-PQ8Q6JGW`
- ✅ DOM Ready: Tags activos
- ⚠️ Si hay tienda con `gtm_id`: 2 contenedores (si `NEXT_PUBLIC_FEATURE_MARKETING=1`)

**Tags esperados:**
- GA4 Configuration (si está configurado en GTM)
- GA4 Events (view_item, add_to_cart, begin_checkout, purchase)
- Facebook Pixel (si está configurado)

### 2. Tag Assistant (Staging/Local)

**URL:** `http://localhost:3000` o staging URL

**Qué deberías ver:**
- ✅ Container Loaded: `GTM-PQ8Q6JGW`
- ⚠️ Si `NEXT_PUBLIC_GA_ID` está configurado: GA4 directo + GA4 vía GTM = duplicación

### 3. GA4 DebugView

**Qué deberías ver:**
- Si `NEXT_PUBLIC_GA_ID` está configurado: 2 pageviews por carga (uno directo, uno vía GTM)
- Eventos e-commerce duplicados

---

## PARCHES PROPUESTOS

### PATCH 1: Eliminar GA4 Directo del Layout Principal

**Razón:** GTM debe ser la única fuente de GA4 para evitar duplicación.

**Archivo:** `src/app/layout.tsx`

```diff
--- a/src/app/layout.tsx
+++ b/src/app/layout.tsx
@@ -111,7 +111,6 @@ export default function RootLayout({
   children: React.ReactNode;
 }>) {
   const gaId = process.env.NEXT_PUBLIC_GA_ID;
-  const fbPixelId = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
 
   return (
     <html lang="es">
@@ -132,28 +131,6 @@ export default function RootLayout({
           }}
         />
 
-        {/* Google Analytics 4 */}
-        {gaId && (
-          <>
-            <script
-              async
-              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
-            />
-            <script
-              dangerouslySetInnerHTML={{
-                __html: `
-                  window.dataLayer = window.dataLayer || [];
-                  function gtag(){dataLayer.push(arguments);}
-                  gtag('js', new Date());
-                  gtag('config', '${gaId}', {
-                    page_path: window.location.pathname,
-                    send_page_view: true
-                  });
-                `,
-              }}
-            />
-          </>
-        )}
-
         {/* Facebook Pixel */}
         {fbPixelId && (
```

**Nota:** Facebook Pixel se mantiene porque puede ser independiente de GTM. Si quieres moverlo a GTM también, se puede eliminar.

---

### PATCH 2: Prevenir Duplicación de GTM en Tiendas

**Razón:** Si el GTM de tienda es el mismo que el principal, no cargar duplicado.

**Archivo:** `src/app/(marketplace)/store/[slug]/layout.tsx`

```diff
--- a/src/app/(marketplace)/store/[slug]/layout.tsx
+++ b/src/app/(marketplace)/store/[slug]/layout.tsx
@@ -38,7 +38,11 @@ export default async function StoreLayout({ children, params }: StoreLayoutProp
   // Determinar qué scripts cargar
   const hasGA = !!trackingIds.gaId;
   const hasPixel = !!trackingIds.pixelId;
-  const hasGTM = !!trackingIds.gtmId;
+  // Solo cargar GTM de tienda si es diferente del principal
+  const mainGTMId = 'GTM-PQ8Q6JGW';
+  const hasGTM = !!trackingIds.gtmId && trackingIds.gtmId !== mainGTMId;
 
   // IDs globales (para multi-pixel)
   const globalPixelId = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
```

---

### PATCH 3: Prevenir Duplicación de GA4 en Tiendas

**Razón:** Si el GA4 de tienda es el mismo que el global, no cargar duplicado.

**Archivo:** `src/app/(marketplace)/store/[slug]/layout.tsx`

```diff
--- a/src/app/(marketplace)/store/[slug]/layout.tsx
+++ b/src/app/(marketplace)/store/[slug]/layout.tsx
@@ -35,8 +35,12 @@ export default async function StoreLayout({ children, params }: StoreLayoutProp
   // Obtener IDs de tracking para esta tienda
   const trackingIds = await getTrackingIdsForStore(slug);
 
+  // IDs globales para comparación
+  const globalGAId = process.env.NEXT_PUBLIC_GA_ID;
+  const mainGTMId = 'GTM-PQ8Q6JGW';
+
   // Determinar qué scripts cargar
-  const hasGA = !!trackingIds.gaId;
+  const hasGA = !!trackingIds.gaId && trackingIds.gaId !== globalGAId;
   const hasPixel = !!trackingIds.pixelId;
-  const hasGTM = !!trackingIds.gtmId;
+  const hasGTM = !!trackingIds.gtmId && trackingIds.gtmId !== mainGTMId;
```

---

### PATCH 4: Prevenir Inicialización Duplicada de GA4 en Servicios

**Razón:** Evitar que `googleAnalyticsService` y `AnalyticsProvider` carguen GA4 si ya existe.

**Archivo:** `src/lib/services/googleAnalyticsService.ts`

```diff
--- a/src/lib/services/googleAnalyticsService.ts
+++ b/src/lib/services/googleAnalyticsService.ts
@@ -35,7 +35,13 @@ class GoogleAnalyticsService {
   initialize(measurementId: string): void {
     if (typeof window === 'undefined' || this.initialized) return;
 
+    // Verificar si gtag ya existe (puede estar cargado vía GTM o layout)
+    if (typeof window !== 'undefined' && (window as any).gtag) {
+      this.measurementId = measurementId;
+      this.initialized = true;
+      return; // Ya está cargado, solo usar la instancia existente
+    }
+
     this.measurementId = measurementId;
```

**Archivo:** `src/components/AnalyticsProvider.tsx`

```diff
--- a/src/components/AnalyticsProvider.tsx
+++ b/src/components/AnalyticsProvider.tsx
@@ -34,7 +34,7 @@ function AnalyticsTracker() {
     // Inicializar Google Analytics
     const gaId = process.env.NEXT_PUBLIC_GA_ID;
-    if (gaId && typeof window !== 'undefined' && !window.gtag) {
+    if (gaId && typeof window !== 'undefined' && !(window as any).gtag) {
       googleAnalyticsService.initialize(gaId);
     }
   }, []);
```

**Nota:** Con PATCH 1, GA4 directo se elimina, así que estos checks adicionales son redundantes pero defensivos.

---

### PATCH 5 (Opcional): Mover Facebook Pixel a GTM

**Razón:** Centralizar todo el tracking en GTM para mejor gestión.

**Archivo:** `src/app/layout.tsx`

```diff
--- a/src/app/layout.tsx
+++ b/src/app/layout.tsx
@@ -111,7 +111,6 @@ export default function RootLayout({
   children: React.ReactNode;
 }>) {
-  const gaId = process.env.NEXT_PUBLIC_GA_ID;
   const fbPixelId = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
 
   return (
@@ -131,30 +130,7 @@ export default function RootLayout({
           }}
         />
 
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

**Nota:** Esto requiere que Facebook Pixel esté configurado en GTM. Si no está, este patch no se debe aplicar.

---

## CHECKLIST FINAL

### ✅ Confirmaciones Positivas:

- ✅ **GTM script en `<head>`**: Líneas 118-130 de `src/app/layout.tsx`
- ✅ **Noscript iframe tras `<body>`**: Líneas 188-195 de `src/app/layout.tsx`
- ✅ **Solo 1 GTM principal**: `GTM-PQ8Q6JGW` hardcodeado
- ✅ **Strategy correcta**: `afterInteractive` (no oculta a Tag Assistant)
- ✅ **dataLayer inicializado**: `w[l]=w[l]||[]` en el snippet
- ✅ **No condicionado a producción**: GTM se carga siempre

### ⚠️ Problemas a Resolver:

- ❌ **GA4 directo duplica con GA4 vía GTM**: Eliminar GA4 directo (PATCH 1)
- ❌ **GTM de tienda puede duplicar GTM principal**: Prevenir si es el mismo ID (PATCH 2)
- ❌ **GA4 de tienda puede duplicar GA4 global**: Prevenir si es el mismo ID (PATCH 3)
- ❌ **Servicios pueden cargar GA4 adicionalmente**: Ya tienen checks, pero reforzar (PATCH 4)

### ✅ Confirmaciones Adicionales:

- ✅ **Tag Assistant debería detectar**: `GTM-PQ8Q6JGW` en todas las páginas
- ✅ **GTM ID hardcodeado**: No depende de env vars (correcto para evitar errores)
- ⚠️ **GA4 Measurement ID**: Debe estar configurado en GTM, no como script directo

---

## RECOMENDACIONES FINALES

### Prioridad Alta:

1. **Aplicar PATCH 1**: Eliminar GA4 directo del layout principal
   - GTM debe ser la única fuente de GA4
   - Evita duplicación de pageviews y eventos

2. **Aplicar PATCH 2**: Prevenir duplicación de GTM en tiendas
   - Solo cargar GTM de tienda si es diferente del principal

3. **Aplicar PATCH 3**: Prevenir duplicación de GA4 en tiendas
   - Solo cargar GA4 de tienda si es diferente del global

### Prioridad Media:

4. **Aplicar PATCH 4**: Reforzar checks en servicios
   - Defensivo, pero ayuda a prevenir errores futuros

### Prioridad Baja (Opcional):

5. **Aplicar PATCH 5**: Mover Facebook Pixel a GTM
   - Solo si Facebook Pixel está configurado en GTM
   - Centraliza todo el tracking

---

## NOTAS IMPORTANTES

1. **GTM Container v5**: El archivo `public/gtm-ecommerce-container-v5.json` está listo para importar
   - Ya tiene GA4 configurado (G-52EMX80KW5)
   - Ya tiene Facebook Pixel parametrizable
   - No requiere GA4 directo en el código

2. **Variables de Entorno**:
   - `NEXT_PUBLIC_GA_ID`: **NO DEBE USARSE** si GA4 está en GTM
   - `NEXT_PUBLIC_FACEBOOK_PIXEL_ID`: Se puede mantener si no está en GTM
   - `NEXT_PUBLIC_GTM_ID`: No se usa (GTM hardcodeado), pero se puede usar para tiendas

3. **Testing**:
   - Después de aplicar patches, verificar en Tag Assistant
   - Verificar en GA4 DebugView que no haya duplicación
   - Verificar que eventos e-commerce se envían correctamente

---

**FIN DEL DIAGNÓSTICO**


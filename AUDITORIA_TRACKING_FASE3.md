# 📊 Auditoría de Tracking - Fase 3
## Mercadito Online PY - Data Layer Unificado (Google + Meta + TikTok)

**Fecha:** 2025-01-XX  
**Auditor:** LPMS - Auditor de Tracking & Marketing Senior  
**Objetivo:** Analizar estado actual del tracking y detectar gaps para implementar Data Layer unificado

---

## 1. Implementación actual detectada

| Proveedor | Tipo | Archivo y ruta | Descripción corta |
|-----------|------|----------------|-------------------|
| **Google** | GTM (Google Tag Manager) | `src/app/layout.tsx` (líneas 120-142) | Inicializa `window.dataLayer` y carga script GTM con ID `GTM-PQ8Q6JGW` |
| **Google** | GA4 (vía GTM) | `src/lib/services/googleAnalyticsService.ts` | Servicio que usa `gtag` si existe (cargado por GTM), NO carga gtag.js directamente |
| **Google** | GA4 (dataLayer) | `src/components/AnalyticsProvider.tsx` (líneas 46-61) | Trackea `page_view` vía `dataLayer.push()` en cada cambio de ruta |
| **Google** | GA4 (gtag directo) | `src/lib/services/analyticsService.ts` (líneas 83-89) | Llama `gtag('event', ...)` si gtag existe |
| **Google** | GTM (helper) | `src/lib/analytics.ts` | Funciones helper para eventos e-commerce: `trackViewItem`, `trackAddToCart`, `trackBeginCheckout`, `trackPurchase` |
| **Google** | GTM (por tienda) | `src/app/(marketplace)/store/[slug]/layout.tsx` (líneas 27-62) | Inyecta GTM adicional por tienda si tiene `gtm_id` distinto del global |
| **Meta** | Facebook Pixel (global) | `src/app/layout.tsx` (líneas 147-176) | Inyecta script de Facebook Pixel con `fbq('init')` y `fbq('track', 'PageView')` |
| **Meta** | Facebook Pixel (servicio) | `src/lib/services/facebookPixelService.ts` | Servicio completo con métodos: `trackViewContent`, `trackAddToCart`, `trackInitiateCheckout`, `trackPurchase`, etc. |
| **Meta** | Facebook Pixel (por tienda) | `src/app/(marketplace)/store/[slug]/layout.tsx` (líneas 80-135) | Inyecta pixel adicional por tienda con namespace 'store' si tiene `fb_pixel_id` |
| **Meta** | Facebook Pixel (unificado) | `src/lib/marketing/events.ts` | API unificada que trackea a GA4 y Facebook Pixel simultáneamente |
| **Otro** | Analytics Service (Supabase) | `src/lib/services/analyticsService.ts` | Guarda eventos en tabla `analytics_events` de Supabase y también envía a GA4 si está disponible |

---

## 2. Estado del Data Layer

### ¿Existe `window.dataLayer`?

**Sí**, pero de forma parcial y no unificada:

1. **Inicialización en layout raíz:**
   - **Archivo:** `src/app/layout.tsx` (líneas 120-127)
   - **Código:**
     ```typescript
     <Script
       id="gtm-datalayer"
       strategy="beforeInteractive"
       dangerouslySetInnerHTML={{
         __html: `window.dataLayer = window.dataLayer || [];`,
       }}
     />
     ```
   - **Estado:** ✅ Se inicializa ANTES de GTM (correcto)

2. **Uso en AnalyticsProvider:**
   - **Archivo:** `src/components/AnalyticsProvider.tsx` (líneas 49-54)
   - **Código:**
     ```typescript
     if (typeof window !== 'undefined' && window.dataLayer) {
       window.dataLayer.push({
         event: 'page_view',
         page_path: pathname,
         page_title: document.title,
       });
     }
     ```
   - **Estado:** ✅ Se usa para `page_view` en cada cambio de ruta

3. **Uso en helpers de analytics:**
   - **Archivo:** `src/lib/analytics.ts` (función `dlPush`, líneas 38-54)
   - **Código:**
     ```typescript
     export function dlPush(evt: string, payload: any = {}): void {
       if (typeof window === 'undefined') return;
       window.dataLayer = window.dataLayer || [];
       const eventData = { event: evt, ...payload };
       window.dataLayer.push(eventData);
     }
     ```
   - **Estado:** ✅ Helper centralizado para push al dataLayer

### ¿Se usa de forma consistente?

**No completamente.** Hay múltiples formas de trackear eventos:

1. **Vía dataLayer (GTM):** `src/lib/analytics.ts` - ✅ Consistente para e-commerce
2. **Vía gtag directo:** `src/lib/services/googleAnalyticsService.ts` - ⚠️ Solo si gtag existe
3. **Vía fbq directo:** `src/lib/services/facebookPixelService.ts` - ⚠️ Solo Meta Pixel
4. **Vía función unificada:** `src/lib/marketing/events.ts` - ⚠️ Trackea a GA4 y Meta, pero NO usa dataLayer
5. **Vía Supabase:** `src/lib/services/analyticsService.ts` - ⚠️ Solo guarda en DB, luego envía a GA4 si existe

### ¿Hay funciones helper para disparar eventos?

**Sí, pero fragmentadas:**

1. **`src/lib/analytics.ts`:**
   - `dlPush(evt, payload)` - Base para dataLayer
   - `trackViewItem(item)` - Vista de producto
   - `trackAddToCart(item)` - Agregar al carrito
   - `trackBeginCheckout(items, total)` - Inicio de checkout
   - `trackPurchase(orderId, items, total)` - Compra completada

2. **`src/lib/marketing/events.ts`:**
   - `trackPageView(path)` - Vista de página (GA4 + Meta)
   - `trackViewItem(params)` - Vista de producto (GA4 + Meta)
   - `trackAddToCart(params)` - Agregar al carrito (GA4 + Meta)
   - `trackBeginCheckout(params)` - Inicio de checkout (GA4 + Meta)
   - `trackPurchase(params)` - Compra completada (GA4 + Meta)
   - `trackSearch(searchTerm)` - Búsqueda (GA4 + Meta)
   - `trackLead(source)` - Lead (GA4 + Meta)

3. **`src/lib/services/googleAnalyticsService.ts`:**
   - Métodos específicos de GA4 (usa gtag directamente)

4. **`src/lib/services/facebookPixelService.ts`:**
   - Métodos específicos de Meta Pixel (usa fbq directamente)

### Conclusión del Data Layer

**❌ NO existe un Data Layer unificado actualmente.**

- Hay múltiples formas de trackear eventos (dataLayer, gtag, fbq, Supabase)
- No hay una función central `track(eventName, payload)` que envíe a todos los sistemas
- Los eventos se disparan de forma inconsistente según el lugar del código
- **Falta:** Integración con TikTok Pixel (no existe implementación)

---

## 3. Eventos actualmente implementados

### 3.1 Google (GA4 / GTM / gtag)

| Evento | Sistema | Archivo | Momento de disparo | Comentarios |
|--------|---------|---------|-------------------|-------------|
| `page_view` | dataLayer + gtag | `src/components/AnalyticsProvider.tsx` (líneas 49-60) | En cada cambio de ruta (useEffect con pathname) | ✅ Correcto, envía a dataLayer y luego gtag si existe |
| `view_item` | gtag | `src/lib/services/googleAnalyticsService.ts` (método `trackViewItem`) | No se llama automáticamente | ⚠️ Método existe pero no se usa en páginas de producto |
| `add_to_cart` | gtag | `src/lib/services/googleAnalyticsService.ts` (método `trackAddToCart`) | No se llama automáticamente | ⚠️ Método existe pero no se usa |
| `begin_checkout` | gtag + dataLayer | `src/app/checkout/page.tsx` (líneas 300-326) | Al cargar items del carrito en checkout | ✅ Se llama `googleAnalytics.trackBeginCheckout()` y `trackBeginCheckout()` de analytics.ts |
| `purchase` | gtag + dataLayer | `src/app/checkout/success/page.tsx` (líneas 84-114) | Al cargar página de éxito con orderId | ✅ Se llama `googleAnalytics.trackPurchase()` y `trackPurchase()` de analytics.ts |
| `view_item_list` | gtag | `src/lib/services/googleAnalyticsService.ts` (método `trackViewItemList`) | No se llama automáticamente | ⚠️ Método existe pero no se usa |
| `select_item` | gtag | `src/lib/services/googleAnalyticsService.ts` (método `trackSelectItem`) | No se llama automáticamente | ⚠️ Método existe pero no se usa |
| `search` | gtag | `src/lib/services/googleAnalyticsService.ts` (método `trackSearch`) | No se llama automáticamente | ⚠️ Método existe pero no se usa |
| `view_store` | gtag | `src/lib/services/googleAnalyticsService.ts` (método `trackStoreView`) | No se llama automáticamente | ⚠️ Método existe pero no se usa |
| `view_auction` | gtag | `src/lib/services/googleAnalyticsService.ts` (método `trackAuctionView`) | No se llama automáticamente | ⚠️ Método existe pero no se usa |

### 3.2 Meta (Pixel)

| Evento | Sistema | Archivo | Momento de disparo | Comentarios |
|--------|---------|---------|-------------------|-------------|
| `PageView` | fbq | `src/app/layout.tsx` (línea 162) | Al cargar cualquier página (script inline) | ✅ Correcto, se dispara en layout global |
| `PageView` (tienda) | fbq con namespace | `src/app/(marketplace)/store/[slug]/layout.tsx` (líneas 88, 114) | Al cargar página de tienda | ✅ Correcto, se dispara para pixel global y store |
| `ViewContent` | fbq | `src/lib/services/facebookPixelService.ts` (método `trackViewContent`) | No se llama automáticamente | ⚠️ Método existe pero no se usa en páginas de producto |
| `AddToCart` | fbq | `src/lib/services/facebookPixelService.ts` (método `trackAddToCart`) | No se llama automáticamente | ⚠️ Método existe pero no se usa |
| `InitiateCheckout` | fbq | `src/app/checkout/page.tsx` (línea 300) | Al cargar items del carrito en checkout | ✅ Se llama `facebookPixel.trackInitiateCheckout()` |
| `Purchase` | fbq | `src/app/checkout/success/page.tsx` (líneas 84-89) | Al cargar página de éxito con orderId | ✅ Se llama `facebookPixel.trackPurchase()` |
| `Search` | fbq | `src/lib/services/facebookPixelService.ts` (método `trackSearch`) | No se llama automáticamente | ⚠️ Método existe pero no se usa |
| `ViewContent` (tienda) | fbq | `src/lib/services/facebookPixelService.ts` (método `trackStoreView`) | No se llama automáticamente | ⚠️ Método existe pero no se usa |
| `ViewContent` (subasta) | fbq | `src/lib/services/facebookPixelService.ts` (método `trackAuctionView`) | No se llama automáticamente | ⚠️ Método existe pero no se usa |
| `Lead` (sorteo) | fbq | `src/lib/services/facebookPixelService.ts` (método `trackRaffleParticipate`) | No se llama automáticamente | ⚠️ Método existe pero no se usa |
| `Lead` (seguir tienda) | fbq | `src/lib/services/facebookPixelService.ts` (método `trackStoreFollow`) | No se llama automáticamente | ⚠️ Método existe pero no se usa |
| `CompleteRegistration` | fbq | `src/lib/services/facebookPixelService.ts` (método `identify`) | No se llama automáticamente | ⚠️ Método existe pero no se usa |

### 3.3 TikTok (Pixel)

| Evento | Sistema | Archivo | Momento de disparo | Comentarios |
|--------|---------|---------|-------------------|-------------|
| **Ninguno** | - | - | - | ❌ **NO HAY IMPLEMENTACIÓN DE TIKTOK PIXEL** |

### 3.4 Otros / Custom

| Evento | Sistema | Archivo | Momento de disparo | Comentarios |
|--------|---------|---------|-------------------|-------------|
| `page_view` | Supabase + gtag | `src/lib/services/analyticsService.ts` (método `trackPageView`) | No se llama automáticamente | ⚠️ Guarda en DB y envía a GA4 si existe |
| `product_view` | Supabase + gtag | `src/lib/services/analyticsService.ts` (método `trackProductView`) | No se llama automáticamente | ⚠️ Guarda en DB y envía a GA4 si existe |
| `purchase` | Supabase + gtag | `src/lib/services/analyticsService.ts` (método `trackProductPurchase`) | No se llama automáticamente | ⚠️ Guarda en DB y envía a GA4 si existe |
| `search` | Supabase + gtag | `src/lib/services/analyticsService.ts` (método `trackSearch`) | No se llama automáticamente | ⚠️ Guarda en DB y envía a GA4 si existe |
| `user_registration` | Supabase + gtag | `src/lib/services/analyticsService.ts` (método `trackUserRegistration`) | No se llama automáticamente | ⚠️ Método existe pero no se usa en signup |
| `user_login` | Supabase + gtag | `src/lib/services/analyticsService.ts` (método `trackUserLogin`) | No se llama automáticamente | ⚠️ Método existe pero no se usa en login |

---

## 4. Gap Analysis (qué falta vs lo deseado)

### Eventos estándar

| Evento objetivo | ¿Existe actualmente? | Dónde / cómo (si existe) | Problema / falta |
|-----------------|---------------------|--------------------------|------------------|
| `pageview` | ✅ **Sí (Parcial)** | `src/components/AnalyticsProvider.tsx` - se dispara en cada cambio de ruta | ✅ Implementado correctamente vía dataLayer y gtag |
| `signup` | ❌ **No** | No existe tracking de signup | ❌ No se trackea cuando usuario se registra en `src/app/auth/sign-in/page.tsx` (línea 147 `signUp`) |
| `login` | ❌ **No** | Existe método `trackUserLogin` en `analyticsService.ts` pero NO se llama | ❌ No se trackea cuando usuario inicia sesión en `src/app/auth/sign-in/page.tsx` (línea 49 `signIn`) |

### Marketplace

| Evento objetivo | ¿Existe actualmente? | Dónde / cómo (si existe) | Problema / falta |
|-----------------|---------------------|--------------------------|------------------|
| `view_product` | ⚠️ **Parcial** | Métodos existen en servicios pero NO se llaman automáticamente | ❌ No se trackea cuando se abre página de producto (ej: `/products/[id]`). Métodos disponibles: `googleAnalytics.trackViewItem()`, `facebookPixel.trackViewContent()`, `analytics.trackProductView()` |
| `publish_product` | ❌ **No** | No existe tracking de publicación | ❌ No se trackea cuando se publica producto nuevo en `src/lib/services/productService.ts` (método `createProduct`, línea 67) |

### Subastas

| Evento objetivo | ¿Existe actualmente? | Dónde / cómo (si existe) | Problema / falta |
|-----------------|---------------------|--------------------------|------------------|
| `bid` | ❌ **No** | No existe tracking de puja | ❌ No se trackea cuando usuario hace puja. La función `place_bid` está en SQL (`supabase/migrations/20251116012000_update_place_bid_with_reputation.sql`) pero no hay tracking de eventos |
| `win` | ❌ **No** | No existe tracking de ganar subasta | ❌ No se trackea cuando usuario gana subasta. Se notifica vía WhatsApp (`src/lib/events/whatsappEvents.ts` línea 56 `notifyAuctionWon`) pero no hay evento de tracking |
| `lose` | ❌ **No** | No existe tracking de perder subasta | ❌ No se trackea cuando usuario pierde subasta (otro usuario gana) |

### Pagos / Membresías

| Evento objetivo | ¿Existe actualmente? | Dónde / cómo (si existe) | Problema / falta |
|-----------------|---------------------|--------------------------|------------------|
| `purchase` | ✅ **Sí** | `src/app/checkout/success/page.tsx` (líneas 84-114) | ✅ Implementado para GA4, Meta y dataLayer. **PERO:** Solo se trackea para órdenes normales, NO para membresías |
| `membership_activated` | ❌ **No** | No existe tracking de activación de membresía | ❌ No se trackea cuando se activa membresía. Se activa en `src/lib/services/membershipService.ts` (método `activateMembershipSubscription`, línea 135) y se notifica vía WhatsApp (línea 159) pero no hay evento de tracking |

### Resumen de gaps

- ❌ **Faltan 7 eventos:** `signup`, `login`, `publish_product`, `bid`, `win`, `lose`, `membership_activated`
- ⚠️ **Parcialmente implementados 1:** `view_product` (métodos existen pero no se llaman)
- ✅ **Implementados correctamente 2:** `pageview`, `purchase` (solo para órdenes, no membresías)
- ❌ **Falta integración TikTok Pixel:** No existe implementación

---

## 5. Checklist de implementación FASE 3 – Data Layer Unificado

### 5.1 Crear Data Layer unificado

- [ ] Crear archivo `/lib/tracking/dataLayer.ts` con función central `track(eventName, payload)` que:
  - Envíe a `window.dataLayer.push()` (GTM)
  - Envíe a `gtag('event', ...)` si existe (GA4)
  - Envíe a `fbq('track', ...)` si existe (Meta Pixel)
  - Envíe a `ttq.track(...)` si existe (TikTok Pixel)
  - Maneje SSR de forma segura (verificar `typeof window !== 'undefined'`)
  - Soporte para múltiples pixels (global + store)

- [ ] Inicializar `window.dataLayer` en `app/layout.tsx` de forma segura (SSR + client) - ✅ **YA EXISTE** (líneas 120-127)

- [ ] Crear tipos TypeScript para eventos estándar en `/lib/tracking/types.ts`:
  - `PageViewEvent`
  - `SignupEvent`
  - `LoginEvent`
  - `ViewProductEvent`
  - `PublishProductEvent`
  - `BidEvent`
  - `WinEvent`
  - `LoseEvent`
  - `PurchaseEvent`
  - `MembershipActivatedEvent`

### 5.2 Implementar eventos faltantes

#### Navegación
- [ ] Implementar `track('signup', {...})` en `src/app/auth/sign-in/page.tsx` después de `signUp` exitoso (línea 147)
  - Incluir: `user_id`, `email`, `method` (email/google/facebook)
  - Enviar a: dataLayer, GA4, Meta, TikTok

- [ ] Implementar `track('login', {...})` en `src/app/auth/sign-in/page.tsx` después de `signIn` exitoso (línea 49)
  - Incluir: `user_id`, `method` (email/google/facebook)
  - Enviar a: dataLayer, GA4, Meta, TikTok

#### Marketplace
- [ ] Implementar `track('view_product', {...})` en página de producto (buscar archivo `/products/[id]/page.tsx` o similar)
  - Incluir: `product_id`, `product_name`, `price`, `currency`, `category`
  - Enviar a: dataLayer, GA4, Meta, TikTok
  - Usar formato estándar de e-commerce (items array)

- [ ] Implementar `track('publish_product', {...})` en `src/lib/services/productService.ts` después de `createProduct` exitoso (línea 67)
  - Incluir: `product_id`, `product_name`, `price`, `currency`, `category`, `seller_id`
  - Enviar a: dataLayer, GA4, Meta, TikTok

#### Subastas
- [ ] Implementar `track('bid', {...})` en función SQL `place_bid` o en cliente después de puja exitosa
  - Incluir: `auction_id`, `bid_amount`, `bidder_id`, `current_bid`, `currency`
  - Enviar a: dataLayer, GA4, Meta, TikTok
  - **Nota:** Si se hace en SQL, necesitar trigger o función que llame a API/endpoint

- [ ] Implementar `track('win', {...})` cuando subasta termina y usuario es ganador
  - Incluir: `auction_id`, `winning_bid`, `winner_id`, `currency`
  - Enviar a: dataLayer, GA4, Meta, TikTok
  - **Ubicación sugerida:** En webhook de Pagopar cuando se confirma pago de subasta ganada, o en función que determina ganador

- [ ] Implementar `track('lose', {...})` cuando subasta termina y usuario NO es ganador
  - Incluir: `auction_id`, `user_id`, `winning_bid`, `winner_id`
  - Enviar a: dataLayer, GA4, Meta, TikTok
  - **Ubicación sugerida:** En función que determina ganador, trackear para todos los postores que no ganaron

#### Pagos / Membresías
- [ ] Implementar `track('membership_activated', {...})` en `src/lib/services/membershipService.ts` después de `activateMembershipSubscription` exitoso (línea 135)
  - Incluir: `subscription_id`, `plan_id`, `plan_name`, `plan_type`, `subscription_type`, `amount`, `currency`, `user_id`
  - Enviar a: dataLayer, GA4, Meta, TikTok

- [ ] Asegurar que `track('purchase', {...})` también se dispare para membresías en `src/app/checkout/success/page.tsx`
  - Actualmente solo se trackea para órdenes normales (líneas 84-114)
  - Agregar lógica para detectar si es membresía y trackear con datos apropiados

### 5.3 Integrar TikTok Pixel

- [ ] Crear archivo `/lib/services/tikTokPixelService.ts` similar a `facebookPixelService.ts`:
  - Método `initialize(pixelId)` que carga script de TikTok
  - Método `track(eventName, eventData)` que llama `ttq.track()`
  - Métodos específicos: `trackPageView()`, `trackViewContent()`, `trackAddToCart()`, `trackInitiateCheckout()`, `trackPurchase()`, etc.

- [ ] Inyectar script de TikTok Pixel en `src/app/layout.tsx` (similar a Facebook Pixel, líneas 147-176)
  - Leer `NEXT_PUBLIC_TIKTOK_PIXEL_ID` de env
  - Inicializar con `ttq.load()` y `ttq.page()`

- [ ] Integrar TikTok Pixel en función `track()` del dataLayer unificado

- [ ] Agregar soporte para TikTok Pixel por tienda en `src/app/(marketplace)/store/[slug]/layout.tsx` (similar a Facebook Pixel)

### 5.4 Migrar código existente

- [ ] Reemplazar llamadas directas a `gtag('event', ...)` por `track(...)` del dataLayer unificado
  - Buscar en: `src/lib/services/googleAnalyticsService.ts`, `src/lib/services/analyticsService.ts`
  - Mantener compatibilidad durante transición

- [ ] Reemplazar llamadas directas a `fbq('track', ...)` por `track(...)` del dataLayer unificado
  - Buscar en: `src/lib/services/facebookPixelService.ts`, `src/lib/marketing/events.ts`
  - Mantener compatibilidad durante transición

- [ ] Consolidar funciones helper en `src/lib/analytics.ts` y `src/lib/marketing/events.ts`:
  - Usar función `track()` centralizada
  - Eliminar duplicación de código

- [ ] Actualizar `src/app/checkout/page.tsx`:
  - Reemplazar `facebookPixel.trackInitiateCheckout()` y `googleAnalytics.trackBeginCheckout()` por `track('begin_checkout', {...})`
  - Reemplazar `trackBeginCheckout()` de `analytics.ts` por `track('begin_checkout', {...})`

- [ ] Actualizar `src/app/checkout/success/page.tsx`:
  - Reemplazar `facebookPixel.trackPurchase()`, `googleAnalytics.trackPurchase()` y `trackPurchase()` de `analytics.ts` por `track('purchase', {...})`

### 5.5 Testing y validación

- [ ] Crear script de testing `/scripts/qa-tracking-unified.mjs` que verifique:
  - Presencia de `window.dataLayer`
  - Presencia de scripts GTM, Meta Pixel, TikTok Pixel
  - Eventos disparados correctamente en dataLayer
  - Eventos enviados a GA4, Meta, TikTok

- [ ] Documentar estructura de eventos en `/docs/TRACKING_EVENTS.md`:
  - Lista completa de eventos
  - Estructura de payload para cada evento
  - Ejemplos de uso

- [ ] Agregar variables de entorno necesarias en `.env.example`:
  - `NEXT_PUBLIC_TIKTOK_PIXEL_ID` (nuevo)
  - Verificar que existan: `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_FACEBOOK_PIXEL_ID`

### 5.6 Configuración GTM

- [ ] Verificar configuración de GTM para:
  - Tags de GA4 configurados correctamente
  - Tags de Meta Pixel configurados correctamente
  - Tags de TikTok Pixel (nuevo) configurados
  - Triggers basados en dataLayer events funcionando

---

## Resumen ejecutivo

### Estado actual
- ✅ **GTM y dataLayer:** Implementado correctamente
- ✅ **GA4:** Implementado vía GTM
- ✅ **Meta Pixel:** Implementado (global + por tienda)
- ❌ **TikTok Pixel:** NO implementado
- ⚠️ **Data Layer unificado:** NO existe, hay múltiples formas de trackear

### Eventos implementados
- ✅ `pageview` - Implementado
- ✅ `purchase` - Implementado (solo órdenes, no membresías)
- ⚠️ `view_product` - Métodos existen pero no se llaman
- ❌ `signup` - NO implementado
- ❌ `login` - NO implementado
- ❌ `publish_product` - NO implementado
- ❌ `bid` - NO implementado
- ❌ `win` - NO implementado
- ❌ `lose` - NO implementado
- ❌ `membership_activated` - NO implementado

### Prioridades de implementación

1. **P0 (Crítico):**
   - Crear Data Layer unificado (`/lib/tracking/dataLayer.ts`)
   - Integrar TikTok Pixel
   - Implementar eventos faltantes: `signup`, `login`, `view_product`, `publish_product`, `bid`, `win`, `lose`, `membership_activated`

2. **P1 (Alto):**
   - Migrar código existente a función `track()` centralizada
   - Consolidar helpers duplicados

3. **P2 (Medio):**
   - Testing y validación
   - Documentación

---

**Fin del reporte de auditoría**













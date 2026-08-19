# 📊 Implementación Data Layer Unificado - Fase 3
## Mercadito Online PY - Tracking & Marketing

**Fecha:** 2025-01-XX  
**Estado:** ✅ Implementado  
**Archivo central:** `src/lib/tracking/dataLayer.ts`

---

## 📁 Archivo Central del Data Layer

### `src/lib/tracking/dataLayer.ts`

Sistema centralizado de tracking que envía todos los eventos a `window.dataLayer`. GTM, Meta Pixel y TikTok Pixel (cuando se configure) leerán desde ahí.

**Funciones principales:**
- `track(eventName, payload)` - Función central para todos los eventos
- `getDataLayer()` - Obtiene o inicializa `window.dataLayer` de forma segura (SSR-safe)

**Helpers disponibles:**
- `trackPageview(path, extra)`
- `trackSignup(userId, method, extra)`
- `trackLogin(userId, method, extra)`
- `trackViewProduct(productId, name, price, extra)`
- `trackPublishProduct(productId, name, price, storeId, category, extra)`
- `trackBid(auctionId, amount, userId, currentBid, extra)`
- `trackWin(auctionId, finalPrice, userId, extra)`
- `trackLose(auctionId, userId, winningBid, winnerId, extra)`
- `trackPurchase(orderId, total, items, extra)`
- `trackMembershipActivated(subscriptionId, planId, planName, planType, subscriptionType, amount, userId, extra)`

---

## ✅ Eventos Implementados y Dónde se Disparan

### 1. `pageview`
- **Archivo:** `src/components/AnalyticsProvider.tsx` (línea 48-50)
- **Momento:** En cada cambio de ruta (useEffect con pathname)
- **Payload:** `{ page_path, page_title }`

### 2. `signup`
- **Archivo:** `src/app/auth/sign-in/page.tsx` (línea 173-180)
- **Momento:** Después de registro exitoso (`signUp` exitoso)
- **Payload:** `{ user_id, method: 'email' }`

### 3. `login`
- **Archivo:** `src/app/auth/sign-in/page.tsx` (línea 113-121)
- **Momento:** Después de login exitoso (`signIn` exitoso)
- **Payload:** `{ user_id, method: 'email' }`

### 4. `view_product`
- **Archivo:** `src/app/products/[id]/ProductPageClient.tsx` (línea 46-59)
- **Momento:** Cuando se monta el componente de detalle de producto
- **Payload:** `{ product_id, name, price, currency: 'PYG', sale_type, store_id }`

### 5. `publish_product`
- **Archivo:** `src/lib/services/productService.ts` (línea 233-256)
- **Momento:** Después de crear producto exitosamente (`createProduct`)
- **Payload:** `{ product_id, name, price, currency: 'PYG', store_id, category, sale_type, seller_id }`

### 6. `bid`
- **Archivo:** `src/lib/services/auctionService.ts` (línea 579-601, 619-625)
- **Momento:** Después de puja exitosa (`placeBid` exitoso)
- **Payload:** `{ auction_id, amount, user_id, current_bid, currency: 'PYG', bid_id }`

### 7. `win`
- **Archivo:** `src/app/auctions/[id]/page.tsx` (línea 447-461)
- **Momento:** Cuando usuario visita subasta finalizada y es el ganador
- **Payload:** `{ auction_id, final_price, user_id, currency: 'PYG', auction_title }`

### 8. `lose`
- **Archivo:** `src/app/auctions/[id]/page.tsx` (línea 462-482)
- **Momento:** Cuando usuario visita subasta finalizada, hizo pujas pero no ganó
- **Payload:** `{ auction_id, user_id, winning_bid, winner_id, auction_title }`

### 9. `purchase`
- **Archivo:** `src/app/checkout/success/page.tsx` (línea 105-118 para órdenes, línea 74-89 para membresías)
- **Momento:** Al cargar página de éxito con `orderId` o `subscriptionId`
- **Payload (órdenes):** `{ transaction_id, value, currency: 'PYG', items[], payment_method, payment_status }`
- **Payload (membresías):** `{ transaction_id, value, currency: 'PYG', items[], subscription_type, plan_type, payment_method }`

### 10. `membership_activated`
- **Archivo:** `src/lib/services/membershipService.ts` (línea 162-176)
- **Momento:** Después de activar membresía exitosamente (`activateMembershipSubscription`)
- **Payload:** `{ subscription_id, plan_id, plan_name, plan_type, subscription_type, value, currency: 'PYG', user_id }`

---

## 🔧 Configuración en GTM

### Tags a Configurar

#### 1. Google Analytics 4 (GA4)
- **Tipo:** Google Analytics: GA4 Configuration
- **Measurement ID:** `NEXT_PUBLIC_GA_ID`
- **Trigger:** All Pages (para pageview automático)
- **Eventos adicionales:** Configurar triggers basados en `dataLayer` events:
  - `event = 'signup'`
  - `event = 'login'`
  - `event = 'view_product'`
  - `event = 'publish_product'`
  - `event = 'bid'`
  - `event = 'win'`
  - `event = 'lose'`
  - `event = 'purchase'`
  - `event = 'membership_activated'`

#### 2. Meta Pixel (Facebook)
- **Tipo:** Custom HTML o Meta Pixel
- **Pixel ID:** `NEXT_PUBLIC_FACEBOOK_PIXEL_ID`
- **Trigger:** All Pages (para PageView automático)
- **Eventos adicionales:** Configurar triggers basados en `dataLayer` events:
  - `event = 'signup'` → `fbq('track', 'CompleteRegistration')`
  - `event = 'login'` → `fbq('track', 'CompleteRegistration')`
  - `event = 'view_product'` → `fbq('track', 'ViewContent', {...})`
  - `event = 'publish_product'` → `fbq('trackCustom', 'PublishProduct', {...})`
  - `event = 'bid'` → `fbq('trackCustom', 'Bid', {...})`
  - `event = 'win'` → `fbq('trackCustom', 'Win', {...})`
  - `event = 'lose'` → `fbq('trackCustom', 'Lose', {...})`
  - `event = 'purchase'` → `fbq('track', 'Purchase', {...})`
  - `event = 'membership_activated'` → `fbq('track', 'Subscribe', {...})`

#### 3. TikTok Pixel (NUEVO - Pendiente de configuración)
- **Tipo:** Custom HTML
- **Pixel ID:** `NEXT_PUBLIC_TIKTOK_PIXEL_ID` (agregar a variables de entorno)
- **Script de inicialización:**
  ```html
  <script>
  !function (w, d, t) {
    w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
    ttq.load('{{TikTok Pixel ID}}');
    ttq.page();
  }(window, document, 'ttq');
  </script>
  ```
- **Trigger:** All Pages (para pageview automático)
- **Eventos adicionales:** Configurar triggers basados en `dataLayer` events:
  - `event = 'signup'` → `ttq.track('CompleteRegistration')`
  - `event = 'login'` → `ttq.track('CompleteRegistration')`
  - `event = 'view_product'` → `ttq.track('ViewContent', {...})`
  - `event = 'purchase'` → `ttq.track('PlaceAnOrder', {...})`
  - `event = 'membership_activated'` → `ttq.track('Subscribe', {...})`

### Variables de DataLayer a Crear en GTM

Para facilitar el mapeo de eventos, crear estas variables en GTM:

- `dl_event` - `{{Event}}` (nombre del evento)
- `dl_user_id` - `{{dlv - user_id}}`
- `dl_product_id` - `{{dlv - product_id}}`
- `dl_auction_id` - `{{dlv - auction_id}}`
- `dl_transaction_id` - `{{dlv - transaction_id}}`
- `dl_value` - `{{dlv - value}}`
- `dl_currency` - `{{dlv - currency}}`
- `dl_items` - `{{dlv - items}}`

---

## 📋 Checklist de Implementación

### ✅ Completado

- [x] Crear archivo `/lib/tracking/dataLayer.ts` con función `track(eventName, payload)`
- [x] Inicializar `window.dataLayer` en `app/layout.tsx` (ya existía, verificado)
- [x] Implementar `track('pageview', {...})` en `AnalyticsProvider`
- [x] Implementar `track('signup', {...})` en `auth/sign-in/page.tsx`
- [x] Implementar `track('login', {...})` en `auth/sign-in/page.tsx`
- [x] Implementar `track('view_product', {...})` en `products/[id]/ProductPageClient.tsx`
- [x] Implementar `track('publish_product', {...})` en `productService.createProduct`
- [x] Implementar `track('bid', {...})` en `auctionService.placeBid`
- [x] Implementar `track('win', {...})` en `auctions/[id]/page.tsx`
- [x] Implementar `track('lose', {...})` en `auctions/[id]/page.tsx`
- [x] Normalizar `track('purchase', {...})` en `checkout/success/page.tsx` (órdenes)
- [x] Implementar `track('purchase', {...})` para membresías en `checkout/success/page.tsx`
- [x] Implementar `track('membership_activated', {...})` en `membershipService.activateMembershipSubscription`

### ⬜ Pendiente (Configuración GTM)

- [ ] Configurar Tag de TikTok Pixel en GTM
- [ ] Configurar Triggers para eventos personalizados en GTM:
  - [ ] Trigger para `event = 'signup'`
  - [ ] Trigger para `event = 'login'`
  - [ ] Trigger para `event = 'view_product'`
  - [ ] Trigger para `event = 'publish_product'`
  - [ ] Trigger para `event = 'bid'`
  - [ ] Trigger para `event = 'win'`
  - [ ] Trigger para `event = 'lose'`
  - [ ] Trigger para `event = 'membership_activated'`
- [ ] Configurar mapeo de eventos a Meta Pixel en GTM
- [ ] Configurar mapeo de eventos a TikTok Pixel en GTM
- [ ] Agregar variable de entorno `NEXT_PUBLIC_TIKTOK_PIXEL_ID`

---

## 🔍 Ejemplos de Uso

### Ejemplo 1: Tracking de Login
```typescript
import { trackLogin } from '@/lib/tracking/dataLayer';

// Después de login exitoso
trackLogin(userId, 'email');
// Envía a dataLayer: { event: 'login', user_id: userId, method: 'email' }
```

### Ejemplo 2: Tracking de Puja
```typescript
import { trackBid } from '@/lib/tracking/dataLayer';

// Después de puja exitosa
trackBid(auctionId, bidAmount, userId, currentBid, { bid_id: bidId });
// Envía a dataLayer: { event: 'bid', auction_id, amount, user_id, current_bid, currency: 'PYG', bid_id }
```

### Ejemplo 3: Tracking de Compra
```typescript
import { trackPurchase } from '@/lib/tracking/dataLayer';

trackPurchase(
  orderId,
  total,
  [
    { item_id: 'prod-1', item_name: 'Producto 1', price: 100000, quantity: 2 },
    { item_id: 'prod-2', item_name: 'Producto 2', price: 50000, quantity: 1 },
  ],
  { payment_method: 'pagopar', payment_status: 'paid' }
);
// Envía a dataLayer: { event: 'purchase', transaction_id, value, currency: 'PYG', items[], ... }
```

---

## 📝 Notas Importantes

1. **SSR Safety:** Todas las funciones verifican `typeof window !== 'undefined'` antes de acceder a `window.dataLayer`.

2. **Compatibilidad:** Se mantiene compatibilidad con código existente (gtag, fbq) durante la transición. GTM manejará el envío a GA4, Meta y TikTok.

3. **Debug Mode:** Activar con `NEXT_PUBLIC_TRACKING_DEBUG=true` para ver logs en consola.

4. **TikTok Pixel:** El código está listo, solo falta:
   - Agregar `NEXT_PUBLIC_TIKTOK_PIXEL_ID` a variables de entorno
   - Configurar Tag en GTM (ver sección arriba)

5. **Eventos Legacy:** Los eventos antiguos (`trackViewItem` de `analytics.ts`, `trackBeginCheckout`, etc.) siguen funcionando pero se recomienda migrar gradualmente a la nueva función `track()`.

---

## 🚀 Próximos Pasos

1. **QA de Tracking:**
   - Verificar eventos en Tag Assistant (Google)
   - Verificar eventos en Meta Pixel Helper
   - Simular eventos en consola del navegador

2. **Configuración GTM:**
   - Configurar Tags de TikTok Pixel
   - Configurar Triggers para todos los eventos
   - Mapear eventos a formatos específicos de cada plataforma

3. **Testing:**
   - Probar cada evento en desarrollo
   - Verificar que aparecen en dataLayer
   - Confirmar que GTM los procesa correctamente

---

**Fin del documento de implementación**













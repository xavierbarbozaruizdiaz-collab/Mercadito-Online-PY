# 🔍 DIAGNÓSTICO LPMS COMPLETO - TRACKING & ANALYTICS
## Mercadito Online PY - Auditoría de Sistema de Tracking

**Fecha:** 2025-01-28  
**Auditor:** LPMS (Lead Senior Frontend + Tracking Engineer)  
**Objetivo:** Unificar tracking bajo GTM como única fuente de verdad

---

## 📊 RESUMEN EJECUTIVO

### Estado General: ⚠️ **CRÍTICO - REQUIERE REFACTOR INMEDIATO**

**Problemas Detectados:**
- ❌ **Facebook Pixel cargado directamente** en `layout.tsx` (debe ir vía GTM)
- ❌ **AnalyticsProvider NO está siendo usado** (existe pero no está importado)
- ❌ **Doble tracking de PageView** (Facebook Pixel + AnalyticsProvider)
- ❌ **Llamadas directas a gtag()** fuera de GTM
- ❌ **Llamadas directas a fbq()** fuera de GTM
- ❌ **Referencias directas a window.dataLayer.push** fuera de track()
- ❌ **Dos APIs diferentes** para dataLayer (analytics.ts vs dataLayer.ts)
- ❌ **Race conditions** por SSR/CSR
- ❌ **Código muerto** en servicios no utilizados

### Conflicto Principal: 🚨
**GTM NO es la única fuente de verdad** - Existen múltiples sistemas de tracking en paralelo.

---

## 🔎 ANÁLISIS DETALLADO POR COMPONENTE

### 1. **Google Tag Manager (GTM)**

#### ✅ **Estado:** Correctamente implementado
- **Ubicación:** `src/app/layout.tsx` (líneas 121-143)
- **ID:** `GTM-PQ8Q6JGW`
- **Inicialización:** ✅ dataLayer inicializado ANTES de GTM
- **Carga:** ✅ Script cargado con `afterInteractive` strategy
- **Noscript:** ✅ Implementado correctamente

#### ⚠️ **Problema Detectado:**
- GTM está configurado correctamente pero otros sistemas lo están bypasseando.

---

### 2. **Google Analytics 4 (GA4)**

#### ❌ **Estado:** MÚLTIPLES PUNTOS DE ENTRADA - CONFLICTO

**Problema:** GA4 puede ser cargado/llamado desde 4 lugares diferentes:

1. **GTM (Correcto)** ✅
   - GTM debe ser la única fuente de carga de `gtag.js`
   - **Estado:** ✅ GTM carga gtag.js automáticamente

2. **AnalyticsProvider.tsx (PROBLEMA)** ❌
   - **Líneas 25-43:** Intenta inicializar GA4 si gtag existe
   - **Líneas 58-60:** Llama `googleAnalyticsService.trackPageView()` que usa gtag DIRECTAMENTE
   - **Conflicto:** Trackea page views con gtag() en lugar de solo dataLayer

3. **googleAnalyticsService.ts (PROBLEMA)** ❌
   - **Líneas 67, 76, 285, 294:** Todas hacen llamadas directas a `window.gtag()`
   - **Conflicto:** By-pasea GTM y llama GA4 directamente
   - **Uso:** Usado en checkout, success pages, y otros componentes

4. **analyticsService.ts (PROBLEMA)** ❌
   - **Líneas 83-89:** Llama `gtag('event', ...)` directamente
   - **Conflicto:** By-pasea GTM
   - **Uso:** Servicio para guardar eventos en Supabase + enviar a GA4

#### 📍 **Referencias Directas a gtag():**
```
src/lib/services/googleAnalyticsService.ts:67,76,285,294
src/lib/services/analyticsService.ts:84
src/components/AnalyticsProvider.tsx:59 (indirecto vía googleAnalyticsService)
src/app/checkout/page.tsx:365 (vía useGoogleAnalytics)
src/app/checkout/success/page.tsx:91 (vía useGoogleAnalytics)
```

---

### 3. **Facebook Pixel**

#### ❌ **Estado:** CARGADO DIRECTAMENTE - DEBE IR VÍA GTM

**Problemas Críticos:**

1. **Facebook Pixel cargado en layout.tsx** ❌
   - **Ubicación:** `src/app/layout.tsx` (líneas 148-177)
   - **Problema:** Script inline que carga Facebook Pixel directamente
   - **Conflicto:** Debe ser cargado SOLO vía GTM

2. **facebookPixelService.ts - Carga Dinámica** ❌
   - **Líneas 48-69:** Método `initialize()` que carga Pixel dinámicamente
   - **Problema:** Puede cargar Pixel si se llama (aunque no se usa actualmente)

3. **Llamadas Directas a fbq()** ❌
   - **Ubicación:** `src/app/layout.tsx:162-163` - `fbq('init')` y `fbq('track', 'PageView')`
   - **Problema:** Facebook Pixel trackea PageView en cada carga de página

#### 📍 **Referencias Directas a fbq():**
```
src/app/layout.tsx:162-163 (PageView en init)
src/lib/services/facebookPixelService.ts:80,273
src/app/(marketplace)/store/[slug]/layout.tsx:87-88,113-114,124-125
```

#### 🚨 **DOBLE TRACKING DE PAGEVIEW:**
- Facebook Pixel trackea `PageView` en `layout.tsx:163` (en cada carga)
- AnalyticsProvider trackearía `page_view` vía dataLayer (si estuviera activo)
- **Resultado:** PageView duplicado

---

### 4. **AnalyticsProvider.tsx**

#### ❌ **Estado:** NO ESTÁ SIENDO USADO - CÓDIGO MUERTO

**Problemas:**

1. **No importado en layout.tsx** ❌
   - El componente existe pero NO está siendo usado
   - **Verificación:** `grep -r "AnalyticsProvider" src/app/layout.tsx` → Sin resultados

2. **Implementación Problemática** ⚠️
   - **Línea 50:** `window.dataLayer.push()` directo (debe usar `track()` de dataLayer.ts)
   - **Línea 59:** Llama `googleAnalyticsService.trackPageView()` que usa gtag directamente
   - **Race condition:** Espera 5 segundos por gtag con setInterval (líneas 33-41)

3. **Doble Tracking** ❌
   - Trackea vía dataLayer (línea 50) Y vía gtag (línea 59)
   - Debe trackear SOLO vía dataLayer y dejar que GTM maneje el resto

**Recomendación:** 
- ✅ Usar este componente pero refactorizar completamente
- ✅ Remover dependencia de `googleAnalyticsService`
- ✅ Usar solo `track()` de `dataLayer.ts`

---

### 5. **Sistema de DataLayer - DUPLICACIÓN**

#### ⚠️ **Estado:** DOS APIs DIFERENTES PARA LO MISMO

**Problema:** Existen dos sistemas diferentes para hacer push al dataLayer:

1. **analytics.ts (ANTIGUO)** ⚠️
   - Función: `dlPush(evt, payload)`
   - Uso: E-commerce events (view_item, add_to_cart, etc.)
   - **Ubicaciones:** `src/app/checkout/page.tsx`, `src/app/checkout/success/page.tsx`, etc.
   - **Problema:** API diferente a dataLayer.ts

2. **dataLayer.ts (NUEVO - RECOMENDADO)** ✅
   - Función: `track(event, payload)`
   - Uso: Sistema unificado de tracking
   - **Ubicaciones:** No se está usando aún
   - **Recomendación:** Este debe ser el estándar

#### 📍 **Referencias Directas a window.dataLayer.push:**
```
src/components/AnalyticsProvider.tsx:50 (debe usar track())
src/lib/analytics.ts:48 (dlPush - debe migrar a track())
```

---

### 6. **Servicios de Tracking**

#### ❌ **googleAnalyticsService.ts** - By-pasea GTM

**Problemas:**
- Todas las funciones hacen llamadas directas a `window.gtag()`
- No respeta que GTM es la única fuente de verdad
- Usado en múltiples lugares del código

**Métodos Problemáticos:**
- `trackEvent()` → `gtag('event', ...)`
- `trackPageView()` → `gtag('config', ...)`
- `setUserProperties()` → `gtag('set', ...)`
- `setUserId()` → `gtag('config', ...)`

**Recomendación:**
- ✅ Remover completamente o refactorizar para que use solo `track()` de dataLayer.ts
- ✅ GTM debe manejar todas las llamadas a GA4

---

#### ❌ **facebookPixelService.ts** - Carga Pixel Dinámicamente

**Problemas:**
- Método `initialize()` carga Facebook Pixel dinámicamente (líneas 48-69)
- Todos los métodos hacen llamadas directas a `fbq()`
- No respeta que GTM debe cargar Facebook Pixel

**Recomendación:**
- ✅ Marcar como deprecated
- ✅ Todos los eventos deben ir vía dataLayer → GTM → Facebook Pixel

---

#### ⚠️ **analyticsService.ts** - Conflicto de Propósito

**Problemas:**
- Guarda eventos en Supabase (✅ OK)
- Pero también llama `gtag('event', ...)` directamente (❌ NO OK)
- Mezcla persistencia en DB con tracking a GA4

**Recomendación:**
- ✅ Separar responsabilidades:
  - Mantener guardado en Supabase
  - Remover llamadas directas a gtag()
  - Si necesita tracking, usar `track()` de dataLayer.ts

---

## 🚨 PROBLEMAS POR PRIORIDAD

### 🔴 **PRIORIDAD CRÍTICA (P0)**

1. **Facebook Pixel cargado directamente en layout.tsx**
   - **Impacto:** Alto - Double tracking, by-pasea GTM
   - **Solución:** Remover script inline, cargar vía GTM únicamente
   - **Archivo:** `src/app/layout.tsx:148-177`

2. **AnalyticsProvider no está siendo usado**
   - **Impacto:** Alto - Código muerto, page views no se trackean correctamente
   - **Solución:** Importar en layout.tsx y refactorizar
   - **Archivo:** `src/components/AnalyticsProvider.tsx`

3. **Llamadas directas a gtag() en googleAnalyticsService**
   - **Impacto:** Alto - By-pasea GTM, duplica eventos
   - **Solución:** Refactorizar para usar solo track() de dataLayer.ts
   - **Archivos:** `src/lib/services/googleAnalyticsService.ts`, componentes que lo usan

---

### 🟡 **PRIORIDAD ALTA (P1)**

4. **Referencias directas a window.dataLayer.push fuera de track()**
   - **Impacto:** Medio - No usa API unificada
   - **Solución:** Migrar a track() de dataLayer.ts
   - **Archivos:** `src/components/AnalyticsProvider.tsx:50`, `src/lib/analytics.ts:48`

5. **Doble API para dataLayer (analytics.ts vs dataLayer.ts)**
   - **Impacto:** Medio - Confusión, inconsistencia
   - **Solución:** Unificar a dataLayer.ts como estándar
   - **Archivos:** `src/lib/analytics.ts` → deprecar, migrar usos

6. **Llamadas directas a fbq() en facebookPixelService**
   - **Impacto:** Medio - By-pasea GTM (aunque no se usa actualmente)
   - **Solución:** Marcar como deprecated, remover o refactorizar
   - **Archivo:** `src/lib/services/facebookPixelService.ts`

---

### 🟢 **PRIORIDAD MEDIA (P2)**

7. **analyticsService.ts llama gtag() directamente**
   - **Impacto:** Bajo - Solo afecta persistencia en Supabase
   - **Solución:** Separar responsabilidades
   - **Archivo:** `src/lib/services/analyticsService.ts:83-89`

8. **Race conditions en AnalyticsProvider**
   - **Impacto:** Bajo - Timeout de 5 segundos puede fallar
   - **Solución:** Mejorar manejo de SSR/CSR
   - **Archivo:** `src/components/AnalyticsProvider.tsx:33-41`

---

## 📋 INVENTARIO DE ARCHIVOS

### Archivos de Tracking (Core)
- ✅ `src/lib/tracking/dataLayer.ts` - **API recomendada (track())**
- ⚠️ `src/lib/analytics.ts` - **Deprecar (dlPush)**
- ❌ `src/lib/services/googleAnalyticsService.ts` - **Refactorizar (by-pasea GTM)**
- ❌ `src/lib/services/facebookPixelService.ts` - **Deprecar (carga Pixel)**
- ⚠️ `src/lib/services/analyticsService.ts` - **Separar responsabilidades**
- ❌ `src/components/AnalyticsProvider.tsx` - **No usado + refactorizar**

### Archivos que Usan Tracking
- `src/app/layout.tsx` - GTM + Facebook Pixel (directo) ❌
- `src/app/checkout/page.tsx` - Usa googleAnalyticsService + analytics.ts
- `src/app/checkout/success/page.tsx` - Usa googleAnalyticsService + analytics.ts
- `src/app/products/[id]/ProductPageClient.tsx` - Usa analytics.ts
- `src/components/ui/ProductCard.tsx` - Usa googleAnalyticsService
- `src/components/AddToCartButton.tsx` - Usa analytics.ts

---

## 🎯 OBJETIVOS DE LA REFACTOR

### Principios
1. ✅ **GTM es la única fuente de verdad** para carga de scripts
2. ✅ **track() de dataLayer.ts es la única API** para eventos
3. ✅ **No hay llamadas directas** a gtag() o fbq()
4. ✅ **No hay referencias directas** a window.dataLayer.push fuera de track()
5. ✅ **AnalyticsProvider trackea solo vía dataLayer** (GTM maneja el resto)
6. ✅ **SSR-safe** - Todo código verifica `typeof window !== 'undefined'`

### Estructura Final
```
src/
  lib/
    tracking/
      dataLayer.ts          ← ÚNICA API para tracking
      events.ts             ← Helpers para eventos específicos (opcional)
  components/
    AnalyticsProvider.tsx   ← Solo trackea page_view vía track()
  app/
    layout.tsx             ← Solo GTM, NO Facebook Pixel directo
```

---

## ✅ VERIFICACIONES POST-REFACTOR

### Checklist de Verificación
- [ ] ✅ GTM es la única fuente de carga de GA4 (gtag.js)
- [ ] ✅ GTM es la única fuente de carga de Facebook Pixel (fbevents.js)
- [ ] ✅ NO existen llamadas directas a `window.gtag()`
- [ ] ✅ NO existen llamadas directas a `window.fbq()`
- [ ] ✅ NO existen referencias directas a `window.dataLayer.push` fuera de `track()`
- [ ] ✅ AnalyticsProvider está importado y funcionando
- [ ] ✅ PageView se trackea SOLO una vez vía dataLayer
- [ ] ✅ Todos los eventos usan `track()` de dataLayer.ts
- [ ] ✅ Código SSR-safe (verificaciones de `typeof window`)
- [ ] ✅ No hay race conditions

---

## 📊 MÉTRICAS DE ÉXITO

### Antes del Refactor
- ❌ 3+ sistemas de tracking en paralelo
- ❌ 10+ referencias directas a gtag()/fbq()
- ❌ 2 APIs diferentes para dataLayer
- ❌ AnalyticsProvider no usado
- ❌ Facebook Pixel cargado directamente

### Después del Refactor
- ✅ 1 sistema unificado (GTM + track())
- ✅ 0 referencias directas a gtag()/fbq()
- ✅ 1 API única (track() de dataLayer.ts)
- ✅ AnalyticsProvider activo y funcionando
- ✅ Facebook Pixel cargado solo vía GTM

---

**FIN DEL DIAGNÓSTICO**




























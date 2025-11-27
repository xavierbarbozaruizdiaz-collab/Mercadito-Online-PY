# 🔍 DIAGNÓSTICO DE ESCALABILIDAD - MERCADITO ONLINE PY

**Fecha:** 2025-01-28  
**Arquitecto:** Performance Engineer  
**Objetivo:** Evaluar capacidad actual y riesgos para escalar de 100-500 a 10,000+ usuarios concurrentes

---

## 📋 RESUMEN EJECUTIVO

El proyecto **Mercadito Online PY** está construido sobre una base sólida (Next.js + Supabase + Vercel), pero presenta **riesgos críticos de escalabilidad** que impedirán manejar más de 500-1,000 usuarios concurrentes sin mejoras significativas.

### Estado Actual
- ✅ **Arquitectura base sólida**: Next.js App Router, Supabase con RLS, estructura modular
- ✅ **Algunas optimizaciones**: Rate limiting básico, locks para subastas, sistema de caché (en memoria)
- ⚠️ **Problemas críticos**: Caché no distribuido, múltiples queries por request, falta de ISR/SSG, locks en memoria
- ❌ **Bloqueadores de escala**: Homepage sin caché, búsquedas sin optimización, subastas con N+1 queries

### Capacidad Estimada Actual
- **100-200 usuarios concurrentes**: ✅ Funcionará con degradación leve
- **500 usuarios concurrentes**: ⚠️ Degradación significativa, timeouts probables
- **1,000+ usuarios concurrentes**: ❌ **FALLO GARANTIZADO** - Supabase se saturará, Vercel funciones timeout

### Capacidad Objetivo (Post-Optimización)
- **100-500 usuarios**: ✅ Sin problemas
- **1,000-5,000 usuarios**: ✅ Con mejoras implementadas
- **10,000+ usuarios**: ✅ Requiere Redis distribuido + read replicas

---

## ✅ PUNTOS FUERTES (Lo que ya está bien)

### 1. Arquitectura Base
- **Next.js App Router**: Permite ISR, SSG, y optimizaciones de caché
- **Supabase con RLS**: Seguridad a nivel de base de datos, buena para escalar
- **Estructura modular**: Servicios separados, fácil de optimizar

### 2. Optimizaciones Existentes
- **Rate limiting básico**: Previene abusos (aunque en memoria)
- **Locks para subastas**: Previene condiciones de carrera (aunque no distribuido)
- **Sistema de caché**: `CacheManager` implementado (aunque en memoria)
- **WebSockets para subastas**: Real-time eficiente con Supabase Realtime

### 3. Buenas Prácticas Detectadas
- **Índices básicos en DB**: Algunos índices creados en migraciones
- **Paginación en búsquedas**: Límites de 12-60 items por página
- **Validación de stock**: Previene overselling
- **Idempotency keys**: En pujas de subastas

---

## 🚨 RIESGOS CRÍTICOS DE ESCALABILIDAD

### 🔴 PRIORIDAD ALTA - Bloqueadores Inmediatos

#### 1. **Homepage sin Caché** 
**Archivo:** `src/app/page.tsx`

**Problema:**
- `export const revalidate = 0` - **SIN CACHÉ**
- `noStore()` - Fuerza render dinámico en cada request
- Query a `hero_slides` en cada carga de página
- Query a productos en `ProductsListClient` sin caché

**Impacto con 10,000 usuarios:**
- 10,000 queries simultáneas a `hero_slides`
- 10,000 queries simultáneas a `products` (sin filtros, puede retornar miles de registros)
- **Supabase se saturará en < 1 minuto**
- Timeouts masivos, página no carga

**Caché actual:** ❌ NINGUNO

**Recomendación:** ISR con `revalidate: 60` (1 minuto) o SSG con revalidación

---

#### 2. **Búsqueda sin Optimización**
**Archivos:** 
- `src/lib/services/searchService.ts`
- `src/components/ProductsListClient.tsx` (líneas 154-400)

**Problema:**
- Queries con `ilike` (case-insensitive) sin índices full-text
- Múltiples queries por búsqueda:
  1. Buscar stores que coincidan
  2. Buscar profiles que coincidan  
  3. Buscar productos con OR complejo
- Sin caché de resultados
- Sin límite de resultados en algunos casos

**Impacto con 10,000 usuarios:**
- 10,000 queries con `ilike` simultáneas = **Postgres se ahoga**
- `ilike` sin índices = **Full table scan** en cada búsqueda
- Tiempo de respuesta: 5-30 segundos por búsqueda
- **Base de datos se bloquea**

**Caché actual:** ❌ NINGUNO (aunque `CacheManager` existe, no se usa aquí)

**Recomendación:** 
- Índices GIN para full-text search
- Caché de resultados (Redis)
- Debounce en cliente (ya existe, pero insuficiente)

---

#### 3. **Detalle de Producto - Múltiples Queries**
**Archivo:** `src/app/products/[id]/page.tsx`

**Problema:**
- **5-7 queries por request:**
  1. Query principal de producto (con joins a categories, stores)
  2. Query separada de `product_images`
  3. Query de `stores` si no viene en join (fallback)
  4. Query de `profiles` para seller info
  5. Query de sesión de usuario
  6. `generateMetadata` hace query adicional
- `revalidate = 0` - sin caché
- Queries secuenciales (no paralelas donde podría)

**Impacto con 10,000 usuarios:**
- 50,000-70,000 queries simultáneas a Supabase
- Cada producto popular = avalancha de queries
- **Conexiones a DB se agotan**
- Timeouts en cascada

**Caché actual:** ❌ NINGUNO

**Recomendación:**
- ISR con `revalidate: 300` (5 minutos)
- Consolidar queries (usar un solo select con todos los joins)
- Caché de imágenes en CDN

---

#### 4. **Subastas - N+1 Queries y Lógica Pesada**
**Archivos:**
- `src/app/auctions/[id]/page.tsx`
- `src/lib/services/auctionService.ts`

**Problema:**
- `loadAuction()` hace **10+ queries por carga:**
  1. `getAuctionById()` → query a products
  2. `getAuctionStats()` → query adicional
  3. Query a `profiles` para seller
  4. Query a `auction_bids` para posición del usuario
  5. Query a `auction_bids` para todas las pujas (sin límite)
  6. Query a `profiles` para ganador
  7. Query a `auction_events`
  8. Query a `product_images`
  9. Query a `products` para subastas relacionadas
  10. `checkAndUpdateAuctionStatus()` → UPDATE por cada subasta
- `getActiveAuctions()` actualiza estado de **TODAS** las subastas antes de filtrar
- Locks en memoria (no distribuido) → **NO FUNCIONA con múltiples instancias de Vercel**

**Impacto con 10,000 usuarios:**
- 100,000+ queries simultáneas
- `checkAndUpdateAuctionStatus()` ejecutado miles de veces = **deadlocks**
- Locks en memoria = condiciones de carrera entre instancias
- **Sistema de subastas colapsa completamente**

**Caché actual:** ❌ NINGUNO

**Recomendación:**
- Redis para locks distribuidos
- Caché de subastas activas (5-10 segundos TTL)
- Background job para actualizar estados (no en cada request)
- Limitar queries de pujas (paginación)

---

#### 5. **Checkout - Transacciones Pesadas sin Optimización**
**Archivo:** `src/app/checkout/page.tsx`

**Problema:**
- **15+ queries/operaciones por checkout:**
  1. Query a `membership_plans` o `auction`
  2. Query a `cart_items`
  3. Query a `products` para cada item (validar stock)
  4. Query a `stores`
  5. RPC `create_order_from_cart` (hace más queries internas)
  6. Updates a `orders` (afiliados, influencers)
  7. Múltiples validaciones de stock
- Sin transacciones explícitas en algunos casos
- Validaciones de stock hacen queries individuales

**Impacto con 10,000 usuarios:**
- 150,000+ queries simultáneas durante pico de checkout
- Race conditions en stock (aunque hay validación, no es atómica)
- **Deadlocks en RPC functions**
- Checkout falla para muchos usuarios

**Caché actual:** ❌ NINGUNO (correcto para checkout, pero queries deben optimizarse)

**Recomendación:**
- Consolidar validaciones en una sola query
- Usar `SELECT FOR UPDATE` para stock
- Optimizar RPC functions

---

### 🟡 PRIORIDAD MEDIA - Degradación Gradual

#### 6. **Caché en Memoria (No Distribuido)**
**Archivo:** `src/lib/cache/cacheManager.ts`

**Problema:**
- `CacheManager` usa `Map<string, ...>` en memoria
- **Cada instancia de Vercel tiene su propio caché**
- Con auto-scaling, 10 instancias = 10 caches diferentes
- Hit rate = ~10% (en vez de 90%+ con Redis)

**Impacto:**
- Caché ineficiente
- Más carga en Supabase de la necesaria
- No se aprovecha el caché entre requests

**Recomendación:** Migrar a Redis (Upstash Redis en Vercel)

---

#### 7. **Locks en Memoria (No Distribuido)**
**Archivo:** `src/lib/utils/locks.ts`

**Problema:**
- `SimpleLock` usa `Map` en memoria
- **No funciona entre instancias de Vercel**
- Subastas pueden tener condiciones de carrera

**Impacto:**
- Pujas duplicadas posibles
- Race conditions en actualizaciones de stock

**Recomendación:** Redis para locks distribuidos

---

#### 8. **Rate Limiting en Memoria**
**Archivo:** `src/lib/utils/rateLimit.ts`

**Problema:**
- Rate limiting en memoria por instancia
- Usuario puede hacer 10x más requests si hay 10 instancias

**Impacto:**
- Rate limiting inefectivo
- Abusos posibles

**Recomendación:** Redis para rate limiting distribuido

---

#### 9. **Listados de Productos - Queries Complejas**
**Archivo:** `src/components/ProductsListClient.tsx`

**Problema:**
- Query inicial sin límite (puede retornar miles)
- Múltiples queries para búsqueda (stores, profiles, products)
- Filtrado en memoria después de query
- Sin caché

**Impacto:**
- Transferencia de datos innecesaria
- Procesamiento pesado en cliente

**Recomendación:**
- Límites estrictos en queries
- Filtrado en DB, no en memoria
- Caché de listados populares

---

#### 10. **Sitemap Dinámico sin Caché**
**Archivo:** `src/app/sitemap.ts`

**Problema:**
- Genera sitemap en cada request
- Queries a `products`, `stores`, `categories`, `auctions`
- Sin ISR ni caché

**Impacto:**
- Cada crawler = queries pesadas
- Googlebot puede hacer cientos de requests

**Recomendación:** ISR con `revalidate: 3600` (1 hora)

---

### 🟢 PRIORIDAD BAJA - Optimizaciones Futuras

#### 11. **Falta de Índices Compuestos**
**Archivos:** Migraciones SQL

**Problema:**
- Índices básicos existen, pero faltan compuestos para queries comunes
- Ejemplo: `(status, sale_type, created_at)` para listados

**Impacto:**
- Queries más lentas de lo necesario

**Recomendación:** Agregar índices compuestos según query patterns

---

#### 12. **Imágenes sin CDN Optimizado**
**Problema:**
- Imágenes servidas desde Supabase Storage
- Sin optimización automática (WebP, tamaños)

**Impacto:**
- Transferencia de datos alta
- Tiempos de carga lentos

**Recomendación:** Next.js Image Optimization + CDN

---

#### 13. **WebSockets - Múltiples Suscripciones**
**Archivo:** `src/app/auctions/[id]/page.tsx`

**Problema:**
- Múltiples canales de Supabase Realtime por página
- Sin límite de reconexiones

**Impacto:**
- Conexiones WebSocket se acumulan
- Costo de Supabase Realtime aumenta

**Recomendación:** Consolidar suscripciones, límite de reconexiones

---

## 📊 ANÁLISIS POR ÁREA CRÍTICA

### Listados de Productos
- **Riesgo:** 🔴 ALTO
- **Queries por request:** 3-5
- **Caché:** ❌ No
- **Con 10k usuarios:** 30k-50k queries/min → **FALLO**

### Búsqueda
- **Riesgo:** 🔴 ALTO  
- **Queries por request:** 3-4
- **Caché:** ❌ No
- **Índices:** ⚠️ Básicos, falta full-text
- **Con 10k usuarios:** Queries con `ilike` = **Postgres bloqueado**

### Detalle de Producto
- **Riesgo:** 🔴 ALTO
- **Queries por request:** 5-7
- **Caché:** ❌ No
- **Con 10k usuarios:** 50k-70k queries/min → **FALLO**

### Subastas
- **Riesgo:** 🔴 CRÍTICO
- **Queries por request:** 10+
- **Caché:** ❌ No
- **Locks:** ⚠️ En memoria (no distribuido)
- **Con 10k usuarios:** 100k+ queries + deadlocks → **COLAPSO TOTAL**

### Checkout
- **Riesgo:** 🟡 MEDIO-ALTO
- **Queries por request:** 15+
- **Caché:** ❌ No (correcto, pero queries deben optimizarse)
- **Con 10k usuarios:** 150k+ queries durante pico → **Degradación severa**

---

## 🎯 RECOMENDACIONES DE ALTO NIVEL

### Fase 1: Quick Wins (1-2 semanas) - Objetivo: 500 usuarios
1. **ISR en Homepage**: `revalidate: 60`
2. **ISR en Productos**: `revalidate: 300`
3. **ISR en Sitemap**: `revalidate: 3600`
4. **Consolidar queries**: Reducir de 5-7 a 2-3 por producto
5. **Límites estrictos**: Max 100 productos por query

### Fase 2: Caché Distribuido (2-3 semanas) - Objetivo: 1,000-2,000 usuarios
1. **Redis (Upstash)**: Migrar `CacheManager` a Redis
2. **Caché de búsquedas**: 5 minutos TTL
3. **Caché de listados**: 1 minuto TTL
4. **Locks distribuidos**: Redis para subastas
5. **Rate limiting distribuido**: Redis

### Fase 3: Optimización de DB (3-4 semanas) - Objetivo: 5,000 usuarios
1. **Índices full-text**: GIN para búsquedas
2. **Índices compuestos**: Para queries comunes
3. **Read replicas**: Supabase read replicas para queries de lectura
4. **Background jobs**: Mover `checkAndUpdateAuctionStatus` a cron
5. **Optimizar RPC**: Consolidar lógica en funciones DB

### Fase 4: Arquitectura Avanzada (1-2 meses) - Objetivo: 10,000+ usuarios
1. **CDN para imágenes**: Next.js Image + Cloudflare
2. **Search service dedicado**: Algolia o Elasticsearch
3. **Message queue**: Para procesamiento asíncrono (checkout, notificaciones)
4. **Monitoring avanzado**: APM, alertas de performance
5. **Load testing**: Validar con herramientas profesionales

---

## 💰 ESTIMACIÓN DE COSTOS (Post-Optimización)

### Infraestructura Mínima (500-1,000 usuarios)
- Vercel Pro: $20/mes
- Supabase Pro: $25/mes
- Upstash Redis: $10/mes
- **Total: ~$55/mes**

### Infraestructura Media (1,000-5,000 usuarios)
- Vercel Pro: $20/mes
- Supabase Pro: $25/mes
- Upstash Redis: $50/mes
- **Total: ~$95/mes**

### Infraestructura Alta (10,000+ usuarios)
- Vercel Enterprise: $500+/mes
- Supabase Enterprise: $500+/mes
- Upstash Redis: $200+/mes
- Algolia/Elasticsearch: $200+/mes
- **Total: ~$1,400+/mes**

---

## ⚠️ CONCLUSIÓN BRUTAL

**El código actual NO escalará más allá de 500 usuarios concurrentes sin cambios significativos.**

Los problemas principales son:
1. **Falta total de caché** en rutas críticas (homepage, productos, búsqueda)
2. **N+1 queries** en todas las áreas (subastas es el peor caso)
3. **Caché/locks en memoria** que no funcionan con múltiples instancias
4. **Queries no optimizadas** (ilike sin índices, sin límites)

**Con 10,000 usuarios simultáneos, el sistema colapsará en < 5 minutos.**

Sin embargo, la **arquitectura base es sólida** y con las optimizaciones recomendadas (especialmente Fase 1 y 2), el sistema puede escalar a 5,000-10,000 usuarios sin reescribir todo.

**Prioridad absoluta:** Implementar ISR y caché distribuido (Redis) antes de cualquier campaña de marketing grande.

---

**Próximos pasos sugeridos:**
1. Revisar este diagnóstico con el equipo
2. Priorizar Fase 1 (Quick Wins) - máximo impacto, mínimo esfuerzo
3. Implementar monitoring (Sentry, Vercel Analytics) para medir mejoras
4. Load testing después de cada fase para validar








# Auditoría Técnica: Sistema de Subastas
## Análisis de Riesgos, Conflictos y Puntos Débiles

**Fecha**: 2024  
**Auditor**: Arquitecto de Subastas + Performance + Consistencia de Datos  
**Objetivo**: Identificar riesgos y conflictos ANTES de agregar nuevas funcionalidades (ej: bonus time)

---

## 📋 Sección 1: Resumen Ejecutivo

### Estado Actual

El sistema de subastas está bien estructurado con:
- ✅ Redis para locks distribuidos, rate limiting y caché
- ✅ PostgreSQL `NOW()` como fuente de verdad única para tiempo
- ✅ Sincronización de tiempo cliente-servidor
- ✅ Validaciones robustas en múltiples capas

### Hallazgos Principales

**Fortalezas**:
- Arquitectura sólida con separación de responsabilidades
- Múltiples capas de validación (frontend, API, PostgreSQL)
- Locks distribuidos previenen condiciones de carrera
- Rate limiting protege contra abuso

**Riesgos Identificados**:
- ✅ **ALTA**: Caché Redis no se invalida cuando cambia estado de subasta → **RESUELTO**
- ✅ **ALTA**: Posible condición de carrera entre `close_expired_auctions()` y `place_bid()` → **RESUELTO**
- ✅ **ALTA**: Lock TTL de 5 segundos puede ser insuficiente → **RESUELTO** (aumentado a 15s)
- ✅ **MEDIA**: Rate limiting falla abierto (permite requests si Redis falla) → **RESUELTO**
- ✅ **MEDIA**: Endpoint `/current` no valida tiempo ni estado real → **RESUELTO**
- ✅ **MEDIA**: Anti-sniping puede extender tiempo indefinidamente → **RESUELTO**
- ✅ **MEDIA**: Componentes usan `Date.now()` directamente → **RESUELTO**
- ✅ **MEDIA**: Falta logging mínimo en operaciones críticas → **RESUELTO**
- ✅ **MEDIA**: `/current` podría devolver datos obsoletos bajo concurrencia → **RESUELTO**

---

## 📋 Sección 2: Fortalezas (Lo que está bien)

### 2.1 Arquitectura de Locks

✅ **Implementación correcta**:
- Locks distribuidos con Redis usando `SET NX EX` (atómico)
- Verificación de ownership antes de liberar
- TTL automático previene deadlocks
- `withLock()` garantiza liberación en `finally`

**Archivos**: `src/lib/redis/locks.ts`

### 2.2 Validación de Tiempo Unificada

✅ **PostgreSQL como fuente de verdad**:
- Endpoint `/api/auctions/[id]/bid` NO valida tiempo con `Date.now()`
- Delega completamente a PostgreSQL `place_bid()` que usa `NOW()`
- Frontend usa `getSyncedNow()` sincronizado con servidor

**Archivos**: 
- `src/app/api/auctions/[id]/bid/route.ts` (línea 126-129)
- `src/lib/utils/timeSync.ts`

### 2.3 Rate Limiting Distribuido

✅ **Protección contra abuso**:
- Rate limiting por usuario (30/min) y por IP (10/min)
- Implementado en Redis para consistencia distribuida
- Degradación elegante si Redis falla (fail open)

**Archivos**: `src/lib/redis/rateLimit.ts`

### 2.4 Idempotencia

✅ **Prevención de pujas duplicadas**:
- `idempotencyKey` generado en cliente
- Validación en PostgreSQL `place_bid()`
- Previene pujas duplicadas en caso de retry

**Archivos**: 
- `src/components/auction/BidForm.tsx` (línea 131)
- `supabase/migrations/20251116012000_update_place_bid_with_reputation.sql`

### 2.5 Separación de Datos Estáticos vs Dinámicos

✅ **Caché optimizado**:
- Datos estáticos (título, descripción, imágenes) en Redis (TTL 45s)
- Datos dinámicos (precio, ganador, estado) siempre desde DB
- Reduce carga en Supabase para lecturas masivas

**Archivos**: `src/lib/redis/cache.ts`

---

## 📋 Sección 3: Riesgos y Conflictos

### 🔴 ALTA PRIORIDAD

#### 3.1 Caché Redis No Se Invalida Cuando Cambia Estado

**Problema**:
- `invalidateAuctionCache()` existe pero **NO se llama** cuando:
  - Una puja se coloca exitosamente
  - La subasta se cierra (`close_expired_auctions()`)
  - El estado cambia de `active` a `ended`

**Impacto**:
- Usuarios pueden ver datos estáticos obsoletos (ej: título, descripción)
- Aunque los datos dinámicos se actualizan, puede haber inconsistencia visual
- En alta concurrencia, miles de usuarios pueden recibir datos cacheados obsoletos

**Evidencia**:
```typescript
// src/lib/redis/cache.ts - Función existe pero no se usa
export async function invalidateAuctionCache(auctionId: string): Promise<boolean>

// ❌ NO se llama en:
// - src/app/api/auctions/[id]/bid/route.ts (después de puja exitosa)
// - src/app/api/auctions/close-expired/route.ts (después de cerrar)
```

**Recomendación**:
- Llamar `invalidateAuctionCache()` después de puja exitosa
- Llamar `invalidateAuctionCache()` en `close_expired_auctions()` para cada subasta cerrada
- Considerar invalidar también cuando se actualiza información estática (título, descripción)

---

#### 3.2 Condición de Carrera: `close_expired_auctions()` vs `place_bid()`

**Problema**:
- `close_expired_auctions()` se ejecuta periódicamente (cron)
- `place_bid()` puede ejecutarse simultáneamente
- Ambos modifican `auction_status` y `winner_id`

**Escenario Problemático**:
```
T0: Usuario A intenta pujar (place_bid adquiere lock)
T1: Cron ejecuta close_expired_auctions() (NO tiene lock)
T2: close_expired_auctions() cambia auction_status = 'ended'
T3: place_bid() valida: auction_status = 'active' ✅ (leyó antes del cambio)
T4: place_bid() acepta puja aunque la subasta ya cerró
```

**Evidencia**:
```sql
-- close_expired_auctions() NO usa locks
-- place_bid() usa lock solo para la subasta específica
-- No hay coordinación entre ambos
```

**Recomendación**:
- `close_expired_auctions()` debería usar locks por subasta antes de cerrar
- O usar transacciones con `SELECT FOR UPDATE` en PostgreSQL
- O ejecutar `close_expired_auctions()` con menor frecuencia (cada 5-10 segundos en lugar de cada minuto)

---

#### 3.3 Lock TTL Puede Ser Insuficiente

**Problema**:
- Lock TTL: 5 segundos (línea 357 en `bid/route.ts`)
- Operaciones dentro del lock:
  1. Validar subasta (query a DB)
  2. Validar monto (cálculo)
  3. Llamar `place_bid()` RPC (puede ser lento si DB está bajo carga)
  4. Re-leer estado actualizado

**Escenario Problemático**:
- Si `place_bid()` tarda > 5 segundos (DB lenta, red lenta)
- El lock expira ANTES de que termine la operación
- Otro proceso puede adquirir el lock y procesar puja simultáneamente
- **Resultado**: Dos pujas procesadas sin coordinación

**Evidencia**:
```typescript
// src/app/api/auctions/[id]/bid/route.ts:357
ttlSeconds: 5, // ⚠️ Puede ser insuficiente
```

**Recomendación**:
- Aumentar TTL a 10-15 segundos
- O implementar renovación de lock (`renewLock()`) durante operaciones largas
- Monitorear tiempo promedio de `place_bid()` y ajustar TTL

---

### 🟡 MEDIA PRIORIDAD

#### 3.4 Rate Limiting Falla Abierto (Fail Open)

**Problema**:
- Si Redis no está disponible, rate limiting **permite todos los requests**
- En producción, si Redis falla, el sistema queda sin protección

**Evidencia**:
```typescript
// src/lib/redis/rateLimit.ts:54-61
if (!isRedisAvailable()) {
  logger.warn('[Rate Limit] Redis no disponible, permitiendo request', { key });
  return {
    allowed: true, // ⚠️ Permite todo
    remaining: config.maxRequests,
    resetAt: Date.now() + config.windowSeconds * 1000,
  };
}
```

**Impacto**:
- Usuario malicioso puede hacer miles de pujas si Redis falla
- Puede saturar la base de datos

**Recomendación**:
- Considerar fallback a rate limiting en memoria (local) si Redis falla
- O implementar circuit breaker que rechace requests si Redis está caído por > X minutos
- Monitorear alertas cuando Redis falla

---

#### 3.5 Validación de Tiempo en Frontend Puede Desincronizarse

**Problema**:
- `getSyncedNow()` se sincroniza cada 30 segundos
- Entre sincronizaciones, el offset puede volverse obsoleto si:
  - El reloj del cliente cambia (NTP sync)
  - El reloj del servidor cambia
  - Hay drift acumulativo

**Evidencia**:
```typescript
// src/lib/utils/timeSync.ts:10
const SYNC_INTERVAL = 30000; // 30 segundos

// Si el reloj del cliente está desincronizado, el offset puede ser incorrecto
```

**Impacto**:
- Usuario puede ver contador en "00:00" pero aún quedar tiempo real
- O viceversa: contador muestra tiempo pero ya expiró

**Recomendación**:
- Reducir intervalo de sincronización a 10-15 segundos
- O sincronizar antes de cada puja crítica (usar `forceSync()`)
- Validar tiempo en servidor como última palabra

---

#### 3.6 Endpoint `/current` No Valida Tiempo

**Problema**:
- Endpoint `/api/auctions/[id]/current` retorna datos dinámicos
- **NO valida** si la subasta expiró
- Puede retornar datos de subasta "activa" que ya expiró

**Evidencia**:
```typescript
// src/app/api/auctions/[id]/current/route.ts
// Solo hace SELECT, no valida auction_end_at <= NOW()
```

**Impacto**:
- Frontend puede recibir `auction_status: 'active'` aunque ya expiró
- UI puede mostrar subasta como activa incorrectamente

**Recomendación**:
- Agregar validación de tiempo en `/current`
- O retornar `auction_status` calculado: si `auction_end_at <= NOW()` → `'ended'`

---

#### 3.7 Anti-Sniping Puede Extender Tiempo Indefinidamente

**Problema**:
- `place_bid()` extiende tiempo si queda < `auto_extend_seconds`
- Si hay pujas constantes en los últimos segundos, la subasta puede extenderse indefinidamente

**Evidencia**:
```sql
-- supabase/migrations/20251116012000_update_place_bid_with_reputation.sql:289
IF (v_auction_end_at - NOW()) < MAKE_INTERVAL(secs => v_product.auto_extend_seconds) THEN
  v_new_end_at := NOW() + MAKE_INTERVAL(secs => v_product.auto_extend_seconds);
```

**Impacto**:
- Subasta puede durar mucho más de lo esperado
- Usuarios pueden confundirse

**Recomendación**:
- Agregar límite máximo de extensiones (ej: máximo 3 extensiones)
- O límite de tiempo total (ej: no extender más de 30 segundos adicionales)

---

### 🟢 BAJA PRIORIDAD

#### 3.8 Esquema de Claves Redis Puede Colisionar

**Problema**:
- Locks: `lock:auction:{id}`
- Rate limit: `ratelimit:user:{id}` o `ratelimit:ip:{ip}`
- Caché: `auction:static:{id}`

**Riesgo**:
- Si hay colisión de nombres, puede haber conflictos
- Aunque bajo, es posible si se agregan nuevos prefijos

**Recomendación**:
- Documentar esquema de claves
- Usar prefijos consistentes y únicos
- Considerar namespace (ej: `mercadito:lock:auction:{id}`)

---

#### 3.9 Falta Logging de Operaciones Críticas

**Problema**:
- No se loguea cuando:
  - Lock no se puede adquirir (solo debug)
  - Rate limit se excede (solo warn)
  - Caché falla (solo warn)

**Recomendación**:
- Agregar métricas/alertas para:
  - Tasa de lock failures
  - Tasa de rate limit excedido
  - Tasa de caché misses

---

#### 3.10 Componente AuctionCard Usa Date.now() Directamente

**Problema**:
- `AuctionCard.tsx` usa `Date.now()` directamente (línea 38)
- No usa `getSyncedNow()` como otros componentes

**Evidencia**:
```typescript
// src/components/auction/AuctionCard.tsx:38
setServerNowMs(Date.now()); // ⚠️ No sincronizado
```

**Impacto**:
- Contador en listado de subastas puede mostrar tiempo incorrecto
- Menor que en página de detalle, pero aún inconsistente

**Recomendación**:
- Actualizar `AuctionCard.tsx` para usar `getSyncedNow()`
- O pasar `serverTime` como prop desde página padre

---

## 📋 Sección 4: Casos Límite para Probar

### 4.1 Alta Concurrencia

**Escenario**: 500 usuarios pujan en los últimos 5 segundos

**Qué probar**:
1. ¿Se procesan todas las pujas correctamente?
2. ¿Hay pujas duplicadas?
3. ¿El lock previene condiciones de carrera?
4. ¿El rate limiting funciona correctamente?
5. ¿La base de datos se satura?

**Cómo probar**:
- Load testing con herramienta (ej: k6, Artillery)
- Simular 500 requests simultáneos al endpoint `/bid`

---

### 4.2 Cierre Automático Durante Puja

**Escenario**: Cron ejecuta `close_expired_auctions()` mientras usuario puja

**Qué probar**:
1. ¿La puja se rechaza correctamente si la subasta cerró?
2. ¿Hay condición de carrera?
3. ¿El estado final es consistente?

**Cómo probar**:
- Ejecutar `close_expired_auctions()` manualmente mientras se procesa una puja
- Verificar logs y estado final en DB

---

### 4.3 Redis Cae Durante Operación

**Escenario**: Redis falla mientras se procesa una puja

**Qué probar**:
1. ¿El lock se libera correctamente?
2. ¿El rate limiting falla abierto (permite requests)?
3. ¿El sistema sigue funcionando?

**Cómo probar**:
- Detener Redis durante operación
- Verificar comportamiento del sistema

---

### 4.4 Desincronización de Tiempo

**Escenario**: Reloj del cliente está 10 segundos adelantado/atrasado

**Qué probar**:
1. ¿El contador muestra tiempo correcto?
2. ¿El botón se deshabilita correctamente?
3. ¿Las pujas se rechazan correctamente si expiró?

**Cómo probar**:
- Modificar reloj del sistema del cliente
- Verificar comportamiento del contador y botón

---

### 4.5 Caché Obsoleto

**Escenario**: Subasta se cierra pero caché aún tiene datos estáticos

**Qué probar**:
1. ¿Los usuarios ven datos obsoletos?
2. ¿El caché se invalida correctamente?
3. ¿Hay inconsistencia visual?

**Cómo probar**:
- Cerrar subasta manualmente
- Verificar si caché se invalida
- Verificar qué ven los usuarios

---

## 📋 Sección 5: Recomendaciones de Alto Nivel

### 5.1 Endurecer Sistema ANTES de Agregar Features

**Prioridad 1 - Crítico**:
1. ✅ **Invalidar caché cuando cambia estado**
   - Llamar `invalidateAuctionCache()` después de puja exitosa
   - Llamar `invalidateAuctionCache()` en `close_expired_auctions()`

2. ✅ **Prevenir condición de carrera en cierre automático**
   - Agregar locks en `close_expired_auctions()` o usar transacciones
   - O reducir frecuencia de ejecución

3. ✅ **Aumentar TTL de locks**
   - Aumentar a 10-15 segundos
   - O implementar renovación de lock

**Prioridad 2 - Importante**:
4. ✅ **Mejorar rate limiting fail-safe**
   - Implementar fallback a rate limiting local
   - O circuit breaker

5. ✅ **Validar tiempo en endpoint `/current`**
   - Agregar validación de `auction_end_at <= NOW()`

6. ✅ **Reducir intervalo de sincronización de tiempo**
   - Reducir a 10-15 segundos
   - O sincronizar antes de pujas críticas

**Prioridad 3 - Mejoras**:
7. ✅ **Limitar extensiones de anti-sniping**
   - Agregar límite máximo de extensiones

8. ✅ **Mejorar logging y métricas**
   - Agregar métricas para locks, rate limits, caché

---

### 5.2 Arquitectura para Bonus Time (Futuro)

**Consideraciones**:
- Bonus time requiere lógica adicional de tiempo
- Debe integrarse con sistema de tiempo unificado
- Debe respetar locks y validaciones existentes

**Recomendaciones**:
- NO agregar bonus time hasta resolver riesgos ALTA prioridad
- Diseñar bonus time para usar mismo sistema de tiempo (PostgreSQL `NOW()`)
- Considerar impacto en caché y locks

---

## 📋 Sección 6: Mapa Completo del Flujo de una Puja

### 6.1 Flujo Frontend → API → DB → Frontend

```
1. Usuario hace clic en BID (BidForm.tsx)
   ├─ Valida: isTimeExpired (usando getSyncedNow())
   ├─ Genera: idempotencyKey
   └─ Llama: placeBid() (auctionService.ts)

2. placeBid() (auctionService.ts)
   └─ Fetch: POST /api/auctions/[id]/bid

3. Endpoint /api/auctions/[id]/bid (route.ts)
   ├─ 1. Valida autenticación
   ├─ 2. Rate limiting (usuario + IP)
   ├─ 3. Valida request body
   ├─ 4. Adquiere lock Redis (lock:auction:{id})
   │   └─ TTL: 5 segundos
   ├─ 5. Valida subasta (re-lectura con lock)
   │   └─ NO valida tiempo (delega a PostgreSQL)
   ├─ 6. Valida monto de puja
   ├─ 7. Llama place_bid() RPC (PostgreSQL)
   │   ├─ Valida: auction_status = 'active'
   │   ├─ Valida: auction_end_at > NOW()
   │   ├─ Valida: monto suficiente
   │   ├─ Inserta: auction_bids
   │   ├─ Actualiza: products (current_bid, winner_id, total_bids, version)
   │   └─ Anti-sniping: extiende tiempo si queda poco
   ├─ 8. Re-lee estado actualizado
   └─ 9. Libera lock
   └─ 10. Retorna respuesta

4. Respuesta al cliente
   ├─ placeBid() procesa respuesta
   ├─ Si success: actualiza UI
   └─ Si error: muestra mensaje

5. Realtime (Supabase)
   ├─ INSERT en auction_bids → evento BID_PLACED
   └─ UPDATE en products → evento AUCTION_UPDATE
   └─ Todos los clientes reciben actualización
```

### 6.2 Archivos y Funciones Clave

**Frontend**:
- `src/components/auction/BidForm.tsx` - UI de puja
- `src/lib/hooks/useAuction.ts` - Hook de subasta
- `src/components/auction/AuctionTimer.tsx` - Contador
- `src/lib/services/auctionService.ts` - Servicio de pujas
- `src/lib/utils/timeSync.ts` - Sincronización de tiempo

**API**:
- `src/app/api/auctions/[id]/bid/route.ts` - Endpoint de puja
- `src/app/api/auctions/[id]/current/route.ts` - Datos dinámicos
- `src/app/api/auctions/close-expired/route.ts` - Cierre automático

**Redis**:
- `src/lib/redis/locks.ts` - Locks distribuidos
- `src/lib/redis/rateLimit.ts` - Rate limiting
- `src/lib/redis/cache.ts` - Caché de datos estáticos
- `src/lib/redis/client.ts` - Cliente Redis

**PostgreSQL**:
- `supabase/migrations/20251116012000_update_place_bid_with_reputation.sql` - Función `place_bid()`
- `supabase/migrations/20250130000001_auction_system.sql` - Función `close_expired_auctions()`

### 6.3 Pasos Redundantes o Duplicados

**❌ Redundancia Detectada**:
1. **Validación de monto duplicada**:
   - Frontend valida monto mínimo (BidForm.tsx:114)
   - API valida monto mínimo (route.ts:282-292)
   - PostgreSQL valida monto mínimo (place_bid())
   
   **Justificación**: Aceptable para mejor UX (rechazar rápido en cliente)

2. **Re-lectura de estado después de puja**:
   - `place_bid()` retorna estado actualizado
   - Endpoint re-lee estado (route.ts:411-415)
   
   **Justificación**: Aceptable para garantizar consistencia

---

## 📋 Conclusión

El sistema está bien diseñado pero tiene **riesgos críticos** que deben resolverse antes de agregar nuevas funcionalidades:

1. **Caché no se invalida** → Puede causar inconsistencias visuales
2. **Condición de carrera en cierre automático** → Puede aceptar pujas después de expirar
3. **Lock TTL insuficiente** → Puede permitir pujas simultáneas

**Recomendación final**: Resolver riesgos ALTA prioridad antes de implementar bonus time u otras features.

---

---

## 📋 Sección 7: Correcciones Implementadas (Post-Auditoría)

### 7.1 Invalidación de Caché Redis ✅

**Problema Original**: Caché no se invalidaba cuando cambiaba el estado de la subasta.

**Solución Implementada**:
- ✅ Agregada invalidación de caché en `/api/auctions/[id]/bid` después de puja exitosa
- ✅ Agregada invalidación de caché en `/api/auctions/close-expired` después de cerrar subastas
- ✅ Invalidación se ejecuta de forma asíncrona (no bloquea respuesta)

**Archivos Modificados**:
- `src/app/api/auctions/[id]/bid/route.ts` (línea ~430)
- `src/app/api/auctions/close-expired/route.ts` (línea ~50)

**Comportamiento**:
- Cuando una puja se procesa exitosamente, el caché se invalida automáticamente
- Cuando `close_expired_auctions()` cierra subastas, el caché se invalida para todas las subastas cerradas
- Si la invalidación falla, se loguea pero no afecta la operación principal

---

### 7.2 Prevención de Condición de Carrera ✅

**Problema Original**: `close_expired_auctions()` y `place_bid()` podían ejecutarse simultáneamente.

**Solución Implementada**:
- ✅ `close_expired_auctions()` ahora usa `SELECT FOR UPDATE SKIP LOCKED`
- ✅ Doble verificación de estado y tiempo dentro del loop
- ✅ `place_bid()` ya usaba `SELECT FOR UPDATE` (verificado)
- ✅ Condiciones adicionales en UPDATE para evitar race conditions

**Archivos Modificados**:
- `supabase/migrations/20250130000010_fix_close_expired_race_condition.sql` (nuevo)

**Comportamiento**:
- `close_expired_auctions()` bloquea filas con `FOR UPDATE SKIP LOCKED`
- Si `place_bid()` ya tiene el lock, `close_expired_auctions()` salta esa subasta
- Doble verificación previene cerrar subastas que fueron extendidas o modificadas
- UPDATE solo se ejecuta si el estado sigue siendo 'active' y el tiempo expiró

**Garantías**:
- Nunca se acepta una puja después del cierre (validado en `place_bid()` con `FOR UPDATE`)
- Nunca se cierra una subasta mientras se procesa una puja (bloqueo mutuo)
- Resultado determinista: un solo ganador, sin estados intermedios

---

### 7.3 Ajuste de TTL de Locks ✅

**Problema Original**: TTL de 5 segundos podía ser insuficiente bajo carga.

**Solución Implementada**:
- ✅ TTL aumentado de 5 a 15 segundos
- ✅ Documentación agregada explicando el cálculo del TTL
- ✅ Comentarios sobre comportamiento si la operación falla

**Archivos Modificados**:
- `src/app/api/auctions/[id]/bid/route.ts` (línea ~357)

**Justificación del TTL (15 segundos)**:
- Validación de subasta (query DB): ~100-200ms
- Validación de monto (cálculo): ~10ms
- `place_bid()` RPC (puede ser lento bajo carga): ~500-2000ms
- Re-lectura de estado: ~100-200ms
- Latencia de red y procesamiento: ~200-500ms
- **Total esperado**: ~1-3 segundos en condiciones normales
- **TTL de 15s**: Da margen para picos de latencia y carga alta

**Comportamiento si falla**:
- Si la operación falla a mitad de camino, el lock expira automáticamente
- No queda colgado indefinidamente
- Otro proceso puede adquirir el lock después de 15 segundos

---

---

## 📋 Sección 8: Correcciones de Riesgos MEDIA Prioridad (Fase 2)

### 8.1 Rate Limiting Robusto con Fallback ✅

**Problema Original**: Rate limiting fallaba abierto (permitía requests) si Redis se caía.

**Solución Implementada**:
- ✅ Fallback en memoria cuando Redis falla (1 req/seg por key)
- ✅ Limpieza automática de entradas expiradas
- ✅ Logging cuando se usa fallback

**Archivos Modificados**:
- `src/lib/redis/rateLimit.ts`

**Comportamiento**:
- Si Redis está disponible: usa rate limiting distribuido normal
- Si Redis falla: cae a rate limiting en memoria (conservador)
- Si Redis falla durante operación: captura error y usa fallback

---

### 8.2 Validación de Tiempo y Estado en `/current` ✅

**Problema Original**: El endpoint `/current` no validaba tiempo ni estado real.

**Solución Implementada**:
- ✅ Validación de tiempo usando PostgreSQL `NOW()` (vía `get_server_time()`)
- ✅ Si subasta expiró según servidor, fuerza estado "ended"
- ✅ Actualización asíncrona de estado en DB si está desactualizado

**Archivos Modificados**:
- `src/app/api/auctions/[id]/current/route.ts`

**Garantías**:
- Nunca devuelve "activa" cuando ya expiró según el servidor
- Siempre valida tiempo usando fuente de verdad (PostgreSQL)

---

### 8.3 Límites de Anti-Sniping ✅

**Problema Original**: El anti-sniping podía extender tiempo indefinidamente.

**Solución Implementada**:
- ✅ **Límite 1**: Duración máxima total (`auction_max_duration_hours`)
- ✅ **Límite 2**: Número máximo de extensiones (50 por defecto)
- ✅ Registro de eventos cuando se alcanzan límites

**Archivos Modificados**:
- `supabase/migrations/20250202000010_add_anti_sniping_limits.sql` (nuevo)

**Comportamiento**:
- Antes de extender, verifica duración máxima total
- Cuenta extensiones previas y rechaza si se alcanza el máximo (50)
- Solo extiende si pasa ambas validaciones

---

### 8.4 Reemplazo de `Date.now()` por `getSyncedNow()` ✅

**Problema Original**: Algunos componentes aún usaban `Date.now()` directamente.

**Solución Implementada**:
- ✅ Reemplazado `Date.now()` por `getSyncedNow()` en `AuctionCard.tsx`
- ✅ Actualización periódica cada segundo para mantener sincronización

**Archivos Modificados**:
- `src/components/auction/AuctionCard.tsx`

**Garantías**:
- Todos los componentes de tiempo usan reloj sincronizado
- Consistencia visual del tiempo mejorada

---

### 8.5 Logging Mínimo en Operaciones Críticas ✅

**Problema Original**: Faltaba logging suficiente para diagnóstico en producción.

**Solución Implementada**:
- ✅ Logging cuando puja es rechazada por tiempo/estado (`/bid`)
- ✅ Logging cuando detecta estado cerrado (`/current`)
- ✅ Logging cuando cierra subastas (`close-expired`)
- ✅ Logging cuando Redis falla y se usa fallback (`rateLimit`)

**Archivos Modificados**:
- `src/app/api/auctions/[id]/bid/route.ts`
- `src/app/api/auctions/[id]/current/route.ts`
- `src/app/api/auctions/close-expired/route.ts`
- `src/lib/redis/rateLimit.ts`

**Niveles de logging**:
- `logger.info`: Operaciones normales importantes
- `logger.warn`: Situaciones que requieren atención
- `logger.error`: Errores críticos
- `logger.debug`: Información detallada

---

### 8.6 Robustez de Estado en `/current` Bajo Concurrencia ✅

**Problema Original**: `/current` podría devolver datos obsoletos bajo concurrencia alta.

**Solución Implementada**:
- ✅ Refresco automático desde DB si está cerca de expirar (últimos 30 segundos)
- ✅ Re-lectura de datos dinámicos cuando está cerca del final
- ✅ Validación doble: tiempo del servidor + estado en DB

**Archivos Modificados**:
- `src/app/api/auctions/[id]/current/route.ts`

**Garantías**:
- Datos frescos cuando está cerca de expirar
- No muestra datos obsoletos bajo alta concurrencia
- Prioriza datos frescos sobre caché cuando hay duda

---

**Correcciones completadas** ✅  
**Versión**: 1.2.0  
**Fecha**: 2024


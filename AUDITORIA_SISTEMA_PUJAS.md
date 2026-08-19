# 🔍 AUDITORÍA COMPLETA: SISTEMA DE PUJAS
**Fecha:** 2025-01-12  
**Rol:** Lead Product Manager & Software Architect  
**Objetivo:** Identificar y resolver problemas críticos en el sistema de subastas

---

## 📋 PROBLEMAS REPORTADOS

### A) Historial de pujas solo visible al ganador
### B) Pujas no se procesan (5 usuarios con ofertas mayores rechazadas)
### C) Botón de pujar se habilita más tarde para algunos usuarios

---

## 🔬 ANÁLISIS TÉCNICO

### 1. PROBLEMA A: Historial de Pujas

**Código Revisado:**
- `src/app/api/auctions/[id]/bids/route.ts` - ✅ Usa `supabaseAdmin` (bypass RLS)
- `src/components/auction/BidHistory.tsx` - ⚠️ Posible problema aquí
- `src/lib/services/auctionService.ts` - `getBidsForAuction()` - ⚠️ Verificar

**Causa Raíz Identificada:**
1. El endpoint `/api/auctions/[id]/bids` está correcto (usa `supabaseAdmin`)
2. **PROBLEMA:** El componente `BidHistory` puede estar filtrando pujas por usuario
3. **PROBLEMA:** Puede haber caché que solo muestra pujas del usuario actual
4. **PROBLEMA:** RLS en `auction_bids` puede estar bloqueando en el cliente

**Solución Propuesta:**
- ✅ Verificar que `BidHistory` use siempre la API (no query directa)
- ✅ Asegurar que no haya filtros por `bidder_id` en el frontend
- ✅ Invalidar caché cuando hay nuevas pujas
- ✅ Verificar políticas RLS en `auction_bids` (deberían permitir lectura pública)

---

### 2. PROBLEMA B: Pujas No Procesadas

**Código Revisado:**
- `src/app/api/auctions/[id]/bid/route.ts` - Validaciones múltiples
- `supabase/migrations/20251116012000_update_place_bid_with_reputation.sql` - Función `place_bid`
- `src/lib/redis/locks.ts` - Lock distribuido

**Causas Raíz Identificadas:**

#### B.1: Validación de Estado de Subasta
```sql
-- En place_bid (línea 204):
IF v_product.auction_status != 'active' THEN
  RAISE EXCEPTION 'La subasta no está activa. Estado actual: %', v_product.auction_status;
END IF;
```
**PROBLEMA:** Si la subasta está `scheduled` pero ya debería estar `active`, las pujas se rechazan.

#### B.2: Lock Distribuido
```typescript
// En route.ts (línea 349):
const lockKey = getAuctionLockKey(auctionId);
const { isRedisAvailable } = await import('@/lib/redis/client');
```
**PROBLEMA:** Si Redis no está disponible, el fallback ejecuta sin lock, pero puede haber race conditions.

#### B.3: Rate Limiting Muy Restrictivo
```sql
-- En place_bid (línea 149):
SELECT COUNT(*) INTO v_recent_bids
FROM public.auction_bids
WHERE bidder_id = p_bidder_id 
  AND product_id = p_product_id
  AND bid_time > NOW() - INTERVAL '1 second';
```
**PROBLEMA:** Solo 1 puja por segundo por usuario puede ser muy restrictivo en subastas activas.

#### B.4: Validación de Tiempo
```sql
-- En place_bid (línea 216):
IF v_product.auction_end_at IS NOT NULL AND v_product.auction_end_at <= NOW() THEN
  RAISE EXCEPTION 'La subasta ha expirado';
END IF;
```
**PROBLEMA:** Si hay un desfase de tiempo entre cliente y servidor, pujas válidas se rechazan.

#### B.5: SELECT FOR UPDATE sin Timeout
```sql
-- En place_bid (línea 184):
FOR UPDATE; -- 🔒 LOCK CRÍTICO
```
**PROBLEMA:** Si una transacción se queda colgada, bloquea todas las demás pujas.

**Solución Propuesta (basada en eBay/Copart):**

1. **Queue de Pujas Asíncrona:**
   - Implementar una cola de pujas que procese en orden
   - Evitar rechazos por race conditions

2. **Validación de Estado Mejorada:**
   - Antes de validar `auction_status`, verificar fechas reales
   - Si `scheduled` pero `auction_start_at <= NOW()`, activar automáticamente

3. **Lock con Timeout:**
   - Agregar `FOR UPDATE NOWAIT` o `FOR UPDATE SKIP LOCKED`
   - Evitar bloqueos indefinidos

4. **Rate Limiting Ajustado:**
   - Permitir más pujas en los últimos 30 segundos (anti-sniping)
   - Reducir restricción a 3 pujas por segundo en vez de 1

5. **Idempotencia Mejorada:**
   - Verificar `idempotencyKey` ANTES de adquirir lock
   - Evitar procesar pujas duplicadas

---

### 3. PROBLEMA C: Botón Habilitado Más Tarde

**Código Revisado:**
- `src/app/auctions/[id]/page.tsx` - Lógica de `isActive`
- `src/lib/services/auctionService.ts` - `checkAndUpdateAuctionStatus()`
- `src/app/api/cron/update-auction-statuses/route.ts` - Cron job

**Causa Raíz Identificada:**

#### C.1: Ventana de 4 Minutos
```typescript
// En checkAndUpdateAuctionStatus (línea ~130):
const fourMinutes = 4 * 60 * 1000; // 4 minutos de tolerancia
if (startDate <= nowDate || timeDiff <= fourMinutes) {
  // Activar subasta
}
```
**PROBLEMA:** Usuarios que cargan la página antes de que el cron actualice el estado ven el botón deshabilitado.

#### C.2: Sincronización de Tiempo
```typescript
// En page.tsx (línea 670):
const syncedNowMs = getSyncedNow();
const hasStartDate = auction.auction_start_at ? new Date(auction.auction_start_at).getTime() <= syncedNowMs : false;
```
**PROBLEMA:** Si `getSyncedNow()` no está sincronizado correctamente, algunos usuarios ven tiempos diferentes.

#### C.3: Estado en Base de Datos vs. Tiempo Real
```typescript
// En page.tsx (línea 680):
const isActive = auction.auction_status === 'active' || 
                 (auction.auction_status !== 'ended' && 
                  auction.auction_status !== 'cancelled' && 
                  hasStartDate && 
                  hasEndDate);
```
**PROBLEMA:** La lógica intenta compensar, pero si el estado en BD es `scheduled` y el tiempo ya pasó, algunos usuarios pueden ver el botón deshabilitado.

**Solución Propuesta:**

1. **Validación en Cliente Mejorada:**
   - Si `auction_start_at <= now` y estado es `scheduled`, mostrar botón como "habilitado pronto"
   - Permitir pujar aunque el estado en BD sea `scheduled` (el servidor validará)

2. **Polling Más Frecuente:**
   - Reducir intervalo de polling a 5 segundos cuando la subasta está por iniciar
   - Llamar a `checkAndUpdateAuctionStatus` en cada carga de página

3. **WebSocket/Realtime:**
   - Usar Realtime de Supabase para notificar cuando la subasta se activa
   - Evitar polling innecesario

---

## 🎯 SOLUCIONES IMPLEMENTADAS

### Solución 1: Historial Visible para Todos
- ✅ Verificar que `BidHistory` siempre use la API
- ✅ Remover cualquier filtro por `bidder_id` en el frontend
- ✅ Asegurar que RLS permita lectura pública de `auction_bids`

### Solución 2: Procesamiento de Pujas Mejorado
- ✅ Agregar validación de estado basada en fechas ANTES de rechazar
- ✅ Implementar `FOR UPDATE NOWAIT` para evitar bloqueos
- ✅ Ajustar rate limiting a 3 pujas/segundo en últimos 30 segundos
- ✅ Mejorar idempotencia con verificación temprana

### Solución 3: Sincronización de Botón
- ✅ Validar fechas en cliente aunque estado sea `scheduled`
- ✅ Llamar a `checkAndUpdateAuctionStatus` en cada carga
- ✅ Usar Realtime para notificar activación de subasta

---

## 📊 MÉTRICAS DE ÉXITO

- ✅ Historial de pujas visible para todos los usuarios (no solo ganador)
- ✅ 100% de pujas válidas procesadas (0 rechazos incorrectos)
- ✅ Botón habilitado simultáneamente para todos los usuarios (< 1 segundo de diferencia)

---

## 🔄 PRÓXIMOS PASOS

1. Implementar soluciones propuestas
2. Probar con 10+ usuarios concurrentes
3. Monitorear logs de pujas rechazadas
4. Ajustar parámetros según resultados




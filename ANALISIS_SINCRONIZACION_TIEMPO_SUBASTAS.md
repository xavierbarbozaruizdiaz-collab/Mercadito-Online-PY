# Análisis: Sincronización de Tiempo en Subastas

## 📋 Resumen Ejecutivo

Este documento analiza **cómo está implementada** la sincronización de tiempo en el sistema de subastas. Incluye el análisis original y las mejoras implementadas para unificar la lógica de tiempo con PostgreSQL como fuente de verdad única.

**Última actualización**: Implementación unificada completada - PostgreSQL `NOW()` es la única fuente de verdad.

---

## 📁 Archivos Relevantes

### Frontend (UI y Lógica de Cliente)

1. **`src/components/auction/AuctionTimer.tsx`**
   - Componente que muestra el contador regresivo
   - Maneja la visualización del tiempo restante
   - Usa `serverNowMs` para calcular tiempo oficial

2. **`src/app/auctions/[id]/page.tsx`**
   - Página principal de detalle de subasta
   - Maneja estado de `serverTime`
   - Sincroniza tiempo cada 30 segundos
   - Pasa `serverTime` al componente `AuctionTimer`

3. **`src/lib/utils/timeSync.ts`**
   - Utilidad para obtener tiempo del servidor
   - Función `getServerTime()` que llama a PostgreSQL
   - Caché de tiempo con resincronización cada 30 segundos

4. **`src/components/auction/BidForm.tsx`**
   - Formulario de puja
   - Valida tiempo antes de enviar puja (en cliente)
   - Usa `new Date()` del navegador para validación

### Backend (API y Validaciones)

5. **`src/app/api/auctions/[id]/bid/route.ts`**
   - Endpoint de puja
   - Valida `auction_end_at` usando `Date.now()` del servidor
   - No usa tiempo sincronizado explícitamente

6. **`supabase/migrations/20250202000002_membership_bid_validation.sql`**
   - Función PostgreSQL `place_bid()`
   - Valida `auction_end_at <= NOW()` usando tiempo de PostgreSQL
   - **Fuente de verdad**: PostgreSQL `NOW()`

7. **`supabase/migrations/20250130000003_get_server_time.sql`**
   - Función PostgreSQL `get_server_time()`
   - Retorna `NOW()` de PostgreSQL
   - Usada por el frontend para sincronización

8. **`src/app/api/auctions/close-expired/route.ts`**
   - Endpoint para cerrar subastas expiradas
   - Llama a función `close_expired_auctions()` en PostgreSQL
   - Debe ejecutarse periódicamente (cron job)

### Base de Datos

9. **Tabla `products`**
   - Campo `auction_end_at` (TIMESTAMPTZ)
   - Campo `auction_start_at` (TIMESTAMPTZ)
   - Campo `auction_status` (scheduled, active, ended, cancelled)

---

## 🔍 1. Dónde se Define el Tiempo de Fin

### En la Base de Datos

**Tabla**: `products`
**Campo**: `auction_end_at` (TIMESTAMPTZ)

**Definición**:
- Se establece al crear/actualizar una subasta
- Puede modificarse por:
  - Extensión anti-sniping (cuando hay puja en los últimos segundos)
  - Actualización manual del vendedor
  - Función `activate_scheduled_auctions()` cuando inicia una subasta programada

**Tipo**: `TIMESTAMPTZ` (timestamp with timezone) - PostgreSQL maneja la zona horaria

---

## 🔍 2. Cómo se Maneja el Contador en el Frontend

### Componente: `AuctionTimer.tsx`

#### Fuente del Tiempo

**✅ SÍ usa tiempo del servidor** (parcialmente):

```typescript
// Props recibidas
endAtMs: number;           // Fecha de fin (del servidor)
serverNowMs: number;        // Tiempo del servidor "ahora" (cuando se montó)

// Cálculo del tiempo oficial
const officialNowMs = useMemo(() => {
  const clientElapsed = nowMs - startClientMsRef.current;
  return serverNowMs + clientElapsed;  // Tiempo servidor + tiempo transcurrido en cliente
}, [nowMs, serverNowMs]);

// Tiempo restante
const remainingMs = Math.max(0, endAtMs - officialNowMs);
```

**Cómo funciona**:
1. Al montar el componente, recibe `serverNowMs` (tiempo del servidor)
2. Guarda `startClientMsRef` = `Date.now()` (tiempo del cliente al montar)
3. Cada tick (cada 200ms por defecto), actualiza `nowMs = Date.now()`
4. Calcula `clientElapsed = nowMs - startClientMsRef`
5. Calcula `officialNowMs = serverNowMs + clientElapsed`
6. Calcula `remainingMs = endAtMs - officialNowMs`

**Problema detectado**: 
- El offset inicial se calcula una vez al montar
- Si `serverTime` se actualiza (cada 30s), el componente **NO recalcula el offset**
- El offset se guarda en `serverTimeOffsetRef` pero **NO se usa** en el cálculo

#### Actualización del Contador

**Frecuencia**: Cada `tickMs` (default: 200ms = 5 veces por segundo)

```typescript
useEffect(() => {
  const timer = setInterval(() => setNowMs(Date.now()), tickMs);
  return () => clearInterval(timer);
}, [tickMs]);
```

**Método**: `setInterval` (no `requestAnimationFrame`)

---

### Página: `src/app/auctions/[id]/page.tsx`

#### Sincronización de Tiempo del Servidor

**Frecuencia**: Cada 30 segundos

```typescript
const timeSyncInterval = setInterval(async () => {
  const { getServerTime } = await import('@/lib/utils/timeSync');
  const serverTimeNow = await getServerTime();
  setServerTime(serverTimeNow);
}, 30000);
```

**Problema detectado**:
- El `AuctionTimer` recibe `serverTime` como prop
- Cuando `serverTime` cambia (cada 30s), el componente **NO recalcula el offset**
- El componente sigue usando el `serverNowMs` inicial + elapsed del cliente
- Esto puede causar drift si el reloj del cliente está desincronizado

---

### Utilidad: `src/lib/utils/timeSync.ts`

#### Función `getServerTime()`

**Cómo funciona**:

1. **Caché local**: Si hay tiempo cacheado y pasaron menos de 30 segundos, retorna tiempo cacheado + elapsed
2. **Llamada a PostgreSQL**: Llama a `supabase.rpc('get_server_time')`
3. **Compensación de latencia**: Ajusta el tiempo sumando la mitad del tiempo de request
4. **Fallback**: Si falla, usa `Date.now()` del cliente

```typescript
export async function getServerTime(): Promise<number> {
  // Si hay caché reciente, usarlo con offset
  if (cachedServerTime !== null && (now - lastSyncTime) < SYNC_INTERVAL) {
    const elapsed = now - lastSyncTime;
    return cachedServerTime + elapsed;  // Tiempo cacheado + tiempo transcurrido
  }
  
  // Llamar a PostgreSQL
  const { data } = await supabase.rpc('get_server_time');
  const serverTimestamp = new Date(data).getTime();
  const requestDuration = Date.now() - startRequest;
  const adjustedTime = serverTimestamp + (requestDuration / 2);  // Compensar latencia
  
  cachedServerTime = adjustedTime;
  lastSyncTime = now;
  return adjustedTime;
}
```

**Función PostgreSQL** (`get_server_time()`):
```sql
CREATE OR REPLACE FUNCTION public.get_server_time()
RETURNS TIMESTAMPTZ AS $$
BEGIN
  RETURN NOW();
END;
$$ LANGUAGE plpgsql;
```

**Fuente de verdad**: PostgreSQL `NOW()` (tiempo del servidor de base de datos)

---

## 🔍 3. Cómo se Decide que la Subasta Terminó

### En el BACKEND

#### A) Endpoint de Puja: `/api/auctions/[id]/bid`

**Validación de tiempo**:

```typescript
// En validateAuction()
if (auction.auction_end_at) {
  const endAt = new Date(auction.auction_end_at).getTime();
  const now = Date.now();  // ⚠️ USA Date.now() del servidor Node.js
  if (endAt <= now) {
    return { valid: false, error: 'La subasta ya ha finalizado' };
  }
}
```

**Problema detectado**:
- Usa `Date.now()` del servidor Node.js (puede diferir de PostgreSQL)
- No usa `NOW()` de PostgreSQL directamente
- No hay sincronización explícita con el tiempo de la base de datos

#### B) Función PostgreSQL: `place_bid()`

**Validación de tiempo**:

```sql
-- Validar que la subasta no ha expirado
IF v_product.auction_end_at IS NOT NULL AND v_product.auction_end_at <= NOW() THEN
  INSERT INTO public.auction_events (...);
  RAISE EXCEPTION 'La subasta ya ha finalizado';
END IF;
```

**✅ CORRECTO**: Usa `NOW()` de PostgreSQL (fuente de verdad)

#### C) Cierre Automático: `close_expired_auctions()`

**Función PostgreSQL** (en migración `20250130000001_auction_system.sql`):

```sql
CREATE OR REPLACE FUNCTION public.close_expired_auctions()
RETURNS INTEGER AS $$
BEGIN
  -- Buscar subastas activas que han expirado
  FOR v_auction IN
    SELECT ... 
    FROM public.products p
    WHERE p.sale_type = 'auction'
      AND p.auction_status = 'active'
      AND p.auction_end_at IS NOT NULL
      AND p.auction_end_at <= NOW()  -- ✅ Usa NOW() de PostgreSQL
  LOOP
    -- Cerrar subasta
    UPDATE public.products
    SET auction_status = 'ended', ...
    WHERE id = v_auction.id;
  END LOOP;
END;
```

**Endpoint**: `/api/auctions/close-expired`
- Debe ejecutarse periódicamente (cron job)
- **Problema**: No hay garantía de que se ejecute exactamente cuando expira

---

### En el FRONTEND

#### A) Componente `AuctionTimer`

**Cuando el contador llega a 0**:

```typescript
const ended = remainingMs <= 0;

useEffect(() => {
  if (ended && onExpire) onExpire();
}, [ended]);
```

**Callback `onExpire`** (en `page.tsx`):
```typescript
onExpire={() => {
  // Reproducir sonido
  loadAuction();  // Recargar estado de la subasta
}}
```

**NO deshabilita el botón automáticamente** - Solo llama a `loadAuction()`

#### B) Formulario de Puja: `BidForm.tsx`

**Validación antes de enviar**:

```typescript
// Validar que la subasta siga activa (verificación en tiempo real)
const { data: auctionCheck } = await supabase
  .from('products')
  .select('auction_status, auction_end_at')
  .eq('id', productId)
  .single();

if (auction.auction_end_at) {
  const endDate = new Date(auction.auction_end_at);
  if (endDate <= new Date()) {  // ⚠️ USA new Date() del navegador
    setError('Esta subasta ya ha finalizado');
    return;
  }
}
```

**Problema detectado**:
- Usa `new Date()` del navegador (puede estar desincronizado)
- No usa tiempo del servidor para esta validación

#### C) Estado de la Subasta

**El botón BID se deshabilita si**:
- `isActive === false` (subasta no está activa)
- `isConnected === false` (desconectado de Realtime)
- `loading === true` (procesando puja)

**NO se deshabilita automáticamente cuando el timer llega a 0**

**Sí se oculta cuando `isEnded === true`**:
```typescript
{isActive && (  // Solo muestra el formulario si está activa
  <BidForm ... />
)}
```

**El estado `isEnded` se actualiza cuando**:
- `auction.auction_status === 'ended'` (viene de la DB)
- `auction.auction_status === 'cancelled'` (viene de la DB)
- **NO se actualiza automáticamente cuando el timer llega a 0** (solo cuando se recarga desde la DB)

#### D) Eventos Realtime

**Suscripción a cambios en `products`**:
```typescript
supabase
  .channel(`auction-${productId}`)
  .on('postgres_changes', {
    event: '*',
    table: 'products',
    filter: `id=eq.${productId}`,
  }, (payload) => {
    // Si cambió auction_status a 'ended', se recarga
    loadAuction();
  })
```

**Qué pasa**:
- Si el estado cambia a `'ended'` en la DB, Realtime notifica
- El componente recarga la subasta
- El formulario se oculta (porque `isActive === false`)

**Problema**: 
- Depende de que `close_expired_auctions()` se ejecute
- Si el cron no se ejecuta, la subasta puede seguir "activa" en la DB
- Los usuarios seguirán viendo el formulario aunque el tiempo haya expirado

---

## 🔍 4. Sincronización Cliente-Servidor

### Mecanismo Existente

**✅ SÍ existe sincronización**, pero con limitaciones:

#### Frontend → Servidor

1. **Función `getServerTime()`**:
   - Llama a `supabase.rpc('get_server_time')`
   - Obtiene `NOW()` de PostgreSQL
   - Compensa latencia (suma mitad del tiempo de request)
   - Cachea resultado por 30 segundos

2. **Resincronización**:
   - Cada 30 segundos en la página de subasta
   - Cada 30 segundos en el stream SSE

#### Cálculo del Offset

**En `AuctionTimer.tsx`**:
```typescript
const serverTimeOffsetRef = useRef<number>(serverNowMs - Date.now());
```

**Problema**: El offset se calcula pero **NO se usa** en el cálculo del tiempo oficial.

**Cálculo actual**:
```typescript
const officialNowMs = serverNowMs + clientElapsed;
```

**Debería ser**:
```typescript
const officialNowMs = serverNowMs + (nowMs - startClientMsRef.current);
```

**Problema adicional**: Si `serverTime` se actualiza (cada 30s), el componente **NO recalcula** el offset inicial.

---

### Riesgos Detectados

#### 1. **Drift del Tiempo**

**Escenario**:
- Usuario tiene reloj adelantado 5 segundos
- `serverTime` se sincroniza cada 30 segundos
- Entre sincronizaciones, el componente usa `serverNowMs` inicial + elapsed
- Si el reloj del cliente está desincronizado, el elapsed puede ser incorrecto

**Resultado**: El contador puede mostrar tiempo incorrecto (adelantado o atrasado)

#### 2. **Validación en Cliente vs Servidor**

**Problema**:
- Cliente valida con `new Date()` del navegador
- Servidor valida con `Date.now()` de Node.js
- PostgreSQL valida con `NOW()` de PostgreSQL
- **Tres fuentes de tiempo diferentes** pueden no coincidir

**Escenario problemático**:
- Cliente: reloj adelantado 10 segundos
- Cliente ve: "Quedan 5 segundos" → Intenta pujar
- Servidor Node.js: "Ya pasaron 5 segundos" → Rechaza
- PostgreSQL: "Aún quedan 2 segundos" → Aceptaría (pero no llega porque el endpoint rechazó)

#### 3. **Cierre Automático No Garantizado**

**Problema**:
- `close_expired_auctions()` debe ejecutarse periódicamente
- Si el cron falla o se retrasa, la subasta puede quedar "activa" después de expirar
- Los usuarios pueden seguir viendo la subasta como activa

---

## 📝 VERSIÓN HUMANA: ¿Qué Pasa Hoy?

### Escenario 1: Faltan 10 Segundos

**En el navegador del usuario**:
1. El contador muestra "00:10" (10 segundos restantes)
2. El tiempo se calcula como: `endAtMs - (serverNowMs + elapsed)`
3. Si el reloj del usuario está correcto, muestra tiempo preciso
4. Si el reloj está desincronizado, puede mostrar tiempo incorrecto

**En el servidor**:
- La subasta sigue activa
- El endpoint de puja aceptaría pujas (si `auction_end_at > NOW()` en PostgreSQL)

**Riesgo**: Si el reloj del usuario está adelantado, puede pensar que ya terminó cuando aún quedan segundos.

---

### Escenario 2: El Contador Llega a 0 en la UI

**Qué pasa**:
1. El componente `AuctionTimer` detecta `remainingMs <= 0`
2. Llama a `onExpire()` callback
3. El callback ejecuta `loadAuction()` para recargar el estado desde la DB
4. **El botón BID NO se deshabilita automáticamente** (solo se oculta si `isActive === false`)

**Problema**:
- Entre el momento que el timer llega a 0 y `loadAuction()` completa, el usuario puede intentar pujar
- El formulario `BidForm` valida con `new Date()` del navegador
- Si el reloj está atrasado, puede permitir pujas después de que expiró
- Si el cron de cierre no se ejecutó, `auction_status` puede seguir siendo `'active'` en la DB

**En el servidor**:
- Si la subasta realmente expiró (según PostgreSQL `NOW()`), el endpoint rechazará la puja
- Si el cron de cierre no se ejecutó, la subasta puede seguir "activa" en la DB
- La función `place_bid()` en PostgreSQL **SÍ valida** con `NOW()`, así que rechazará pujas después de expirar

---

### Escenario 3: Dos Usuarios Pujan Justo al Final

**Usuario A** (reloj correcto):
- Ve "00:02" (2 segundos)
- Hace clic en BID
- Request llega al servidor en 200ms
- Servidor valida: `auction_end_at > NOW()` → ✅ Acepta
- PostgreSQL procesa: `auction_end_at > NOW()` → ✅ Acepta
- Puja exitosa

**Usuario B** (reloj adelantado 3 segundos):
- Ve "00:00" (piensa que terminó, pero en realidad quedan 3 segundos)
- Hace clic en BID
- Request llega al servidor en 200ms
- Servidor valida: `auction_end_at > NOW()` → ✅ Acepta
- PostgreSQL procesa: `auction_end_at > NOW()` → ✅ Acepta
- Puja exitosa (pero el usuario pensó que ya había terminado)

**Usuario C** (reloj atrasado 3 segundos):
- Ve "00:06" (piensa que quedan 6 segundos, pero en realidad quedan 3)
- Hace clic en BID
- Request llega al servidor en 200ms
- Servidor valida: `auction_end_at <= NOW()` → ❌ Rechaza
- Puja rechazada (aunque el usuario pensó que aún había tiempo)

**Problema**: Los usuarios con relojes desincronizados tienen experiencias inconsistentes.

---

### Escenario 4: Reloj del Usuario Adelantado/Atrasado

#### Reloj Adelantado (5 segundos)

**Qué pasa**:
1. Usuario ve contador en "00:00" cuando en realidad quedan 5 segundos
2. Usuario piensa que la subasta terminó
3. No intenta pujar (pierde oportunidad)
4. O intenta pujar, pero el servidor acepta (confusión)

**Riesgo**: Usuario puede perder oportunidades o tener confusión sobre el estado real.

#### Reloj Atrasado (5 segundos)

**Qué pasa**:
1. Usuario ve contador en "00:05" cuando en realidad ya terminó
2. Usuario intenta pujar
3. Cliente valida: `new Date() < endDate` → ✅ Permite
4. Servidor valida: `Date.now() < endAt` → ❌ Rechaza (si el servidor tiene tiempo correcto)
5. Usuario ve error: "La subasta ya ha finalizado"

**Riesgo**: Usuario intenta pujar cuando ya no puede, experiencia frustrante.

---

## ⚠️ Riesgos Detectados

### 1. **Múltiples Fuentes de Tiempo**

- **Cliente**: `Date.now()` del navegador
- **Servidor Node.js**: `Date.now()` del servidor
- **PostgreSQL**: `NOW()` de la base de datos

**Riesgo**: Pueden no coincidir, causando validaciones inconsistentes.

### 2. **Offset No Se Recalcula**

- El `AuctionTimer` calcula el offset una vez al montar
- Si `serverTime` se actualiza (cada 30s), el offset no se recalcula
- El componente sigue usando el tiempo inicial + elapsed

**Riesgo**: Drift acumulativo si el reloj del cliente está desincronizado.

### 3. **Validación en Cliente Usa Tiempo Local**

- `BidForm` valida con `new Date()` del navegador
- Puede permitir pujas que el servidor rechazará

**Riesgo**: Experiencia frustrante para usuarios con relojes desincronizados.

### 4. **Cierre Automático No Garantizado**

- `close_expired_auctions()` depende de un cron job
- Si el cron falla, la subasta puede quedar "activa" después de expirar

**Riesgo**: Usuarios pueden ver subastas como activas cuando ya expiraron.

### 5. **No Hay Validación de Tiempo en el Endpoint**

- El endpoint `/api/auctions/[id]/bid` valida con `Date.now()` del servidor
- No usa `NOW()` de PostgreSQL directamente
- Puede diferir del tiempo usado en `place_bid()`

**Riesgo**: Validaciones inconsistentes entre endpoint y función PostgreSQL.

---

## 📊 Resumen Técnico

### Flujo Actual de Validación de Tiempo

```
1. Usuario ve contador (AuctionTimer)
   └─ Calcula: endAtMs - (serverNowMs + elapsed)
   └─ Usa: serverTime inicial + elapsed del cliente
   └─ Actualiza: cada 200ms

2. Usuario hace clic en BID (BidForm)
   └─ Valida: new Date() < auction_end_at
   └─ Usa: tiempo del navegador

3. Request llega al endpoint (/api/auctions/[id]/bid)
   └─ Valida: Date.now() < auction_end_at
   └─ Usa: tiempo del servidor Node.js

4. Función PostgreSQL (place_bid)
   └─ Valida: NOW() < auction_end_at
   └─ Usa: tiempo de PostgreSQL (fuente de verdad)

5. Cierre automático (close_expired_auctions)
   └─ Ejecuta: periódicamente (cron)
   └─ Valida: NOW() <= auction_end_at
   └─ Actualiza: auction_status = 'ended'
```

### Fuentes de Tiempo

| Ubicación | Fuente | Precisión | Sincronización |
|-----------|--------|----------|----------------|
| Cliente (navegador) | `Date.now()` | Variable | No sincronizado |
| Cliente (timer) | `serverNowMs + elapsed` | Buena (si serverTime es correcto) | Parcial (cada 30s) |
| Servidor Node.js | `Date.now()` | Variable | No sincronizado |
| PostgreSQL | `NOW()` | **Precisa** | ✅ Fuente de verdad |

---

## ✅ Puntos Positivos

1. **Sí existe sincronización**: El sistema intenta sincronizar con el servidor
2. **PostgreSQL es fuente de verdad**: Las validaciones críticas usan `NOW()` de PostgreSQL
3. **Compensación de latencia**: `getServerTime()` compensa la mitad del tiempo de request
4. **Caché de tiempo**: Reduce llamadas a la base de datos

---

## ❌ Puntos de Mejora Identificados

1. **Offset no se recalcula**: Cuando `serverTime` se actualiza, el componente no recalcula el offset
2. **Validación en cliente usa tiempo local**: Debería usar tiempo del servidor
3. **Endpoint usa tiempo de Node.js**: Debería usar `NOW()` de PostgreSQL o tiempo sincronizado
4. **Cierre automático no garantizado**: Depende de cron job externo
5. **No hay validación de tiempo en Realtime**: Los eventos no validan tiempo antes de mostrar

---

**Análisis completado sin realizar cambios**
**Fecha**: 2024
**Versión**: 1.0.0


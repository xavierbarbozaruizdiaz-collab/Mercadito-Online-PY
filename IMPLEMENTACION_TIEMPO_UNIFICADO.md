# Implementación: Unificación de Lógica de Tiempo en Subastas

## 📋 Resumen

Se ha implementado una unificación completa de la lógica de tiempo en subastas, donde **PostgreSQL `NOW()` es la única fuente de verdad** para todas las validaciones de tiempo.

---

## ✅ Cambios Implementados

### 1. Backend - Fuente de Verdad Única

#### Endpoint `/api/auctions/[id]/bid`

**Antes:**
- Validaba tiempo con `Date.now()` del servidor Node.js
- Podía diferir del tiempo usado en PostgreSQL

**Ahora:**
- **NO valida tiempo** con `Date.now()`
- Delega completamente la validación de tiempo a PostgreSQL `place_bid()`
- PostgreSQL usa `NOW()` como fuente de verdad única

**Código:**
```typescript
// ❌ ANTES: Validación con Date.now()
if (auction.auction_end_at) {
  const endAt = new Date(auction.auction_end_at).getTime();
  const now = Date.now(); // ⚠️ Tiempo de Node.js
  if (endAt <= now) {
    return { valid: false, error: 'La subasta ya ha finalizado' };
  }
}

// ✅ AHORA: No valida tiempo, delega a PostgreSQL
// La validación de tiempo se delega completamente a PostgreSQL (place_bid)
// PostgreSQL usa NOW() como fuente de verdad única
```

**Código de Error:**
- Se agregó `error_code: 'AUCTION_ENDED'` cuando la subasta ya terminó
- Permite al frontend manejar este caso específico

---

### 2. Frontend - Sincronización Mejorada

#### `src/lib/utils/timeSync.ts`

**Mejoras:**
1. **Offset que se recalcula**: El offset entre cliente y servidor se recalcula cada vez que se sincroniza
2. **Función `getSyncedNow()`**: Expone tiempo sincronizado que siempre usa el offset actualizado
3. **Sincronización periódica**: Se sincroniza cada 30 segundos automáticamente

**Código:**
```typescript
let timeOffset: number = 0; // Offset: serverTime - clientTime

export async function getServerTime(): Promise<number> {
  // ... obtiene tiempo de PostgreSQL
  // Calcula y actualiza el offset
  timeOffset = adjustedTime - clientTimeAtSync;
  return adjustedTime;
}

export function getSyncedNow(): number {
  // Tiempo sincronizado = tiempo del cliente + offset
  return Date.now() + timeOffset;
}
```

---

### 3. Componentes Frontend Actualizados

#### `AuctionTimer.tsx`

**Antes:**
- Usaba `Date.now()` del navegador
- Offset calculado una vez y nunca se recalcula

**Ahora:**
- Usa `getSyncedNow()` que siempre usa el offset actualizado
- Se actualiza automáticamente cuando el offset cambia

**Código:**
```typescript
// ✅ AHORA: Usa getSyncedNow()
useEffect(() => {
  const timer = setInterval(() => {
    setNowMs(getSyncedNow()); // Siempre sincronizado
  }, tickMs);
  return () => clearInterval(timer);
}, [tickMs]);
```

---

#### `BidForm.tsx`

**Mejoras:**
1. **Usa tiempo sincronizado**: Calcula `remainingMs` usando `getSyncedNow()`
2. **Deshabilita botón consistentemente**: Cuando `remainingMs <= 0`
3. **Maneja error `AUCTION_ENDED`**: Muestra mensaje claro y fuerza refresh

**Código:**
```typescript
// Calcular tiempo restante usando tiempo sincronizado
useEffect(() => {
  if (!auctionEndAt || isAuctionEnded) {
    setRemainingMs(0);
    return;
  }

  const updateRemaining = () => {
    const endAtMs = new Date(auctionEndAt).getTime();
    const syncedNow = getSyncedNow(); // ✅ Usa tiempo sincronizado
    const remaining = Math.max(0, endAtMs - syncedNow);
    setRemainingMs(remaining);
  };

  updateRemaining();
  const interval = setInterval(updateRemaining, 1000);
  return () => clearInterval(interval);
}, [auctionEndAt, isAuctionEnded]);

// Deshabilitar botón cuando remainingMs <= 0
const isTimeExpired = remainingMs <= 0;
const isDisabled = isAuctionEnded || isTimeExpired;
```

---

#### `useAuction.ts`

**Mejora:**
- Calcula `timeRemainingMs` usando `getSyncedNow()` en lugar de `Date.now()`

---

## 🔄 Flujo Unificado

### Flujo de Validación de Tiempo

```
1. Usuario ve contador (AuctionTimer)
   └─ Usa: getSyncedNow() (tiempo sincronizado con servidor)
   └─ Offset se recalcula cada 30 segundos
   └─ Si remainingMs <= 0 → Deshabilita botón BID

2. Usuario hace clic en BID (BidForm)
   └─ Valida: remainingMs > 0 (usando getSyncedNow())
   └─ Si isTimeExpired → Rechaza inmediatamente

3. Request llega al endpoint (/api/auctions/[id]/bid)
   └─ NO valida tiempo con Date.now()
   └─ Delega validación a PostgreSQL

4. Función PostgreSQL (place_bid)
   └─ Valida: NOW() < auction_end_at
   └─ ✅ Fuente de verdad única
   └─ Si expiró → Retorna error con código "AUCTION_ENDED"

5. Respuesta al cliente
   └─ Si error_code === 'AUCTION_ENDED' → Muestra mensaje y fuerza refresh
   └─ Si success → Actualiza UI con nuevo estado
```

---

## 📊 Comparación: Antes vs. Ahora

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| **Fuente de verdad** | Múltiples (cliente, Node.js, PostgreSQL) | ✅ PostgreSQL `NOW()` única |
| **Validación en endpoint** | `Date.now()` de Node.js | ✅ Delega a PostgreSQL |
| **Sincronización frontend** | Offset calculado una vez | ✅ Offset se recalcula periódicamente |
| **Botón BID** | No se deshabilita automáticamente | ✅ Se deshabilita cuando `remainingMs <= 0` |
| **Validación en cliente** | `new Date()` del navegador | ✅ `getSyncedNow()` sincronizado |
| **Manejo de errores** | Mensaje genérico | ✅ Código `AUCTION_ENDED` específico |

---

## 🎯 Beneficios

1. **Consistencia**: Todas las validaciones usan la misma fuente de tiempo
2. **Precisión**: El offset se recalcula periódicamente, evitando drift
3. **UX Mejorada**: El botón se deshabilita consistentemente cuando expira
4. **Claridad**: Código de error específico para subasta finalizada
5. **Robustez**: No depende de relojes desincronizados del cliente o servidor

---

## ⚠️ Notas Importantes

### Sincronización Periódica

- El offset se recalcula cada 30 segundos
- Si el reloj del cliente está desincronizado, se corrige automáticamente
- `getSyncedNow()` siempre usa el offset más reciente

### Validación en Cliente vs. Servidor

- El cliente valida con `getSyncedNow()` para mejor UX (evita pujas inválidas)
- El servidor valida con PostgreSQL `NOW()` como fuente de verdad
- Si hay discrepancia, el servidor tiene la última palabra

### Cierre Automático

- `close_expired_auctions()` sigue siendo necesario para actualizar `auction_status`
- La validación de tiempo en `place_bid()` es independiente y más precisa
- Incluso si el cron falla, las pujas después de expirar son rechazadas

---

## 📝 Archivos Modificados

1. `src/app/api/auctions/[id]/bid/route.ts` - Eliminada validación con Date.now()
2. `src/lib/utils/timeSync.ts` - Agregado offset y getSyncedNow()
3. `src/components/auction/AuctionTimer.tsx` - Usa getSyncedNow()
4. `src/components/auction/BidForm.tsx` - Usa tiempo sincronizado y deshabilita botón
5. `src/lib/hooks/useAuction.ts` - Usa getSyncedNow()
6. `src/lib/services/auctionService.ts` - Retorna error_code
7. `src/app/auctions/[id]/page.tsx` - Pasa props necesarias a BidForm

---

**Implementación completada** ✅
**Fecha**: 2024
**Versión**: 2.0.0








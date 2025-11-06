# ANÁLISIS DE SEGURIDAD ANTI-TRAMPA - SISTEMA DE SUBASTAS

## ✅ LO QUE SÍ ESTÁ IMPLEMENTADO

### 1. Autoridad del Servidor (Single Source of Truth)
- ✅ Función `place_bid` en PostgreSQL (RPC) - toda la lógica está en el servidor
- ✅ Validaciones en el servidor: estado activo, no vendedor, fecha de fin
- ✅ Extensión anti-sniping (`auto_extend_seconds`)
- ✅ Cálculo de incremento mínimo en el servidor

### 2. Sincronización de Tiempo
- ✅ Función `get_server_time()` que retorna `NOW()` del servidor
- ✅ Timer en cliente usa `serverNowMs + clientElapsed`
- ✅ Resincronización cada 30 segundos

### 3. Real-time Updates
- ✅ Supabase Realtime para actualizaciones en tiempo real
- ✅ Suscripción a cambios en `products` y `auction_bids`

### 4. Anti-sniping Básico
- ✅ Extensión de tiempo cuando hay puja en último momento (`auto_extend_seconds`)

### 5. Validaciones Básicas
- ✅ El vendedor no puede pujar en sus propias subastas
- ✅ Validación de subasta activa
- ✅ Validación de incremento mínimo

---

## ❌ LO QUE FALTA IMPLEMENTAR (CRÍTICO)

### 1. Rate Limiting ⚠️ CRÍTICO
**Estado:** NO IMPLEMENTADO
- ❌ Límite de 1 puja/usuario/lote/segundo
- ❌ Sin verificación de frecuencia de pujas
- **Riesgo:** Usuarios pueden hacer spam de pujas, manipular subastas

**Solución necesaria:**
```sql
-- Agregar en place_bid antes de aceptar la puja:
SELECT COUNT(*) INTO v_recent_bids
FROM auction_bids
WHERE bidder_id = p_bidder_id 
  AND product_id = p_product_id
  AND bid_time > NOW() - INTERVAL '1 second';
  
IF v_recent_bids > 0 THEN
  RAISE EXCEPTION 'Demasiadas pujas. Máximo 1 puja por segundo.';
END IF;
```

### 2. Versionado de Lote ⚠️ CRÍTICO
**Estado:** NO IMPLEMENTADO
- ❌ No hay columna `lot_version` en `products`
- ❌ No se incluye `version` en mensajes real-time
- ❌ Cliente no descarta mensajes viejos
- **Riesgo:** Mensajes desactualizados pueden causar condiciones de carrera

**Solución necesaria:**
```sql
-- Agregar columna version a products
ALTER TABLE products ADD COLUMN auction_version INTEGER DEFAULT 0;

-- Incrementar version en cada cambio
UPDATE products SET auction_version = auction_version + 1 WHERE id = p_product_id;
```

### 3. JWT Expiration Check ⚠️ IMPORTANTE
**Estado:** NO IMPLEMENTADO
- ❌ No se verifica expiración de token antes de aceptar puja
- **Riesgo:** Tokens expirados podrían usarse para pujar

**Solución necesaria:**
```sql
-- En place_bid, verificar token:
-- (Supabase Auth ya maneja esto, pero se puede reforzar)
-- Verificar que auth.uid() es válido y no expirado
```

### 4. Timestamps en Mensajes ⚠️ IMPORTANTE
**Estado:** NO IMPLEMENTADO
- ❌ No hay `server_emitted_at` en respuestas
- ❌ No hay `client_sent_at` en peticiones
- ❌ No se valida diferencia entre timestamps
- **Riesgo:** Ataques de replay, pujas con timestamps manipulados

**Solución necesaria:**
```sql
-- Agregar a place_bid:
-- p_client_sent_at TIMESTAMPTZ (opcional)
-- Validar: Si p_client_sent_at > NOW() + INTERVAL '5 seconds' → rechazar
-- Si p_client_sent_at < NOW() - INTERVAL '30 seconds' → rechazar
```

### 5. Idempotency Key ⚠️ IMPORTANTE
**Estado:** NO IMPLEMENTADO
- ❌ No hay `idempotency_key` en `auction_bids`
- ❌ No se previenen pujas duplicadas por retry
- **Riesgo:** Pujas duplicadas si hay retry de red

**Solución necesaria:**
```sql
-- Agregar columna:
ALTER TABLE auction_bids ADD COLUMN idempotency_key UUID;

-- Crear índice único:
CREATE UNIQUE INDEX idx_bids_idempotency ON auction_bids(idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- En place_bid, verificar:
IF p_idempotency_key IS NOT NULL THEN
  SELECT id INTO v_existing_bid_id
  FROM auction_bids
  WHERE idempotency_key = p_idempotency_key;
  
  IF FOUND THEN
    RETURN v_existing_bid_id; -- Retornar puja existente
  END IF;
END IF;
```

### 6. Lock Transaccional ⚠️ CRÍTICO
**Estado:** PARCIALMENTE IMPLEMENTADO
- ⚠️ No hay `SELECT ... FOR UPDATE` explícito en `place_bid`
- ⚠️ No hay advisory lock por `product_id`
- **Riesgo:** Condiciones de carrera cuando múltiples pujas llegan simultáneamente

**Solución necesaria:**
```sql
-- En place_bid, al inicio:
BEGIN;
  -- Lock el producto
  SELECT * INTO v_product
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;
  
  -- O usar advisory lock:
  PERFORM pg_advisory_xact_lock(hashtext(p_product_id::TEXT));
  
  -- ... resto de lógica ...
COMMIT;
```

### 7. Tabla de Auditoría ⚠️ IMPORTANTE
**Estado:** NO IMPLEMENTADO
- ❌ No hay tabla `auction_events`
- ❌ No se registran eventos: BID_PLACED, TIMER_EXTENDED, LOT_CLOSED
- **Riesgo:** No hay forma de auditar o resolver disputas

**Solución necesaria:**
```sql
CREATE TABLE auction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('BID_PLACED', 'TIMER_EXTENDED', 'LOT_CLOSED', 'BID_REJECTED')),
  user_id UUID REFERENCES auth.users(id),
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insertar en place_bid después de puja exitosa:
INSERT INTO auction_events (product_id, event_type, user_id, event_data)
VALUES (p_product_id, 'BID_PLACED', p_bidder_id, jsonb_build_object(
  'bid_id', v_bid_id,
  'amount', p_amount,
  'previous_bid', v_current_bid,
  'new_end_at', v_new_end_at
));
```

### 8. Scheduler Server-Side ⚠️ CRÍTICO
**Estado:** PARCIALMENTE IMPLEMENTADO
- ⚠️ Existe función `close_expired_auctions` pero no se ejecuta automáticamente
- ❌ No hay cron job o scheduler configurado
- **Riesgo:** Subastas pueden quedarse abiertas si no se llama manualmente

**Solución necesaria:**
- Configurar Supabase Edge Function que se ejecute cada 5 segundos
- O configurar pg_cron en PostgreSQL:
```sql
SELECT cron.schedule('close-expired-auctions', '*/5 * * * * *', 
  $$SELECT close_expired_auctions();$$);
```

### 9. Verificación de Depósito/KYC ⚠️ FUTURO
**Estado:** NO IMPLEMENTADO
- ❌ No se verifica depósito antes de aceptar puja
- ❌ No se verifica estado KYC
- **Riesgo:** Usuarios sin fondos pueden pujar

**Solución necesaria:**
```sql
-- Agregar tabla de depósitos o verificar en profiles
-- En place_bid:
SELECT deposit_amount, kyc_status INTO v_user_deposit, v_kyc_status
FROM profiles WHERE id = p_bidder_id;

IF v_kyc_status != 'verified' THEN
  RAISE EXCEPTION 'Debes completar verificación KYC para pujar';
END IF;

IF v_user_deposit < p_amount THEN
  RAISE EXCEPTION 'Fondos insuficientes';
END IF;
```

### 10. Manejo de Reconexión ⚠️ IMPORTANTE
**Estado:** NO IMPLEMENTADO
- ❌ No se detecta cuando cae el socket WebSocket
- ❌ No se muestra "reconectando"
- ❌ No se desactiva botón de puja durante reconexión
- ❌ No se fuerza re-fetch al reconectar

**Solución necesaria en frontend:**
```typescript
// Detectar desconexión:
channel.on('system', {}, (payload) => {
  if (payload.status === 'SUBSCRIBED') {
    setIsConnected(true);
  } else if (payload.status === 'CLOSED') {
    setIsConnected(false);
    // Re-fetch auction data
    loadAuction();
  }
});
```

### 11. Descartar Mensajes Viejos ⚠️ IMPORTANTE
**Estado:** NO IMPLEMENTADO
- ❌ Cliente no mantiene `max_version` visto
- ❌ No descarta mensajes con `version` menor
- **Riesgo:** UI puede mostrar información desactualizada

**Solución necesaria:**
```typescript
const [maxVersion, setMaxVersion] = useState(0);

channel.on('postgres_changes', ..., (payload) => {
  const messageVersion = payload.new.auction_version || 0;
  if (messageVersion < maxVersion) {
    console.warn('Ignorando mensaje viejo');
    return;
  }
  setMaxVersion(messageVersion);
  // Procesar mensaje
});
```

---

## 📊 RESUMEN DE PRIORIDADES

### 🔴 CRÍTICO (Implementar inmediatamente)
1. **Rate Limiting** - Prevenir spam de pujas
2. **Lock Transaccional** - Prevenir condiciones de carrera
3. **Scheduler Server-Side** - Cerrar subastas automáticamente

### 🟡 IMPORTANTE (Implementar pronto)
4. **Versionado de Lote** - Prevenir mensajes desactualizados
5. **Idempotency Key** - Prevenir pujas duplicadas
6. **Tabla de Auditoría** - Para resolución de disputas
7. **Timestamps en Mensajes** - Prevenir replay attacks

### 🟢 DESEABLE (Mejoras futuras)
8. **Manejo de Reconexión** - Mejor UX
9. **Verificación Depósito/KYC** - Para producción real
10. **Descartar Mensajes Viejos** - Robustez adicional

---

## 🎯 RECOMENDACIÓN

**Fase 1 (Inmediata):**
- Agregar rate limiting
- Implementar lock transaccional
- Configurar scheduler para cerrar subastas

**Fase 2 (Esta semana):**
- Versionado de lote
- Idempotency key
- Tabla de auditoría

**Fase 3 (Próximo mes):**
- Timestamps en mensajes
- Manejo de reconexión
- Verificación depósito/KYC


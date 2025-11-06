# 📋 PLAN DE IMPLEMENTACIÓN - SISTEMA DE SUBASTAS
## Mercadito Online PY

---

## 📊 ANÁLISIS DEL ESTADO ACTUAL

### ✅ Lo que ya existe:
- Campo `sale_type` en products con valores 'direct' o 'auction'
- Formulario de creación permite guardar datos de subasta en `attributes.auction`
- Campos capturados: starting_price, buy_now_price, start_date
- Página de producto muestra badge "SUBASTA" cuando `sale_type = 'auction'`

### ❌ Lo que falta:
- Tabla de pujas (bids)
- Timer visual con anti-sniping
- Sistema de pujas en tiempo real
- Página de subastas activas
- Auto-cierre automático
- Notificaciones
- Historial de pujas por usuario
- Validación de incrementos mínimos
- "Mis Pujas" en dashboard

---

## 🏗️ FASE 1: ESTRUCTURA DE BASE DE DATOS

### 1.1 Crear tabla `auction_bids`
```sql
CREATE TABLE auction_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  bid_time TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  is_auto_bid BOOLEAN DEFAULT FALSE,
  max_auto_bid DECIMAL(10,2), -- máximo para auto-bid
  is_retracted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  INDEX idx_bids_product (product_id),
  INDEX idx_bids_bidder (bidder_id),
  INDEX idx_bids_time (bid_time)
);
```

### 1.2 Agregar columnas a `products` para subastas
```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS auction_end_at TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS auction_status TEXT DEFAULT 'scheduled' 
  CHECK (auction_status IN ('scheduled', 'active', 'ended', 'cancelled'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS current_bid DECIMAL(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_bid_increment DECIMAL(10,2) DEFAULT 1000;
ALTER TABLE products ADD COLUMN IF NOT EXISTS buy_now_price DECIMAL(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS reserve_price DECIMAL(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS winner_id UUID REFERENCES auth.users(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS total_bids INTEGER DEFAULT 0;
```

### 1.3 Funciones de base de datos
- `place_bid()`: Validar y crear puja
- `extend_auction_time()`: Anti-sniping (extender tiempo en nueva puja)
- `close_auction()`: Finalizar y asignar ganador
- `get_auction_stats()`: Estadísticas de subasta

---

## 🎨 FASE 2: COMPONENTES UI

### 2.1 Componente AuctionTimer
- ✅ Ya proporcionado por el usuario
- Integrar con Supabase Realtime
- Estados: scheduled, active, warning, danger, ended

### 2.2 Componente BidForm
- Input de monto con validación
- Botón "Pujar"
- Botón "Compra ahora" (si aplica)
- Indicador de incremento mínimo
- Mostrar "Eres el máximo postor" / "Puja superada"

### 2.3 Componente BidHistory
- Lista de pujas recientes
- Auto-actualización en tiempo real
- Indicar pujas del usuario actual

### 2.4 Componente AuctionCard
- Card para lista de subastas
- Timer compacto
- Precio actual
- Número de pujas
- Estado visual

---

## 📄 FASE 3: PÁGINAS

### 3.1 `/auctions` - Lista de subastas activas
**Funcionalidades:**
- Grid/list de subastas activas
- Filtros: categoría, precio, tiempo restante
- Ordenamiento: más recientes, finaliza pronto, precio
- Búsqueda
- Cada card muestra:
  - Imagen del producto
  - Título
  - Timer con tiempo restante
  - Precio actual
  - Número de pujas
  - Botón "Ver subasta"

### 3.2 `/auctions/[id]` - Detalle de subasta
**Funcionalidades:**
- Vista completa del producto
- Timer grande (variant="full", size="lg")
- Formulario de puja
- Historial de pujas en tiempo real
- Información del vendedor
- Botón "Compra ahora"
- Estado de la subasta (activa/finalizada)

### 3.3 `/dashboard/auctions` - Mis subastas (vendedor)
**Funcionalidades:**
- Lista de subastas creadas
- Estado: programadas, activas, finalizadas
- Estadísticas: pujas, precio actual, tiempo restante
- Acciones: editar, cancelar (si no hay pujas), ver ganador

### 3.4 `/dashboard/my-bids` - Mis pujas (comprador)
**Funcionalidades:**
- Subastas en las que he pujado
- Estado: activas (ganando/perdiendo), ganadas, perdidas
- Historial completo de mis pujas
- Notificaciones de pujas superadas
- Acceso rápido para volver a pujar

---

## ⚡ FASE 4: SISTEMA EN TIEMPO REAL

### 4.1 Supabase Realtime
**Suscripciones:**
- `auction_bids`: INSERT para nuevas pujas
- `products`: UPDATE cuando cambia current_bid o auction_status
- Notificaciones cuando se actualiza el estado

### 4.2 Hook `useAuction`
```typescript
const {
  auction,
  bids,
  currentBid,
  isWinning,
  timeRemaining,
  placeBid,
  buyNow,
  loading
} = useAuction(productId);
```

### 4.3 Servicio `auctionService.ts`
- `getActiveAuctions()`
- `getAuctionById(id)`
- `getBidsForAuction(productId)`
- `placeBid(productId, amount)`
- `buyNow(productId)`
- `getUserBids(userId)`

---

## 🔄 FASE 5: LÓGICA DE NEGOCIO

### 5.1 Validaciones de puja
- Monto debe ser mayor que current_bid + min_bid_increment
- Usuario no puede pujar en sus propias subastas
- Subasta debe estar activa
- Tiempo no debe haber expirado
- Usuario autenticado

### 5.2 Anti-sniping
**Implementación:**
1. Cada nueva puja extiende `auction_end_at` en X segundos (ej: 10s)
2. Si queda menos de X segundos, se extiende
3. Máximo de extensiones para evitar subastas infinitas
4. Timer se actualiza automáticamente via Realtime

**Ejemplo:**
```sql
-- En función place_bid()
IF auction_end_at - NOW() < INTERVAL '10 seconds' THEN
  UPDATE products 
  SET auction_end_at = NOW() + INTERVAL '10 seconds'
  WHERE id = product_id;
END IF;
```

### 5.3 Auto-cierre
**Implementación con Edge Function o Trigger:**
```sql
-- Trigger que verifica cada minuto
CREATE FUNCTION check_auction_closures()
RETURNS void AS $$
BEGIN
  UPDATE products
  SET auction_status = 'ended',
      winner_id = (SELECT bidder_id FROM auction_bids 
                   WHERE product_id = products.id 
                   ORDER BY amount DESC, bid_time ASC LIMIT 1)
  WHERE auction_status = 'active'
    AND auction_end_at <= NOW();
END;
$$ LANGUAGE plpgsql;
```

### 5.4 Incremento mínimo de puja
**Lógica:**
- Si precio < 10,000: incremento 1,000
- Si precio < 50,000: incremento 5,000
- Si precio < 100,000: incremento 10,000
- Si precio >= 100,000: incremento 10% del precio actual

### 5.5 Compra ahora (Buy Now)
**Implementación:**
- Si existe `buy_now_price`, mostrar botón
- Al hacer clic, crear orden directamente
- Cerrar subasta inmediatamente
- Notificar a todos los postores

---

## 📱 FASE 6: NOTIFICACIONES

### 6.1 Tipos de notificaciones
1. **Nueva puja recibida** (vendedor)
2. **Puja superada** (comprador que perdió el primer lugar)
3. **Ganaste la subasta** (ganador)
4. **Perdiste la subasta** (postores que no ganaron)
5. **Subasta finalizada sin ganador** (si no hay pujas)
6. **Compra ahora realizada** (notificar que subasta cerró)

### 6.2 Implementación
- Guardar en tabla `notifications`
- Push notifications (si está configurado)
- Email (opcional)
- WhatsApp (ya existe endpoint)

---

## 🎯 FASE 7: FLUJOS DE USUARIO

### 7.1 Flujo de comprador
1. Ver lista de subastas activas
2. Entrar a detalle de subasta
3. Ver timer, precio actual, historial
4. Ingresar monto (con sugerencia de incremento mínimo)
5. Confirmar puja
6. Ver confirmación y actualización en tiempo real
7. Recibir notificaciones si es superado
8. Ver resultado final (ganó/perdió)

### 7.2 Flujo de vendedor
1. Crear producto como subasta
2. Configurar: precio inicial, precio compra ahora, fecha inicio/cierre
3. Ver sus subastas en dashboard
4. Monitorear pujas en tiempo real
5. Recibir notificaciones de nuevas pujas
6. Ver ganador al finalizar
7. Contactar ganador para completar venta

### 7.3 Flujo de auto-cierre
1. Sistema verifica cada minuto subastas activas
2. Si `auction_end_at <= NOW()`:
   - Marcar como 'ended'
   - Asignar ganador (mayor puja)
   - Crear notificaciones
   - Si no hay pujas, notificar al vendedor

---

## 📋 ORDEN DE IMPLEMENTACIÓN RECOMENDADO

### Sprint 1: Fundación (Fase 1)
1. ✅ Migración de tabla `auction_bids`
2. ✅ Agregar columnas a `products`
3. ✅ Funciones básicas de BD

### Sprint 2: Componentes base (Fase 2.1-2.2)
1. ✅ Integrar AuctionTimer
2. ✅ Crear BidForm
3. ✅ Crear BidHistory básico

### Sprint 3: Páginas principales (Fase 3.1-3.2)
1. ✅ `/auctions` - Lista
2. ✅ `/auctions/[id]` - Detalle
3. ✅ Servicio `auctionService.ts`

### Sprint 4: Tiempo real (Fase 4)
1. ✅ Hook `useAuction`
2. ✅ Supabase Realtime subscriptions
3. ✅ Actualización automática de UI

### Sprint 5: Lógica completa (Fase 5)
1. ✅ Validaciones de puja
2. ✅ Anti-sniping
3. ✅ Auto-cierre
4. ✅ Compra ahora

### Sprint 6: Dashboard y notificaciones (Fase 3.3-3.4, 6)
1. ✅ `/dashboard/auctions` (vendedor)
2. ✅ `/dashboard/my-bids` (comprador)
3. ✅ Sistema de notificaciones

---

## 🔧 DETALLES TÉCNICOS

### Estructura de datos Auction en `attributes`
```json
{
  "auction": {
    "starting_price": 10000,
    "buy_now_price": 50000,
    "reserve_price": 15000,
    "start_date": "2025-01-30T10:00:00Z",
    "min_bid_increment": 1000,
    "duration_minutes": 1440, // 24 horas
    "auto_extend_seconds": 10
  }
}
```

### Estados de subasta
- `scheduled`: Programada, aún no inició
- `active`: En curso, aceptando pujas
- `ended`: Finalizada, ganador asignado
- `cancelled`: Cancelada por el vendedor

### RLS Policies necesarias
- `auction_bids`: SELECT público, INSERT authenticated, UPDATE solo para retraer propia puja
- `products` con auction: UPDATE solo vendedor para cancelar

---

## ✅ CHECKLIST FINAL

- [ ] Base de datos completa
- [ ] Componente AuctionTimer integrado
- [ ] Página de subastas activas
- [ ] Página de detalle de subasta
- [ ] Sistema de pujas funcional
- [ ] Tiempo real funcionando
- [ ] Anti-sniping implementado
- [ ] Auto-cierre automático
- [ ] Compra ahora funcional
- [ ] Mis pujas (comprador)
- [ ] Mis subastas (vendedor)
- [ ] Notificaciones completas
- [ ] Validaciones robustas
- [ ] Tests básicos

---

## 📝 FLUJOS ADICIONALES IDENTIFICADOS

### Flujo: "Mis Pujas" en Dashboard de Usuario
**Ubicación:** `/dashboard/my-bids`

**Secciones necesarias:**
1. **Pujas Activas**
   - Subastas donde estoy pujando actualmente
   - Estado: "Ganando" (verde) / "Perdiendo" (amarillo) / "Última puja superada" (rojo)
   - Botón rápido "Pujar más"
   - Timer de tiempo restante

2. **Pujas Ganadas**
   - Subastas que gané
   - Información de contacto del vendedor
   - Botón "Completar compra"
   - Estado de la orden asociada

3. **Pujas Perdidas**
   - Subastas donde participé pero no gané
   - Precio final pagado
   - Opción de ver productos similares

4. **Historial Completo**
   - Todas mis pujas con fecha/hora
   - Monto de cada puja
   - Estado de la subasta al momento de pujar
   - Orden cronológico descendente

**Estadísticas:**
- Total de pujas realizadas
- Subastas ganadas vs perdidas
- Total invertido en pujas
- Promedio de puja

### Flujo: "Mis Subastas" en Dashboard de Vendedor
**Ubicación:** `/dashboard/auctions`

**Ya existe parcialmente** pero necesita mejoras:

**Secciones necesarias:**
1. **Subastas Activas**
   - Lista de subastas en curso
   - Timer en tiempo real
   - Número de pujas recibidas
   - Precio actual vs precio inicial
   - Acción rápida: "Ver detalles"

2. **Subastas Programadas**
   - Subastas que iniciarán en el futuro
   - Fecha/hora de inicio
   - Acciones: Editar, Cancelar (si no hay pujas)

3. **Subastas Finalizadas**
   - Subastas completadas
   - Información del ganador
   - Precio final
   - Estado: "Ganador asignado", "Sin pujas", "Cancelada"
   - Acción: "Contactar ganador"

4. **Estadísticas de Subastas**
   - Total de subastas creadas
   - Tasa de éxito (con pujas)
   - Precio promedio de venta
   - Incremento promedio vs precio inicial

---

## 🔄 FLUJOS DE NOTIFICACIONES DETALLADOS

### Notificaciones para Compradores (Postores)

1. **"Nueva puja superada"** ⚠️
   - Cuando alguien puja más que tú
   - Mensaje: "Tu puja de Gs. X fue superada. Puja ahora para volver a ganar"
   - Botón: "Ver subasta" → `/auctions/[id]`
   - Urgencia: Alta (si es la última puja)

2. **"Ganaste la subasta"** 🎉
   - Cuando la subasta finaliza y eres el ganador
   - Mensaje: "¡Felicidades! Ganaste la subasta de [Producto] por Gs. X"
   - Botón: "Ver detalles" → `/auctions/[id]`
   - Urgencia: Alta

3. **"Subasta finalizada - No ganaste"** 😔
   - Cuando la subasta termina y no eres ganador
   - Mensaje: "La subasta de [Producto] finalizó. Precio final: Gs. X"
   - Botón: "Ver otros productos" → `/products`
   - Urgencia: Baja

4. **"Compra ahora realizada"** ℹ️
   - Cuando alguien usa "Compra ahora"
   - Mensaje: "La subasta de [Producto] fue comprada directamente"
   - Urgencia: Media

### Notificaciones para Vendedores

1. **"Nueva puja recibida"** 🔔
   - Cada vez que alguien puja
   - Mensaje: "Nueva puja en [Producto]: Gs. X (Total: Y pujas)"
   - Botón: "Ver subasta" → `/dashboard/auctions/[id]`
   - Urgencia: Media

2. **"Subasta finalizada con ganador"** ✅
   - Cuando la subasta termina con ganador
   - Mensaje: "Subasta finalizada. Ganador: [Nombre], Precio: Gs. X"
   - Botón: "Contactar ganador"
   - Urgencia: Alta

3. **"Subasta finalizada sin ganador"** ⚠️
   - Cuando termina sin pujas
   - Mensaje: "La subasta de [Producto] finalizó sin pujas. ¿Quieres relanzarla?"
   - Botón: "Relanzar subasta"
   - Urgencia: Media

4. **"Compra ahora realizada"** 💰
   - Cuando alguien usa "Compra ahora"
   - Mensaje: "Alguien compró [Producto] directamente por Gs. X"
   - Botón: "Ver orden"
   - Urgencia: Alta

---

## 🎯 PRIORIZACIÓN REVISADA

### CRÍTICO - Implementar Primero (Sprint 1-2)
1. ✅ Migración BD: tabla `auction_bids`
2. ✅ Columnas en `products` para subastas
3. ✅ Componente AuctionTimer
4. ✅ Página `/auctions` - Lista básica
5. ✅ Página `/auctions/[id]` - Detalle básico
6. ✅ Función `place_bid()` en BD

### IMPORTANTE - Segundo (Sprint 3-4)
7. ✅ Sistema de pujas en tiempo real
8. ✅ Anti-sniping (extensión de tiempo)
9. ✅ Auto-cierre automático
10. ✅ Validaciones de incremento mínimo
11. ✅ `/dashboard/my-bids` - Mis pujas

### MEDIO - Tercero (Sprint 5-6)
12. ✅ Compra ahora funcional
13. ✅ Sistema completo de notificaciones
14. ✅ `/dashboard/auctions` mejorado (vendedor)
15. ✅ Historial detallado de pujas
16. ✅ Estadísticas de subastas

---

## 🚀 ESTIMACIÓN DE TIEMPO

- **Fase 1 (BD):** 2-3 horas
- **Fase 2 (Componentes):** 3-4 horas
- **Fase 3 (Páginas):** 4-5 horas
- **Fase 4 (Tiempo real):** 3-4 horas
- **Fase 5 (Lógica):** 4-5 horas
- **Fase 6 (Notificaciones):** 2-3 horas
- **Fase 7 (Flujos):** 3-4 horas

**Total estimado:** 21-28 horas de desarrollo

---

**¿Empezamos con la Fase 1 (Base de datos)?**


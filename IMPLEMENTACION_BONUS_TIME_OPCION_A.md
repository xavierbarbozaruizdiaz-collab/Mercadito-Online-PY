# Implementación: Bonus Time / Anti-Sniping (Opción A Mejorada)

**Fecha**: 2024  
**Versión**: 1.0.0  
**Objetivo**: Documentar la implementación mejorada del sistema de bonus time

---

## 📋 Sección 1: Cómo Funciona el Bonus Time en Lenguaje Humano

### Concepto General

El **bonus time** (también llamado "anti-sniping") es un mecanismo que **extiende automáticamente el tiempo de una subasta** cuando alguien puja en los últimos segundos antes de que termine. Esto previene que usuarios hagan "snipes" (pujas de último segundo) que impiden que otros usuarios puedan responder.

### Activación del Bonus Time

**Cuándo se activa**:
- Se activa **automáticamente** cuando alguien puja y quedan **menos de X segundos** para que termine la subasta
- El valor de X es configurable y se llama **"ventana de activación"** (`bonus_window_seconds`)
- Por defecto: **10 segundos**

**Ejemplo**:
- Subasta termina en 15 segundos → alguien puja → **NO se activa** (15 > 10)
- Subasta termina en 8 segundos → alguien puja → **SÍ se activa** (8 < 10)
- Subasta termina en 3 segundos → alguien puja → **SÍ se activa** (3 < 10)

### Extensión del Tiempo

**Cuánto se extiende**:
- Cada vez que se activa, se extiende **exactamente Y segundos** desde el momento actual (`NOW()`)
- El valor de Y es configurable y se llama **"tiempo de extensión"** (`bonus_extend_seconds`)
- Por defecto: **10 segundos**

**Comportamiento importante**:
- Si quedan 3 segundos y alguien puja, la subasta se extiende a **10 segundos** (no 3 + 10 = 13)
- La nueva fecha de fin es: `NOW() + bonus_extend_seconds`
- Esto significa que siempre se extiende a un tiempo fijo desde el momento actual

**Ejemplo**:
- Faltan 3 segundos → alguien puja → nueva fecha: `NOW() + 10s` → quedan **10 segundos**
- Faltan 1 segundo → alguien puja → nueva fecha: `NOW() + 10s` → quedan **10 segundos**

### Límites del Sistema

El sistema tiene **2 límites** para prevenir extensiones infinitas:

1. **Límite de Duración Máxima Total**:
   - Configuración: `auction_max_duration_hours` (default: 24 horas)
   - Si la subasta ya duró más que este límite desde `auction_start_at`, **NO se extiende más**
   - Ejemplo: Si la subasta empezó hace 25 horas y alguien puja en los últimos segundos, **NO se extiende**

2. **Límite de Número Máximo de Extensiones**:
   - Configuración: `bonus_max_extensions` (default: 50 extensiones)
   - Se cuenta cuántas veces se ha extendido exitosamente
   - Si ya se alcanzaron 50 extensiones, **NO se extiende más**, incluso si quedan pocos segundos

### Flujo Completo

1. Usuario puja en los últimos X segundos
2. Sistema verifica si se puede aplicar bonus (límites)
3. Si se puede, extiende a `NOW() + Y segundos`
4. Actualiza `auction_end_at` en la base de datos
5. Registra evento `TIMER_EXTENDED`
6. Frontend recibe notificación y actualiza el timer

---

## 📋 Sección 2: Parámetros Usados y Dónde se Configuran

### Configuración Centralizada

**Tabla**: `public.auction_bonus_config`

Esta tabla almacena la configuración global de bonus time. Tiene un registro con `id = 'default'` que contiene los valores por defecto.

**Columnas**:
- `bonus_window_seconds` (INTEGER, default: 10) - Ventana de activación
- `bonus_extend_seconds` (INTEGER, default: 10) - Tiempo de extensión
- `bonus_max_extensions` (INTEGER, default: 50) - Máximo de extensiones

**Función auxiliar**: `get_bonus_time_config()`
- Retorna la configuración global
- Si no existe, retorna valores por defecto (10, 10, 50)

### Configuración por Subasta (Compatibilidad)

**Columna**: `products.auto_extend_seconds` (INTEGER, default: 10)

Esta columna se mantiene por **compatibilidad con subastas existentes**. Si una subasta tiene `auto_extend_seconds` definido, se usa ese valor tanto para la ventana de activación como para el tiempo de extensión.

**Prioridad**:
1. Si `auto_extend_seconds` está definido → usar ese valor (ventana y extensión)
2. Si no está definido → usar valores de `auction_bonus_config`

### Límites Adicionales

**Columnas en `products`**:
- `auction_max_duration_hours` (INTEGER, default: 24) - Duración máxima total
- `auction_start_at` (TIMESTAMPTZ) - Fecha de inicio (para calcular duración)

### Cómo Cambiar los Valores

#### Cambiar Configuración Global

```sql
-- Actualizar configuración global
UPDATE public.auction_bonus_config
SET 
  bonus_window_seconds = 30,  -- Activar en últimos 30 segundos
  bonus_extend_seconds = 30,  -- Extender 30 segundos
  bonus_max_extensions = 100, -- Máximo 100 extensiones
  updated_at = NOW()
WHERE id = 'default';
```

#### Cambiar Configuración de una Subasta Específica

```sql
-- Actualizar subasta específica
UPDATE public.products
SET auto_extend_seconds = 20  -- Usar 20 segundos para ventana y extensión
WHERE id = 'subasta-id';
```

**Nota**: Si cambias `auto_extend_seconds`, afecta tanto la ventana de activación como el tiempo de extensión (comportamiento de compatibilidad).

---

## 📋 Sección 3: Diagrama del Flujo cuando se Aplica Bonus Time

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIO PUJA                             │
│              (POST /api/auctions/[id]/bid)                  │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  place_bid() en PostgreSQL                                  │
│  - Adquiere LOCK (SELECT FOR UPDATE)                        │
│  - Valida subasta activa y no expirada                      │
│  - Valida monto de puja                                     │
│  - Inserta puja en auction_bids                             │
│  - Actualiza current_bid y winner_id                        │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  OBTENER CONFIGURACIÓN DE BONUS TIME                        │
│  - get_bonus_time_config() → valores globales               │
│  - O verificar auto_extend_seconds de la subasta            │
│  - bonus_window_seconds = X (default: 10)                  │
│  - bonus_extend_seconds = Y (default: 10)                   │
│  - bonus_max_extensions = Z (default: 50)                    │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  PASO 1: ¿QUEDAN MENOS DE bonus_window_seconds?             │
│  (ej: quedan 5s, bonus_window_seconds = 10)                 │
└────────────────────┬──────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼ SÍ                   ▼ NO
┌──────────────────┐   ┌──────────────────┐
│ PASO 2: Verificar│   │ NO SE APLICA     │
│ límites          │   │ BONUS TIME       │
│                  │   │ Retorna resultado│
│ - ¿Ya pasó       │   │ sin bonus        │
│   duración       │   └──────────────────┘
│   máxima?        │
│ - ¿Ya se alcanzó │
│   máximo         │
│   extensiones?   │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
   SÍ        NO
    │         │
    ▼         ▼
┌───────┐ ┌──────────────────────┐
│ NO    │ │ PASO 3: CALCULAR      │
│ APLICA│ │ NUEVO END_TIME        │
│ BONUS │ │                      │
│ (regis│ │ new_end_time =        │
│ tra   │ │   NOW() +             │
│ evento│ │   bonus_extend_seconds│
│ límite│ │                      │
│ alcanz│ │                      │
│ ado)  │ │ PASO 4: ACTUALIZAR DB │
└───────┘ │ - UPDATE products     │
          │   SET auction_end_at  │
          │ - INSERT evento        │
          │   TIMER_EXTENDED      │
          └──────────┬─────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │ RETORNAR RESULTADO    │
          │ - bonus_applied: true │
          │ - bonus_new_end_time  │
          │ - bonus_extension_   │
          │   seconds             │
          └──────────┬────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │ /bid endpoint         │
          │ - Incluye info bonus  │
          │   en respuesta JSON  │
          └──────────┬────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │ Frontend (useAuction) │
          │ - Detecta bonus_applied│
          │ - Actualiza auction_  │
          │   end_at inmediatamente│
          │ - Timer se recalcula  │
          │ - Muestra notificación│
          └──────────────────────┘
```

---

## 📋 Sección 4: Integración con Otros Componentes

### 4.1 Integración con `place_bid()`

**Ubicación**: `supabase/migrations/20250202000011_centralize_bonus_time_config.sql`

**Cómo funciona**:
1. Al inicio de la función, obtiene configuración de bonus time
2. Después de insertar la puja, verifica si se debe aplicar bonus
3. Si se aplica, actualiza `auction_end_at` y registra evento
4. Retorna información de bonus en el JSONB de respuesta

**Variables clave**:
- `v_bonus_window_seconds` - Ventana de activación
- `v_bonus_extend_seconds` - Tiempo de extensión
- `v_bonus_max_extensions` - Máximo de extensiones
- `v_should_apply_bonus` - Flag si se debe aplicar
- `v_bonus_applied` - Flag si se aplicó exitosamente

### 4.2 Integración con `/api/auctions/[id]/bid`

**Ubicación**: `src/app/api/auctions/[id]/bid/route.ts`

**Cómo funciona**:
1. Llama a `place_bid()` dentro de un lock Redis
2. Recibe respuesta con información de bonus time
3. Incluye `bonus_applied`, `bonus_new_end_time`, `bonus_extension_seconds` en la respuesta JSON
4. Logging cuando se aplica bonus time

**Campos agregados a `BidResponse`**:
```typescript
interface BidResponse {
  // ... campos existentes
  bonus_applied?: boolean;
  bonus_new_end_time?: string;
  bonus_extension_seconds?: number;
}
```

### 4.3 Integración con `/api/auctions/[id]/current`

**Ubicación**: `src/app/api/auctions/[id]/current/route.ts`

**Cómo funciona**:
- Retorna `auction_end_at` actualizado desde la base de datos
- Si se aplicó bonus time, el `auction_end_at` ya está actualizado
- El frontend puede usar este endpoint para sincronizar el tiempo

**Sin cambios necesarios**: El endpoint ya retorna `auction_end_at` actualizado.

### 4.4 Integración con Locks Redis

**Ubicación**: `src/lib/redis/locks.ts`

**Cómo funciona**:
- El endpoint `/bid` adquiere un lock antes de llamar a `place_bid()`
- Esto garantiza que solo una puja se procesa a la vez
- El bonus time se aplica dentro de la misma transacción, evitando condiciones de carrera

**Sin cambios necesarios**: Los locks ya protegen el proceso completo.

### 4.5 Integración con `close_expired_auctions()`

**Ubicación**: `supabase/migrations/20250202000009_fix_close_expired_race_condition_final.sql`

**Cómo funciona**:
- La función verifica `auction_end_at <= NOW()` para cerrar subastas
- Si el bonus time extendió `auction_end_at`, la función respeta la nueva fecha
- Usa `SELECT FOR UPDATE` para prevenir condiciones de carrera con `place_bid()`

**Sin cambios necesarios**: La función ya maneja correctamente las extensiones.

### 4.6 Integración con Frontend

**Hook**: `src/lib/hooks/useAuction.ts`

**Cómo funciona**:
1. Cuando `placeBid()` retorna `bonus_applied = true`, actualiza `auction_end_at` inmediatamente
2. Esto evita que el timer muestre tiempo incorrecto mientras se recarga
3. Luego recarga datos completos para sincronizar todo

**Componente**: `src/components/auction/AuctionTimer.tsx`

**Cómo funciona**:
- Usa `getSyncedNow()` para calcular tiempo restante
- Reacciona automáticamente cuando `auction_end_at` cambia
- Muestra animación cuando se detecta nueva puja (prop `lastBidAtMs`)

**Página**: `src/app/auctions/[id]/page.tsx`

**Cómo funciona**:
- Escucha eventos `TIMER_EXTENDED` de Supabase Realtime
- Muestra notificación cuando se extiende el tiempo
- Mensaje mejorado: "⏰ Bonus time activado: +Xs"

---

## 📋 Sección 5: Cómo Cambiar los Valores sin Romper Nada

### Cambiar Ventana de Activación y Tiempo de Extensión

#### Opción 1: Cambiar Configuración Global (Recomendado)

```sql
-- Cambiar a 30 segundos de ventana y 30 segundos de extensión
UPDATE public.auction_bonus_config
SET 
  bonus_window_seconds = 30,
  bonus_extend_seconds = 30,
  updated_at = NOW()
WHERE id = 'default';
```

**Efecto**: Todas las subastas nuevas usarán estos valores (a menos que tengan `auto_extend_seconds` configurado).

#### Opción 2: Cambiar Subasta Específica

```sql
-- Cambiar subasta específica a 20 segundos
UPDATE public.products
SET auto_extend_seconds = 20
WHERE id = 'subasta-id';
```

**Efecto**: Solo esa subasta usará 20 segundos (tanto para ventana como extensión).

### Cambiar Máximo de Extensiones

```sql
-- Cambiar máximo de extensiones a 100
UPDATE public.auction_bonus_config
SET 
  bonus_max_extensions = 100,
  updated_at = NOW()
WHERE id = 'default';
```

**Efecto**: Todas las subastas podrán extenderse hasta 100 veces (antes de alcanzar límite de duración máxima).

### Cambiar Duración Máxima Total

```sql
-- Cambiar duración máxima a 48 horas
UPDATE public.products
SET auction_max_duration_hours = 48
WHERE id = 'subasta-id';
```

**Efecto**: Esa subasta podrá durar hasta 48 horas en total (incluyendo todas las extensiones).

### Verificar Cambios

```sql
-- Ver configuración actual
SELECT * FROM public.auction_bonus_config WHERE id = 'default';

-- Ver configuración de una subasta
SELECT id, auto_extend_seconds, auction_max_duration_hours 
FROM public.products 
WHERE id = 'subasta-id';
```

### Precauciones

1. **No cambiar valores mientras hay subastas activas**:
   - Los cambios afectan subastas que ya están en curso
   - Mejor cambiar antes de crear nuevas subastas

2. **Mantener valores razonables**:
   - Ventana muy grande (ej: 60s) puede confundir a usuarios
   - Extensión muy grande (ej: 60s) puede hacer que subastas duren mucho
   - Máximo de extensiones muy alto puede permitir abusos

3. **Probar en staging primero**:
   - Verificar que los cambios funcionan como esperado
   - Monitorear comportamiento de subastas de prueba

---

## 📋 Sección 6: Estructura de Archivos

### Migraciones SQL

1. **`supabase/migrations/20250202000011_centralize_bonus_time_config.sql`** (nuevo)
   - Crea tabla `auction_bonus_config`
   - Crea función `get_bonus_time_config()`
   - Actualiza `place_bid()` con configuración centralizada

### Backend

1. **`src/app/api/auctions/[id]/bid/route.ts`**
   - Incluye información de bonus time en respuesta
   - Logging cuando se aplica bonus

2. **`src/lib/services/auctionService.ts`**
   - Tipo de retorno de `placeBid()` incluye campos de bonus
   - Propaga información de bonus al frontend

### Frontend

1. **`src/lib/hooks/useAuction.ts`**
   - Detecta `bonus_applied` en respuesta
   - Actualiza `auction_end_at` inmediatamente
   - Recarga datos completos después

2. **`src/components/auction/AuctionTimer.tsx`**
   - Reacciona automáticamente a cambios en `auction_end_at`
   - Usa tiempo sincronizado (`getSyncedNow()`)

3. **`src/app/auctions/[id]/page.tsx`**
   - Muestra notificación mejorada cuando se extiende tiempo
   - Maneja eventos `TIMER_EXTENDED` de Realtime

---

## 📋 Sección 7: Ejemplos de Uso

### Ejemplo 1: Subasta con Bonus Time Estándar

**Configuración**:
- `bonus_window_seconds = 10`
- `bonus_extend_seconds = 10`
- `bonus_max_extensions = 50`

**Escenario**:
- Faltan 5 segundos → Usuario A puja → Se extiende a 10 segundos
- Faltan 8 segundos → Usuario B puja → Se extiende a 10 segundos
- ... (hasta 50 extensiones o duración máxima)

### Ejemplo 2: Subasta con Configuración Personalizada

**Configuración**:
- `auto_extend_seconds = 20` (en la subasta)
- `bonus_max_extensions = 50` (global)

**Escenario**:
- Faltan 15 segundos → Usuario A puja → NO se extiende (15 > 20)
- Faltan 10 segundos → Usuario B puja → SÍ se extiende (10 < 20) → nueva fecha: `NOW() + 20s`

### Ejemplo 3: Subasta que Alcanza Límite de Extensiones

**Configuración**:
- `bonus_max_extensions = 50`

**Escenario**:
- Ya se han hecho 50 extensiones exitosas
- Faltan 3 segundos → Usuario A puja → NO se extiende (límite alcanzado)
- La subasta termina en 3 segundos

---

## 📋 Sección 8: Troubleshooting

### Problema: Bonus Time No Se Aplica

**Posibles causas**:
1. La subasta tiene `auto_extend_seconds = 0` o NULL
2. Ya se alcanzó el máximo de extensiones
3. Ya se alcanzó la duración máxima total
4. La puja no cae en la ventana de activación

**Solución**:
```sql
-- Verificar configuración
SELECT 
  p.id,
  p.auto_extend_seconds,
  p.auction_max_duration_hours,
  (SELECT COUNT(*) FROM auction_events 
   WHERE product_id = p.id 
   AND event_type = 'TIMER_EXTENDED' 
   AND event_data->>'reason' IS NULL) as extension_count
FROM products p
WHERE p.id = 'subasta-id';
```

### Problema: Bonus Time Se Aplica Demasiado

**Posibles causas**:
1. Ventana de activación muy grande
2. Máximo de extensiones muy alto
3. Sin límite de duración máxima

**Solución**:
- Reducir `bonus_window_seconds`
- Reducir `bonus_max_extensions`
- Configurar `auction_max_duration_hours`

### Problema: Frontend No Muestra Tiempo Actualizado

**Posibles causas**:
1. El hook `useAuction` no está actualizando `auction_end_at`
2. El timer no está reaccionando a cambios

**Solución**:
- Verificar que `bonus_applied` está en la respuesta
- Verificar que `bonus_new_end_time` se está usando para actualizar estado
- Verificar que `AuctionTimer` recibe `endAtMs` actualizado

---

**Documentación completada** ✅  
**Versión**: 1.0.0  
**Fecha**: 2024








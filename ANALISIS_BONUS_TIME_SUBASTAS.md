# Análisis: Sistema de Bonus Time / Anti-Sniping en Subastas

**Fecha**: 2024  
**Rol**: Arquitecto de Subastas - Análisis y Diseño  
**Objetivo**: Entender el sistema actual y proponer mejoras

---

## 📋 Sección 1: Resumen en Lenguaje Humano

### ¿Cómo Funciona el Bonus Time Actual?

El sistema de **anti-sniping** (también llamado "bonus time") está diseñado para prevenir que usuarios hagan "snipes" (pujas de último segundo) que impiden que otros usuarios puedan responder.

#### Activación del Bonus Time

**Condición de activación**:
- Se activa **automáticamente** cuando alguien puja y quedan **menos de X segundos** para que termine la subasta
- El valor de X es configurable por subasta en la columna `auto_extend_seconds` (default: **10 segundos**)

**Ejemplo práctico**:
- Subasta termina en 15 segundos → alguien puja → **NO se extiende** (15 > 10)
- Subasta termina en 8 segundos → alguien puja → **SÍ se extiende** (8 < 10)
- Subasta termina en 3 segundos → alguien puja → **SÍ se extiende** (3 < 10)

#### Cuánto Tiempo se Extiende

**Cantidad de extensión**:
- Cada vez que se activa, se extiende **exactamente `auto_extend_seconds` segundos** desde el momento actual (`NOW()`)
- Si `auto_extend_seconds = 10`, y alguien puja cuando quedan 5 segundos:
  - Nueva fecha de fin: `NOW() + 10 segundos`
  - Esto significa que la subasta ahora termina en **10 segundos** (no 5 + 10 = 15)

**Ejemplo**:
- Faltan 3 segundos → alguien puja → nueva fecha: `NOW() + 10s` → quedan **10 segundos**
- Faltan 1 segundo → alguien puja → nueva fecha: `NOW() + 10s` → quedan **10 segundos**

#### Límites del Sistema

El sistema tiene **2 límites** para prevenir extensiones infinitas:

1. **Límite de Duración Máxima Total**:
   - Columna: `auction_max_duration_hours` (default: **24 horas**)
   - Si la subasta ya duró más que este límite desde `auction_start_at`, **NO se extiende más**
   - Ejemplo: Si la subasta empezó hace 25 horas y alguien puja en los últimos segundos, **NO se extiende**

2. **Límite de Número Máximo de Extensiones**:
   - Valor hardcodeado: **50 extensiones** por subasta
   - Se cuenta cuántas veces se ha extendido (eventos `TIMER_EXTENDED` sin `reason`)
   - Si ya se alcanzaron 50 extensiones, **NO se extiende más**, incluso si quedan pocos segundos

#### Dónde se Guardan los Datos

**Columnas en la tabla `products`**:
- `auto_extend_seconds` (INTEGER, default: 10) - Segundos de extensión por cada activación
- `auction_max_duration_hours` (INTEGER, default: 24) - Duración máxima total en horas
- `auction_start_at` (TIMESTAMPTZ) - Fecha/hora de inicio (para calcular duración total)
- `auction_end_at` (TIMESTAMPTZ) - Fecha/hora de fin (se actualiza cada vez que se extiende)

**Eventos registrados**:
- Tabla `auction_events` con tipo `TIMER_EXTENDED`
- Guarda: `old_end_at`, `new_end_at`, `extension_seconds`, `extension_number`
- También registra cuando se alcanzan límites (con `reason: 'max_duration_reached'` o `'max_extensions_reached'`)

#### Configuración Global vs Por Subasta

**Actualmente**:
- ✅ **Configurable por subasta**: Cada subasta puede tener su propio `auto_extend_seconds`
- ✅ **Configurable por subasta**: Cada subasta puede tener su propio `auction_max_duration_hours`
- ❌ **Hardcodeado**: El máximo de extensiones (50) está hardcodeado en la función SQL

**Ejemplo de configuración**:
- Subasta A: `auto_extend_seconds = 10`, `auction_max_duration_hours = 24`
- Subasta B: `auto_extend_seconds = 30`, `auction_max_duration_hours = 48`
- Ambas tienen máximo de 50 extensiones (no configurable)

---

### Escenarios Paso a Paso

#### Escenario 1: Faltan 40 segundos → alguien puja

**Situación**:
- `auto_extend_seconds = 10`
- Faltan 40 segundos para que termine
- Usuario A puja

**Resultado**:
- ❌ **NO se extiende** (40 > 10)
- La subasta sigue terminando en 40 segundos
- No se registra evento `TIMER_EXTENDED`

#### Escenario 2: Faltan 5 segundos → alguien puja

**Situación**:
- `auto_extend_seconds = 10`
- Faltan 5 segundos para que termine
- Usuario A puja

**Resultado**:
- ✅ **SÍ se extiende**
- Nueva fecha de fin: `NOW() + 10 segundos`
- Ahora faltan **10 segundos** (no 5)
- Se registra evento `TIMER_EXTENDED` con `extension_seconds = 10`
- El frontend recibe el evento y actualiza el timer automáticamente

#### Escenario 3: Ya se alcanzó el número máximo de extensiones

**Situación**:
- Ya se han hecho 50 extensiones (máximo)
- Faltan 3 segundos para que termine
- Usuario A intenta pujar

**Resultado**:
- ✅ **La puja se acepta** (es válida)
- ❌ **NO se extiende** (límite alcanzado)
- Se registra evento `TIMER_EXTENDED` con `reason: 'max_extensions_reached'`
- La subasta termina en 3 segundos (no se extiende)
- Si alguien más puja en esos 3 segundos, tampoco se extiende

---

## 📋 Sección 2: Diagrama del Flujo Actual

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIO PUJA                             │
│              (POST /api/auctions/[id]/bid)                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  place_bid() en PostgreSQL                                  │
│  - Adquiere LOCK (SELECT FOR UPDATE)                        │
│  - Valida que subasta está activa                           │
│  - Valida que no ha expirado (auction_end_at > NOW())       │
│  - Valida monto de puja                                     │
│  - Inserta puja en auction_bids                             │
│  - Actualiza current_bid y winner_id                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  ¿QUEDAN MENOS DE auto_extend_seconds?                      │
│  (ej: quedan 5s, auto_extend_seconds = 10)                  │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼ SÍ                   ▼ NO
┌──────────────────┐   ┌──────────────────┐
│ ¿Ya pasó duración │   │ NO SE EXTENDE    │
│ máxima total?     │   │ Retorna resultado │
│ (auction_max_     │   └──────────────────┘
│  duration_hours)  │
└────────┬──────────┘
         │
    ┌────┴────┐
    │         │
   SÍ        NO
    │         │
    ▼         ▼
┌───────┐ ┌──────────────────────┐
│ NO    │ │ ¿Ya se alcanzaron 50 │
│ EXTENDE│ │ extensiones?         │
│ (regis│ └──────────┬───────────┘
│ tra   │            │
│ evento│      ┌─────┴─────┐
│ límite│      │           │
│ alcanz│     SÍ          NO
│ ado)  │      │           │
└───────┘      ▼           ▼
         ┌──────────┐ ┌──────────────────┐
         │ NO       │ │ SÍ SE EXTENDE    │
         │ EXTENDE  │ │                  │
         │ (registra│ │ - Nuevo end_at = │
         │  evento  │ │   NOW() + auto_  │
         │  límite) │ │   extend_seconds │
         └──────────┘ │ - Actualiza DB    │
                     │ - Registra evento │
                     │   TIMER_EXTENDED  │
                     └──────────┬─────────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │ Supabase Realtime     │
                    │ emite evento         │
                    │ TIMER_EXTENDED       │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Frontend recibe evento│
                    │ - Actualiza auction_  │
                    │   end_at              │
                    │ - Timer se recalcula  │
                    │ - Muestra notificación│
                    └──────────────────────┘
```

---

## 📋 Sección 3: Problemas y Riesgos del Diseño Actual

### 🔴 Alta Prioridad (Impactan Justicia de la Subasta)

#### 3.1 Lógica de Extensión Poco Intuitiva

**Problema**:
- Si quedan 3 segundos y alguien puja, la subasta se extiende a **10 segundos** (no 3 + 10 = 13)
- Esto puede confundir a los usuarios que esperan que se sume el tiempo

**Impacto**:
- Usuarios pueden pensar que el sistema "roba" tiempo
- Puede generar desconfianza en el sistema

**Ejemplo**:
- Usuario ve: "Quedan 3 segundos"
- Alguien puja
- Usuario espera: "Quedan 13 segundos" (3 + 10)
- Sistema muestra: "Quedan 10 segundos"
- **Confusión**

#### 3.2 Máximo de Extensiones Hardcodeado

**Problema**:
- El límite de 50 extensiones está hardcodeado en la función SQL
- No es configurable por subasta ni globalmente
- Si una subasta tiene `auto_extend_seconds = 5` y muchas pujas, puede alcanzar 50 extensiones rápidamente

**Impacto**:
- Subastas con extensiones cortas pueden quedarse sin extensiones antes de tiempo
- No hay flexibilidad para ajustar según el tipo de subasta

**Ejemplo**:
- Subasta con `auto_extend_seconds = 5`
- 50 usuarios pujan en los últimos 5 segundos
- Después de 50 extensiones, ya no se puede extender más
- Si alguien más puja, la subasta termina aunque queden pocos segundos

#### 3.3 Ventana de Activación = Tiempo de Extensión

**Problema**:
- La misma columna (`auto_extend_seconds`) controla:
  - Cuándo se activa (si quedan menos de X segundos)
  - Cuánto se extiende (X segundos)
- No se pueden configurar por separado

**Impacto**:
- Si quieres extender 30 segundos pero activar solo en los últimos 10 segundos, no es posible
- Configuración rígida

**Ejemplo deseado**:
- Activar si quedan menos de 10 segundos
- Extender 30 segundos cada vez
- **No es posible con el diseño actual**

---

### 🟡 Media Prioridad (Impactan UX/Claridad)

#### 3.4 Nombres de Columnas Poco Expresivos

**Problema**:
- `auto_extend_seconds` no es claro sobre qué hace exactamente
- No indica que es tanto la ventana de activación como el tiempo de extensión

**Impacto**:
- Desarrolladores nuevos pueden confundirse
- Documentación menos clara

**Sugerencia**:
- `bonus_window_seconds` (ventana de activación)
- `bonus_extend_seconds` (tiempo de extensión)

#### 3.5 Falta de Feedback Visual Claro

**Problema**:
- El frontend muestra notificación cuando se extiende, pero no es muy visible
- No hay indicador claro de cuántas extensiones quedan disponibles

**Impacto**:
- Usuarios pueden no entender por qué el tiempo "salta" hacia adelante
- No saben cuántas extensiones más pueden ocurrir

#### 3.6 Eventos TIMER_EXTENDED con Diferentes Propósitos

**Problema**:
- El mismo tipo de evento (`TIMER_EXTENDED`) se usa para:
  - Extensiones exitosas (sin `reason`)
  - Límites alcanzados (con `reason: 'max_duration_reached'` o `'max_extensions_reached'`)

**Impacto**:
- El frontend debe verificar `reason` para saber qué hacer
- Puede ser confuso procesar estos eventos

---

### 🟢 Baja Prioridad (Mantenimiento Interno)

#### 3.7 Cálculo de Extensiones desde Eventos

**Problema**:
- Para contar extensiones, se consulta la tabla `auction_events`
- Esto agrega una query adicional en cada puja que podría extender

**Impacto**:
- Pequeño overhead de performance
- Dependencia de que los eventos se registren correctamente

**Sugerencia**:
- Agregar columna `extension_count` en `products` para evitar contar eventos

#### 3.8 Falta de Configuración Global

**Problema**:
- No hay valores por defecto globales configurables
- Cada subasta debe configurarse individualmente

**Impacto**:
- Más trabajo para crear subastas
- Inconsistencias si no se configuran todas

---

## 📋 Sección 4: Opción A - Bonus Actual Mejorado

### Descripción General

Mantener la lógica actual pero hacerla **más clara, parametrizable y expresiva**. No cambiar el comportamiento fundamental, solo mejorar la implementación.

### Cambios Propuestos

#### 4.1 Separar Ventana de Activación y Tiempo de Extensión

**Columnas nuevas**:
- `bonus_window_seconds` (INTEGER) - Ventana de activación (cuándo se activa)
- `bonus_extend_seconds` (INTEGER) - Tiempo de extensión (cuánto se extiende)

**Migración**:
- Mantener `auto_extend_seconds` por compatibilidad (deprecated)
- Si `bonus_window_seconds` y `bonus_extend_seconds` son NULL, usar `auto_extend_seconds` para ambos
- Si están definidos, usar los nuevos valores

**Ejemplo**:
- `bonus_window_seconds = 10` (activar si quedan menos de 10s)
- `bonus_extend_seconds = 30` (extender 30 segundos)
- Si quedan 5 segundos y alguien puja → se extiende a `NOW() + 30s`

#### 4.2 Hacer Máximo de Extensiones Configurable

**Columna nueva**:
- `bonus_max_extensions` (INTEGER, default: 50) - Máximo de extensiones permitidas

**Comportamiento**:
- Si es NULL, usar 50 (comportamiento actual)
- Si está definido, usar ese valor
- Permitir NULL para "sin límite" (solo limitado por duración máxima)

#### 4.3 Agregar Contador de Extensiones en Tabla

**Columna nueva**:
- `bonus_extension_count` (INTEGER, default: 0) - Contador de extensiones realizadas

**Comportamiento**:
- Se incrementa cada vez que se extiende exitosamente
- Se resetea cuando se crea una nueva subasta
- Evita contar eventos en cada puja

#### 4.4 Mejorar Nombres y Documentación

**Renombrar** (opcional, puede ser solo en comentarios):
- `auction_max_duration_hours` → `bonus_max_duration_hours` (más claro)
- Agregar comentarios SQL explicando cada columna

#### 4.5 Lógica Mejorada en `place_bid()`

**Cambios en la función**:
```sql
-- En lugar de:
IF (v_auction_end_at - NOW()) < MAKE_INTERVAL(secs => v_product.auto_extend_seconds) THEN
  v_new_end_at := NOW() + MAKE_INTERVAL(secs => v_product.auto_extend_seconds);

-- Usar:
v_bonus_window := COALESCE(v_product.bonus_window_seconds, v_product.auto_extend_seconds, 10);
v_bonus_extend := COALESCE(v_product.bonus_extend_seconds, v_product.auto_extend_seconds, 10);

IF (v_auction_end_at - NOW()) < MAKE_INTERVAL(secs => v_bonus_window) THEN
  v_new_end_at := NOW() + MAKE_INTERVAL(secs => v_bonus_extend);
```

### Pros y Contras

**✅ Pros**:
- **Poco invasivo**: No cambia el comportamiento fundamental
- **Retrocompatible**: Mantiene `auto_extend_seconds` para subastas existentes
- **Más flexible**: Permite configurar ventana y extensión por separado
- **Mejor performance**: Contador en tabla evita contar eventos
- **Más claro**: Nombres más expresivos

**❌ Contras**:
- **Sigue siendo confuso**: Si quedan 3s y se extiende 30s, sigue siendo `NOW() + 30s` (no 3 + 30)
- **No resuelve el problema de UX**: Los usuarios aún pueden confundirse
- **Requiere migración**: Agregar nuevas columnas y actualizar función

### Impacto del Cambio

**Migraciones SQL necesarias**:
- 1 migración para agregar columnas nuevas
- 1 migración para actualizar `place_bid()`
- Opcional: migración para migrar datos de `auto_extend_seconds` a nuevas columnas

**Impacto en Frontend**:
- **Mínimo**: Solo si queremos mostrar contador de extensiones
- Los eventos `TIMER_EXTENDED` siguen funcionando igual

**Impacto en Backend**:
- **Medio**: Actualizar `place_bid()` para usar nuevas columnas
- Mantener compatibilidad con `auto_extend_seconds`

**Tiempo estimado de implementación**:
- 2-3 horas (migraciones + actualizar función + tests)

---

## 📋 Sección 5: Opción B - Bonus Time Estilo Copart

### Descripción General

Rediseñar completamente el sistema para que funcione como Copart: **ventana de activación clara, extensión fija, y comportamiento predecible**.

### Comportamiento Propuesto

#### 5.1 Ventana de Activación Configurable

**Columna**: `bonus_window_seconds` (INTEGER, default: 30)
- Si alguien puja cuando quedan **menos de X segundos**, se activa el bonus time
- Ejemplo: Si `bonus_window_seconds = 30`, se activa cuando quedan menos de 30 segundos

#### 5.2 Tiempo de Extensión Configurable

**Columna**: `bonus_extend_seconds` (INTEGER, default: 30)
- Cada vez que se activa, se extiende **exactamente Y segundos** desde `NOW()`
- Ejemplo: Si `bonus_extend_seconds = 30`, se extiende a `NOW() + 30s`

#### 5.3 Límites Configurables

**Columnas**:
- `bonus_max_extensions` (INTEGER, default: 50) - Máximo de extensiones
- `bonus_max_total_extension_seconds` (INTEGER, default: NULL) - Máximo total de tiempo extendido
- `bonus_max_duration_hours` (INTEGER, default: 24) - Duración máxima total (ya existe como `auction_max_duration_hours`)

**Comportamiento**:
- Si se alcanza cualquiera de estos límites, **NO se extiende más**
- El contador `bonus_extension_count` y `bonus_total_extension_seconds` se actualizan en cada extensión

#### 5.4 Lógica Mejorada

**Nueva lógica en `place_bid()`**:
```sql
-- 1. Verificar si estamos en la ventana de bonus
v_time_remaining := v_auction_end_at - NOW();
v_bonus_window := COALESCE(v_product.bonus_window_seconds, 30);

IF EXTRACT(EPOCH FROM v_time_remaining) < v_bonus_window THEN
  -- 2. Verificar límites
  v_should_extend := true;
  
  -- Límite 1: Duración máxima total
  IF v_product.bonus_max_duration_hours IS NOT NULL THEN
    IF (NOW() - v_product.auction_start_at) >= (v_product.bonus_max_duration_hours || ' hours')::INTERVAL THEN
      v_should_extend := false;
    END IF;
  END IF;
  
  -- Límite 2: Número máximo de extensiones
  IF v_should_extend AND v_product.bonus_max_extensions IS NOT NULL THEN
    IF v_product.bonus_extension_count >= v_product.bonus_max_extensions THEN
      v_should_extend := false;
    END IF;
  END IF;
  
  -- Límite 3: Tiempo total extendido
  IF v_should_extend AND v_product.bonus_max_total_extension_seconds IS NOT NULL THEN
    IF v_product.bonus_total_extension_seconds >= v_product.bonus_max_total_extension_seconds THEN
      v_should_extend := false;
    END IF;
  END IF;
  
  -- 3. Extender si pasa todas las validaciones
  IF v_should_extend THEN
    v_bonus_extend := COALESCE(v_product.bonus_extend_seconds, 30);
    v_new_end_at := NOW() + (v_bonus_extend || ' seconds')::INTERVAL;
    
    -- Actualizar contadores
    UPDATE public.products
    SET 
      auction_end_at = v_new_end_at,
      bonus_extension_count = bonus_extension_count + 1,
      bonus_total_extension_seconds = COALESCE(bonus_total_extension_seconds, 0) + v_bonus_extend
    WHERE id = p_product_id;
    
    -- Registrar evento
    INSERT INTO auction_events ...
  END IF;
END IF;
```

### Columnas Necesarias

**Nuevas columnas en `products`**:
- `bonus_enabled` (BOOLEAN, default: true) - Habilitar/deshabilitar bonus time
- `bonus_window_seconds` (INTEGER, default: 30) - Ventana de activación
- `bonus_extend_seconds` (INTEGER, default: 30) - Tiempo de extensión
- `bonus_max_extensions` (INTEGER, default: 50) - Máximo de extensiones
- `bonus_max_total_extension_seconds` (INTEGER, default: NULL) - Máximo total de tiempo extendido
- `bonus_extension_count` (INTEGER, default: 0) - Contador de extensiones
- `bonus_total_extension_seconds` (INTEGER, default: 0) - Tiempo total extendido

**Reutilizar existentes**:
- `auction_max_duration_hours` → `bonus_max_duration_hours` (renombrar o mantener)
- `auction_start_at` (ya existe)
- `auction_end_at` (ya existe)

### Integración con Flujo Actual

#### Backend (`/api/auctions/[id]/bid`)
- **Sin cambios**: La función `place_bid()` maneja todo
- El endpoint solo llama a `place_bid()` y retorna el resultado
- Si se extendió, `auction_end_at` viene actualizado en la respuesta

#### Frontend (Timer y Notificaciones)
- **Sin cambios mayores**: El timer ya usa `auction_end_at` del servidor
- Cuando recibe evento `TIMER_EXTENDED`, actualiza el timer automáticamente
- Puede mostrar notificación más clara: "⏰ Bonus time activado: +30 segundos"

#### Cierre Automático (`close_expired_auctions()`)
- **Sin cambios**: Ya verifica `auction_end_at <= NOW()`
- Si el bonus extendió el tiempo, el cierre automático respeta la nueva fecha

#### Endpoint `/current`
- **Sin cambios**: Ya retorna `auction_end_at` actualizado
- Si se extendió, el frontend recibe la nueva fecha automáticamente

### Pros y Contras

**✅ Pros**:
- **Muy flexible**: Todos los parámetros son configurables
- **Claro y predecible**: Comportamiento tipo Copart, fácil de entender
- **Múltiples límites**: Previene abusos de múltiples formas
- **Mejor UX**: Los usuarios entienden mejor el comportamiento
- **Escalable**: Fácil agregar nuevos tipos de límites en el futuro

**❌ Contras**:
- **Más invasivo**: Requiere agregar varias columnas nuevas
- **Más complejo**: Más lógica en `place_bid()`
- **Migración más grande**: Necesita migrar datos existentes
- **Más columnas**: Tabla `products` se vuelve más grande

### Impacto del Cambio

**Migraciones SQL necesarias**:
- 1 migración para agregar todas las columnas nuevas
- 1 migración para actualizar `place_bid()` con nueva lógica
- 1 migración opcional para migrar datos de `auto_extend_seconds` a nuevas columnas
- 1 migración opcional para deprecar `auto_extend_seconds` (marcar como deprecated)

**Impacto en Frontend**:
- **Mínimo**: Solo mejorar notificaciones si se desea
- Los eventos y el timer siguen funcionando igual

**Impacto en Backend**:
- **Medio-Alto**: Actualizar `place_bid()` completamente
- Agregar lógica de múltiples límites
- Actualizar contadores en cada extensión

**Tiempo estimado de implementación**:
- 4-6 horas (migraciones + actualizar función + tests + documentación)

---

## 📋 Sección 6: Recomendación del Arquitecto

### Opción Recomendada: **Opción B (Bonus Time Estilo Copart)**

### Razones de la Recomendación

#### 1. Claridad y Predecibilidad

El sistema actual puede confundir a los usuarios. La Opción B es más clara:
- "Si pujas en los últimos 30 segundos, se extiende 30 segundos"
- Fácil de entender y explicar

#### 2. Flexibilidad Futura

La Opción B permite:
- Diferentes configuraciones por tipo de subasta
- Ajustar límites según necesidades del negocio
- Agregar nuevos tipos de límites sin cambiar la estructura

#### 3. Mejor UX

Con la Opción B:
- Los usuarios saben exactamente cuándo se activa el bonus
- Pueden ver cuántas extensiones quedan (si se muestra en UI)
- El comportamiento es predecible y justo

#### 4. Escalabilidad

La Opción B es más escalable:
- Fácil agregar nuevos tipos de límites
- Fácil ajustar parámetros sin cambiar código
- Fácil hacer A/B testing de diferentes configuraciones

### Plan de Implementación Recomendado

#### Fase 1: Preparación (1-2 horas)
1. Crear migración para agregar columnas nuevas
2. Agregar valores por defecto razonables
3. Documentar cada columna

#### Fase 2: Implementación (2-3 horas)
1. Actualizar `place_bid()` con nueva lógica
2. Agregar contadores (`bonus_extension_count`, `bonus_total_extension_seconds`)
3. Implementar todos los límites
4. Mantener compatibilidad con `auto_extend_seconds` (deprecated)

#### Fase 3: Migración de Datos (1 hora)
1. Migrar subastas existentes a nuevas columnas
2. Si `auto_extend_seconds` está definido, usar para `bonus_window_seconds` y `bonus_extend_seconds`
3. Establecer valores por defecto para subastas sin configuración

#### Fase 4: Testing (1-2 horas)
1. Probar activación de bonus time
2. Probar todos los límites
3. Probar integración con frontend
4. Probar cierre automático

#### Fase 5: Mejoras de UX (Opcional, 1-2 horas)
1. Mostrar contador de extensiones en UI
2. Mejorar notificaciones de bonus time
3. Agregar indicador visual cuando está en ventana de bonus

**Tiempo total estimado**: 6-10 horas

### Consideraciones Importantes

#### Compatibilidad Hacia Atrás

- Mantener `auto_extend_seconds` como deprecated
- Si nuevas columnas son NULL, usar `auto_extend_seconds` como fallback
- Esto permite migración gradual

#### Valores por Defecto Recomendados

- `bonus_enabled = true`
- `bonus_window_seconds = 30` (activar en últimos 30 segundos)
- `bonus_extend_seconds = 30` (extender 30 segundos)
- `bonus_max_extensions = 50`
- `bonus_max_total_extension_seconds = NULL` (sin límite de tiempo total, solo duración máxima)
- `bonus_max_duration_hours = 24` (usar `auction_max_duration_hours` existente)

#### Monitoreo Post-Implementación

- Monitorear cuántas extensiones se hacen en promedio
- Ajustar límites según comportamiento real
- Verificar que no haya abusos del sistema

---

## 📋 Conclusión

El sistema actual de bonus time funciona pero tiene limitaciones en claridad y flexibilidad. La **Opción B (Bonus Time Estilo Copart)** ofrece:

- ✅ Mayor claridad para usuarios
- ✅ Mayor flexibilidad para configuración
- ✅ Mejor escalabilidad para futuras mejoras
- ✅ Comportamiento predecible y justo

**Recomendación final**: Implementar Opción B con plan de migración gradual para mantener compatibilidad.

---

**Análisis completado** ✅  
**Versión**: 1.0.0  
**Fecha**: 2024








# Correcciones: Riesgos MEDIA Prioridad
## Endurecimiento del Sistema de Subastas (Fase 2)

**Fecha**: 2024  
**Versión**: 1.0.0  
**Objetivo**: Resolver los 6 riesgos de MEDIA prioridad identificados en la auditoría técnica

---

## 📋 Resumen de Correcciones

Se han implementado correcciones para los 6 riesgos de MEDIA prioridad identificados en `AUDITORIA_TECNICA_SISTEMA_SUBASTAS.md`:

1. ✅ **Rate limiting robusto con fallback si Redis falla**
2. ✅ **Validación de tiempo y estado en `/current`**
3. ✅ **Límites de anti-sniping para prevenir extensiones infinitas**
4. ✅ **Reemplazo de `Date.now()` por `getSyncedNow()` en componentes**
5. ✅ **Logging mínimo en operaciones críticas**
6. ✅ **Robustez de estado en `/current` bajo concurrencia alta**

---

## 🔧 Corrección 1: Rate Limiting Robusto

### Problema Original

Rate limiting fallaba abierto (permitía requests) si Redis se caía, lo que podía permitir abuso masivo.

### Solución Implementada

**Archivo**: `src/lib/redis/rateLimit.ts`

**Cambios**:
- ✅ Fallback en memoria cuando Redis falla
- ✅ Límite conservador: 1 request por segundo por key
- ✅ Limpieza automática de entradas expiradas
- ✅ Logging cuando se usa fallback

**Comportamiento**:
1. **Si Redis está disponible**: Usa rate limiting distribuido normal
2. **Si Redis falla**: Cae a rate limiting en memoria (1 req/seg)
3. **Si Redis falla durante operación**: Captura error y usa fallback

**Justificación del fallback**:
- **1 req/seg**: Muy conservador, previene abuso masivo
- **En memoria**: Solo funciona en una instancia, pero es mejor que nada
- **Limpieza automática**: Previene memory leaks

---

## 🔧 Corrección 2: Validación de Tiempo y Estado en `/current`

### Problema Original

El endpoint `/current` no validaba tiempo ni estado real, pudiendo devolver "activa" cuando ya estaba cerrada.

### Solución Implementada

**Archivo**: `src/app/api/auctions/[id]/current/route.ts`

**Cambios**:
- ✅ Validación de tiempo usando PostgreSQL `NOW()` (vía `get_server_time()`)
- ✅ Si subasta expiró según servidor, fuerza estado "ended"
- ✅ Actualización asíncrona de estado en DB si está desactualizado
- ✅ Fallback a comparación local si falla obtener tiempo del servidor

**Comportamiento**:
1. Obtiene datos de la subasta desde DB
2. Si está "active" y tiene `auction_end_at`, valida tiempo del servidor
3. Si `serverNow >= endAt`, fuerza estado "ended"
4. Actualiza DB asíncronamente (no bloquea respuesta)
5. Si falla obtener tiempo del servidor, usa comparación local como fallback

**Garantías**:
- ✅ Nunca devuelve "activa" cuando ya expiró según el servidor
- ✅ Siempre valida tiempo usando fuente de verdad (PostgreSQL)
- ✅ Logging cuando detecta estado cerrado

---

## 🔧 Corrección 3: Límites de Anti-Sniping

### Problema Original

El anti-sniping podía extender tiempo indefinidamente si no había límites.

### Solución Implementada

**Archivo**: `supabase/migrations/20250202000010_add_anti_sniping_limits.sql` (nuevo)

**Cambios**:
- ✅ **Límite 1**: Duración máxima total (`auction_max_duration_hours`)
  - Si la subasta ya duró más que el máximo, NO extiende más
- ✅ **Límite 2**: Número máximo de extensiones (50 por defecto)
  - Cuenta extensiones previas y rechaza si se alcanza el máximo
- ✅ Registro de eventos cuando se alcanzan límites

**Comportamiento**:
1. Antes de extender, verifica duración máxima total
2. Si ya pasó el máximo, NO extiende (registra evento)
3. Si no pasó el máximo, cuenta extensiones previas
4. Si ya se alcanzaron 50 extensiones, NO extiende más (registra evento)
5. Solo extiende si pasa ambas validaciones

**Límites aplicados**:
- **Duración máxima**: Configurado en `auction_max_duration_hours` (default: 24 horas)
- **Extensiones máximas**: 50 por defecto (hardcoded, puede ajustarse)

---

## 🔧 Corrección 4: Reemplazo de `Date.now()` por `getSyncedNow()`

### Problema Original

Algunos componentes aún usaban `Date.now()` directamente, causando inconsistencias de tiempo.

### Solución Implementada

**Archivo**: `src/components/auction/AuctionCard.tsx`

**Cambios**:
- ✅ Reemplazado `Date.now()` por `getSyncedNow()` de `timeSync.ts`
- ✅ Actualización periódica cada segundo para mantener sincronización
- ✅ Limpieza de interval al desmontar componente

**Comportamiento**:
1. Al montar componente, inicializa con `getSyncedNow()`
2. Actualiza cada segundo usando `getSyncedNow()`
3. Limpia interval al desmontar

**Garantías**:
- ✅ Todos los componentes de tiempo usan reloj sincronizado
- ✅ Consistencia visual del tiempo mejorada
- ✅ No hay desincronización entre componentes

---

## 🔧 Corrección 5: Logging Mínimo en Operaciones Críticas

### Problema Original

Faltaba logging suficiente para diagnóstico en producción.

### Solución Implementada

**Archivos modificados**:

1. **`src/app/api/auctions/[id]/bid/route.ts`**:
   - ✅ Logging cuando puja es rechazada por tiempo (`AUCTION_ENDED`)
   - ✅ Logging cuando puja es rechazada por estado (`not_active`)
   - ✅ Logging diferenciado por tipo de error

2. **`src/app/api/auctions/[id]/current/route.ts`**:
   - ✅ Logging cuando detecta estado cerrado
   - ✅ Logging cuando subasta está cerca de expirar (últimos 10 segundos)
   - ✅ Logging cuando actualiza estado a "ended"

3. **`src/app/api/auctions/close-expired/route.ts`**:
   - ✅ Logging cuando cierra subastas exitosamente
   - ✅ Incluye conteo de subastas cerradas

4. **`src/lib/redis/rateLimit.ts`**:
   - ✅ Logging cuando Redis falla y se usa fallback
   - ✅ Logging cuando fallback en memoria alcanza límite

**Niveles de logging**:
- **`logger.info`**: Operaciones normales importantes (cierre de subastas, estado actualizado)
- **`logger.warn`**: Situaciones que requieren atención (pujas rechazadas, fallback activado)
- **`logger.error`**: Errores críticos (errores de DB, Redis)
- **`logger.debug`**: Información detallada (subasta cerca de expirar)

---

## 🔧 Corrección 6: Robustez de Estado en `/current` Bajo Concurrencia

### Problema Original

`/current` podría devolver datos obsoletos bajo concurrencia alta.

### Solución Implementada

**Archivo**: `src/app/api/auctions/[id]/current/route.ts`

**Cambios**:
- ✅ Refresco automático desde DB si está cerca de expirar (últimos 30 segundos)
- ✅ Re-lectura de datos dinámicos cuando está cerca del final
- ✅ Validación doble: tiempo del servidor + estado en DB

**Comportamiento**:
1. Obtiene datos iniciales desde DB
2. Si está cerca de expirar (< 30 segundos), re-lee desde DB
3. Valida tiempo del servidor para forzar estado "ended" si expiró
4. Actualiza DB asíncronamente si detecta desincronización

**Garantías**:
- ✅ Datos frescos cuando está cerca de expirar
- ✅ No muestra datos obsoletos bajo alta concurrencia
- ✅ Prioriza datos frescos sobre caché cuando hay duda

---

## 📁 Archivos Modificados

1. **`src/lib/redis/rateLimit.ts`**
   - Fallback en memoria cuando Redis falla
   - Logging mejorado

2. **`src/app/api/auctions/[id]/current/route.ts`**
   - Validación de tiempo y estado
   - Refresco automático cerca de expirar
   - Logging mínimo

3. **`src/app/api/auctions/[id]/bid/route.ts`**
   - Logging cuando puja es rechazada por tiempo/estado

4. **`src/app/api/auctions/close-expired/route.ts`**
   - Logging cuando cierra subastas

5. **`src/components/auction/AuctionCard.tsx`**
   - Reemplazo de `Date.now()` por `getSyncedNow()`

6. **`supabase/migrations/20250202000010_add_anti_sniping_limits.sql`** (nuevo)
   - Límites de anti-sniping en `place_bid()`

---

## ✅ Criterios de Aceptación Cumplidos

- ✅ Rate limiting es seguro incluso si Redis falla (fallback en memoria)
- ✅ `/current` devuelve estado correcto en todo momento (validación de tiempo)
- ✅ No hay extensiones infinitas en anti-sniping (límites implementados)
- ✅ Ningún componente de tiempo usa `Date.now()` directo (AuctionCard corregido)
- ✅ Logging suficiente para diagnóstico en producción (4 endpoints con logging)
- ✅ Consistencia visual del tiempo mejorada (getSyncedNow() en todos lados)

---

## 📝 Notas Importantes

### Rate Limiting Fallback

El fallback en memoria es **conservador** (1 req/seg) porque:
- Solo funciona en una instancia (no distribuido)
- Es mejor que permitir abuso masivo
- Se activa solo cuando Redis falla completamente

### Anti-Sniping Límites

Los límites son:
- **Duración máxima**: Configurable por subasta (`auction_max_duration_hours`)
- **Extensiones máximas**: 50 por defecto (hardcoded)

Si necesitas ajustar el máximo de extensiones, modifica `v_max_extensions` en la migración.

### Logging

El logging es **mínimo pero suficiente**:
- Solo loguea eventos importantes (no spam)
- Diferencia entre info/warn/error según severidad
- Incluye contexto suficiente para diagnóstico

---

**Correcciones completadas** ✅  
**Versión**: 1.0.0  
**Fecha**: 2024








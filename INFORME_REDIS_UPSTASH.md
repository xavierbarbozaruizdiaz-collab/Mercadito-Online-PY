# 📊 INFORME: Uso de Redis/Upstash en Mercadito Online PY

**Fecha:** Enero 2025  
**Autor:** Senior Developer Review  
**Objetivo:** Analizar dónde y cómo se usa Redis/Upstash en el proyecto

---

## 🔍 PASO 1: Dónde se usa Redis

### Archivos principales que usan Redis:

1. **`src/lib/redis/client.ts`** - Cliente Redis (Upstash)
2. **`src/lib/redis/locks.ts`** - Locks distribuidos
3. **`src/lib/redis/rateLimit.ts`** - Rate limiting distribuido
4. **`src/lib/redis/cache.ts`** - Cache de datos estáticos de subastas
5. **`src/app/api/auctions/[id]/bid/route.ts`** - Endpoint de pujas (usa locks + rate limit)
6. **`src/lib/services/auctionService.ts`** - Servicio de subastas (usa cache)

### Variables de entorno requeridas:

- `UPSTASH_REDIS_REST_URL` - URL de la instancia Redis en Upstash
- `UPSTASH_REDIS_REST_TOKEN` - Token de autenticación de Upstash

---

## 📄 PASO 2: Análisis archivo por archivo

### 1. **Archivo:** `src/lib/redis/client.ts`

**Cómo usa Redis:**
- Cliente singleton que se conecta a Upstash Redis usando REST API
- Proporciona funciones `getRedis()` e `isRedisAvailable()`
- Es la base para todos los demás módulos de Redis

**Dónde impacta:**
- Todos los módulos que usan Redis (locks, rate limit, cache)

**Es crítico para que el sitio funcione?**
- **No crítico** - Si Redis no está configurado, retorna `null` y muestra un warning en desarrollo

**¿Qué pasa hoy si Redis NO está configurado?**
- El cliente retorna `null`
- Se muestra un warning en consola (solo en desarrollo)
- Los módulos que dependen de Redis detectan esto y usan fallbacks o fallan de forma segura

---

### 2. **Archivo:** `src/lib/redis/locks.ts`

**Cómo usa Redis:**
- Sistema de locks distribuidos usando `SET NX EX` (atómico)
- Previene condiciones de carrera cuando múltiples usuarios pujan simultáneamente en la misma subasta
- Funciones principales:
  - `acquireLock()` - Adquiere un lock con TTL
  - `releaseLock()` - Libera un lock (verifica ownership)
  - `withLock()` - Ejecuta una función dentro de un lock (auto-libera)

**Dónde impacta:**
- **CRÍTICO para pujas en subastas** - Endpoint `/api/auctions/[id]/bid`
- Sin locks, dos pujas simultáneas podrían causar:
  - Pujas duplicadas
  - Pérdida de datos
  - Inconsistencias en `current_bid` y `winner_id`

**Es crítico para que el sitio funcione?**
- **SÍ, crítico para subastas** - Sin locks, las pujas concurrentes pueden corromper datos
- **No crítico para el resto del sitio** - Solo afecta el sistema de pujas

**¿Qué pasa hoy si Redis NO está configurado?**
- `acquireLock()` retorna `{ acquired: false, error: 'Redis no disponible' }`
- `withLock()` retorna `{ success: false, error: 'No se pudo adquirir el lock' }`
- **El endpoint de pujas FALLA** - No se pueden procesar pujas sin locks
- **Resultado:** Los usuarios reciben error 500 al intentar pujar

---

### 3. **Archivo:** `src/lib/redis/rateLimit.ts`

**Cómo usa Redis:**
- Rate limiting distribuido para prevenir abuso de endpoints
- Configuraciones:
  - `BID_BY_USER`: 30 pujas/minuto por usuario
  - `BID_BY_IP`: 10 pujas/minuto por IP
  - `API_GENERAL`: 200 requests/minuto
- Usa claves en Redis: `ratelimit:user:{id}` y `ratelimit:ip:{ip}`

**Dónde impacta:**
- **Endpoint de pujas** (`/api/auctions/[id]/bid`) - Protege contra spam de pujas
- Previene que un usuario o bot haga miles de pujas en segundos

**Es crítico para que el sitio funcione?**
- **No crítico para funcionalidad básica** - El sitio funciona sin rate limiting
- **SÍ crítico para seguridad** - Sin rate limiting, el sitio es vulnerable a:
  - Spam de pujas
  - Ataques de fuerza bruta
  - Abuso de API

**¿Qué pasa hoy si Redis NO está configurado?**
- **Tiene fallback en memoria** - Si Redis falla, usa rate limiting local (1 req/seg por key)
- El fallback es más permisivo que Redis pero previene abuso masivo
- **Resultado:** El sitio funciona, pero con protección reducida

---

### 4. **Archivo:** `src/lib/redis/cache.ts`

**Cómo usa Redis:**
- Cache de datos estáticos de subastas (título, descripción, imágenes, precio inicial)
- TTL de 45 segundos
- Separa datos estáticos (cacheables) de dinámicos (current_bid, auction_status, etc.)
- Funciones:
  - `getCachedAuctionStaticData()` - Obtiene datos estáticos desde cache
  - `setCachedAuctionStaticData()` - Guarda datos estáticos en cache
  - `invalidateAuctionCache()` - Invalida cache cuando hay cambios

**Dónde impacta:**
- **Páginas de subastas** - Reduce carga en Supabase cuando muchos usuarios ven la misma subasta
- **Rendimiento** - Acelera la carga de datos estáticos que no cambian frecuentemente

**Es crítico para que el sitio funcione?**
- **No crítico** - Solo mejora rendimiento
- Sin cache, el sitio funciona igual pero más lento bajo carga alta

**¿Qué pasa hoy si Redis NO está configurado?**
- `getCachedAuctionStaticData()` retorna `null`
- `setCachedAuctionStaticData()` retorna `false`
- El servicio de subastas detecta esto y hace query completa a Supabase
- **Resultado:** El sitio funciona normalmente, solo es más lento

---

### 5. **Archivo:** `src/app/api/auctions/[id]/bid/route.ts`

**Cómo usa Redis:**
- **Locks:** Usa `withLock()` para procesar pujas de forma atómica
- **Rate limiting:** Usa `checkUserRateLimit()` y `checkIpRateLimit()` antes de procesar puja
- **Cache invalidation:** Invalida cache después de una puja exitosa

**Dónde impacta:**
- **Endpoint crítico de pujas** - `/api/auctions/[id]/bid`
- Sin este endpoint funcionando, los usuarios no pueden pujar

**Es crítico para que el sitio funcione?**
- **SÍ, crítico** - Este endpoint es esencial para el sistema de subastas

**¿Qué pasa hoy si Redis NO está configurado?**
- **Rate limiting:** Funciona con fallback en memoria (protección reducida)
- **Locks:** **FALLA** - `withLock()` retorna error, el endpoint retorna 500
- **Cache:** Se salta la invalidación (no crítico)
- **Resultado:** **Los usuarios NO pueden pujar** - Reciben error 500

---

### 6. **Archivo:** `src/lib/services/auctionService.ts`

**Cómo usa Redis:**
- Usa cache de datos estáticos en `getAuctionById()`
- Si hay cache, solo consulta datos dinámicos (más rápido)
- Si no hay cache, hace query completa

**Dónde impacta:**
- **Páginas de subastas** - Mejora rendimiento al mostrar subastas
- **Home y listados** - Acelera carga de datos estáticos

**Es crítico para que el sitio funcione?**
- **No crítico** - Solo optimización de rendimiento

**¿Qué pasa hoy si Redis NO está configurado?**
- El cache retorna `null`
- Se hace query completa a Supabase (más lento pero funciona)
- **Resultado:** El sitio funciona normalmente, solo es más lento

---

### 7. **Archivo:** `src/lib/services/productService.ts`

**Cómo usa Redis:**
- **NO usa Redis directamente**
- Usa `@/lib/utils/rateLimit` que es rate limiting en memoria (no Redis)
- Este rate limiting es independiente de Redis

**Dónde impacta:**
- Creación de productos - Limita cuántos productos puede crear un usuario por hora

**Es crítico para que el sitio funcione?**
- **No crítico** - Solo protección contra spam

**¿Qué pasa hoy si Redis NO está configurado?**
- **No afecta** - Este rate limiting no usa Redis, es en memoria

---

## 📊 PASO 3: Resumen ejecutivo

| Uso de Redis            | Archivo(s) clave                         | Crítico para MVP | Comentario corto                                    |
|-------------------------|------------------------------------------|------------------|-----------------------------------------------------|
| **Locks distribuidos**  | `src/lib/redis/locks.ts`<br>`src/app/api/auctions/[id]/bid/route.ts` | **SÍ**           | Sin locks, las pujas concurrentes fallan o corrompen datos |
| **Rate limiting**       | `src/lib/redis/rateLimit.ts`<br>`src/app/api/auctions/[id]/bid/route.ts` | **No** (solo seguridad) | Tiene fallback en memoria, pero protección reducida |
| **Cache de subastas**   | `src/lib/redis/cache.ts`<br>`src/lib/services/auctionService.ts` | **No** (solo rendimiento) | Sin cache, el sitio funciona pero más lento |
| **Cliente Redis**       | `src/lib/redis/client.ts`                | **Sí (indirecto)** | Base para locks, rate limit y cache |

### Impacto si Redis NO está configurado:

| Funcionalidad           | Estado sin Redis                         | Impacto en usuarios                        |
|-------------------------|------------------------------------------|--------------------------------------------|
| **Pujas en subastas**   | ❌ **NO FUNCIONA** (error 500)           | **CRÍTICO** - No pueden pujar              |
| **Ver subastas**        | ✅ Funciona (más lento)                  | Menor - Solo afecta velocidad              |
| **Crear productos**     | ✅ Funciona normalmente                  | Ninguno                                    |
| **Rate limiting**       | ⚠️ Funciona con fallback (menos seguro)  | Medio - Vulnerable a spam                  |

---

## 🛠️ PASO 4: Recomendaciones

### Opción A – Configurar Redis / Upstash ahora

**Qué variables de entorno hacen falta:**
- `UPSTASH_REDIS_REST_URL` - URL de tu instancia Redis en Upstash (ej: `https://xxxxx.upstash.io`)
- `UPSTASH_REDIS_REST_TOKEN` - Token de autenticación de Upstash

**En qué partes del código se apoyan esas variables:**
- `src/lib/redis/client.ts` (líneas 11-12) - Lee las variables de entorno
- Si no están configuradas, el cliente retorna `null` y los locks fallan

**Riesgos si no se configura bien:**
- Si las credenciales son incorrectas: Redis falla, locks no funcionan, pujas fallan
- Si la instancia Redis se cae: Mismo problema
- Si excedes el plan gratuito de Upstash: Puede haber throttling o errores

**Pasos para configurar:**
1. Crear cuenta en [upstash.com](https://upstash.com)
2. Crear base de datos Redis (plan gratuito: 10,000 comandos/día)
3. Copiar `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`
4. Agregar en Vercel Dashboard → Settings → Environment Variables
5. Redeploy

**Ventajas:**
- ✅ Pujas funcionan correctamente
- ✅ Protección robusta contra spam
- ✅ Mejor rendimiento con cache
- ✅ Plan gratuito generoso (10k comandos/día)

**Desventajas:**
- ⚠️ Requiere configuración externa (Upstash)
- ⚠️ Dependencia externa (si Upstash cae, pujas fallan)

---

### Opción B – Desactivar Redis por ahora para el MVP

**Qué partes del código se podrían envolver:**

1. **Locks (CRÍTICO):**
   - En `src/app/api/auctions/[id]/bid/route.ts` (línea 261)
   - Actualmente: Si Redis falla, `withLock()` retorna error y la puja falla
   - **Cambio necesario:** Envolver `withLock()` con un `if (!isRedisAvailable())` y procesar sin lock
   - **Riesgo:** Sin locks, pujas concurrentes pueden causar condiciones de carrera

2. **Rate limiting:**
   - Ya tiene fallback en memoria (no requiere cambios)
   - El fallback es más permisivo pero funciona

3. **Cache:**
   - Ya maneja Redis no disponible (retorna null y hace query normal)
   - No requiere cambios

**Qué se perdería:**
- ❌ **Locks distribuidos** - Sin esto, pujas concurrentes pueden corromper datos
- ⚠️ **Rate limiting robusto** - Solo protección básica en memoria
- ⚠️ **Cache de rendimiento** - Queries más lentas a Supabase

**Confirmar que esto NO rompe la lógica principal:**
- ✅ **Ver productos:** Funciona (no usa Redis)
- ✅ **Crear productos:** Funciona (no usa Redis)
- ✅ **Ver subastas:** Funciona (cache es opcional)
- ⚠️ **Pujar en subastas:** **RIESGO** - Sin locks, puede haber condiciones de carrera
- ✅ **Checkout:** Funciona (no usa Redis)
- ✅ **Login/Registro:** Funciona (no usa Redis)

**Recomendación:**
- **NO recomendado** - Desactivar locks es riesgoso para integridad de datos
- Si decides hacerlo, al menos implementa locks en memoria (no distribuidos) para prevenir condiciones de carrera en la misma instancia

---

### Opción C – Dejarlo preparado para una versión 2.0

**Sugerencias de cómo dejar el código ordenado:**

1. **Mantener la estructura actual:**
   - ✅ El código ya está bien estructurado con degradación elegante
   - ✅ Los módulos detectan si Redis está disponible y usan fallbacks
   - ✅ Solo los locks fallan sin Redis (y eso es intencional por seguridad)

2. **Mejoras sugeridas (sin implementar todavía):**
   - **Locks en memoria como fallback:** Si Redis no está disponible, usar locks en memoria (Map) para prevenir condiciones de carrera en la misma instancia (no distribuidas)
   - **Centralizar configuración:** Crear `src/lib/redis/config.ts` con todas las configuraciones de Redis en un solo lugar
   - **Health check endpoint:** Crear `/api/health/redis` para verificar estado de Redis
   - **Métricas:** Agregar logging cuando Redis falla para monitorear

3. **Estructura recomendada (descriptiva, no implementar):**
   ```
   src/lib/redis/
   ├── client.ts          (ya existe - cliente singleton)
   ├── config.ts          (nuevo - configuraciones centralizadas)
   ├── locks.ts           (ya existe - locks distribuidos)
   ├── locks-memory.ts    (nuevo - locks en memoria como fallback)
   ├── rateLimit.ts       (ya existe - rate limiting)
   └── cache.ts           (ya existe - cache de subastas)
   ```

4. **Cómo activar Redis después:**
   - Solo necesitas agregar las variables de entorno en Vercel
   - El código ya detecta automáticamente si Redis está disponible
   - No requiere cambios en el código

**Ventajas de esta opción:**
- ✅ Código listo para activar Redis cuando lo necesites
- ✅ No requiere cambios ahora
- ✅ Fácil de activar después (solo variables de entorno)

**Desventajas:**
- ⚠️ Las pujas seguirán fallando hasta que configures Redis
- ⚠️ No hay protección robusta contra spam hasta entonces

---

## 🎯 RECOMENDACIÓN FINAL

**Como dueño del proyecto, te recomiendo:**

### **Opción A - Configurar Redis/Upstash ahora**

**Razones:**
1. **Es crítico para pujas** - Sin Redis, los usuarios no pueden pujar (error 500)
2. **Plan gratuito generoso** - 10,000 comandos/día es suficiente para empezar
3. **Configuración rápida** - 10 minutos para crear cuenta y agregar variables
4. **Protección de datos** - Los locks previenen corrupción de datos en pujas concurrentes
5. **El código ya está listo** - Solo necesitas las credenciales

**Pasos concretos:**
1. Ir a [upstash.com](https://upstash.com) y crear cuenta (gratis)
2. Crear base de datos Redis (Regional o Global, plan gratuito)
3. Copiar `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`
4. En Vercel Dashboard → Tu proyecto → Settings → Environment Variables
5. Agregar ambas variables
6. Redeploy

**Si no puedes configurar Redis ahora:**
- Implementa locks en memoria como fallback temporal (previene condiciones de carrera en la misma instancia)
- Esto es un parche temporal - Redis sigue siendo necesario para producción

---

## 📝 NOTAS ADICIONALES

### Plan gratuito de Upstash:
- **10,000 comandos/día** (gratis)
- Suficiente para ~300-500 pujas/día (cada puja usa ~20-30 comandos)
- Si necesitas más, plan pay-as-you-go: ~$0.20 por 100k comandos

### Monitoreo recomendado:
- Verificar logs cuando Redis falla (ya está implementado)
- Monitorear uso de comandos en Upstash Dashboard
- Alertar si Redis está caído por > 5 minutos

### Alternativas a Upstash:
- **Redis Cloud** (también tiene plan gratuito)
- **Vercel KV** (si estás en Vercel, integración nativa)
- **Railway Redis** (otra opción serverless)

---

**Fin del informe**












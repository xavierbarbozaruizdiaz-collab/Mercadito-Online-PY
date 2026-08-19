# 🔍 DIAGNÓSTICO REDIS/UPSTASH - Mercadito Online PY

**Fecha:** Enero 2025  
**Tipo:** Diagnóstico sin modificar código  
**Objetivo:** Verificar que Redis/Upstash funciona correctamente

---

## ✅ PASO 1 – Verificación de configuración en el código

### Archivo revisado: `src/lib/redis/client.ts`

**Variables de entorno usadas:**
- ✅ `process.env.UPSTASH_REDIS_REST_URL` (línea 11)
- ✅ `process.env.UPSTASH_REDIS_REST_TOKEN` (línea 12)

**Resultado:**
- ✅ **Los nombres coinciden 100%** con las variables estándar de Upstash
- ✅ No hay variaciones ni nombres alternativos en el código

**Manejo cuando faltan las env vars:**
- ✅ El cliente tiene `console.warn` en desarrollo (línea 18)
- ✅ Retorna `null` de forma elegante (no lanza error)
- ✅ El warning solo aparece en `NODE_ENV === 'development'` (no en producción)

**Conclusión PASO 1:**
✅ **Configuración correcta** - El código está listo para usar las variables estándar de Upstash.

---

## 🧪 PASO 2 – Prueba directa a Upstash (REST API)

### Comando para ejecutar en terminal:

**IMPORTANTE:** Reemplazá `<PEGAR_URL>` y `<PEGAR_TOKEN>` con tus credenciales reales de Upstash.

```bash
UPSTASH_REDIS_REST_URL="<PEGAR_URL>" UPSTASH_REDIS_REST_TOKEN="<PEGAR_TOKEN>" node -e "
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const key = 'lpms:test';
  const value = 'ok';

  (async () => {
    const setRes = await fetch(\`\${url}/set/\${key}/\${value}\`, {
      headers: { Authorization: \`Bearer \${token}\` }
    });
    const getRes = await fetch(\`\${url}/get/\${key}\`, {
      headers: { Authorization: \`Bearer \${token}\` }
    });
    console.log('SET status:', setRes.status);
    console.log('GET status:', getRes.status);
    const getBody = await getRes.text();
    console.log('GET body:', getBody);
  })().catch(err => {
    console.error('Redis test error:', err);
    process.exit(1);
  });
"
```

### Qué esperar en la salida:

**Si todo está bien:**
```
SET status: 200
GET status: 200
GET body: ok
```

**Si hay error de autenticación:**
```
SET status: 401
GET status: 401
GET body: {"error":"Unauthorized"}
```

**Si la URL es incorrecta:**
```
Redis test error: TypeError: fetch failed
```

### Análisis esperado:

- ✅ **SET status 200** = Upstash acepta el comando SET
- ✅ **GET status 200** = Upstash acepta el comando GET
- ✅ **GET body: "ok"** = El valor se guardó y recuperó correctamente

**Si ves esto, Redis/Upstash responde bien a nivel de infraestructura.**

---

## 🔧 PASO 3 – Probar el cliente Redis del proyecto

### Archivo temporal creado: `scripts/check-redis-temp.ts`

**⚠️ IMPORTANTE:** Este archivo es TEMPORAL y se puede borrar después de la prueba.

### Comando para ejecutar:

```bash
npx tsx scripts/check-redis-temp.ts
```

**O si no tenés `tsx` instalado:**
```bash
npm install -D tsx
npx tsx scripts/check-redis-temp.ts
```

### Qué hace el script:

1. Verifica si Redis está disponible (`isRedisAvailable()`)
2. Obtiene el cliente con `getRedis()`
3. Prueba SET de una key de prueba
4. Prueba GET de la misma key
5. Verifica que el valor coincide
6. Limpia la key de prueba

### Salida esperada (si todo funciona):

```
🔍 Iniciando diagnóstico de Redis/Upstash...

1. Redis disponible: ✅ SÍ
2. Cliente obtenido: ✅ Instancia válida

3. Probando SET: lpms:check = test-1234567890
   Resultado SET: ✅ OK

4. Probando GET: lpms:check
   Resultado GET: ✅ Coincide
   Valor obtenido: test-1234567890

5. Limpiando key de prueba...
   ✅ Key eliminada

6. Verificación post-delete: ✅ Key eliminada correctamente

✅ DIAGNÓSTICO COMPLETO: Redis/Upstash está funcionando correctamente
```

### Si Redis NO está configurado:

```
🔍 Iniciando diagnóstico de Redis/Upstash...

1. Redis disponible: ❌ NO
2. Cliente obtenido: ❌ null

❌ No se pudo obtener cliente Redis. Verifica las variables de entorno:
   - UPSTASH_REDIS_REST_URL
   - UPSTASH_REDIS_REST_TOKEN
```

### Después de la prueba:

**Borrá el archivo temporal:**
```bash
rm scripts/check-redis-temp.ts
```

O simplemente ignorálo, no afecta el proyecto.

---

## 📡 PASO 4 – Diagnóstico del endpoint de pujas

### Archivo revisado: `src/app/api/auctions/[id]/bid/route.ts`

### Flujo de locks:

1. **Línea 259:** Obtiene la clave del lock: `getAuctionLockKey(auctionId)`
2. **Línea 261:** Llama a `withLock()` que internamente:
   - Llama a `acquireLock()` (línea 215 en `locks.ts`)
   - Si no puede adquirir el lock, retorna `{ success: false, error: 'No se pudo adquirir el lock' }`
3. **Línea 418:** Si `result.success === false`, el endpoint:
   - Loguea el error
   - Retorna status **500** con mensaje genérico (línea 454)

### Qué pasa si Redis NO funciona:

**En `acquireLock()` (locks.ts línea 54-60):**
- Detecta que Redis no está disponible
- Retorna `{ acquired: false, error: 'Redis no disponible' }`

**En `withLock()` (locks.ts línea 217-221):**
- Si `acquired === false`, retorna `{ success: false, error: 'No se pudo adquirir el lock' }`

**En el endpoint (route.ts línea 418-455):**
- Si `result.success === false` y el error NO es de validación de subasta/monto:
- Retorna **status 500** con `{ success: false, error: 'Error al procesar la puja' }`

### Prueba HTTP local

**1. Levantá el servidor:**
```bash
npm run dev
```

**2. Endpoint:**
```
POST http://localhost:3000/api/auctions/<ID_DE_SUBASTA>/bid
```

**3. Headers necesarios:**
```http
Content-Type: application/json
Authorization: Bearer <TOKEN_DE_SESION>
```

**Nota:** Para obtener el token de sesión, necesitás estar autenticado. Podés:
- Hacer login en el navegador y copiar el token de las cookies
- O usar el endpoint de login primero

**4. Body mínimo:**
```json
{
  "bidAmount": 50000
}
```

**Body completo (con idempotencia):**
```json
{
  "bidAmount": 50000,
  "idempotencyKey": "unique-key-123"
}
```

### Ejemplo con curl:

```bash
curl -X POST http://localhost:3000/api/auctions/TU_SUBASTA_ID/bid \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{"bidAmount": 50000}'
```

### Respuestas esperadas:

**✅ Si todo va bien (Redis funcionando):**
```json
{
  "success": true,
  "bid_id": "uuid-del-bid",
  "current_bid": 50000,
  "winner_id": "user-id",
  "auction_status": "active",
  "auction_end_at": "2025-01-15T10:30:00Z",
  "version": 1
}
```
**Status:** `200 OK`

**❌ Si Redis NO funciona (no puede adquirir lock):**
```json
{
  "success": false,
  "error": "Error al procesar la puja"
}
```
**Status:** `500 Internal Server Error`

**⚠️ Si la subasta no existe o no está activa:**
```json
{
  "success": false,
  "error": "La subasta ya ha finalizado",
  "error_code": "AUCTION_ENDED"
}
```
**Status:** `400 Bad Request`

**⚠️ Si el monto es inválido:**
```json
{
  "success": false,
  "error": "El monto debe ser al menos Gs. 60,000 (precio actual + incremento mínimo)"
}
```
**Status:** `400 Bad Request`

**⚠️ Si no estás autenticado:**
```json
{
  "success": false,
  "error": "No autenticado. Debes iniciar sesión para pujar."
}
```
**Status:** `401 Unauthorized`

**⚠️ Si excediste el rate limit:**
```json
{
  "success": false,
  "error": "Has alcanzado el límite de pujas. Intenta de nuevo en 60 segundos.",
  "retry_after": 60
}
```
**Status:** `429 Too Many Requests`

---

## 📊 PASO 5 – Informe final

### ✅ ¿Redis/Upstash responde bien a nivel de infraestructura?

**Prueba directa REST (PASO 2):**
- Ejecutá el comando de prueba directa
- Si SET y GET devuelven status 200, **Redis/Upstash está funcionando**

**Estado esperado:** ✅ **OK** (después de ejecutar la prueba)

---

### ✅ ¿Nuestro cliente `src/lib/redis/client.ts` obtiene una conexión válida?

**Prueba del cliente (PASO 3):**
- Ejecutá `npx tsx scripts/check-redis-temp.ts`
- Si el script muestra "✅ DIAGNÓSTICO COMPLETO", **el cliente funciona**

**Estado esperado:** ✅ **OK** (después de ejecutar la prueba)

---

### ✅ / ⚠️ / ❌ ¿El endpoint de pujas debería funcionar ahora con Redis configurado?

**Análisis del código:**

**✅ Si Redis está configurado:**
- Los locks funcionan → Las pujas se procesan correctamente
- El rate limiting funciona → Protección contra spam
- El cache funciona → Mejor rendimiento

**❌ Si Redis NO está configurado:**
- Los locks fallan → El endpoint retorna **500 Internal Server Error**
- El rate limiting usa fallback en memoria → Protección reducida
- El cache no funciona → Queries más lentas (pero funciona)

**Estado esperado:** ✅ **OK** (si Redis está configurado)

---

## 🎯 CONCLUSIÓN FINAL

### Si todas las pruebas pasan:

**✅ Todo OK, podés considerar Redis listo para producción para el MVP**

**Qué significa:**
- Redis/Upstash responde correctamente
- El cliente del proyecto se conecta bien
- Los locks funcionan (pujas concurrentes son seguras)
- El rate limiting funciona (protección contra spam)
- El cache funciona (mejor rendimiento)

### Si alguna prueba falla:

**⚠️ Falta X/Y para decir que está 100% OK**

**Posibles problemas:**
1. **Variables de entorno no configuradas:**
   - Verificá que `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` estén en `.env.local`
   - O en Vercel Dashboard si estás en producción

2. **Credenciales incorrectas:**
   - Verificá que las credenciales sean correctas en Upstash Dashboard
   - Regenerá el token si es necesario

3. **Upstash caído o con problemas:**
   - Verificá el estado de Upstash en su dashboard
   - Revisá los logs de Upstash

---

## 🔍 RIESGOS DETECTADOS (sin proponer cambios todavía)

### 1. Dependencia crítica en Redis para pujas
- **Riesgo:** Si Redis cae, las pujas fallan completamente (error 500)
- **Impacto:** Alto - Los usuarios no pueden pujar
- **Mitigación actual:** Ninguna (el código falla intencionalmente por seguridad)

### 2. Falta de manejo específico de error de Redis
- **Riesgo:** Si Redis falla, el error genérico "Error al procesar la puja" no indica que es un problema de Redis
- **Impacto:** Medio - Dificulta el debugging
- **Mitigación actual:** Los logs muestran el error, pero no en la respuesta al usuario

### 3. Rate limiting con fallback permisivo
- **Riesgo:** Si Redis falla, el fallback en memoria solo permite 1 req/seg (muy permisivo)
- **Impacto:** Medio - Vulnerable a spam si Redis cae
- **Mitigación actual:** El fallback previene abuso masivo, pero no es tan estricto como Redis

---

## 📝 PRÓXIMOS PASOS RECOMENDADOS

1. **Ejecutá las pruebas (PASO 2 y PASO 3)** para confirmar que todo funciona
2. **Probá el endpoint de pujas (PASO 4)** con una subasta real
3. **Monitoreá los logs** cuando haya pujas en producción
4. **Considerá agregar alertas** si Redis falla por más de 5 minutos

---

**Fin del diagnóstico**












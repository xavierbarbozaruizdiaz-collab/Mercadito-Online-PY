# Test RLS product_images con Cliente Admin

**Endpoint de prueba:** `/api/debug/test-product-images-insert`  
**Propósito:** Demostrar si el error RLS viene de usar cliente normal (anon) o cliente admin (service_role)

---

## Instrucciones de Prueba

### Paso 1: Obtener un UUID de producto existente

Necesitas un UUID de un producto que exista en tu base de datos de producción. Puedes obtenerlo de varias formas:

1. **Desde Supabase Dashboard:**
   - Ir a **Database** → **Table Editor** → `products`
   - Copiar el `id` de cualquier producto

2. **Desde la aplicación:**
   - Abrir la consola del navegador en producción
   - Ejecutar: `fetch('/api/products').then(r => r.json()).then(d => console.log(d[0]?.id))`
   - Copiar el primer `id` que aparezca

### Paso 2: Ejecutar la prueba

#### Opción A: Usando `curl` (desde terminal)

```bash
curl -X POST https://TU_DOMINIO_VERCEL/api/debug/test-product-images-insert \
  -H "Content-Type: application/json" \
  -d '{"productId": "UUID_DE_PRODUCTO_QUE_EXISTA_EN_PRODUCCION"}'
```

**Ejemplo real:**
```bash
curl -X POST https://mercadito-online-12hen8w3u-barboza.vercel.app/api/debug/test-product-images-insert \
  -H "Content-Type: application/json" \
  -d '{"productId": "123e4567-e89b-12d3-a456-426614174000"}'
```

#### Opción B: Usando `fetch` (desde consola del navegador)

Abre la consola del navegador en producción y ejecuta:

```javascript
fetch('/api/debug/test-product-images-insert', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    productId: 'UUID_DE_PRODUCTO_QUE_EXISTA_EN_PRODUCCION'
  })
})
  .then(r => r.json())
  .then(data => console.log('Resultado:', data))
  .catch(err => console.error('Error:', err));
```

**Ejemplo real:**
```javascript
fetch('/api/debug/test-product-images-insert', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ productId: '123e4567-e89b-12d3-a456-426614174000' })
})
  .then(r => r.json())
  .then(console.log);
```

#### Opción C: Usando Postman o Insomnia

1. Crear nueva request POST
2. URL: `https://TU_DOMINIO_VERCEL/api/debug/test-product-images-insert`
3. Headers: `Content-Type: application/json`
4. Body (JSON):
```json
{
  "productId": "UUID_DE_PRODUCTO_QUE_EXISTA_EN_PRODUCCION"
}
```

---

## Interpretación de Resultados

### ✅ Caso 1: Respuesta 200 con `success: true`

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "INSERT successful with service_role. RLS is correctly bypassed.",
  "imageId": "uuid-del-registro-creado",
  "usingServiceRole": true
}
```

**Interpretación:**
- ✅ El `service_role` **SÍ funciona correctamente** y **SÍ ignora RLS**
- ✅ El problema está en el endpoint real `/api/products/upload-images`
- ✅ El endpoint real está usando cliente normal (`anon` key) en lugar de `service_role`
- ✅ **Solución:** Modificar `/api/products/upload-images` para usar `directAdminClient` con `SUPABASE_SERVICE_ROLE_KEY`

### ❌ Caso 2: Respuesta 500 con `errorCode: "42501"` (RLS Violation)

**Respuesta esperada:**
```json
{
  "success": false,
  "errorCode": "42501",
  "message": "new row violates row-level security policy for table \"product_images\"",
  "details": "...",
  "hint": "...",
  "usingServiceRole": true,
  "interpretation": "RLS se está aplicando incluso con service_role. Esto NO debería pasar..."
}
```

**Interpretación:**
- ❌ Incluso el `service_role` está siendo evaluado con RLS
- ❌ Esto **NO debería pasar** según la documentación de Supabase
- ❌ Posibles causas:
  1. La variable `SUPABASE_SERVICE_ROLE_KEY` en Vercel no es realmente el `service_role` key
  2. Hay un problema de configuración en Supabase
  3. Hay políticas RLS conflictivas o mal configuradas
  4. El proyecto de Supabase tiene alguna configuración especial que fuerza RLS incluso para `service_role`

**Acciones:**
1. Verificar en Supabase Dashboard que el `service_role` key es correcto
2. Verificar en Vercel que `SUPABASE_SERVICE_ROLE_KEY` tiene el valor correcto
3. Revisar políticas RLS en Supabase Dashboard → Database → Policies
4. Considerar crear una función `SECURITY DEFINER` en PostgreSQL para insertar sin RLS

### ⚠️ Caso 3: Respuesta 500 con otro error

**Ejemplos:**
- `404` → Producto no encontrado (verificar que el UUID existe)
- `500` con `error: "Missing env"` → Variables de entorno no configuradas en Vercel
- `500` con otro código → Error desconocido, revisar logs de Vercel

---

## Logs de Vercel

Después de ejecutar la prueba, revisa los logs de Vercel:

1. Ir a **Vercel Dashboard** → Tu proyecto → **Deployments** → Último deployment → **Logs**
2. Buscar logs con prefijo `[DEBUG]`:
   - `[DEBUG] Direct admin client created for test` → Confirma que el cliente se creó
   - `[DEBUG] INSERT failed with error` → Muestra el error detallado si falla
   - `[DEBUG] INSERT successful with service_role` → Confirma éxito

---

## Limpieza

El endpoint automáticamente elimina el registro de prueba después de insertarlo (línea ~120 del código). Si por alguna razón el cleanup falla, puedes eliminar manualmente registros con `sort_order = 9999` desde Supabase Dashboard.

---

## Seguridad

⚠️ **IMPORTANTE:** Este endpoint es solo para diagnóstico. **NO debe estar activo en producción final.**

Después de completar el diagnóstico:
1. Eliminar el archivo `src/app/api/debug/test-product-images-insert/route.ts`
2. O agregar una verificación que lo deshabilite en producción:
   ```typescript
   if (process.env.NODE_ENV === 'production') {
     return NextResponse.json({ error: 'Endpoint disabled in production' }, { status: 403 });
   }
   ```

---

## Resumen

Este test permite confirmar si:
- ✅ `service_role` funciona → El problema está en el endpoint real (usa cliente normal)
- ❌ `service_role` NO funciona → Hay un problema más profundo (configuración de Supabase/Vercel)








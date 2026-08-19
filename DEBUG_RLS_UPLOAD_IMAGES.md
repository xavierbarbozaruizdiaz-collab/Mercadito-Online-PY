# Auditoría RLS - Endpoint /api/products/upload-images

**Fecha:** 2025-02-01  
**Archivo:** `src/app/api/products/upload-images/route.ts`

---

## Análisis de Operaciones sobre `product_images` y `products`

### Operaciones encontradas:

#### 1. Línea 40-44: SELECT en `products`
```typescript
const { data: product, error: productError } = await supabase
  .from('products')
  .select('id, seller_id')
  .eq('id', productId)
  .single();
```
- **Cliente usado:** `supabase` (cliente normal)
- **Tipo de cliente:** `createServerClient()` → usa `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Operación:** SELECT (solo lectura, no afecta RLS INSERT)

#### 2. Línea 124-135: INSERT en `product_images` ⚠️ **CRÍTICO**
```typescript
const { data: imageData, error: imageError } = await (supabase as any)
  .from('product_images')
  .insert({
    product_id: productId,
    url: uploadedUrls.full || uploadedUrls.original,
    thumbnail_url: uploadedUrls.thumbnail || uploadedUrls.small || uploadedUrls.full || uploadedUrls.original,
    alt_text: file.name,
    sort_order: 0,
    is_cover: false,
  })
  .select()
  .single();
```
- **Cliente usado:** `supabase` (cliente normal)
- **Tipo de cliente:** `createServerClient()` → usa `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Operación:** INSERT ⚠️ **ESTE ES EL PROBLEMA**
- **Riesgo:** Esta operación está usando `anon` key, por lo que RLS se aplica y puede fallar si la política no permite el INSERT

#### 3. Línea 144-148: SELECT en `product_images`
```typescript
const { data: existingImages } = await supabase
  .from('product_images')
  .select('id')
  .eq('product_id', productId)
  .neq('id', imageData.id);
```
- **Cliente usado:** `supabase` (cliente normal)
- **Tipo de cliente:** `createServerClient()` → usa `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Operación:** SELECT (solo lectura, no afecta RLS INSERT)

#### 4. Línea 152-158: UPDATE en `products`
```typescript
await (supabase as any)
  .from('products')
  .update({
    cover_url: uploadedUrls.full || uploadedUrls.original,
    thumbnail_url: thumbnailUrl,
  })
  .eq('id', productId);
```
- **Cliente usado:** `supabase` (cliente normal)
- **Tipo de cliente:** `createServerClient()` → usa `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Operación:** UPDATE (puede afectar RLS si hay políticas UPDATE)

#### 5. Línea 161-164: UPDATE en `product_images`
```typescript
await (supabase as any)
  .from('product_images')
  .update({ is_cover: true })
  .eq('id', imageData.id);
```
- **Cliente usado:** `supabase` (cliente normal)
- **Tipo de cliente:** `createServerClient()` → usa `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Operación:** UPDATE (puede afectar RLS si hay políticas UPDATE)

---

## Conclusión de la Auditoría

### ❌ PROBLEMA CRÍTICO DETECTADO

**TODAS las operaciones INSERT/UPDATE/SELECT en `product_images` y `products` en este archivo usan el cliente normal (`supabase`) con `anon` key.**

**Ninguna operación usa `service_role` (directAdminClient o supabaseAdmin).**

### Operaciones que deberían usar `service_role`:

1. **INSERT en `product_images` (línea 124)** → ⚠️ **CRÍTICO** - Debe usar `directAdminClient` con `SUPABASE_SERVICE_ROLE_KEY`
2. **UPDATE en `products` (línea 152)** → Debería usar `directAdminClient` para evitar RLS
3. **UPDATE en `product_images` (línea 161)** → Debería usar `directAdminClient` para evitar RLS

### Operaciones que pueden usar cliente normal:

1. **SELECT en `products` (línea 40)** → ✅ OK (solo lectura, RLS permite si el producto es público o del usuario)
2. **SELECT en `product_images` (línea 144)** → ✅ OK (solo lectura)

---

## Causa Raíz del Error

El error `new row violates row-level security policy for table "product_images"` ocurre porque:

1. El INSERT en `product_images` (línea 124) está usando `supabase` (cliente normal con `anon` key)
2. Con `anon` key, RLS se aplica y evalúa la política `product_images_insert_owner`
3. Si la política falla (por ejemplo, si el producto no pertenece al usuario según RLS), se lanza el error 42501

### Solución Requerida

Cambiar todas las operaciones de escritura (INSERT/UPDATE) en `product_images` y `products` para usar un cliente admin con `service_role`:

```typescript
// Crear cliente admin directamente
const directAdminClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
);

// Usar directAdminClient para INSERT/UPDATE
const { data: imageData, error: imageError } = await directAdminClient
  .from('product_images')
  .insert({ ... });
```

---

## Próximos Pasos

1. ✅ Crear endpoint de prueba `/api/debug/test-product-images-insert` para confirmar que `service_role` funciona
2. ⏳ Si la prueba confirma que `service_role` funciona, modificar el endpoint real para usar `directAdminClient`
3. ⏳ Verificar que todas las operaciones de escritura usen `service_role`








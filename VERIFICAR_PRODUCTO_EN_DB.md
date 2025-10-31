# 🔍 Cómo Verificar si un Producto Existe en la Base de Datos

## 📋 Opción 1: Supabase Dashboard (Recomendado)

### Pasos:

1. **Ve a tu Supabase Dashboard**
   - URL: https://supabase.com/dashboard
   - Selecciona tu proyecto: `hqdatzhliaordlsqtjea`

2. **Navega a "Table Editor"**
   - En el menú lateral izquierdo
   - Busca "Table Editor" o "Editor de Tablas"

3. **Busca la tabla `products`**
   - En la lista de tablas, haz clic en `products`

4. **Busca el producto por ID**
   - Usa el campo de búsqueda/filtro
   - Busca por el `id` del producto (UUID)
   - O busca por `title` si conoces el nombre

### Verificación Rápida con SQL:

1. **Ve a "SQL Editor"**
   - En el menú lateral izquierdo
   - Haz clic en "SQL Editor" o "Editor SQL"

2. **Ejecuta este query** (reemplaza `PRODUCT_ID_AQUI` con el ID del producto):

```sql
-- Buscar un producto específico por ID
SELECT 
  id,
  title,
  seller_id,
  price,
  status,
  auction_status,
  created_at,
  updated_at
FROM products
WHERE id = 'PRODUCT_ID_AQUI';
```

3. **O busca por título**:

```sql
-- Buscar productos por título
SELECT 
  id,
  title,
  seller_id,
  price,
  status,
  auction_status
FROM products
WHERE title ILIKE '%toyota%';  -- Cambia 'toyota' por el nombre que buscas
```

4. **Ver todos tus productos** (con tu user ID):

```sql
-- Ver todos los productos de tu usuario
SELECT 
  id,
  title,
  seller_id,
  price,
  status,
  auction_status,
  created_at
FROM products
WHERE seller_id = auth.uid()  -- Solo muestra tus productos
ORDER BY created_at DESC;
```

## 📋 Opción 2: Desde el Código (Logs de Consola)

El código ya verifica automáticamente. Busca estos logs en la consola del navegador:

### Logs de Verificación:

```
🔍 Verificando que auth.uid() coincide: { ... }
📊 Resultado del DELETE: { count: 0, ... }
⚠️ DELETE retornó count: 0. Intentando con función SQL...
✅ Producto eliminado usando función SQL
```

### Verificación Final:

```
✅ El producto fue eliminado correctamente por la función SQL
✅ Eliminación confirmada: el producto ya no existe en la base de datos
```

O si falla:

```
❌ El producto todavía existe después del DELETE
```

## 📋 Opción 3: Desde la Aplicación

El código ya hace estas verificaciones automáticamente en:

**Archivo:** `src/app/dashboard/page.tsx`

### Verificaciones que hace el código:

1. **Línea ~462-466**: Verifica si el producto existe después del DELETE fallido
2. **Línea ~562-566**: Verificación final antes de mostrar el mensaje de éxito

```typescript
// Verificación automática en el código
const { data: finalCheck } = await supabase
  .from('products')
  .select('id, seller_id, title')
  .eq('id', productId)
  .single();

if (finalCheck) {
  // El producto todavía existe
} else {
  // El producto fue eliminado ✅
}
```

## 🔗 URL Directa para Tu Proyecto

**Table Editor:**
https://supabase.com/dashboard/project/hqdatzhliaordlsqtjea/editor

**SQL Editor:**
https://supabase.com/dashboard/project/hqdatzhliaordlsqtjea/sql/new

---

**💡 Tip:** Si quieres verificar rápidamente en la consola del navegador, abre las DevTools (F12) y busca los logs mencionados arriba.


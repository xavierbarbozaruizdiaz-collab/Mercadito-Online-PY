# ✅ Checklist Pre-Deployment - Mercadito Online PY

## 🚨 ACCIÓN INMEDIATA REQUERIDA

### 1. Verificar Estado de la Base de Datos

Ejecutar en **Supabase SQL Editor** el script `verify_database_state.sql`:

```sql
-- Copiar y pegar el contenido de verify_database_state.sql
```

**Resultado esperado:**
- ✅ `image_url` NO existe (0 filas)
- ✅ `cover_url` SÍ existe (1 fila)

---

### 2. Aplicar Migración Corregida

Si `image_url` todavía existe:

1. Ir a **Supabase Dashboard → Database → Migrations**
2. Hacer clic en **"New Migration"**
3. Copiar el contenido de `supabase/migrations/20250203000000_fix_products_structure_syntax.sql`
4. Guardar y aplicar

**O** ejecutar directamente en SQL Editor:
```sql
-- Copiar contenido de 20250203000000_fix_products_structure_syntax.sql
```

---

### 3. Forzar Refresh de PostgREST

Después de aplicar la migración, ejecutar:

```sql
NOTIFY pgrst, 'reload schema';
```

Esto fuerza a PostgREST a actualizar su caché del esquema.

---

### 4. Verificar Variables de Entorno en Vercel

En **Vercel Dashboard → Settings → Environment Variables**, verificar:

- ✅ `NEXT_PUBLIC_SUPABASE_URL` configurada
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurada
- ✅ `SUPABASE_SERVICE_ROLE_KEY` configurada (si se usa en backend)
- ✅ `NEXT_PUBLIC_APP_URL` = `https://mercadito-online-py.vercel.app`

---

### 5. Verificar Build en Vercel

1. Ir a **Vercel Dashboard → Deployments**
2. Verificar que el último deployment:
   - Estado: ✅ **Ready** o **Ready (Production)**
   - Sin errores en los logs
   - Node.js versión: 20.x (verificar en `package.json`)

---

### 6. Health Check

Antes de abrir el link, verificar:

```bash
curl -I https://mercadito-online-py.vercel.app
```

Debe retornar `200 OK`

---

### 7. Test Rápido Post-Deployment

Después de abrir el link, verificar en la consola del navegador:

- ❌ NO debe aparecer: `column products.image_url does not exist`
- ✅ Debe cargar: Lista de productos
- ✅ Debe funcionar: Ordenamiento y filtros

---

## 🔧 Si el Error Persiste

### Opción A: Refresh Manual de PostgREST

1. En Supabase Dashboard → Settings → API
2. Hacer un cambio menor en cualquier tabla (ej: agregar comentario)
3. Esto fuerza el refresh automático

### Opción B: Verificar Código

Buscar todas las referencias a `image_url` en productos:

```bash
grep -r "products.*image_url" src/
grep -r "\.select('\*')" src/lib/services/
```

Reemplazar todos los `.select('*')` por columnas específicas incluyendo `cover_url`.

---

## ✅ Orden de Ejecución

1. **Ejecutar `verify_database_state.sql`** → Verificar estado
2. **Si image_url existe** → Aplicar `20250203000000_fix_products_structure_syntax.sql`
3. **Ejecutar `NOTIFY pgrst, 'reload schema';`**
4. **Verificar variables de entorno en Vercel**
5. **Verificar build en Vercel**
6. **Health check**
7. **Abrir link de Vercel**
8. **Verificar consola del navegador** (no debe haber error de image_url)

---

## 📝 Notas Importantes

- La migración original tenía errores de sintaxis (faltaban `;` en las políticas RLS)
- Esta nueva migración corrige esos errores y asegura el estado correcto
- El refresh de PostgREST es **CRÍTICO** para que reconozca los cambios



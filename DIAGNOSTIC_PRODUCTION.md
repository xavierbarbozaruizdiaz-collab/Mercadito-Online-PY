# 🔍 Diagnóstico: ¿Por qué no se ve nada en Producción?

## 🚨 CHECKLIST RÁPIDO

### 1. Verificar Consola del Navegador (CRÍTICO)

Abre **DevTools (F12) → Console** en el sitio de producción y verifica:

- ❌ **Errores en rojo** (especialmente el de `image_url`)
- ⚠️ **Warnings** en amarillo
- 🔴 **Errores de red** (Network tab → Failed requests)

**Acción**: Copia TODOS los errores de la consola

---

### 2. Verificar Network Tab

**DevTools → Network tab:**

1. Recarga la página
2. Busca requests que fallen (status 400, 500, etc.)
3. Revisa las requests a Supabase:
   - `https://hqdatzhliaordlsqtjea.supabase.co/rest/v1/products`
   - Verifica el **Response** de requests fallidas

**Errores comunes:**
- `400 Bad Request` → Problema con la query (probablemente `image_url`)
- `401 Unauthorized` → Problema con `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `404 Not Found` → Tabla no existe o nombre incorrecto

---

### 3. Verificar Variables de Entorno en Vercel

**Vercel Dashboard → Settings → Environment Variables:**

✅ Debe existir:
```
NEXT_PUBLIC_SUPABASE_URL=https://hqdatzhliaordlsqtjea.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

**IMPORTANTE**: 
- Las variables `NEXT_PUBLIC_*` deben estar en **Production**, **Preview**, y **Development**
- Después de agregar/modificar variables, **redeployear** la aplicación

---

### 4. Verificar Build Logs en Vercel

**Vercel Dashboard → Deployments → Último deployment → View Build Logs:**

Busca:
- ❌ Errores de TypeScript
- ❌ Errores de build
- ⚠️ Warnings importantes
- ❌ Errores de variables de entorno

---

### 5. Verificar Build Status

El deployment debe estar en estado:
- ✅ **Ready** (verde)
- ❌ **Error** (rojo) → Hay un problema
- ⚠️ **Building** → Espera a que termine

---

### 6. Verificar CSP (Content Security Policy)

El `next.config.js` tiene CSP estricto. En producción, puede bloquear recursos.

**Síntoma**: La página carga pero sin estilos/scripts

**Solución temporal**: Relajar CSP para debug (luego volver a restringirlo)

---

### 7. Verificar Errores de Hidratación React

**Síntoma**: La página carga pero está "rota" o sin contenido

**En consola busca**: `Hydration failed` o `Hydration error`

---

### 8. Verificar Caché del Navegador

**Probar:**
1. Abrir en **ventana incógnito**
2. Limpiar caché del navegador
3. Hard refresh: `Ctrl + Shift + R` (Windows) o `Cmd + Shift + R` (Mac)

---

## 🔧 DIAGNÓSTICO PASO A PASO

### Paso 1: Verificar que la página responde

```bash
curl -I https://mercadito-online-py.vercel.app
```

**Debe retornar**: `200 OK`

Si retorna `404` o `500` → Problema de deployment

---

### Paso 2: Verificar HTML básico

Abre el sitio y **clic derecho → Ver código fuente**:

Busca:
- ✅ `<!DOCTYPE html>`
- ✅ `<html>`
- ✅ `<body>`
- ❌ Errores en el HTML

Si el HTML está vacío o tiene errores → Problema de build

---

### Paso 3: Verificar que Supabase responde

En la consola del navegador, ejecuta:

```javascript
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
```

**Problema común**: Si es `undefined` → Variables de entorno no están configuradas

---

### Paso 4: Verificar query a productos

En **Network tab**, busca la request:
```
GET https://hqdatzhliaordlsqtjea.supabase.co/rest/v1/products?select=...
```

**Revisa:**
- **Status Code**: ¿200 OK o 400/500?
- **Response**: ¿Qué dice el error?
- **Request Headers**: ¿Tiene `apikey` correcto?

---

### Paso 5: Test Directo de Supabase

Abre **Supabase Dashboard → SQL Editor** y ejecuta:

```sql
SELECT 
    id, 
    title, 
    price, 
    cover_url,
    status
FROM products 
LIMIT 5;
```

Si esto funciona → El problema NO es la base de datos

---

## 🎯 PROBLEMAS COMUNES Y SOLUCIONES

### Problema 1: "Página en blanco"

**Causas:**
1. Error de JavaScript que rompe todo
2. CSP bloqueando recursos
3. Variables de entorno faltantes

**Solución:**
1. Revisar consola del navegador
2. Verificar variables de entorno
3. Revisar build logs

---

### Problema 2: "Error: column products.image_url does not exist"

**Causa**: El error que ya identificamos

**Solución**:
1. Ejecutar `fix_image_url_immediate.sql` en Supabase
2. Ejecutar `NOTIFY pgrst, 'reload schema';`
3. Redeployear en Vercel
4. Limpiar caché del navegador

---

### Problema 3: "No se cargan productos"

**Causas:**
1. Error en la query (probablemente `image_url`)
2. RLS bloqueando acceso
3. Variables de entorno incorrectas

**Solución:**
1. Verificar Network tab → Response de la request a productos
2. Verificar políticas RLS en Supabase
3. Verificar `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

### Problema 4: "Estilos no cargan"

**Causa**: CSP bloqueando recursos o problema con Tailwind

**Solución:**
1. Verificar Network tab → ¿CSS files cargan?
2. Verificar CSP en `next.config.js`
3. Verificar que `output: 'standalone'` no rompe estilos

---

### Problema 5: "Diferente a localhost"

**Causas:**
1. Variables de entorno diferentes
2. Caché de producción
3. Build optimizations que cambian comportamiento

**Solución:**
1. Comparar variables de entorno local vs producción
2. Limpiar caché
3. Verificar que `NODE_ENV=production` no rompe nada

---

## 📋 CHECKLIST DE ACCIONES INMEDIATAS

1. ✅ **Abrir DevTools → Console** y copiar TODOS los errores
2. ✅ **Abrir DevTools → Network** y verificar requests fallidas
3. ✅ **Verificar variables de entorno** en Vercel
4. ✅ **Verificar build logs** en Vercel
5. ✅ **Ejecutar** `fix_image_url_immediate.sql` si no lo hiciste
6. ✅ **Ejecutar** `NOTIFY pgrst, 'reload schema';` en Supabase
7. ✅ **Redeployear** en Vercel después de cambios
8. ✅ **Probar en ventana incógnito**

---

## 🔍 QUÉ COMPARTIR PARA DIAGNÓSTICO

Si todavía no funciona, comparte:

1. **Errores de la consola** (texto completo)
2. **Screenshot de Network tab** (requests fallidas)
3. **Build logs** de Vercel (último deployment)
4. **Response** de una request fallida a Supabase
5. **Variables de entorno** que tienes configuradas (sin valores sensibles)




# 📋 Pasos Manuales para Completar el Deploy

**Solo las acciones que TÚ debes hacer manualmente**

---

## ✅ PASO 1: Guardar Configuración de Node.js en Vercel

**Dónde**: Vercel Dashboard → Settings → General → Node.js Version

**Qué hacer**:
1. Verifica que el dropdown muestre **"22.x"** (ya lo seleccionaste)
2. Haz clic en el botón **"Save"** (botón oscuro a la derecha)
3. Espera a que aparezca un mensaje de confirmación

**Tiempo**: ~10 segundos

---

## ✅ PASO 2: Verificar Variables de Entorno en Vercel

**Dónde**: Vercel Dashboard → Settings → Environment Variables

**Qué verificar** (variables críticas):

### Variables OBLIGATORIAS (sin ellas la app no funciona):
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

### Variables CRÍTICAS para Subastas (sin ellas las pujas no funcionan):
- [ ] `UPSTASH_REDIS_REST_URL` ⚠️ **MUY IMPORTANTE**
- [ ] `UPSTASH_REDIS_REST_TOKEN` ⚠️ **MUY IMPORTANTE**

### Variables para Pagos (opcionales pero recomendadas):
- [ ] `NEXT_PUBLIC_PAGOPAR_PUBLIC_TOKEN`
- [ ] `PAGOPAR_PRIVATE_TOKEN`

**Qué hacer**:
1. Revisa que todas las variables críticas estén configuradas
2. Si falta alguna, haz clic en **"Add New"** y agrega:
   - **Key**: Nombre de la variable
   - **Value**: Valor de la variable
   - **Environment**: Selecciona **"Production"** (y "Preview" si quieres)
3. Guarda cada variable

**Tiempo**: ~2-5 minutos (depende de cuántas falten)

---

## ✅ PASO 3: Aplicar Migración SQL (si es necesaria)

**Dónde**: Supabase Dashboard → SQL Editor

**Qué hacer**:
1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **SQL Editor**
4. Si la migración `20250202000012_place_bid_final_version.sql` no se aplicó automáticamente:
   - Copia el contenido de `supabase/migrations/20250202000012_place_bid_final_version.sql`
   - Pégalo en el SQL Editor
   - Haz clic en **"Run"**
   - Verifica que no haya errores

**Tiempo**: ~1-2 minutos

**Nota**: Si usas `supabase db push` o similar, esto se hace automáticamente.

---

## ✅ PASO 4: Ejecutar Deploy a Producción

**Dónde**: Terminal (PowerShell o Git Bash)

**Qué hacer**:

### Opción A: Script Automático (Recomendado)

**Windows PowerShell:**
```powershell
nvm use 22
.\scripts\deploy-prod.ps1
```

**Linux/Mac/Git Bash:**
```bash
nvm use 22
./scripts/deploy-prod.sh
```

El script te pedirá confirmación antes de deployar.

### Opción B: Comandos Manuales

```powershell
# 1. Usar Node 22
nvm use 22

# 2. Instalar dependencias
npm ci

# 3. Build local (verificar que funciona)
npm run build

# 4. Deploy a producción
npx vercel --prod --yes
```

**Tiempo**: ~3-5 minutos

---

## ✅ PASO 5: Verificar Deploy Exitoso

**Dónde**: Vercel Dashboard → Deployments

**Qué hacer**:
1. Ve a la pestaña **"Deployments"**
2. Verifica que el último deploy tenga estado **✅ "Ready"** (verde)
3. Si hay errores, haz clic en el deploy para ver los logs

**Tiempo**: ~30 segundos

---

## ✅ PASO 6: Probar en Producción

**Dónde**: Tu navegador

**Qué hacer**:
1. Abre `https://mercadito-online-py.vercel.app`
2. Verifica que:
   - La página carga correctamente
   - No hay errores en la consola del navegador (F12 → Console)
   - Las funcionalidades críticas funcionan (login, búsqueda, etc.)

**Tiempo**: ~2-3 minutos

---

## 📝 Resumen Rápido

1. ✅ **Guardar Node 22.x** en Vercel Dashboard (ya casi lo tienes)
2. ✅ **Verificar variables de entorno** en Vercel Dashboard
3. ⚠️ **Aplicar migración SQL** (si es necesaria)
4. ✅ **Ejecutar deploy** (`nvm use 22` → `.\scripts\deploy-prod.ps1`)
5. ✅ **Verificar deploy** en Vercel Dashboard
6. ✅ **Probar en producción**

---

## ⚠️ Si Algo Sale Mal

### Deploy falla:
- Revisa los logs en Vercel Dashboard → Deployments → Último deploy
- Ejecuta `npm run build` localmente para ver el error
- Verifica que todas las variables de entorno estén configuradas

### Variables de entorno faltantes:
- Agrega las variables faltantes en Vercel Dashboard
- Haz un nuevo deploy (las variables se aplican en el próximo deploy)

### Error de Node version:
- Verifica que guardaste Node 22.x en Vercel Dashboard
- Espera 1-2 minutos y vuelve a intentar el deploy

---

**¿Listo?** Empieza con el Paso 1 (guardar Node 22.x) y continúa en orden.






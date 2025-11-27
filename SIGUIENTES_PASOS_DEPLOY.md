# ✅ Siguientes Pasos - Deploy a Producción

**Estado actual:**
- ✅ Node 22.x configurado en Vercel
- ✅ Credenciales de Upstash Redis agregadas en Vercel

---

## 📋 Checklist de Variables de Entorno

Verifica que estas variables estén en Vercel Dashboard → Settings → Environment Variables:

### Variables OBLIGATORIAS:
- [x] `UPSTASH_REDIS_REST_URL` ✅ (ya agregada)
- [x] `UPSTASH_REDIS_REST_TOKEN` ✅ (ya agregada)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

### Variables para Pagos (opcionales pero recomendadas):
- [ ] `NEXT_PUBLIC_PAGOPAR_PUBLIC_TOKEN`
- [ ] `PAGOPAR_PRIVATE_TOKEN`

**Si falta alguna, agrégala ahora antes de deployar.**

---

## 🚀 Pasos Siguientes

### PASO 1: Verificar Todas las Variables de Entorno

1. Ve a **Vercel Dashboard** → **Settings** → **Environment Variables**
2. Verifica que todas las variables obligatorias estén configuradas
3. Si falta alguna, agrégala

**Tiempo**: ~2 minutos

---

### PASO 2: Aplicar Migración SQL (si es necesaria)

**¿Necesitas aplicar la migración?**
- Si usas `supabase db push` o migraciones automáticas: **NO necesitas hacer nada**
- Si no: **SÍ, necesitas aplicarla manualmente**

**Cómo aplicar manualmente:**
1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **SQL Editor**
4. Abre el archivo: `supabase/migrations/20250202000012_place_bid_final_version.sql`
5. Copia todo el contenido
6. Pégalo en SQL Editor
7. Haz clic en **"Run"**
8. Verifica que no haya errores

**Tiempo**: ~2 minutos

**Nota**: Esta migración actualiza `place_bid()` con la versión final que incluye bonus time mejorado.

---

### PASO 3: Ejecutar Deploy a Producción

**En tu terminal (PowerShell):**

```powershell
# 1. Usar Node 22
nvm use 22

# 2. Ejecutar script de deploy
.\scripts\deploy-prod.ps1
```

**O si prefieres comandos manuales:**

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

**El script automático:**
- ✅ Verifica Node.js 22.x
- ✅ Verifica Git
- ✅ Instala dependencias
- ✅ Ejecuta lint (advertencia, no bloquea)
- ✅ Ejecuta build (BLOQUEANTE - si falla, no deploya)
- ✅ Pide confirmación
- ✅ Deploy a producción

**Tiempo**: ~3-5 minutos

---

### PASO 4: Verificar Deploy Exitoso

1. Ve a **Vercel Dashboard** → **Deployments**
2. Espera a que el deploy termine (estado "Building" → "Ready")
3. Verifica que el último deploy tenga estado **✅ "Ready"** (verde)
4. Si hay errores:
   - Haz clic en el deploy
   - Revisa los logs en la pestaña "Build Logs" o "Function Logs"

**Tiempo**: ~1-2 minutos (mientras se construye)

---

### PASO 5: Probar en Producción

1. Abre `https://mercadito-online-py.vercel.app`
2. Verifica que:
   - ✅ La página carga correctamente
   - ✅ No hay errores en la consola del navegador (F12 → Console)
   - ✅ Las funcionalidades críticas funcionan:
     - Login
     - Búsqueda de productos
     - Ver subastas
     - Pujar en subastas (si es posible)

**Tiempo**: ~2-3 minutos

---

## 🎯 Resumen Rápido

1. ✅ **Verificar variables de entorno** (especialmente Supabase)
2. ⚠️ **Aplicar migración SQL** (si es necesaria)
3. ✅ **Ejecutar deploy** (`nvm use 22` → `.\scripts\deploy-prod.ps1`)
4. ✅ **Verificar deploy** en Vercel Dashboard
5. ✅ **Probar en producción**

---

## ⚠️ Si Algo Sale Mal

### Deploy falla:
- Revisa los logs en Vercel Dashboard → Deployments → Último deploy
- Ejecuta `npm run build` localmente para ver el error
- Verifica que todas las variables de entorno estén configuradas

### Error de variables de entorno:
- Verifica en Vercel Dashboard → Settings → Environment Variables
- Asegúrate de que todas las variables obligatorias estén configuradas
- Haz un nuevo deploy (las variables se aplican en el próximo deploy)

### Error de Node version:
- Verifica que guardaste Node 22.x en Vercel Dashboard
- Espera 1-2 minutos y vuelve a intentar el deploy

---

**¿Listo para deployar?** Empieza verificando las variables de entorno y luego ejecuta el deploy.






# 🔑 Cómo Obtener las Credenciales de Upstash Redis

**Variables necesarias:**
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

---

## 📋 Paso a Paso

### Paso 1: Crear Cuenta en Upstash (si no tienes una)

1. Ve a [https://upstash.com](https://upstash.com)
2. Haz clic en **"Sign Up"** o **"Log In"**
3. Puedes registrarte con:
   - GitHub
   - Google
   - Email

**Tiempo**: ~2 minutos

---

### Paso 2: Crear una Base de Datos Redis

1. Una vez dentro del dashboard de Upstash:
   - Haz clic en **"Create Database"** o **"New Database"**
   - O ve a la sección **"Redis"** → **"Create"**

2. Configuración básica:
   - **Name**: `mercadito-online-redis` (o el nombre que prefieras)
   - **Type**: Selecciona **"Regional"** (más económico) o **"Global"** (mejor latencia)
   - **Region**: Selecciona la región más cercana a tus usuarios (ej: `us-east-1` para América)
   - **Primary Region**: Misma región que elegiste arriba

3. Haz clic en **"Create"**

**Tiempo**: ~1 minuto

**Nota**: Upstash tiene un plan gratuito generoso que incluye:
- 10,000 comandos/día
- 256 MB de almacenamiento
- Suficiente para desarrollo y producción pequeña/mediana

---

### Paso 3: Obtener las Credenciales

Una vez creada la base de datos:

1. **Ve a la página de detalles de tu base de datos**
   - Haz clic en el nombre de la base de datos que acabas de crear

2. **Busca la sección "REST API"**
   - En el dashboard, deberías ver pestañas o secciones como:
     - **"Details"**
     - **"REST API"** ← **AQUÍ**
     - **"Console"**
     - **"Settings"**

3. **Copia las credenciales:**
   - **UPSTASH_REDIS_REST_URL**: 
     - Busca el campo **"UPSTASH_REDIS_REST_URL"** o **"REST URL"**
     - Debería verse algo como: `https://xxxxx.upstash.io`
     - Copia este valor completo
   
   - **UPSTASH_REDIS_REST_TOKEN**:
     - Busca el campo **"UPSTASH_REDIS_REST_TOKEN"** o **"REST TOKEN"**
     - Debería verse algo como: `AXxxxxx...` (un string largo)
     - Copia este valor completo

**⚠️ IMPORTANTE**: 
- Estas credenciales son **secretas** - no las compartas públicamente
- Si las expones por error, puedes regenerarlas desde Settings → Security

**Tiempo**: ~1 minuto

---

### Paso 4: Agregar las Variables en Vercel

1. **Ve a Vercel Dashboard**:
   - [https://vercel.com/dashboard](https://vercel.com/dashboard)
   - Selecciona tu proyecto `mercadito-online-py`

2. **Ve a Settings → Environment Variables**

3. **Agrega la primera variable:**
   - Haz clic en **"Add New"**
   - **Key**: `UPSTASH_REDIS_REST_URL`
   - **Value**: Pega el valor que copiaste (ej: `https://xxxxx.upstash.io`)
   - **Environment**: Selecciona **"Production"** (y "Preview" si quieres)
   - Haz clic en **"Save"**

4. **Agrega la segunda variable:**
   - Haz clic en **"Add New"** nuevamente
   - **Key**: `UPSTASH_REDIS_REST_TOKEN`
   - **Value**: Pega el token que copiaste (ej: `AXxxxxx...`)
   - **Environment**: Selecciona **"Production"** (y "Preview" si quieres)
   - Haz clic en **"Save"**

**Tiempo**: ~2 minutos

---

### Paso 5: Verificar que Funciona (Opcional)

Después de agregar las variables, puedes verificar que funcionan:

1. **Espera 1-2 minutos** (para que Vercel actualice las variables)

2. **Haz un nuevo deploy** (las variables se aplican en el próximo deploy)

3. **Revisa los logs** en Vercel Dashboard → Deployments → Último deploy
   - No deberías ver el warning: `⚠️ Variables de entorno de Upstash no configuradas`

---

## 🎯 Resumen Rápido

1. ✅ Crear cuenta en [upstash.com](https://upstash.com)
2. ✅ Crear base de datos Redis (Regional o Global)
3. ✅ Ir a la sección "REST API" de tu base de datos
4. ✅ Copiar `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`
5. ✅ Agregar ambas variables en Vercel Dashboard → Settings → Environment Variables

**Tiempo total**: ~5-10 minutos

---

## 💰 Costos

**Plan Gratuito de Upstash:**
- ✅ 10,000 comandos/día
- ✅ 256 MB de almacenamiento
- ✅ Suficiente para desarrollo y producción pequeña/mediana

**Si necesitas más:**
- Planes pagos desde $0.20/100K comandos
- Muy económico para producción

---

## ⚠️ Si No Encuentras las Credenciales

Si no ves la sección "REST API" en el dashboard:

1. **Verifica que estás en la página correcta:**
   - Deberías estar en la página de detalles de tu base de datos Redis
   - No en la lista de bases de datos

2. **Busca en diferentes lugares:**
   - Algunos dashboards muestran las credenciales en:
     - Una pestaña "REST API"
     - Una sección "Connection Details"
     - Un botón "Show Credentials" o "View Credentials"
     - En "Settings" → "Security" o "API Keys"

3. **Alternativa - Usar Console:**
   - Si tienes acceso a la consola de Redis, puedes usar el cliente REST directamente
   - Pero es más fácil obtener las credenciales desde el dashboard

---

## 🔒 Seguridad

- ✅ **NUNCA** commitees estas credenciales en Git
- ✅ **NUNCA** las compartas públicamente
- ✅ Si las expones por error, **regenera las credenciales** desde Upstash Dashboard → Settings → Security
- ✅ Usa **variables de entorno** siempre (como estás haciendo en Vercel)

---

**¿Listo?** Sigue estos pasos y tendrás Redis funcionando en producción en menos de 10 minutos.






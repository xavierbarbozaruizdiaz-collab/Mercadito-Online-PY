# 🚀 Guía de Deploy a Producción - Vercel CLI

**Mercadito Online PY**  
**Versión**: 1.0  
**Última actualización**: 2024

---

## 📋 Tabla de Contenidos

1. [Prerrequisitos](#prerrequisitos)
2. [Primer Uso (Configuración Inicial)](#primer-uso-configuración-inicial)
3. [Deploy Normal (Uso Diario)](#deploy-normal-uso-diario)
4. [Variables de Entorno Requeridas](#variables-de-entorno-requeridas)
5. [Errores Comunes y Soluciones](#errores-comunes-y-soluciones)
6. [Verificación Post-Deploy](#verificación-post-deploy)

---

## ✅ Prerrequisitos

### 1. Node.js y NVM

**Requisito**: Node.js 22.x

**Instalación:**
```bash
# Si usas NVM (recomendado)
nvm install 22
nvm use 22

# Verificar versión
node -v  # Debe mostrar v22.x.x
```

**Windows (nvm-windows):**
```powershell
# Instalar nvm-windows desde: https://github.com/coreybutler/nvm-windows
nvm install 22
nvm use 22
```

### 2. Vercel CLI

**Opción A: Instalación Global (Recomendado)**
```bash
npm install -g vercel
```

**Opción B: Usar npx (sin instalar)**
```bash
# No necesitas instalar, se usará npx vercel automáticamente
```

**Verificar instalación:**
```bash
vercel --version
# o
npx vercel --version
```

### 3. Git y Repositorio

- ✅ Git instalado
- ✅ Repositorio clonado
- ✅ Acceso a la rama `main` o `production`

---

## 🔧 Primer Uso (Configuración Inicial)

### Paso 1: Login en Vercel

```bash
npx vercel login
```

Esto abrirá tu navegador para autenticarte. Sigue las instrucciones.

### Paso 2: Vincular Proyecto a Vercel

```bash
npx vercel link
```

**Preguntas que te hará:**
1. **"Set up and develop"?** → Selecciona el proyecto existente
2. **"Which scope?"** → Selecciona tu organización/team
3. **"Link to existing project?"** → Sí
4. **"What's the name of your existing project?"** → `mercadito-online-py`

**Resultado esperado:**
- Se creará `.vercel/project.json` con la configuración
- Este archivo NO debe commitearse (ya está en `.gitignore`)

### Paso 3: Dar Permisos de Ejecución al Script (Linux/Mac)

```bash
chmod +x scripts/deploy-prod.sh
```

**Windows**: No es necesario, el script PowerShell se ejecuta directamente.

### Paso 4: Verificar Variables de Entorno en Vercel

**IMPORTANTE**: Antes del primer deploy, verifica que todas las variables de entorno estén configuradas:

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona el proyecto `mercadito-online-py`
3. Ve a **Settings** → **Environment Variables**
4. Verifica que existan las variables críticas (ver sección [Variables de Entorno](#variables-de-entorno-requeridas))

---

## 🚀 Deploy Normal (Uso Diario)

### Opción 1: Script Automático (Recomendado)

**Linux/Mac:**
```bash
nvm use 22
./scripts/deploy-prod.sh
```

**Windows (PowerShell):**
```powershell
nvm use 22
.\scripts\deploy-prod.ps1
```

**Windows (Git Bash):**
```bash
nvm use 22
./scripts/deploy-prod.sh
```

### Opción 2: Comandos Manuales

Si prefieres ejecutar los pasos manualmente:

```bash
# 1. Usar Node 22
nvm use 22

# 2. Instalar dependencias
npm ci

# 3. Build local (verificar que funciona)
npm run build

# 4. Deploy a producción
npx vercel --prod --yes
```

---

## 🔐 Variables de Entorno Requeridas

### Variables Críticas (Sin ellas la app NO funciona)

Estas variables **DEBEN** estar configuradas en Vercel Dashboard:

| Variable | Descripción | Dónde obtener |
|----------|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública de Supabase | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (server-side) | Supabase Dashboard → Settings → API |

### Variables Importantes (Funcionalidad reducida sin ellas)

| Variable | Descripción | Dónde obtener |
|----------|-------------|---------------|
| `UPSTASH_REDIS_REST_URL` | URL de Redis (Upstash) | Upstash Dashboard → Redis → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | Token de Redis (Upstash) | Upstash Dashboard → Redis → REST API |
| `NEXT_PUBLIC_PAGOPAR_PUBLIC_TOKEN` | Token público Pagopar | Pagopar Dashboard |
| `PAGOPAR_PRIVATE_TOKEN` | Token privado Pagopar | Pagopar Dashboard |

### Variables Opcionales (Mejoran funcionalidad)

- `NEXT_PUBLIC_APP_URL` - URL de producción
- `NEXT_PUBLIC_GA_ID` - Google Analytics
- `NEXT_PUBLIC_GTM_ID` - Google Tag Manager
- `NEXT_PUBLIC_FACEBOOK_PIXEL_ID` - Facebook Pixel
- `RESEND_API_KEY` - Para emails
- `SENTRY_DSN` - Para error tracking

### Cómo Configurar Variables en Vercel

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona el proyecto `mercadito-online-py`
3. Ve a **Settings** → **Environment Variables**
4. Agrega cada variable:
   - **Key**: Nombre de la variable (ej: `NEXT_PUBLIC_SUPABASE_URL`)
   - **Value**: Valor de la variable
   - **Environment**: Selecciona `Production` (y `Preview` si quieres)
5. Guarda

**Nota**: Después de agregar/modificar variables, necesitas hacer un nuevo deploy para que se apliquen.

---

## 🐛 Errores Comunes y Soluciones

### Error 1: "Module not found: Can't resolve '@upstash/redis'"

**Causa**: Dependencia faltante en `package.json` o no instalada.

**Solución:**
```bash
npm install @upstash/redis
git add package.json package-lock.json
git commit -m "fix: Agregar dependencia @upstash/redis"
git push origin main
```

---

### Error 2: "Command 'npm run build' exited with code 1"

**Causa**: Error de TypeScript, sintaxis, o dependencias.

**Solución:**
1. Ejecuta localmente: `npm run build`
2. Revisa los errores en la consola
3. Corrige los errores
4. Vuelve a intentar el deploy

**Errores comunes:**
- TypeScript errors → `npm run typecheck`
- Lint errors → `npm run lint`
- Dependencias faltantes → `npm install`

---

### Error 3: "Environment variable not found"

**Causa**: Variable de entorno faltante en Vercel.

**Solución:**
1. Ve a Vercel Dashboard → Settings → Environment Variables
2. Agrega la variable faltante
3. Haz un nuevo deploy

---

### Error 4: "Node version mismatch"

**Causa**: Vercel está usando Node 20.x pero el código requiere Node 22.x.

**Solución:**
1. Ve a Vercel Dashboard → Settings → General
2. En "Node.js Version", selecciona `22.x`
3. Guarda y haz un nuevo deploy

**O** actualiza `.vercel/project.json` (pero esto se sobrescribe, mejor hacerlo desde Dashboard).

---

### Error 5: "Build timeout" o "Function timeout"

**Causa**: Build o función tarda demasiado.

**Solución:**
- Revisa `vercel.json` → `functions` → `maxDuration` (actualmente 30s)
- Optimiza el código que tarda mucho
- Considera usar ISR o caché

---

### Error 6: "Deploy failed: Invalid project"

**Causa**: Proyecto no vinculado correctamente.

**Solución:**
```bash
# Re-vincular proyecto
npx vercel link

# Seleccionar proyecto existente: mercadito-online-py
```

---

## ✅ Verificación Post-Deploy

### 1. Verificar en Vercel Dashboard

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona el proyecto `mercadito-online-py`
3. Ve a la pestaña **Deployments**
4. Verifica que el último deploy tenga estado **✅ Ready**

### 2. Verificar en Producción

**URLs a verificar:**
- Home: `https://mercadito-online-py.vercel.app`
- Subastas: `https://mercadito-online-py.vercel.app/auctions`
- Productos: `https://mercadito-online-py.vercel.app/products`

**Qué verificar:**
- ✅ Página carga correctamente
- ✅ No hay errores en consola del navegador
- ✅ Funcionalidades críticas funcionan (login, búsqueda, etc.)

### 3. Verificar Logs

**En Vercel Dashboard:**
1. Ve a **Deployments** → Selecciona el último deploy
2. Ve a la pestaña **Functions** o **Logs**
3. Revisa si hay errores en tiempo de ejecución

**Errores comunes a buscar:**
- `500 Internal Server Error` → Revisar logs de funciones
- `Environment variable not found` → Agregar variable faltante
- `Database connection error` → Verificar Supabase
- `Redis connection error` → Verificar Upstash

---

## 📊 Flujo Completo Resumido

```
1. nvm use 22
2. ./scripts/deploy-prod.sh
   ├─ Verifica Node.js
   ├─ Verifica Git
   ├─ Instala dependencias (npm ci)
   ├─ Ejecuta lint (advertencia, no bloquea)
   ├─ Ejecuta build (BLOQUEANTE - si falla, no deploya)
   └─ Deploy a producción (npx vercel --prod --yes)
3. Verificar en Vercel Dashboard
4. Probar en producción
```

---

## 🔄 Rollback (Si algo sale mal)

### Opción 1: Desde Vercel Dashboard

1. Ve a **Deployments**
2. Encuentra el deploy anterior que funcionaba
3. Haz clic en los tres puntos (⋯) → **Promote to Production**

### Opción 2: Desde CLI

```bash
# Listar deploys
npx vercel ls

# Promover un deploy anterior
npx vercel promote <deployment-url>
```

### Opción 3: Revertir commit en Git

```bash
# Ver commits recientes
git log --oneline -5

# Revertir último commit (crea nuevo commit que deshace cambios)
git revert HEAD
git push origin main
```

---

## 📝 Notas Importantes

### ⚠️ Antes de Deployar

1. **Verifica que el build local funciona**: `npm run build`
2. **Verifica que no hay cambios sin commitear** (o commitea primero)
3. **Revisa los cambios** que vas a deployar (`git log`)
4. **Verifica variables de entorno** en Vercel Dashboard

### 🔒 Seguridad

- **NUNCA** commitees `.env.local` o archivos con secrets
- **NUNCA** commitees `.vercel/project.json` (ya está en `.gitignore`)
- **SIEMPRE** usa variables de entorno en Vercel Dashboard, no en código

### 🚨 Si el Deploy Falla

1. **NO entres en pánico** - el deploy anterior sigue funcionando
2. **Revisa los logs** en Vercel Dashboard
3. **Ejecuta `npm run build` localmente** para reproducir el error
4. **Corrige el error** y vuelve a intentar

---

## 📞 Soporte

Si tienes problemas que no se resuelven con esta guía:

1. Revisa `DEPLOY_DIAGNOSTICO_VERCECLI.md` para diagnóstico detallado
2. Revisa los logs en Vercel Dashboard
3. Ejecuta `npm run build` localmente para ver errores específicos

---

**Última actualización**: 2024






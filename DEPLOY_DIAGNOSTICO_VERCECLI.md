# 🔍 Diagnóstico: Estado Actual de Deploy a Producción

**Fecha**: 2024  
**Objetivo**: Identificar por qué los deploys a producción fallan y solucionarlo de raíz

---

## 📋 1. Estado Actual del Deploy

### 1.1. Método de Deploy Actual

**Configuración detectada:**
- ✅ **Vercel CLI**: Proyecto vinculado (`.vercel/project.json` existe)
- ✅ **GitHub Integration**: Deploy automático desde `main` branch
- ✅ **GitHub Actions**: Workflow `deploy-production.yml` configurado (pero con `continue-on-error: true`)

**Proyecto Vercel:**
- **Project ID**: `prj_yg0zLyglfq2v57OvLkwKLNS0k99M`
- **Org ID**: `team_cMhBvKCHlyxNqY0AptVkmqyd`
- **Project Name**: `mercadito-online-py`

**Configuración en `vercel.json`:**
- Framework: Next.js
- Node Version: **22.x** (configurado en `vercel.json`, pero `.vercel/project.json` muestra 20.x)
- Build Command: `npm run build`
- Install Command: `npm ci` ✅ **CORREGIDO**

---

## 🐛 2. Problemas Identificados

### 2.1. Discrepancia en Versión de Node

**Problema:**
- `package.json` especifica: `"node": "22.x"` (en `engines`)
- `.nvmrc` contiene: `22`
- `.vercel/project.json` tiene: `"nodeVersion": "20.x"` ⚠️

**Impacto:**
- Vercel puede estar usando Node 20.x mientras el código requiere Node 22.x
- Esto puede causar errores de build si hay características específicas de Node 22

**Solución aplicada:**
- ✅ Agregado `"nodeVersion": "22.x"` en `vercel.json`
- ⚠️ **ACCIÓN REQUERIDA**: Configurar Node 22.x en Vercel Dashboard (Settings → General → Node.js Version)
- Ver `CONFIGURACION_VERCEL_NODE_VERSION.md` para instrucciones detalladas

---

### 2.2. Install Command Problemático

**Problema en `vercel.json`:**
```json
"installCommand": "rm -rf node_modules package-lock.json && npm install"
```

**Por qué era problemático:**
1. Eliminaba `package-lock.json` en cada deploy, perdiendo determinismo
2. Causaba inconsistencias entre builds
3. Más lento (no usaba cache de npm)
4. Podía instalar versiones diferentes de dependencias

**Solución aplicada:**
```json
"installCommand": "npm ci"
```
- ✅ Cambiado a `npm ci` que es determinístico y más rápido
- ✅ Respeta `package-lock.json` exactamente
- ✅ Mejor para producción

---

### 2.3. Errores de Build Recientes

**Errores observados en commits recientes:**

1. **Commit `8d54466`** (feat: Mejoras UX subastas):
   - Error: Código duplicado en `checkout/page.tsx`
   - **Estado**: ✅ Corregido en commit `ec59316`

2. **Commit `7280316`** (fix: Reemplazar require() por import):
   - Error: Uso de `require()` en componente cliente
   - **Estado**: ✅ Corregido

3. **Commit `ec59316`** (fix: Eliminar código duplicado):
   - Error: `toast.warning()` no existe en `react-hot-toast`
   - **Estado**: ✅ Corregido en commit `c13fc6c`

4. **Commit `c13fc6c`** (fix: Reemplazar toast.warning):
   - **Estado**: ⏳ Pendiente verificar

**Errores comunes detectados:**
- ❌ Código duplicado (sintaxis)
- ❌ Uso incorrecto de APIs (`require()` en cliente, `toast.warning()`)
- ❌ Dependencias faltantes (`@upstash/redis`)

---

### 2.4. Variables de Entorno Críticas

**Variables requeridas para build (mínimas):**
- `NEXT_PUBLIC_SUPABASE_URL` ✅
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅

**Variables requeridas para funcionalidad completa:**
- `SUPABASE_SERVICE_ROLE_KEY` (para server-side)
- `UPSTASH_REDIS_REST_URL` (para locks y rate limiting)
- `UPSTASH_REDIS_REST_TOKEN` (para locks y rate limiting)
- `NEXT_PUBLIC_PAGOPAR_PUBLIC_TOKEN` (para pagos)
- `PAGOPAR_PRIVATE_TOKEN` (para pagos)

**Verificación:**
- ⚠️ No se puede verificar desde aquí si están configuradas en Vercel
- **Acción requerida**: Verificar en Vercel Dashboard → Project Settings → Environment Variables

---

## 🔧 3. Causa Raíz del Problema

### Análisis

**Build local**: ✅ **FUNCIONA** (se completó exitosamente)

**Deploy en Vercel**: ❌ **FALLA**

**Conclusión:**
El problema NO es el código en sí, sino la **configuración de Vercel**:

1. **Versión de Node incorrecta** (20.x vs 22.x)
2. **Install command problemático** (elimina package-lock.json)
3. **Posibles variables de entorno faltantes** (especialmente Redis/Upstash)

---

## ✅ 4. Soluciones Aplicadas

### 4.1. Correcciones de Código
- ✅ Eliminado código duplicado en `checkout/page.tsx`
- ✅ Cambiado `require()` por `import` estático
- ✅ Corregido `toast.warning()` → `toast()` con opciones
- ✅ Agregada dependencia `@upstash/redis`

### 4.2. Correcciones de Configuración (Pendientes)

**Archivos a modificar:**
1. `vercel.json` - Actualizar `installCommand`
2. `.vercel/project.json` - Actualizar `nodeVersion` (o configurar en Vercel Dashboard)
3. Verificar variables de entorno en Vercel Dashboard

---

## 📝 5. Resumen Ejecutivo

### Estado Actual
- ✅ Código: Build local funciona
- ❌ Deploy: Falla en Vercel
- ⚠️ Configuración: Desalineada (Node version, install command)

### Problemas Principales
1. ✅ **Discrepancia Node version** (20.x vs 22.x) - **CORREGIDO** (agregado en vercel.json, falta configurar en Dashboard)
2. ✅ **Install command problemático** (elimina package-lock.json) - **CORREGIDO** (cambiado a `npm ci`)
3. ⚠️ **Posibles env vars faltantes** (especialmente Upstash Redis) - **VERIFICAR EN VERCEL DASHBOARD**

### Próximos Pasos (Acciones Requeridas)
1. ✅ Actualizar `vercel.json` con `installCommand` correcto - **COMPLETADO**
2. ⚠️ **ACCIÓN REQUERIDA**: Configurar Node 22.x en Vercel Dashboard (Settings → General → Node.js Version)
3. ⚠️ **ACCIÓN REQUERIDA**: Verificar variables de entorno en Vercel Dashboard (especialmente Upstash Redis)
4. ✅ Crear script de deploy simple (`scripts/deploy-prod.sh` y `.ps1`) - **COMPLETADO**
5. ✅ Documentar proceso completo - **COMPLETADO**

---

**Última actualización**: 2024


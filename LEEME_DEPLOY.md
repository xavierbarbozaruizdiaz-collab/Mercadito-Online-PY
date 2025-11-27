# 🚀 INICIO RÁPIDO: Deploy a Producción

## ⚡ 2 Comandos para Deployar

### Windows (PowerShell):
```powershell
nvm use 22
.\scripts\deploy-prod.ps1
```

### Linux/Mac/Git Bash:
```bash
nvm use 22
./scripts/deploy-prod.sh
```

---

## ⚠️ ANTES del Primer Deploy

### 1. Configurar Node 22.x en Vercel Dashboard
1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Proyecto → Settings → General → Node.js Version
3. Selecciona **22.x** y guarda

**Ver**: `CONFIGURACION_VERCEL_NODE_VERSION.md` para detalles

### 2. Verificar Variables de Entorno
1. Vercel Dashboard → Settings → Environment Variables
2. Verifica que existan:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `UPSTASH_REDIS_REST_URL` ⚠️ **CRÍTICO**
   - `UPSTASH_REDIS_REST_TOKEN` ⚠️ **CRÍTICO**

**Ver**: `DEPLOY_GUIA_VERCECLI.md` → Sección "Variables de Entorno"

---

## 📚 Documentación Completa

- **`DEPLOY_GUIA_VERCECLI.md`** - Guía paso a paso completa
- **`DEPLOY_DIAGNOSTICO_VERCECLI.md`** - Diagnóstico de problemas
- **`CONFIGURACION_VERCEL_NODE_VERSION.md`** - Configurar Node version
- **`RESUMEN_SOLUCION_DEPLOY.md`** - Resumen ejecutivo

---

## ✅ Estado Actual

- ✅ Build local funciona
- ✅ Scripts de deploy creados
- ✅ Configuración corregida
- ⚠️ **Pendiente**: Configurar Node 22.x en Vercel Dashboard
- ⚠️ **Pendiente**: Verificar variables de entorno

---

**¿Listo?** Ejecuta los 2 comandos arriba después de configurar Node 22.x en Dashboard.






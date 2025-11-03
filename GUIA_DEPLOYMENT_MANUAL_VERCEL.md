# 🚀 GUÍA COMPLETA: DEPLOYMENT MANUAL EN VERCEL

## 🎯 OBJETIVO

Deployar manualmente el commit `3edae25` o `38308cf` en Vercel para que los cambios aparezcan en producción.

---

## 📋 MÉTODO 1: VERCEL DASHBOARD (MÁS FÁCIL)

### Paso 1: Ir a Vercel Dashboard
1. Ve a: https://vercel.com/dashboard
2. Selecciona el proyecto: **Mercadito Online PY**

### Paso 2: Crear Deployment
**Opción A: Desde Deployments**
1. Ve a la pestaña **"Deployments"**
2. Busca el botón **"Create Deployment"** (arriba a la derecha, puede estar oculto)
3. Si no lo ves, haz clic en los **3 puntos** del último deployment
4. Busca opción: **"Redeploy"** o **"Create New Deployment"**

**Opción B: Desde Settings → Git**
1. Ve a **Settings** → **Git**
2. Busca sección de **"Deployments"**
3. Puede haber opción para crear deployment manual

### Paso 3: Configurar Deployment
1. **Git Repository:** `xavierbarbozaruizdiaz-collab/Mercadito-Online-PY`
2. **Branch:** `main`
3. **Commit:** `3edae25` (o busca en el dropdown)
4. **Environment:** `Production`
5. **Desmarca:** "Use existing Build Cache" ✅ IMPORTANTE

### Paso 4: Deploy
1. Haz clic en **"Deploy"**
2. Espera 5-10 minutos
3. Verifica que el build pasa

---

## 📋 MÉTODO 2: VERCEL CLI

### Paso 1: Instalar Vercel CLI
```bash
npm install -g vercel
```

### Paso 2: Login
```bash
vercel login
```

### Paso 3: Deployar Commit Específico
```bash
# Ir al directorio del proyecto
cd C:\Users\PCera\mercadito-online-py

# Checkout del commit específico
git checkout 3edae25

# Deployar a producción
vercel --prod --force
```

**Nota:** Esto desplegará el código en el estado del commit `3edae25`.

---

## 📋 MÉTODO 3: GITHUB ACTIONS (Re-run)

### Paso 1: Ir a GitHub Actions
1. Ve a: https://github.com/xavierbarbozaruizdiaz-collab/Mercadito-Online-PY/actions

### Paso 2: Encontrar Workflow
1. Busca el workflow **"Deploy to Production #140"** (o el más reciente)
2. Haz clic en él

### Paso 3: Re-run
1. Haz clic en **"Re-run workflow"** (botón arriba a la derecha)
2. Selecciona: **"Re-run all jobs"**
3. Esto debería usar el commit del workflow original

**Nota:** Esto puede no funcionar si el workflow tiene errores.

---

## 📋 MÉTODO 4: PROMOVER DEPLOYMENT EXISTENTE

Si ya existe un deployment con el commit correcto:

1. Ve a **Vercel Dashboard** → **Deployments**
2. Busca el deployment que tiene commit `3edae25` o `38308cf`
3. Haz clic en los **3 puntos** del deployment
4. Selecciona **"Promote to Production"**

---

## ✅ VERIFICACIÓN DESPUÉS DEL DEPLOYMENT

### 1. Verificar Commit en Build Logs
1. Ve a Vercel Dashboard → Deployments
2. Haz clic en el nuevo deployment
3. En "Source", verifica que dice:
   - ✅ `Commit: 3edae25` o `38308cf`
   - ❌ NO debe decir `cc9a642`

### 2. Verificar Build Logs
1. En el deployment, ve a "Build Logs"
2. Debe mostrar:
   - ✅ "Compiled successfully"
   - ✅ NO debe mostrar "Generating static pages" para `/`

### 3. Verificar Página Principal
1. Abre: https://mercadito-online-py.vercel.app/
2. Debe mostrar:
   - ✅ Banner azul/morado "🔍 DEBUG HERO"
   - ✅ Timestamp y Random en el banner
   - ✅ Estos valores cambian en cada refresh

---

## 🎯 RECOMENDACIÓN FINAL

**Usa el MÉTODO 1 (Vercel Dashboard)** si es posible.

Si no ves la opción "Create Deployment", puedes:
1. **Cancelar el workflow bloqueado** en GitHub
2. **Esperar a que Vercel detecte el nuevo commit** automáticamente (puede tardar)
3. **Usar Vercel CLI** (Método 2) como alternativa

---

## 📝 COMMITS DISPONIBLES

- **`3edae25`** (RECOMENDADO): Más reciente, incluye timeouts para workflows
- **`38308cf`**: Sin `experimental.dynamicIO`, debería funcionar

**Ambos deberían funcionar, pero `3edae25` es más reciente.**


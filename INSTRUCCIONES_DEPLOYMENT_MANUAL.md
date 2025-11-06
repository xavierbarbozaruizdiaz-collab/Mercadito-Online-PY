# 🚀 CÓMO CREAR DEPLOYMENT MANUAL EN VERCEL

## 📋 PASO A PASO

### Opción 1: Desde Vercel Dashboard (RECOMENDADO)

1. **Ve a Vercel Dashboard:**
   - https://vercel.com/dashboard
   - Selecciona el proyecto: `mercadito-online-py`

2. **Crea Deployment Manual:**
   - En la página de Deployments, busca el botón **"Create Deployment"** (arriba a la derecha)
   - O ve a: **Settings** → **Git** → Busca opción para crear deployment

3. **Si no ves "Create Deployment" directamente:**
   - Ve a: **Deployments** → Haz clic en los **3 puntos** del último deployment
   - Busca opción: **"Redeploy"** o **"Create New Deployment"**

4. **Selecciona el Commit:**
   - **Branch:** `main`
   - **Commit:** `3edae25` (el más reciente) o `38308cf`
   - **Desmarca:** "Use existing Build Cache"

5. **Haz clic en "Deploy"**

---

### Opción 2: Desde Vercel CLI

1. **Instala Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Haz login:**
   ```bash
   vercel login
   ```

3. **Deploya commit específico:**
   ```bash
   # Para commit 3edae25
   git checkout 3edae25
   vercel --prod --force
   
   # O directamente
   vercel --prod --force --cwd . --token $VERCEL_TOKEN
   ```

---

### Opción 3: Desde GitHub Actions (Re-run workflow)

1. **Ve a GitHub → Actions**
2. **Busca el workflow "Deploy to Production"**
3. **Haz clic en el workflow que usó el commit `3edae25`**
4. **Haz clic en "Re-run workflow"** (botón arriba a la derecha)
5. **Selecciona:** "Re-run all jobs" o "Re-run failed jobs"

---

### Opción 4: Usando Vercel API

Si tienes acceso a la API de Vercel:

```bash
curl -X POST \
  "https://api.vercel.com/v13/deployments" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "mercadito-online-py",
    "gitSource": {
      "type": "github",
      "repo": "xavierbarbozaruizdiaz-collab/Mercadito-Online-PY",
      "ref": "3edae25"
    },
    "projectSettings": {
      "buildCommand": "npm run build",
      "installCommand": "npm ci"
    }
  }'
```

---

## ✅ VERIFICACIÓN DESPUÉS DEL DEPLOYMENT

1. **Verifica Build Logs:**
   - Debe mostrar: `Commit: 3edae25` (o `38308cf`)
   - Debe mostrar: "Compiled successfully"

2. **Verifica Página Principal:**
   - Debe mostrar banner azul/morado con timestamp y random
   - Estos valores deben cambiar en cada refresh

3. **Promueve a Producción:**
   - Si el deployment es Preview, haz clic en "Promote to Production"

---

## 🎯 RECOMENDACIÓN

**Usa la Opción 1 (Vercel Dashboard)** - Es la más directa y visual.

**Commit recomendado:** `3edae25` (el más reciente con los timeouts)


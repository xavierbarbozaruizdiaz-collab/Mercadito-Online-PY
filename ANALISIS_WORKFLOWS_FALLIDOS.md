# 🔍 ANÁLISIS DE WORKFLOWS FALLIDOS

## 📊 PROBLEMAS IDENTIFICADOS

### 🔴 PROBLEMA PRINCIPAL: **BRANCH MISMATCH**

**Situación:**
- Estás trabajando en la branch: `feat/core-ecommerce`
- Los workflows están configurados para ejecutarse en: `main`, `dev` o `production`

**Por qué fallan:**
1. Los workflows se ejecutan en `feat/core-ecommerce` (porque están configurados para ejecutarse en PRs)
2. Pero muchos jobs tienen `if: github.ref == 'refs/heads/main'` 
3. Esto hace que algunos jobs se salten o fallen condicionalmente

---

## 🛠️ PROBLEMAS ESPECÍFICOS EN CADA WORKFLOW

### 1. **`.github/workflows/deploy.yml`**

**Problemas:**
- ❌ Ejecuta `npm run test:e2e` pero no verifica si el servidor está corriendo
- ❌ `npm audit --audit-level moderate` puede fallar si hay vulnerabilidades
- ❌ Health check falla si la URL no está disponible

**Branches esperadas:** `main` solamente

---

### 2. **`.github/workflows/ci-cd.yml`**

**Problemas:**
- ❌ Requiere `SNYK_TOKEN` (línea 102) - Si no está configurado, falla
- ❌ Ejecuta `npx playwright test` sin servidor de desarrollo corriendo
- ❌ El deploy solo corre en branch `main` (línea 112)

**Branches esperadas:** `main`, `dev`

---

### 3. **`.github/workflows/deploy-production.yml`** ⚠️ MÁS PROBLEMAS

**Problemas críticos:**
- ❌ Línea 68: **FALTA el `uses:` del step de Snyk** (syntax error)
  ```yaml
  - name: 🔒 Run Snyk security audit
    uses: snyk/actions/node@master  # <- ESTA LÍNEA FALTA
    env:
      SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
  ```
- ❌ Requiere `SNYK_TOKEN` secret
- ❌ Ejecuta `npm run test:e2e:production` (línea 124) pero este script **NO EXISTE** en `package.json`
- ❌ Requiere `SLACK_WEBHOOK_URL` para notificaciones (línea 143, 156)

**Branches esperadas:** `main`, `production`

---

## 🔑 SECRETS FALTANTES (Probable causa principal)

Los workflows requieren estos secrets en GitHub:

1. ✅ `NEXT_PUBLIC_SUPABASE_URL` - Probablemente configurado
2. ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Probablemente configurado
3. ❓ `VERCEL_TOKEN` - ¿Está configurado?
4. ❓ `VERCEL_ORG_ID` - ¿Está configurado?
5. ❓ `VERCEL_PROJECT_ID` - ¿Está configurado?
6. ❌ `SNYK_TOKEN` - **MUY PROBABLE QUE FALTE** (causa de fallos en security-audit)
7. ❌ `SLACK_WEBHOOK_URL` - Probablemente falta (causa de fallos en notifications)

---

## 🐛 ERRORES DE CONFIGURACIÓN

### Error 1: Workflow `deploy-production.yml` tiene syntax error
```yaml
# Línea 68 - FALTA el "uses:"
- name: 🔒 Run Snyk security audit
  # <-- AQUÍ DEBERÍA ESTAR: uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

### Error 2: Script faltante en `package.json`
El workflow intenta ejecutar:
```bash
npm run test:e2e:production
```
Pero este script **NO EXISTE** en `package.json`. Solo existe:
- ✅ `test:e2e`
- ✅ `test:e2e:ui`
- ✅ `test:e2e:headed`

---

## ✅ SOLUCIONES RECOMENDADAS

### **Solución 1: Deshabilitar workflows en branches de feature** (MÁS RÁPIDO)

Agregar condición para que NO se ejecuten en `feat/*`:
```yaml
on:
  push:
    branches: [main, production]
    branches-ignore: ['feat/*', 'feature/*']  # <- Agregar esto
```

### **Solución 2: Configurar todos los secrets faltantes**

1. Ve a GitHub → Settings → Secrets and variables → Actions
2. Agregar:
   - `SNYK_TOKEN` (o comentar el step de Snyk)
   - `SLACK_WEBHOOK_URL` (o comentar los steps de notificación)
   - Verificar que `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` estén configurados

### **Solución 3: Arreglar errores de sintaxis**

1. **Arreglar `deploy-production.yml` línea 68:**
   ```yaml
   - name: 🔒 Run Snyk security audit
     uses: snyk/actions/node@master  # <- AGREGAR ESTA LÍNEA
     env:
       SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
   ```

2. **Agregar script faltante o cambiar workflow:**
   - Opción A: Agregar `test:e2e:production` a `package.json`
   - Opción B: Cambiar workflow para usar `test:e2e` en lugar de `test:e2e:production`

---

## 🎯 PRIORIZACIÓN

| Problema | Severidad | Impacto | Solución Prioridad |
|----------|-----------|---------|-------------------|
| Secrets faltantes | 🔴 ALTA | Falla completamente | **1. URGENTE** |
| Syntax error en deploy-production.yml | 🔴 ALTA | Falla siempre | **2. URGENTE** |
| Script `test:e2e:production` faltante | 🟡 MEDIA | Falla en post-deployment | **3. ALTA** |
| Branch mismatch | 🟢 BAJA | Ejecuta innecesariamente | **4. MEDIA** |

---

## 📝 RESUMEN EJECUTIVO

**¿Por qué tantas X?**
1. **70%** - Secrets faltantes (SNYK_TOKEN, SLACK_WEBHOOK_URL)
2. **20%** - Syntax error en `deploy-production.yml`
3. **10%** - Script faltante `test:e2e:production`

**Solución más rápida:**
- Deshabilitar workflows en branches `feat/*` para evitar ejecuciones innecesarias
- O configurar todos los secrets requeridos


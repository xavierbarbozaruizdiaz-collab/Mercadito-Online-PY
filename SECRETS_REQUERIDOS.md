# 🔑 SECRETS REQUERIDOS PARA WORKFLOWS

## ✅ SECRETS OBLIGATORIOS (Sin estos, workflows FALLARÁN)

Verifica en GitHub → Settings → Secrets and variables → Actions:

1. **`VERCEL_TOKEN`** ✅ OBLIGATORIO
   - Para deploy a Vercel
   - Sin esto, el job `deploy` falla

2. **`VERCEL_ORG_ID`** ✅ OBLIGATORIO
   - Para deploy a Vercel
   - Sin esto, el job `deploy` falla

3. **`VERCEL_PROJECT_ID`** ✅ OBLIGATORIO
   - Para deploy a Vercel
   - Sin esto, el job `deploy` falla

4. **`NEXT_PUBLIC_SUPABASE_URL`** ✅ OBLIGATORIO
   - Para build y tests
   - Sin esto, el build falla

5. **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** ✅ OBLIGATORIO
   - Para build y tests
   - Sin esto, el build falla

---

## ⚠️ SECRETS OPCIONALES (NO bloquean workflows)

Estos tienen `continue-on-error: true`, así que NO causan fallos:

6. **`SNYK_TOKEN`** ⚠️ OPCIONAL
   - Solo para security audit
   - Si falta, el step se omite (no falla)

7. **`SLACK_WEBHOOK_URL`** ⚠️ OPCIONAL
   - Solo para notificaciones
   - Si falta, el step se omite (no falla)

8. **`PRODUCTION_URL`** ⚠️ OPCIONAL
   - Solo para post-deployment tests
   - Si falta, usa URL por defecto

---

## 🔍 CÓMO VERIFICAR SI FALTAN SECRETS

### Opción 1: GitHub Dashboard
1. Ve a tu repositorio
2. Settings → Secrets and variables → Actions
3. Verifica que los 5 obligatorios estén presentes

### Opción 2: Ver logs del workflow
1. Ve a GitHub → Actions
2. Haz clic en un workflow fallido
3. Haz clic en un job fallido
4. Busca en el log:
   - `Error: Missing required input`
   - `Secret not found`
   - `Invalid credentials`

---

## 📋 CHECKLIST

- [ ] `VERCEL_TOKEN` configurado
- [ ] `VERCEL_ORG_ID` configurado
- [ ] `VERCEL_PROJECT_ID` configurado
- [ ] `NEXT_PUBLIC_SUPABASE_URL` configurado
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurado

Si TODOS estos están configurados, los workflows deberían funcionar.

---

## 🚨 SI FALTAN SECRETS OBLIGATORIOS

El workflow fallará con errores como:
- `Error: Missing required input 'vercel-token'`
- `Error: NEXT_PUBLIC_SUPABASE_URL is not defined`
- `Build failed: Environment variable not found`


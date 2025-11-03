# 🔐 SECRETS REQUERIDOS PARA CI/CD

## 📋 Secrets Necesarios en GitHub

Para que el workflow `prod.yml` funcione correctamente, necesitas configurar estos secrets en GitHub:

### 1. SUPABASE_ACCESS_TOKEN
**Descripción:** Token de acceso de Supabase para autenticar el CLI

**Cómo obtenerlo:**
1. Ve a: https://supabase.com/dashboard/account/tokens
2. Clic en "Generate new token"
3. Dale un nombre (ej: "CI/CD Token")
4. Copia el token generado

**Agregar en GitHub:**
1. Ve a: https://github.com/xavierbarbozaruizdiaz-collab/Mercadito-Online-PY/settings/secrets/actions
2. Clic en "New repository secret"
3. Name: `SUPABASE_ACCESS_TOKEN`
4. Value: [Pega el token]
5. Clic en "Add secret"

---

### 2. SUPABASE_PROJECT_REF
**Descripción:** ID del proyecto de Supabase (ya está en el workflow como env var)

**Valor:** `hqdatzhliaordlsqtjea`

**Nota:** Está configurado en el workflow, pero si quieres hacerlo secreto:
1. Ve a GitHub Secrets
2. Name: `SUPABASE_PROJECT_REF`
3. Value: `hqdatzhliaordlsqtjea`

---

### 3. VERCEL_DEPLOY_HOOK_PROD
**Descripción:** URL del deploy hook de Vercel para disparar deployments manualmente

**Cómo obtenerlo:**
1. Ve a: https://vercel.com/dashboard
2. Selecciona proyecto: `mercadito-online-py`
3. Ve a: Settings → Deploy Hooks
4. Clic en "Create Hook"
5. Name: `production-deploy`
6. Branch: `main`
7. Clic en "Create Hook"
8. Copia la URL generada (ej: `https://api.vercel.com/v1/integrations/deploy/...`)

**Agregar en GitHub:**
1. Ve a: https://github.com/xavierbarbozaruizdiaz-collab/Mercadito-Online-PY/settings/secrets/actions
2. Clic en "New repository secret"
3. Name: `VERCEL_DEPLOY_HOOK_PROD`
4. Value: [Pega la URL del hook]
5. Clic en "Add secret"

**Nota:** Si no configuras este secret, el workflow funcionará igual porque Vercel hace deployment automático desde git push.

---

## ✅ CHECKLIST DE CONFIGURACIÓN

- [ ] `SUPABASE_ACCESS_TOKEN` agregado en GitHub Secrets
- [ ] `VERCEL_DEPLOY_HOOK_PROD` agregado en GitHub Secrets (opcional)
- [ ] Deploy hook creado en Vercel (si usas deploy hook)
- [ ] Workflow `prod.yml` creado y funcionando

---

## 🔍 VERIFICAR SECRETS CONFIGURADOS

Puedes verificar qué secrets están configurados en:
```
https://github.com/xavierbarbozaruizdiaz-collab/Mercadito-Online-PY/settings/secrets/actions
```

**Nota:** No puedes ver los valores de los secrets por seguridad, solo sus nombres.

---

## 🚨 SI FALTAN SECRETS

Si los secrets no están configurados:

1. **SUPABASE_ACCESS_TOKEN faltante:**
   - El workflow fallará en el paso "Link Supabase project"
   - Error: "Authentication failed" o similar

2. **VERCEL_DEPLOY_HOOK_PROD faltante:**
   - El workflow mostrará advertencia pero continuará
   - Vercel hará deployment automático desde git push

---

## 📝 NOTAS

- Los secrets son sensibles y NUNCA deben committearse al repo
- Si cambias un token, actualiza el secret en GitHub
- Los secrets están disponibles solo para workflows de GitHub Actions
- Puedes rotar los tokens cuando quieras sin afectar el código



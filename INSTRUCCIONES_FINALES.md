# 📋 Instrucciones Finales de Configuración

## ✅ 1. Branch Protection en main (2 min)

**GitHub UI → Settings → Branches → Add rule**

### Configuración:
- **Branch name pattern:** `main`
- ✅ **Require a pull request before merging**
  - Number of approvals: `1`
- ✅ **Require status checks to pass before merging**
  - Seleccionar:
    - `🔍 CI / build` (o el nombre del job de build en `deploy-production.yml`)
    - `CodeQL / Analyze`
- ✅ **Require conversation resolution before merging**
- (Opcional) ✅ **Require linear history**

**Save changes**

---

## ✅ 2. Generar Tipos de Supabase

### Paso 1: Login y Link (requiere interacción)

```bash
# Login (abre navegador)
npx supabase login

# Obtener Project Ref:
# 1. Ve a https://supabase.com/dashboard
# 2. Selecciona tu proyecto: "hqdatzhliaordlsqtjea" (del código)
# 3. Settings → API
# 4. Copia el "Reference ID"

# Link del proyecto (reemplaza <PROJECT_REF>)
npx supabase link --project-ref <TU_PROJECT_REF>
```

### Paso 2: Generar Tipos

```bash
npm run typegen
```

Esto creará `src/types/supabase.ts` con todos los tipos de la base de datos.

### Paso 3: Reemplazar @ts-ignore

Después de generar tipos, ejecutar:

```bash
git grep -n "@ts-ignore"
```

Los archivos a actualizar son:
1. `src/app/admin/reports/page.tsx` (líneas 130, 133)
2. `src/app/api/whatsapp/notify-seller/route.ts` (líneas 71, 73)
3. `src/app/admin/orders/page.tsx` (ya tiene cast, pero se puede mejorar)

**Ejemplo de reemplazo:**

```typescript
// ANTES:
// @ts-ignore - Supabase types for reports table are incomplete
const { error } = await supabase
  .from('reports')
  // @ts-ignore
  .update({ status: resolution, ... })

// DESPUÉS:
import type { Database } from '@/types/supabase';
type ReportsUpdate = Database['public']['Tables']['reports']['Update'];

const { error } = await supabase
  .from('reports')
  .update<ReportsUpdate>({
    status: resolution,
    resolved_by: user.id,
    resolved_at: new Date().toISOString(),
    resolution_notes: resolutionNotes,
  })
  .eq('id', selectedReport.id);
```

**Commit después de reemplazar:**
```bash
git add src/types/supabase.ts src/app/admin/reports/page.tsx src/app/api/whatsapp/notify-seller/route.ts
git commit -m "types: generate supabase types + remove ts-ignore"
git push origin main
```

---

## ✅ 3. Deploy a Producción

### GitHub Actions:

1. **GitHub → Actions → "🚀 Deploy to Production"**
2. Click en **"Run workflow"** (dropdown arriba a la derecha)
3. Branch: `main`
4. Click **"Run workflow"**

### Verificar en logs:

- ✅ `🧪 Test (No Bloqueante)` - debe pasar o tener `continue-on-error: true`
- ✅ `🏗️ Build (Bloqueante)` - debe usar `npm ci` y pasar
- ✅ `🚀 Deploy to Vercel` - debe ejecutar `vercel deploy --prebuilt --prod`
- ✅ URL de producción generada

---

## ✅ 4. Validar en Vercel

### Deployments:
1. **Vercel → Proyecto → Deployments**
2. Último deployment debe estar **verde** ✅

### Environment Variables (Production):
**Vercel → Settings → Environment Variables → Production**

Verificar que existan:
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ (Opcional) `SNYK_TOKEN` si usas Snyk
- ✅ (Opcional) `SLACK_WEBHOOK_URL` si usas Slack

---

## ✅ 5. Opcional pero Recomendado

### Dependabot
- ✅ Ya configurado en `.github/dependabot.yml`
- Las PRs aparecerán semanalmente
- Acepta las PRs que sean seguras

### CodeQL
- ✅ Ya configurado en `.github/workflows/codeql.yml`
- El primer análisis tarda ~5-10 min
- Revisa los resultados en **Security → Code scanning alerts**

### Snyk
- Ya configurado con `continue-on-error: true`
- Para activar completamente:
  1. Crear cuenta en https://snyk.io
  2. Obtener token
  3. Agregar `SNYK_TOKEN` a GitHub Secrets
  4. El workflow ya está configurado para usarlo

---

## 📝 Checklist Final

- [ ] Branch protection activado en main
- [ ] `npx supabase login` ejecutado
- [ ] `npx supabase link --project-ref <REF>` ejecutado
- [ ] `npm run typegen` ejecutado
- [ ] `src/types/supabase.ts` generado
- [ ] `@ts-ignore` reemplazados por tipos reales
- [ ] Commit y push de tipos generados
- [ ] Workflow "Deploy to Production" ejecutado manualmente
- [ ] Deploy en Vercel verificado (verde)
- [ ] Environment variables verificadas en Vercel

---

## 🚀 Listo para Producción

Una vez completado todo:
- ✅ Repositorio limpio y ordenado
- ✅ CI/CD funcionando
- ✅ Branch protection activo
- ✅ Tipos de Supabase generados
- ✅ Deploy a producción exitoso


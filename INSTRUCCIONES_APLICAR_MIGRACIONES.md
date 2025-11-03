# 🚀 INSTRUCCIONES RÁPIDAS: Aplicar Migraciones

## ⚡ MÉTODO RÁPIDO (5 minutos)

### 1. Verificar Migraciones Pendientes

**En Supabase Dashboard:**
```
https://supabase.com/dashboard/project/hqdatzhliaordlsqtjea/sql
```

**Ejecuta:**
```sql
SELECT version, name, executed_at
FROM supabase_migrations.schema_migrations
ORDER BY executed_at DESC
LIMIT 10;
```

### 2. Aplicar Migración de Hero Slides

**Si falta `202511022129_fix_hero_slides_table.sql`:**

1. Abre: `supabase/migrations/202511022129_fix_hero_slides_table.sql`
2. Copia TODO el contenido
3. Pega en Supabase SQL Editor
4. Ejecuta (RUN)
5. Verifica: Debe decir "Success" o mostrar resultados de SELECT

### 3. Verificar que se aplicó

**Ejecuta:**
```sql
SELECT * FROM public.hero_slides WHERE is_active = true LIMIT 1;
```

**Debe mostrar:** Al menos 1 slide con `title` y `image_url`

---

## 🔄 CONFIGURAR WORKFLOW AUTOMÁTICO

### 1. Configurar Secrets en GitHub

**Ve a:**
```
https://github.com/xavierbarbozaruizdiaz-collab/Mercadito-Online-PY/settings/secrets/actions
```

**Agrega:**
- `SUPABASE_ACCESS_TOKEN` - Token de Supabase
- `VERCEL_DEPLOY_HOOK_PROD` - Deploy hook de Vercel (opcional)

**Ver:** `SECRETS_CONFIGURACION.md` para instrucciones detalladas

### 2. Crear Deploy Hook en Vercel (Opcional)

**Ve a:**
```
https://vercel.com/dashboard/project/mercadito-online-py/settings/deploy-hooks
```

1. Clic en "Create Hook"
2. Name: `production-deploy`
3. Branch: `main`
4. Clic en "Create Hook"
5. Copia la URL
6. Agrega como secret: `VERCEL_DEPLOY_HOOK_PROD`

### 3. Probar el Workflow

**Haz un push mínimo:**
```bash
git commit --allow-empty -m "test: trigger prod workflow"
git push origin main
```

**Verifica en:**
```
https://github.com/xavierbarbozaruizdiaz-collab/Mercadito-Online-PY/actions
```

**Debes ver:**
- ✅ Workflow "Prod CI/CD" ejecutándose
- ✅ Job "migrate-db" completado
- ✅ Job "deploy-vercel" completado

---

## ✅ RESULTADO ESPERADO

**Después de configurar todo:**

1. ✅ Migraciones aplicadas en PROD
2. ✅ Workflow funcionando automáticamente
3. ✅ Deployments en Vercel después de migraciones
4. ✅ Hero slider funcionando en producción

---

## 📝 NOTA IMPORTANTE

**El workflow `prod.yml` ya está creado** pero:
- ⚠️ Necesitas configurar los secrets en GitHub
- ⚠️ Necesitas aplicar migraciones pendientes manualmente la primera vez
- ✅ Después de eso, todo será automático



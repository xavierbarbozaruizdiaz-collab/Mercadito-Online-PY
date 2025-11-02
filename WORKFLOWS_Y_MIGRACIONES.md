# ⚠️ WORKFLOWS Y MIGRACIONES - Relación Crítica

## 🔴 **SÍ, LOS WORKFLOWS TIENEN QUE VER CON LOS ERRORES DE MIGRACIONES**

---

## 📊 **EL PROBLEMA:**

### **Lo que veo en tus workflows:**

1. ✅ **Los workflows despliegan el código** a Vercel
2. ✅ **Los workflows hacen build** de la aplicación
3. ❌ **Los workflows NO aplican migraciones** automáticamente

### **Esto significa:**

- Tu código se despliega con cambios que requieren nuevas columnas/tablas
- Pero las migraciones **nunca se aplican** a la base de datos de producción
- Resultado: **Error `column products.image_url does not exist`**

---

## 🔍 **DÓNDE VERIFICAR LOS WORKFLOWS:**

### **1. GitHub Actions (Principal):**

1. Ve a tu repositorio en GitHub
2. Haz clic en la pestaña **"Actions"**
3. Ahí verás:
   - ✅ Workflows exitosos (check verde)
   - ❌ Workflows fallidos (X roja)
   - ⚠️ Workflows en progreso (círculo amarillo)

4. **Revisa workflows fallidos:**
   - Haz clic en el workflow fallido
   - Revisa cada "Job" (test, build, deploy)
   - Los errores aparecerán en rojo

---

## 🚨 **PROBLEMA IDENTIFICADO:**

### **Tus workflows actuales:**

Revisé tus workflows (`.github/workflows/`):
- `deploy-production.yml`
- `ci-cd.yml`
- `deploy.yml`

**Ninguno de estos aplica migraciones de Supabase.**

**Lo que hacen:**
- ✅ Checkout del código
- ✅ Instalan dependencias
- ✅ Hacen build
- ✅ Despliegan a Vercel
- ❌ **NO ejecutan `supabase db push`**
- ❌ **NO aplican migraciones**

---

## ✅ **SOLUCIÓN: Agregar paso de migraciones**

### **Dónde agregar:**

En cada workflow que despliega a producción, agregar un paso **antes** del deploy:

```yaml
- name: Apply Supabase Migrations
  run: |
    npm install -g supabase
    supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
    supabase db push
  env:
    SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
    SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
```

---

## 📋 **CHECKLIST PARA VERIFICAR:**

### **1. Ver errores en GitHub Actions:**

1. Ve a: `https://github.com/tu-usuario/mercadito-online-py/actions`
2. Revisa workflows recientes
3. Identifica cuáles fallaron
4. Haz clic en cada uno para ver el error específico

### **2. Verificar si las migraciones se aplican:**

**En Supabase Dashboard:**
1. Database → Migrations
2. Ver si hay migraciones aplicadas recientemente
3. Si no hay migraciones nuevas desde hace tiempo = **problema confirmado**

### **3. Comparar estado:**

**Ejecuta en Supabase SQL Editor:**
```sql
-- Ver últimas migraciones aplicadas
SELECT version, name, inserted_at
FROM supabase_migrations.schema_migrations
ORDER BY inserted_at DESC
LIMIT 10;
```

**Compara con tus migraciones locales:**
```bash
ls -lt supabase/migrations/ | head -10
```

Si las fechas no coinciden = **las migraciones no se están aplicando**

---

## 🎯 **POR QUÉ ESTO CAUSA EL ERROR:**

### **Escenario típico:**

1. **Desarrollas localmente:**
   - Creas migración que cambia `image_url` → `cover_url`
   - Aplicas migración localmente
   - Todo funciona ✅

2. **Haces commit y push:**
   - Workflow despliega código nuevo que usa `cover_url`
   - **Pero NO aplica la migración en producción**
   - La BD de producción todavía tiene `image_url`

3. **Resultado:**
   - Código espera `cover_url` (que no existe)
   - O código todavía busca `image_url` (que fue eliminado)
   - **Error: `column products.image_url does not exist`**

---

## 🔧 **CÓMO SOLUCIONAR:**

### **Opción 1: Aplicar migraciones manualmente (Inmediato)**

1. Ve a Supabase Dashboard → SQL Editor
2. Copia y pega las migraciones faltantes
3. Ejecuta una por una
4. Verifica errores

### **Opción 2: Agregar migraciones a workflows (Prevención)**

Agregar paso en workflows para aplicar migraciones automáticamente en cada deploy.

### **Opción 3: Usar Supabase CLI localmente**

```bash
supabase link --project-ref tu-project-ref
supabase db push
```

---

## 📝 **RESUMEN:**

### **Sí, los workflows tienen que ver:**

- ❌ **No aplican migraciones automáticamente**
- ✅ **Despliegan código nuevo que requiere nuevas columnas**
- 🔴 **Resultado: Errores por columnas faltantes**

### **Qué verificar:**

1. ✅ GitHub Actions → Ver workflows fallidos
2. ✅ Supabase Dashboard → Ver migraciones aplicadas
3. ✅ Comparar migraciones locales vs aplicadas
4. ✅ Aplicar migraciones faltantes manualmente

### **Solución permanente:**

Agregar paso de migraciones a los workflows para que se apliquen automáticamente en cada deploy.

---

## 🆘 **PRÓXIMOS PASOS:**

1. **Revisa GitHub Actions** para ver si hay workflows fallidos
2. **Revisa Supabase Migrations** para ver qué falta aplicar
3. **Aplica migraciones faltantes** manualmente desde SQL Editor
4. **Luego podemos agregar** el paso de migraciones a los workflows




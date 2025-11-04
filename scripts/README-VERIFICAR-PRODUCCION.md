# Verificación de Base de Datos en Producción

Este documento explica cómo verificar el estado de la base de datos en producción usando el CLI de Supabase.

## Método 1: Usando el Script Automático

### Paso 1: Obtener el Access Token

1. Ve a: https://supabase.com/dashboard/account/tokens
2. Crea un nuevo token o copia uno existente
3. **IMPORTANTE**: Guarda el token de forma segura, no lo compartas públicamente

### Paso 2: Configurar el Token

**Windows PowerShell:**
```powershell
$env:SUPABASE_ACCESS_TOKEN="tu_token_aqui"
```

**Windows CMD:**
```cmd
set SUPABASE_ACCESS_TOKEN=tu_token_aqui
```

**Linux/Mac:**
```bash
export SUPABASE_ACCESS_TOKEN="tu_token_aqui"
```

### Paso 3: Ejecutar el Script

```bash
node scripts/verificar-produccion-db.js
```

---

## Método 2: Comandos Manuales del CLI

### 1. Linkear el Proyecto (Primera vez)

```bash
$env:SUPABASE_ACCESS_TOKEN="tu_token"
npx supabase link --project-ref hqdatzhliaordlsqtjea
```

### 2. Verificar Migraciones Aplicadas

```bash
npx supabase migration list --linked
```

### 3. Verificar Hero Slides Activos

```bash
npx supabase db query "SELECT id, title, is_active, sort_order FROM hero_slides WHERE is_active = true ORDER BY sort_order ASC" --linked
```

### 4. Verificar Conteo de Productos

```bash
npx supabase db query "SELECT COUNT(*) as total FROM products WHERE status = 'active'" --linked
```

### 5. Verificar Políticas de RLS

```bash
npx supabase db query "SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename" --linked
```

---

## Método 3: Verificación Manual en Dashboard

Si prefieres no usar el CLI, puedes verificar manualmente:

1. **Ve al Dashboard de Supabase**: https://supabase.com/dashboard/project/hqdatzhliaordlsqtjea
2. **Table Editor** → Verifica:
   - `hero_slides`: Debe haber slides con `is_active = true`
   - `products`: Verifica que hay productos activos
3. **Database** → **Policies**: Verifica que las políticas de RLS estén configuradas
4. **Database** → **Migrations**: Compara con las migraciones locales

---

## Verificaciones Específicas para Problemas Visuales

### ¿Los hero slides aparecen en producción?

**Query:**
```sql
SELECT 
  id, 
  title, 
  is_active, 
  sort_order,
  bg_type,
  bg_gradient_from,
  bg_gradient_to,
  bg_image_url,
  image_url
FROM hero_slides 
WHERE is_active = true 
ORDER BY sort_order ASC;
```

### ¿Hay productos visibles?

**Query:**
```sql
SELECT 
  id, 
  title, 
  status,
  cover_url
FROM products 
WHERE status = 'active' 
LIMIT 10;
```

### ¿Las políticas de RLS permiten acceso?

**Query:**
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## Solución de Problemas

### Error: "Project not found"
- Verifica que el `PROJECT_REF` sea correcto: `hqdatzhliaordlsqtjea`
- Verifica que tengas acceso al proyecto en Supabase Dashboard

### Error: "Invalid API key"
- Verifica que el token esté correcto
- El token debe tener permisos de lectura/escritura en el proyecto

### Error: "Permission denied"
- Verifica que el token tenga los permisos necesarios
- Puede que necesites un token con rol de `service_role` para algunas operaciones

---

## Notas de Seguridad

⚠️ **IMPORTANTE**: 
- Nunca subas el `SUPABASE_ACCESS_TOKEN` al repositorio
- Usa variables de entorno o secrets
- El token debe tener solo los permisos necesarios
- Revoca tokens que ya no uses


# 🔍 Cómo Verificar Migraciones Faltantes o Fallidas en Supabase

## 📍 DÓNDE VERIFICAR

### 1️⃣ **En Supabase Dashboard (Panel Web)**

#### **A. Verificar Migraciones Aplicadas:**

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a la sección **"Database"** (Base de datos) en el menú lateral
4. Haz clic en **"Migrations"** o **"Database Migrations"**
5. Aquí verás:
   - ✅ Migraciones aplicadas (con fecha y hora)
   - ❌ Migraciones que fallaron (con error)
   - ⏳ Migraciones pendientes

#### **B. Verificar Estado de la Base de Datos:**

1. En Supabase Dashboard → **"Database"** → **"Table Editor"**
2. Busca la tabla `products`
3. Haz clic en "View Table Structure" o similar
4. Verás todas las columnas que **existen realmente**
5. Compara con lo que debería tener según las migraciones

---

### 2️⃣ **En SQL Editor de Supabase (Más Detallado)**

#### **A. Ver Todas las Migraciones Aplicadas:**

1. Ve a Supabase Dashboard → **"SQL Editor"**
2. Ejecuta esta consulta:

```sql
SELECT 
  version,
  name,
  inserted_at
FROM supabase_migrations.schema_migrations
ORDER BY inserted_at DESC;
```

Esto te mostrará **todas las migraciones que Supabase ha registrado como aplicadas**.

#### **B. Ver Qué Columnas Existen en `products`:**

```sql
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'products'
ORDER BY ordinal_position;
```

Esto te dirá **exactamente qué columnas existen** en tu tabla `products` en producción.

#### **C. Verificar el Problema Específico de `image_url`:**

```sql
-- Verificar si image_url existe
SELECT EXISTS (
  SELECT 1 
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'products'
    AND column_name = 'image_url'
) as image_url_exists;

-- Verificar si cover_url existe
SELECT EXISTS (
  SELECT 1 
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'products'
    AND column_name = 'cover_url'
) as cover_url_exists;
```

---

### 3️⃣ **Comparar Migraciones Locales con Aplicadas**

#### **A. Listar Todas las Migraciones Locales:**

En tu terminal, ejecuta:

```bash
ls supabase/migrations/ | sort
```

Esto te mostrará todos los archivos de migración que tienes localmente.

#### **B. Comparar con Supabase:**

1. Copia la lista de migraciones aplicadas desde Supabase (SQL Editor)
2. Compara con la lista local
3. Identifica cuáles faltan

---

### 4️⃣ **Verificar Errores en Logs de Migraciones**

1. Ve a Supabase Dashboard → **"Logs"** o **"Database Logs"**
2. Busca errores relacionados con migraciones
3. Los errores mostrarán qué migración falló y por qué

---

## 🎯 PASOS ESPECÍFICOS PARA TU PROBLEMA

### **Problema: `column products.image_url does not exist`**

**Paso 1: Verificar qué existe realmente**
```sql
-- Ejecuta en SQL Editor de Supabase
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'products' 
  AND table_schema = 'public'
  AND column_name LIKE '%image%' OR column_name LIKE '%cover%';
```

**Paso 2: Verificar qué migraciones mencionan `image_url`**
En tu proyecto local, busca:
```bash
grep -r "image_url" supabase/migrations/ --include="*.sql"
```

**Paso 3: Identificar la migración correcta**
Según tu código, veo que:
- Las migraciones tempranas crean/usan `image_url`
- Las migraciones posteriores lo cambian a `cover_url`
- La migración `20250128000001_fix_products_structure.sql` debería haber eliminado `image_url`

**Si `image_url` todavía se usa en algún lugar del código pero no existe en la BD**, necesitas:
1. Aplicar la migración que la elimina/renombra
2. O actualizar el código para usar `cover_url` en su lugar

---

## 📊 MÉTODO RECOMENDADO: Checklist Completo

### ✅ **Checklist de Verificación:**

1. **En Supabase Dashboard → Migrations:**
   - [ ] Ver lista de migraciones aplicadas
   - [ ] Identificar últimas migraciones aplicadas
   - [ ] Verificar si hay errores reportados

2. **En SQL Editor:**
   - [ ] Ejecutar query para ver columnas de `products`
   - [ ] Verificar si `cover_url` existe
   - [ ] Verificar si `image_url` existe o no

3. **En tu código local:**
   - [ ] Buscar todas las referencias a `products.image_url`
   - [ ] Verificar que se use `cover_url` en su lugar
   - [ ] Identificar qué migraciones faltan aplicar

4. **Aplicar migraciones faltantes:**
   - [ ] Usar Supabase CLI: `supabase db push`
   - [ ] O aplicar manualmente desde SQL Editor

---

## 🛠️ HERRAMIENTAS ÚTILES

### **Supabase CLI (Recomendado)**

Si tienes Supabase CLI instalado:

```bash
# Ver estado de migraciones
supabase migration list

# Ver diferencias entre local y remoto
supabase db diff

# Aplicar migraciones pendientes
supabase db push
```

### **Desde Supabase Dashboard**

1. **SQL Editor** → Crea una nueva query
2. Copia y pega las migraciones que faltan
3. Ejecuta una por una
4. Verifica errores

---

## 🚨 SOLUCIÓN RÁPIDA PARA TU ERROR ESPECÍFICO

Si el error es `column products.image_url does not exist`:

### **Opción 1: Verificar y aplicar migración**

La migración `20250128000001_fix_products_structure.sql` debería:
- Crear `cover_url` si no existe
- Renombrar `image_url` a `cover_url`
- Eliminar `image_url`

**Verifica si esta migración se aplicó:**

1. Ve a SQL Editor en Supabase
2. Ejecuta:
```sql
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'products' 
  AND column_name IN ('image_url', 'cover_url');
```

3. Si `cover_url` no existe pero `image_url` sí, aplica manualmente:
```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS cover_url TEXT;
UPDATE products SET cover_url = image_url WHERE cover_url IS NULL;
```

4. Si `cover_url` existe, verifica el código que usa `image_url`

---

## 📝 RESUMEN

**Para verificar migraciones faltantes:**

1. ✅ **Supabase Dashboard → Database → Migrations** (ver aplicadas)
2. ✅ **SQL Editor → Ejecutar queries** (verificar estructura real)
3. ✅ **Comparar lista local vs aplicadas** (encontrar faltantes)
4. ✅ **Aplicar migraciones faltantes** (SQL Editor o CLI)

**Prioridad:** Empieza verificando en Supabase Dashboard la lista de migraciones aplicadas.






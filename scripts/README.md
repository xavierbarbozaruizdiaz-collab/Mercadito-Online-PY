# 📦 Scripts de Sincronización

## ⚠️ IMPORTANTE

**Para sincronizar SOLO código visual (sin tocar datos):**
- Usa `npm run sync:git-from-prod` (recomendado)
- O `scripts/sync-git.js` directamente

**Los scripts de datos (export/import) están deshabilitados por defecto**
para evitar modificar datos de producción.

---

Scripts para sincronizar código y datos entre PRODUCCIÓN y LOCAL.

## 🚀 Scripts Disponibles

### 1. `export-data.js` - Exportar datos a JSON

Exporta datos de Supabase a archivos JSON.

```bash
# Exportar desde PRODUCCIÓN (requiere .env.production)
node scripts/export-data.js --prod

# Exportar desde LOCAL (requiere .env.local)
node scripts/export-data.js
```

**Genera:**
- `scripts/data-export/categories.json`
- `scripts/data-export/products.json`
- `scripts/data-export/hero_slides.json`
- ... (y más tablas)
- `scripts/data-export/export-summary.json`

---

### 2. `import-data.js` - Importar datos desde JSON

Importa datos desde archivos JSON a Supabase.

```bash
# Importar a LOCAL (requiere .env.local)
node scripts/import-data.js

# Importar a PRODUCCIÓN (⚠️ CUIDADO - requiere .env.production)
node scripts/import-data.js --prod
```

**Lee desde:**
- `scripts/data-export/*.json`

---

### 3. `sync-prod-to-local.js` - Sincronización directa

Sincroniza directamente desde PRODUCCIÓN a LOCAL (sin archivos intermedios).

```bash
node scripts/sync-prod-to-local.js
```

**Requiere:**
- `.env.production` con variables de PRODUCCIÓN
- `.env.local` con variables de LOCAL

---

## ⚙️ Configuración

### Paso 1: Crear archivo `.env.production`

```env
# Variables de PRODUCCIÓN
PROD_SUPABASE_URL=https://tu-proyecto-prod.supabase.co
PROD_SUPABASE_ANON_KEY=tu_anon_key_de_produccion
```

### Paso 2: Verificar `.env.local`

```env
# Variables de LOCAL
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto-local.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_local
```

---

## 📋 Flujo Recomendado

### Opción A: Sincronización directa (rápida)

```bash
# 1. Sincronizar datos de producción a local
node scripts/sync-prod-to-local.js
```

### Opción B: Exportar/Importar (más control)

```bash
# 1. Exportar datos de producción
node scripts/export-data.js --prod

# 2. Revisar archivos en scripts/data-export/

# 3. Importar a local
node scripts/import-data.js
```

---

## 🔄 Sincronizar Código (Git)

Para sincronizar el código también:

```bash
# 1. Ver qué rama está en producción
git branch -r

# 2. Traer cambios de producción
git fetch origin

# 3. Ver diferencias
git diff HEAD origin/dev

# 4. Hacer merge o rebase
git merge origin/dev
# O
git rebase origin/dev
```

---

## ⚠️ Advertencias

1. **Backup primero**: Siempre haz backup antes de importar
2. **Producción**: ⚠️ No ejecutes `import-data.js --prod` sin revisar
3. **Dependencias**: Algunas tablas tienen foreign keys, respeta el orden
4. **Storage**: Las imágenes en Storage no se sincronizan, solo las URLs

---

## 📊 Tablas que se Sincronizan

- `categories` - Categorías de productos
- `hero_slides` - Slides del hero
- `products` - Productos
- `product_images` - Imágenes de productos
- `orders` - Pedidos
- `order_items` - Items de pedidos
- `raffles` - Sorteos
- `raffle_tickets` - Tickets de sorteos
- `raffle_winner_photos` - Fotos de ganadores

---

## 🐛 Troubleshooting

### Error: "Variables de entorno no encontradas"
- Verifica que `.env.production` y `.env.local` existan
- Verifica que las variables estén correctamente nombradas

### Error: "No se puede conectar"
- Verifica que las URLs de Supabase sean correctas
- Verifica que las keys sean válidas
- Verifica permisos RLS en Supabase

### Error: "Foreign key constraint"
- Algunas tablas tienen dependencias, verifica el orden de sincronización
- Puede que necesites limpiar datos en orden inverso

---

## 📝 Notas

- Los scripts intentan mantener IDs originales
- Las imágenes en Storage no se copian, solo las referencias
- Los usuarios/perfiles no se sincronizan por seguridad
- Los scripts son idempotentes (puedes ejecutarlos múltiples veces)


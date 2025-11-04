# 🚀 APLICAR MIGRACIÓN - SISTEMA DE MARKETING

## ⚠️ IMPORTANTE: Hay una migración duplicada

La migración `20250201000004_update_auction_close_with_commissions.sql` ya existe en producción.

## ✅ Solución: Aplicar solo la migración de marketing

### Opción 1: Aplicar directamente en Supabase Dashboard (MÁS SEGURO)

1. Abre: https://supabase.com/dashboard/project/hqdatzhliaordlsqtjea
2. Ve a **SQL Editor**
3. Copia el contenido completo de este archivo:
   ```
   supabase/migrations/20250203000001_marketing_system.sql
   ```
4. Pega y ejecuta el SQL
5. Verifica que se crearon las tablas:
   - `marketing_campaigns`
   - `campaign_metrics`
   - `campaign_targeting`
   - `product_catalog_sync`

---

### Opción 2: Marcar migración duplicada como aplicada y luego push

```bash
# 1. Ver migraciones aplicadas
npx supabase migration list

# 2. Si la 20250201000004 ya está aplicada, puedes aplicar solo la nueva:
# Edita temporalmente el nombre de la migración duplicada o 
# aplica directamente la de marketing en el dashboard
```

---

### Opción 3: Crear migración temporal y aplicar

```bash
# 1. Crear una nueva migración con timestamp más reciente
# (Ya está creada: 20250203000001_marketing_system.sql)

# 2. Aplicar usando Supabase CLI (si no hay conflictos)
npx supabase db push
```

**Nota:** Si hay conflictos con otras migraciones, usa la Opción 1 (Dashboard).

---

## 📋 Scripts disponibles

En `package.json` ya tienes:
```json
"db:push": "npx supabase db push"
```

Para aplicar solo la nueva migración, usa el dashboard o el comando directo de arriba.

---

## ✅ Verificación después de aplicar

```sql
-- Verificar que las tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'marketing_campaigns',
  'campaign_metrics', 
  'campaign_targeting',
  'product_catalog_sync'
);
```

Deberías ver 4 filas.

---

## 🎯 Comando recomendado para este caso

**Usa el Dashboard de Supabase** (Opción 1) porque hay una migración duplicada que puede causar conflictos.

### Script rápido para copiar SQL al portapapeles (Windows):

```powershell
# Copiar contenido de la migración al portapapeles
Get-Content supabase/migrations/20250203000001_marketing_system.sql | Set-Clipboard
```

Luego pega en el SQL Editor del dashboard.

---

**Nota:** La migración usa `CREATE TABLE IF NOT EXISTS`, así que es segura ejecutarla múltiples veces.

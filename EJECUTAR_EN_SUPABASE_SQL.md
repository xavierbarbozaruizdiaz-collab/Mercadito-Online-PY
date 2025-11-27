# 📋 LISTA DE MIGRACIONES SQL PARA EJECUTAR EN SUPABASE

## ⚠️ IMPORTANTE: Orden de Ejecución

Ejecuta estas migraciones en el **Editor SQL de Supabase** en el orden indicado.

---

## ✅ MIGRACIÓN REQUERIDA (NUEVA)

### 1. `20250202000009_fix_close_expired_race_condition_final.sql`

**Archivo**: `supabase/migrations/20250202000009_fix_close_expired_race_condition_final.sql`

**¿Qué hace?**
- Mejora la función `close_expired_auctions()` para prevenir condiciones de carrera
- Agrega `SELECT FOR UPDATE SKIP LOCKED` para bloquear filas
- Incluye doble verificación de estado y tiempo
- Mantiene el cálculo de comisiones de migraciones anteriores

**¿Por qué es necesaria?**
- Previene que `place_bid()` y `close_expired_auctions()` se ejecuten simultáneamente
- Garantiza que nunca se acepte una puja después del cierre
- Asegura consistencia de datos

---

## 📝 INSTRUCCIONES PASO A PASO

### Paso 1: Abrir Editor SQL en Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **SQL Editor** (menú lateral izquierdo)
3. Haz clic en **"New query"** o abre una nueva pestaña

### Paso 2: Copiar y Pegar la Migración

1. Abre el archivo: `supabase/migrations/20250202000009_fix_close_expired_race_condition_final.sql`
2. **Copia TODO el contenido** del archivo (desde `-- ============================================` hasta el final)
3. Pega el contenido en el Editor SQL de Supabase

### Paso 3: Ejecutar la Migración

1. Haz clic en el botón **"Run"** o presiona `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
2. Espera a que termine la ejecución
3. Verifica que no haya errores en la consola

### Paso 4: Verificar que Funcionó

Ejecuta esta query para verificar (usa la **Opción 2** que es la más clara):

```sql
-- Verificar que tiene las mejoras de race condition
SELECT 
  proname as function_name,
  CASE 
    WHEN prosrc LIKE '%FOR UPDATE OF p SKIP LOCKED%' THEN '✅ Tiene SELECT FOR UPDATE SKIP LOCKED'
    ELSE '❌ NO tiene SELECT FOR UPDATE SKIP LOCKED'
  END as has_skip_locked,
  CASE 
    WHEN prosrc LIKE '%GET DIAGNOSTICS v_rows_updated%' THEN '✅ Tiene GET DIAGNOSTICS'
    ELSE '❌ NO tiene GET DIAGNOSTICS'
  END as has_get_diagnostics,
  CASE 
    WHEN prosrc LIKE '%v_current_status%' AND prosrc LIKE '%v_current_end_at%' THEN '✅ Tiene doble verificación'
    ELSE '❌ NO tiene doble verificación'
  END as has_double_check
FROM pg_proc
WHERE proname = 'close_expired_auctions';
```

**Resultado esperado**: 
- `has_skip_locked`: ✅ Tiene SELECT FOR UPDATE SKIP LOCKED
- `has_get_diagnostics`: ✅ Tiene GET DIAGNOSTICS
- `has_double_check`: ✅ Tiene doble verificación

---

## 📄 CONTENIDO COMPLETO DE LA MIGRACIÓN

El contenido completo está en:
```
supabase/migrations/20250202000009_fix_close_expired_race_condition_final.sql
```

**Copia TODO el contenido de ese archivo y pégalo en Supabase SQL Editor.**

---

## ✅ CHECKLIST DE EJECUCIÓN

- [ ] Abrir Supabase Dashboard → SQL Editor
- [ ] Abrir archivo: `supabase/migrations/20250202000009_fix_close_expired_race_condition_final.sql`
- [ ] Copiar TODO el contenido del archivo
- [ ] Pegar en el Editor SQL de Supabase
- [ ] Ejecutar la migración (botón "Run" o Ctrl+Enter)
- [ ] Verificar que no hay errores
- [ ] Ejecutar query de verificación
- [ ] Confirmar que la función se creó correctamente

---

## 🔍 VERIFICACIÓN ADICIONAL (Opcional)

Si quieres ver la definición completa de la función:

```sql
-- Ver la definición completa de la función
SELECT pg_get_functiondef(oid) as full_definition
FROM pg_proc 
WHERE proname = 'close_expired_auctions';
```

**Busca en el resultado**:
- ✅ `FOR UPDATE OF p SKIP LOCKED` (debe estar en el SELECT principal)
- ✅ `FOR UPDATE` (debe estar en el SELECT dentro del loop)
- ✅ `GET DIAGNOSTICS v_rows_updated = ROW_COUNT` (debe estar después del UPDATE)

**O usa la query de verificación rápida** (más fácil de leer):

```sql
-- Verificar mejoras de race condition
SELECT 
  proname as function_name,
  CASE 
    WHEN prosrc LIKE '%FOR UPDATE OF p SKIP LOCKED%' THEN '✅ Tiene SELECT FOR UPDATE SKIP LOCKED'
    ELSE '❌ NO tiene SELECT FOR UPDATE SKIP LOCKED'
  END as has_skip_locked,
  CASE 
    WHEN prosrc LIKE '%GET DIAGNOSTICS v_rows_updated%' THEN '✅ Tiene GET DIAGNOSTICS'
    ELSE '❌ NO tiene GET DIAGNOSTICS'
  END as has_get_diagnostics,
  CASE 
    WHEN prosrc LIKE '%v_current_status%' AND prosrc LIKE '%v_current_end_at%' THEN '✅ Tiene doble verificación'
    ELSE '❌ NO tiene doble verificación'
  END as has_double_check
FROM pg_proc
WHERE proname = 'close_expired_auctions';
```

---

## ⚠️ NOTAS IMPORTANTES

1. **Es seguro ejecutar**: Usa `CREATE OR REPLACE FUNCTION`, así que reemplazará la función existente sin problemas
2. **No hay pérdida de funcionalidad**: Mantiene todas las características anteriores (comisiones, notificaciones, etc.)
3. **Backup recomendado**: Antes de ejecutar, haz un backup de tu base de datos (por precaución)
4. **Si hay errores**: Revisa que las funciones `get_auction_commissions()` y `calculate_auction_commissions()` existan. Si no existen, la migración usará valores por defecto (comisiones en 0)

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### Error: "function get_auction_commissions does not exist"

**Solución**: La migración maneja este caso automáticamente con `EXCEPTION WHEN OTHERS`. Si ves este error, la función seguirá funcionando pero con comisiones en 0.

### Error: "syntax error near FOR UPDATE"

**Solución**: Verifica que estás usando PostgreSQL 12+ (SKIP LOCKED requiere PostgreSQL 9.5+)

### Error: "permission denied"

**Solución**: Asegúrate de estar ejecutando como usuario con permisos `SECURITY DEFINER` o como superusuario

---

**Última actualización**: 2024  
**Versión**: 1.0.0

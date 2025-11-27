# 📋 Migración SQL: Bonus Time Mejorado (Opción A)

## ⚠️ IMPORTANTE: Ejecutar en Supabase SQL Editor

Esta migración mejora el sistema de bonus time centralizando la configuración y mejorando la claridad del código.

---

## ✅ MIGRACIÓN REQUERIDA

### `20250202000011_centralize_bonus_time_config.sql`

**Archivo**: `supabase/migrations/20250202000011_centralize_bonus_time_config.sql`

**¿Qué hace?**
- Crea tabla `auction_bonus_config` para centralizar configuración
- Crea función `get_bonus_time_config()` para obtener valores
- Refactoriza `place_bid()` para usar configuración centralizada
- Mejora nombres de variables y comentarios
- Agrega información de bonus time en respuesta de `place_bid()`

**¿Por qué es necesaria?**
- Elimina valores hardcodeados (50 extensiones, etc.)
- Centraliza configuración en un solo lugar
- Mejora legibilidad y mantenibilidad
- Mantiene compatibilidad con subastas existentes

---

## 📝 INSTRUCCIONES

1. Abre el **Editor SQL** en tu proyecto de Supabase
2. **IMPORTANTE**: Abre el archivo SQL (NO el markdown):
   - ✅ `supabase/migrations/20250202000011_centralize_bonus_time_config.sql` 
   - ✅ O usa el archivo limpio: `EJECUTAR_SQL_BONUS_TIME.sql`
   - ❌ NO uses `EJECUTAR_MIGRACION_BONUS_TIME_MEJORADO.md` (ese es solo documentación)
3. **Copia TODO el contenido** del archivo SQL (solo el código SQL, sin markdown)
4. Pega en el Editor SQL de Supabase
5. Ejecuta la migración (botón "Run" o `Ctrl+Enter`)
6. Verifica que no haya errores

**⚠️ NOTA**: Si ves errores de sintaxis con "#" o "---", significa que estás ejecutando markdown en lugar de SQL. Usa el archivo `.sql`, no el `.md`.

---

## ✅ Verificación Post-Ejecución

### Verificar que la tabla se creó

```sql
-- Verificar tabla de configuración
SELECT * FROM public.auction_bonus_config WHERE id = 'default';
```

**Resultado esperado**: Debe mostrar un registro con `id = 'default'` y valores por defecto.

### Verificar que la función se actualizó

```sql
-- Verificar que place_bid() tiene la nueva lógica
SELECT 
  proname as function_name,
  CASE 
    WHEN prosrc LIKE '%get_bonus_time_config%' THEN '✅ Usa configuración centralizada'
    ELSE '❌ NO usa configuración centralizada'
  END as uses_centralized_config,
  CASE 
    WHEN prosrc LIKE '%bonus_window_seconds%' THEN '✅ Tiene ventana de activación'
    ELSE '❌ NO tiene ventana de activación'
  END as has_bonus_window,
  CASE 
    WHEN prosrc LIKE '%bonus_extend_seconds%' THEN '✅ Tiene tiempo de extensión'
    ELSE '❌ NO tiene tiempo de extensión'
  END as has_bonus_extend,
  CASE 
    WHEN prosrc LIKE '%bonus_applied%' THEN '✅ Retorna información de bonus'
    ELSE '❌ NO retorna información de bonus'
  END as returns_bonus_info
FROM pg_proc
WHERE proname = 'place_bid';
```

**Resultado esperado**:
- `uses_centralized_config`: ✅ Usa configuración centralizada
- `has_bonus_window`: ✅ Tiene ventana de activación
- `has_bonus_extend`: ✅ Tiene tiempo de extensión
- `returns_bonus_info`: ✅ Retorna información de bonus

### Verificar función auxiliar

```sql
-- Probar función de configuración
SELECT * FROM public.get_bonus_time_config();
```

**Resultado esperado**: Debe retornar 3 columnas con valores por defecto (10, 10, 50).

---

## 📋 Checklist

- [ ] Abrir Supabase Dashboard → SQL Editor
- [ ] Abrir archivo: `supabase/migrations/20250202000011_centralize_bonus_time_config.sql`
- [ ] Copiar TODO el contenido
- [ ] Pegar en Editor SQL
- [ ] Ejecutar migración
- [ ] Verificar que no hay errores
- [ ] Ejecutar queries de verificación
- [ ] Confirmar que tabla y función se crearon correctamente

---

## 🔧 Cambiar Valores de Configuración (Opcional)

Después de ejecutar la migración, puedes cambiar los valores por defecto:

```sql
-- Cambiar a 30 segundos de ventana y 30 segundos de extensión
UPDATE public.auction_bonus_config
SET 
  bonus_window_seconds = 30,
  bonus_extend_seconds = 30,
  bonus_max_extensions = 100,
  updated_at = NOW()
WHERE id = 'default';
```

**Nota**: Los cambios afectan todas las subastas que no tengan `auto_extend_seconds` configurado.

---

**Última actualización**: 2024


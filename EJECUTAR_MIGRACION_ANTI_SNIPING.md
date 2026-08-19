# 📋 Migración SQL: Límites de Anti-Sniping

## ⚠️ IMPORTANTE: Ejecutar en Supabase SQL Editor

Esta migración agrega límites al anti-sniping para prevenir extensiones infinitas.

---

## ✅ MIGRACIÓN REQUERIDA

### `20250202000010_add_anti_sniping_limits.sql`

**Archivo**: `supabase/migrations/20250202000010_add_anti_sniping_limits.sql`

**¿Qué hace?**
- Actualiza la función `place_bid()` para incluir límites de anti-sniping
- **Límite 1**: Duración máxima total (usa `auction_max_duration_hours`)
- **Límite 2**: Número máximo de extensiones (50 por defecto)
- Previene extensiones infinitas del tiempo de subasta

**¿Por qué es necesaria?**
- Previene que una subasta se extienda indefinidamente por anti-sniping
- Garantiza que las subastas terminen en un tiempo razonable
- Protege contra abuso del sistema de extensiones

---

## 📝 INSTRUCCIONES

1. Abre el **Editor SQL** en tu proyecto de Supabase
2. Abre el archivo: `supabase/migrations/20250202000010_add_anti_sniping_limits.sql`
3. **Copia TODO el contenido** del archivo
4. Pega en el Editor SQL de Supabase
5. Ejecuta la migración (botón "Run" o `Ctrl+Enter`)
6. Verifica que no haya errores

---

## ✅ Verificación Post-Ejecución

Después de ejecutar, verifica que la función se actualizó:

```sql
-- Verificar que la función tiene los límites
SELECT 
  proname as function_name,
  CASE 
    WHEN prosrc LIKE '%v_max_extensions%' THEN '✅ Tiene límite de extensiones'
    ELSE '❌ NO tiene límite de extensiones'
  END as has_extension_limit,
  CASE 
    WHEN prosrc LIKE '%auction_max_duration_hours%' THEN '✅ Tiene límite de duración'
    ELSE '❌ NO tiene límite de duración'
  END as has_duration_limit
FROM pg_proc
WHERE proname = 'place_bid';
```

**Resultado esperado**:
- `has_extension_limit`: ✅ Tiene límite de extensiones
- `has_duration_limit`: ✅ Tiene límite de duración

---

## 📋 Checklist

- [ ] Abrir Supabase Dashboard → SQL Editor
- [ ] Abrir archivo: `supabase/migrations/20250202000010_add_anti_sniping_limits.sql`
- [ ] Copiar TODO el contenido
- [ ] Pegar en Editor SQL
- [ ] Ejecutar migración
- [ ] Verificar que no hay errores
- [ ] Ejecutar query de verificación
- [ ] Confirmar que ambos límites están presentes

---

**Última actualización**: 2024








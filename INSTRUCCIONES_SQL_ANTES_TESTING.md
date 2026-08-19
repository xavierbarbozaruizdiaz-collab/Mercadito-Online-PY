# 📋 INSTRUCCIONES SQL - ANTES DEL TESTING
**Lead Product Manager Senior**  
**Fecha:** 2025-01-30  
**Estado:** ⚠️ REVISIÓN DE MIGRACIONES

---

## ⚠️ PROBLEMA DETECTADO

**Conflicto de nombres de migración:**
- `20250130000003_approve_pending_membership.sql` (NUEVA - creada hoy)
- `20250130000003_get_server_time.sql` (EXISTENTE)

**Ambas tienen el mismo timestamp**, lo que puede causar conflictos.

---

## ✅ SOLUCIÓN

### **Opción 1: Renombrar la nueva migración (RECOMENDADO)**

Renombrar el archivo a un timestamp posterior:
```
20250130000003_approve_pending_membership.sql
→
20250131000001_approve_pending_membership.sql
```

### **Opción 2: Ejecutar manualmente en Supabase**

Si no quieres renombrar, ejecutar el SQL directamente en Supabase Dashboard.

---

## 📝 MIGRACIÓN A EJECUTAR

### **Archivo:** `supabase/migrations/20250130000003_approve_pending_membership.sql`

**O si renombras:**
### **Archivo:** `supabase/migrations/20250131000001_approve_pending_membership.sql`

---

## 🔧 CÓMO EJECUTAR

### **Método 1: Supabase CLI (Recomendado)**

```bash
# 1. Renombrar archivo primero (si hay conflicto)
# 2. Aplicar migración
supabase migration up

# O aplicar migración específica
supabase db push
```

### **Método 2: Supabase Dashboard (Manual)**

1. Ir a **Supabase Dashboard** → Tu proyecto
2. Ir a **SQL Editor**
3. Copiar y pegar el contenido de la migración
4. Ejecutar

### **Método 3: psql (Directo)**

```bash
psql -h [TU_HOST] -U postgres -d postgres -f supabase/migrations/20250130000003_approve_pending_membership.sql
```

---

## 📄 CONTENIDO DE LA MIGRACIÓN

La migración crea la función:
```sql
approve_pending_membership_subscription(
  p_subscription_id UUID,
  p_duration_days INTEGER DEFAULT NULL
)
```

**Qué hace:**
- Aprueba una suscripción pendiente
- Calcula duración (usa la del plan o la especificada)
- Actualiza suscripción a 'active'
- Actualiza perfil del usuario
- Crea notificación
- Reactiva productos pausados (si aplica)

---

## ✅ VERIFICACIÓN POST-EJECUCIÓN

Después de ejecutar, verificar que la función existe:

```sql
-- Verificar que la función existe
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'approve_pending_membership_subscription';

-- Debe retornar 1 fila
```

---

## 🚨 IMPORTANTE

### **Antes de ejecutar:**
1. ✅ Verificar que no hay conflictos de nombres
2. ✅ Hacer backup de la BD (recomendado)
3. ✅ Ejecutar en ambiente de desarrollo primero
4. ✅ Verificar que la función se creó correctamente

### **Después de ejecutar:**
1. ✅ Verificar que la función existe
2. ✅ Probar con una suscripción de prueba
3. ✅ Verificar logs por errores

---

## 📋 CHECKLIST PRE-TESTING

- [ ] Migración renombrada (si hay conflicto)
- [ ] Backup de BD realizado
- [ ] Migración ejecutada
- [ ] Función verificada en BD
- [ ] Sin errores en logs
- [ ] Listo para testing

---

## 🔍 NOTA SOBRE OTRAS MIGRACIONES

**Migraciones relacionadas que ya deberían estar ejecutadas:**
- ✅ `20250202000004_membership_plans_system.sql` - Sistema de membresías base
- ✅ `20250130000001_fix_store_membership_expiration.sql` - Expiración de tiendas
- ✅ `20250130000002_store_membership_notifications_reactivation.sql` - Notificaciones

**Si estas NO están ejecutadas, ejecutarlas primero.**

---

*Instrucciones generadas por LPMS - Mercadito Online PY*

















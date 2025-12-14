# ✅ CHECKLIST SQL - ANTES DEL TESTING
**Lead Product Manager Senior**  
**Fecha:** 2025-01-30

---

## 🎯 MIGRACIÓN REQUERIDA

### **Archivo:** `supabase/migrations/20250131000001_approve_pending_membership.sql`

**Función creada:** `approve_pending_membership_subscription()`

**Propósito:** Permite aprobar manualmente suscripciones pendientes de transferencia bancaria

---

## 📋 PASOS A SEGUIR

### **1. Verificar que el archivo existe**
```bash
# Verificar archivo
ls supabase/migrations/20250131000001_approve_pending_membership.sql
```

### **2. Ejecutar migración**

#### **Opción A: Supabase CLI (Recomendado)**
```bash
cd [tu-proyecto]
supabase db push
```

#### **Opción B: Supabase Dashboard**
1. Ir a **Supabase Dashboard** → Tu proyecto
2. **SQL Editor** → **New Query**
3. Copiar contenido del archivo
4. **Run**

#### **Opción C: psql**
```bash
psql -h [host] -U postgres -d postgres -f supabase/migrations/20250131000001_approve_pending_membership.sql
```

---

### **3. Verificar ejecución**

Ejecutar en SQL Editor:
```sql
-- Verificar que la función existe
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'approve_pending_membership_subscription';
```

**Resultado esperado:** 1 fila con la función

---

### **4. Verificar permisos**

```sql
-- Verificar que la función tiene SECURITY DEFINER
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'approve_pending_membership_subscription';
```

**Debe contener:** `SECURITY DEFINER`

---

## ✅ CHECKLIST COMPLETO

- [ ] Archivo de migración existe
- [ ] Migración ejecutada sin errores
- [ ] Función existe en BD
- [ ] Función tiene permisos correctos (SECURITY DEFINER)
- [ ] Sin errores en logs de Supabase
- [ ] Listo para testing

---

## 🧪 TESTING RÁPIDO POST-EJECUCIÓN

Después de ejecutar, probar que funciona:

```sql
-- Crear una suscripción de prueba (si no existe)
-- Luego intentar aprobarla (esto solo verifica que la función existe)
SELECT approve_pending_membership_subscription(
  '00000000-0000-0000-0000-000000000000'::UUID,  -- UUID de prueba
  30  -- días
);
```

**Nota:** Esto fallará porque el UUID no existe, pero confirma que la función está disponible.

---

## 🚨 SI HAY ERRORES

### **Error: "function already exists"**
- La función ya está creada
- Puedes usar `CREATE OR REPLACE` (ya está en el SQL)
- Ejecutar de nuevo está bien

### **Error: "permission denied"**
- Verificar que estás usando usuario con permisos
- En Supabase Dashboard, usar SQL Editor (tiene permisos)

### **Error: "table does not exist"**
- Verificar que las tablas base existen:
  - `membership_subscriptions`
  - `membership_plans`
  - `profiles`
  - `notifications`

---

## 📝 NOTAS IMPORTANTES

1. **Esta migración es SEGURA** - Solo crea una función, no modifica datos
2. **Puede ejecutarse múltiples veces** - Usa `CREATE OR REPLACE`
3. **No afecta datos existentes** - Solo agrega funcionalidad
4. **Es necesaria para el flujo de aprobación manual**

---

## ✅ CONFIRMACIÓN FINAL

Una vez ejecutada y verificada:

```
✅ Migración ejecutada
✅ Función creada
✅ Permisos correctos
✅ Listo para testing del flujo completo
```

---

*Checklist generado por LPMS - Mercadito Online PY*

















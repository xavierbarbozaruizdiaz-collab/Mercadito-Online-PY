# 🔍 AUDITORÍA LPMS - Sistema de Membresías: Desincronización entre Planes y Asignación

**Fecha:** 2025-11-30  
**Autor:** Lead Product Manager Senior  
**Problema:** Dropdown de membresías no refleja los planes disponibles en la base de datos

---

## 📊 DIAGNÓSTICO COMPLETO

### 1. PROBLEMA IDENTIFICADO

**Síntoma:** Al intentar asignar membresías a usuarios en `/admin/memberships`, el dropdown muestra opciones fijas que no coinciden con los planes configurados en `/admin/memberships/plans`.

**Evidencia:**
- En `/admin/memberships/plans` hay 4 planes: **Bronce, Plata, Oro, Plan Tienda Pro (store)**
- En `/admin/memberships` el dropdown solo muestra: **Gratis, Bronce, Plata, Oro** (hardcodeado)
- Falta el plan **"store"** en el dropdown
- Los planes no se sincronizan dinámicamente

---

### 2. ANÁLISIS DE CAUSAS RAÍZ

#### 2.1 Desincronización de Datos

**Problema 1: Dropdown Hardcodeado**
- **Ubicación:** `src/app/admin/memberships/page.tsx` líneas 346-349
- **Código actual:**
```typescript
<select>
  <option value="free">Gratis</option>
  <option value="bronze">Bronce</option>
  <option value="silver">Plata</option>
  <option value="gold">Oro</option>
</select>
```
- **Problema:** Valores fijos, no lee desde `membership_plans`
- **Impacto:** CRÍTICO - No se pueden asignar planes nuevos sin modificar código

#### 2.2 Constraint de Base de Datos Incompleto

**Problema 2: CHECK Constraint Restrictivo**
- **Ubicación:** `supabase/migrations/20250202000004_membership_plans_system.sql` línea 16
- **Código actual:**
```sql
level TEXT NOT NULL UNIQUE CHECK (level IN ('bronze', 'silver', 'gold'))
```
- **Problema:** No incluye `'store'` ni `'free'`
- **Impacto:** ALTO - No se puede crear plan "store" en la BD

#### 2.3 Tipo TypeScript Desactualizado

**Problema 3: Tipo MembershipLevel Incompleto**
- **Ubicaciones:**
  - `src/app/admin/memberships/page.tsx` línea 14: `type MembershipLevel = 'free' | 'bronze' | 'silver' | 'gold';`
  - `src/types/index.ts` línea 11: `export type MembershipLevel = 'free' | 'bronze' | 'silver' | 'gold';`
  - `src/types/database.ts` línea 22: `membership_level: 'free' | 'bronze' | 'silver' | 'gold';`
- **Problema:** No incluye `'store'`
- **Impacto:** MEDIO - Errores de tipo al intentar usar 'store'

#### 2.4 Falta de Sincronización

**Problema 4: No hay Conexión entre Tablas**
- **Tabla `membership_plans`:** Contiene planes configurables (bronze, silver, gold, store)
- **Campo `profiles.membership_level`:** Almacena nivel del usuario (free, bronze, silver, gold)
- **Problema:** No hay relación FK ni validación que sincronice ambos
- **Impacto:** CRÍTICO - Pueden existir niveles en `profiles` que no existen en `membership_plans`

---

### 3. FLUJO ACTUAL (ROTO)

```
┌─────────────────────────────────────────────────────────┐
│ 1. Admin crea/edita planes en /admin/memberships/plans │
│    ✅ Se guarda en tabla membership_plans              │
└────────────────────┬──────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Admin intenta asignar membresía en /admin/memberships│
│    ❌ Dropdown muestra valores hardcodeados             │
│    ❌ No lee desde membership_plans                      │
│    ❌ Falta opción "store"                               │
└─────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Usuario intenta usar membresía                        │
│    ⚠️ Puede tener nivel que no existe en planes         │
│    ⚠️ Validaciones pueden fallar                         │
└─────────────────────────────────────────────────────────┘
```

---

### 4. FLUJO CORRECTO (PROPUESTO)

```
┌─────────────────────────────────────────────────────────┐
│ 1. Admin crea/edita planes en /admin/memberships/plans  │
│    ✅ Se guarda en tabla membership_plans               │
│    ✅ CHECK constraint permite: bronze, silver, gold,   │
│       store, free                                        │
└────────────────────┬──────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Admin intenta asignar membresía en /admin/memberships│
│    ✅ Dropdown lee dinámicamente desde membership_plans  │
│    ✅ Muestra todos los planes activos + "free"         │
│    ✅ Incluye "store" si existe                         │
└────────────────────┬──────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Al guardar, valida que el nivel existe en planes    │
│    ✅ FK o CHECK constraint valida                      │
│    ✅ Usuario tiene membresía válida                    │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ SOLUCIÓN PROFESIONAL COMPLETA

### FASE 1: ACTUALIZAR BASE DE DATOS (CRÍTICO)

#### 1.1 Actualizar CHECK Constraint
**Archivo:** `supabase/migrations/20251130000003_fix_membership_levels.sql` (NUEVO)

```sql
-- ============================================
-- FIX: Actualizar constraint de membership_plans.level
-- ============================================

-- 1. Eliminar constraint antiguo
ALTER TABLE membership_plans 
DROP CONSTRAINT IF EXISTS membership_plans_level_check;

-- 2. Agregar constraint nuevo que incluye 'store' y 'free'
ALTER TABLE membership_plans
ADD CONSTRAINT membership_plans_level_check 
CHECK (level IN ('bronze', 'silver', 'gold', 'store', 'free'));

-- 3. Actualizar constraint en profiles.membership_level
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_membership_level_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_membership_level_check
CHECK (membership_level IN ('free', 'bronze', 'silver', 'gold', 'store'));

-- 4. Insertar plan "store" si no existe
INSERT INTO membership_plans (
  level, 
  name, 
  description, 
  price_monthly, 
  price_yearly, 
  duration_days, 
  bid_limit, 
  bid_limit_formatted, 
  features, 
  is_active, 
  is_popular, 
  sort_order
) VALUES (
  'store',
  'Plan Tienda Pro',
  'Plan premium para vendedores con tienda',
  200000,
  1800000,
  30,
  NULL,
  'Ilimitado',
  '["Vitrina personalizada y catálogo ilimitado", "Participación ilimitada en subastas (excepto en tus propios lotes)", "Herramientas avanzadas de venta y analíticas", "Soporte prioritario y onboarding"]'::jsonb,
  true,
  true,
  4
)
ON CONFLICT (level) DO NOTHING;

-- 5. Insertar plan "free" si no existe (para referencia)
INSERT INTO membership_plans (
  level,
  name,
  description,
  price_monthly,
  price_yearly,
  duration_days,
  bid_limit,
  bid_limit_formatted,
  features,
  is_active,
  is_popular,
  sort_order
) VALUES (
  'free',
  'Gratis',
  'Plan gratuito sin acceso a pujas',
  0,
  0,
  NULL,
  0,
  'No puede pujar',
  '["Solo visualización de subastas"]'::jsonb,
  true,
  false,
  0
)
ON CONFLICT (level) DO NOTHING;
```

---

### FASE 2: ACTUALIZAR TIPOS TYPESCRIPT (CRÍTICO)

#### 2.1 Actualizar tipo en página de membresías
**Archivo:** `src/app/admin/memberships/page.tsx`

```typescript
// Línea 14 - ACTUALIZAR
type MembershipLevel = 'free' | 'bronze' | 'silver' | 'gold' | 'store';
```

#### 2.2 Actualizar tipo global
**Archivo:** `src/types/index.ts`

```typescript
// Línea 11 - ACTUALIZAR
export type MembershipLevel = 'free' | 'bronze' | 'silver' | 'gold' | 'store';
```

#### 2.3 Actualizar tipo en database.ts
**Archivo:** `src/types/database.ts`

```typescript
// Línea 22, 39, 56 - ACTUALIZAR
membership_level: 'free' | 'bronze' | 'silver' | 'gold' | 'store';
```

#### 2.4 Actualizar tipo en membershipService.ts
**Archivo:** `src/lib/services/membershipService.ts`

```typescript
// Línea 11 - ACTUALIZAR
level: 'bronze' | 'silver' | 'gold' | 'store' | 'free';
```

---

### FASE 3: HACER DROPDOWN DINÁMICO (CRÍTICO)

#### 3.1 Modificar página de membresías para leer planes dinámicamente
**Archivo:** `src/app/admin/memberships/page.tsx`

**Cambios necesarios:**

```typescript
// 1. Agregar estado para planes
const [availablePlans, setAvailablePlans] = useState<Array<{
  level: MembershipLevel;
  name: string;
}>>([]);

// 2. Cargar planes al montar componente
useEffect(() => {
  loadPlans();
}, []);

async function loadPlans() {
  try {
    // Cargar planes activos desde membership_plans
    const { data: plans, error } = await supabase
      .from('membership_plans')
      .select('level, name')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    // Agregar "free" siempre (no está en membership_plans como plan pagado)
    const plansWithFree = [
      { level: 'free' as MembershipLevel, name: 'Gratis' },
      ...(plans || []).map((p: any) => ({
        level: p.level as MembershipLevel,
        name: p.name
      }))
    ];

    setAvailablePlans(plansWithFree);
  } catch (err) {
    logger.error('Error loading plans', err);
    // Fallback a valores hardcodeados
    setAvailablePlans([
      { level: 'free', name: 'Gratis' },
      { level: 'bronze', name: 'Bronce' },
      { level: 'silver', name: 'Plata' },
      { level: 'gold', name: 'Oro' },
      { level: 'store', name: 'Plan Tienda Pro' }
    ]);
  }
}

// 3. Reemplazar dropdown hardcodeado (línea 336-350)
{isEditing ? (
  <select
    value={editData?.membership_level || 'free'}
    onChange={(e) =>
      setEditData({
        ...editData!,
        membership_level: e.target.value as MembershipLevel,
      })
    }
    className="px-2 py-1 border border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
  >
    {availablePlans.map((plan) => (
      <option key={plan.level} value={plan.level}>
        {plan.name}
      </option>
    ))}
  </select>
) : (
  // ... resto igual
)}
```

---

### FASE 4: ACTUALIZAR FUNCIONES DE MAPEO (ALTO)

#### 4.1 Actualizar getMembershipLabel
**Archivo:** `src/app/admin/memberships/page.tsx`

```typescript
function getMembershipLabel(level: MembershipLevel): string {
  // Buscar en planes cargados primero
  const plan = availablePlans.find(p => p.level === level);
  if (plan) return plan.name;
  
  // Fallback
  switch (level) {
    case 'free':
      return 'Gratis';
    case 'bronze':
      return 'Bronce';
    case 'silver':
      return 'Plata';
    case 'gold':
      return 'Oro';
    case 'store':
      return 'Plan Tienda Pro';
    default:
      return level;
  }
}
```

#### 4.2 Actualizar getBidLimit
**Archivo:** `src/app/admin/memberships/page.tsx`

```typescript
function getBidLimit(level: MembershipLevel): string {
  switch (level) {
    case 'free':
      return 'No puede pujar';
    case 'bronze':
      return 'Hasta 2,500,000 Gs';
    case 'silver':
      return 'Hasta 10,000,000 Gs';
    case 'gold':
    case 'store':
      return 'Sin límite';
    default:
      return 'N/A';
  }
}
```

#### 4.3 Actualizar getMembershipColor
**Archivo:** `src/app/admin/memberships/page.tsx`

```typescript
function getMembershipColor(level: MembershipLevel): string {
  switch (level) {
    case 'free':
      return 'bg-gray-100 text-gray-800';
    case 'bronze':
      return 'bg-amber-100 text-amber-800';
    case 'silver':
      return 'bg-gray-200 text-gray-900';
    case 'gold':
      return 'bg-yellow-100 text-yellow-900';
    case 'store':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
```

---

### FASE 5: ACTUALIZAR ESTADÍSTICAS (MEDIO)

#### 5.1 Actualizar cards de estadísticas
**Archivo:** `src/app/admin/memberships/page.tsx`

```typescript
// Línea 236 - ACTUALIZAR para incluir 'store'
{(['free', 'bronze', 'silver', 'gold', 'store'] as MembershipLevel[]).map((level) => {
  // ... resto igual
})}
```

#### 5.2 Actualizar filtros
**Archivo:** `src/app/admin/memberships/page.tsx`

```typescript
// Línea 266 - ACTUALIZAR para incluir 'store'
{(['all', 'free', 'bronze', 'silver', 'gold', 'store'] as const).map((f) => {
  // ... resto igual
})}
```

---

### FASE 6: VALIDACIÓN AL GUARDAR (ALTO)

#### 6.1 Agregar validación en saveEdit
**Archivo:** `src/app/admin/memberships/page.tsx`

```typescript
async function saveEdit(userId: string) {
  if (!editData) return;

  // VALIDACIÓN: Verificar que el plan existe y está activo
  if (editData.membership_level !== 'free') {
    const { data: planExists } = await supabase
      .from('membership_plans')
      .select('id, is_active')
      .eq('level', editData.membership_level)
      .eq('is_active', true)
      .single();

    if (!planExists) {
      alert(`Error: El plan "${editData.membership_level}" no existe o está inactivo.`);
      return;
    }
  }

  setSaving(userId);
  try {
    // ... resto del código igual
  } catch (err: any) {
    // ... manejo de errores
  }
}
```

---

## 📋 PLAN DE IMPLEMENTACIÓN

### Prioridad CRÍTICA (Implementar primero)
1. ✅ **Fase 1:** Actualizar CHECK constraints en BD
2. ✅ **Fase 2:** Actualizar tipos TypeScript
3. ✅ **Fase 3:** Hacer dropdown dinámico

### Prioridad ALTA (Implementar después)
4. ✅ **Fase 4:** Actualizar funciones de mapeo
5. ✅ **Fase 6:** Validación al guardar

### Prioridad MEDIA (Mejoras)
6. ✅ **Fase 5:** Actualizar estadísticas

---

## 🧪 TESTING

### Casos de prueba:
1. ✅ Crear plan "store" en `/admin/memberships/plans` → Debe aparecer en dropdown
2. ✅ Desactivar plan "bronze" → No debe aparecer en dropdown
3. ✅ Asignar membresía "store" a usuario → Debe guardarse correctamente
4. ✅ Verificar que estadísticas incluyen "store"
5. ✅ Verificar que filtros incluyen "store"
6. ✅ Cambiar nombre de plan → Debe reflejarse en dropdown

---

## ⚠️ CONSIDERACIONES IMPORTANTES

1. **Plan "free":** No está en `membership_plans` como plan pagado, pero debe estar siempre disponible en el dropdown
2. **Compatibilidad:** Usuarios existentes con `membership_level = 'store'` deben seguir funcionando
3. **Validación:** Al asignar membresía, verificar que el plan existe y está activo
4. **Sincronización:** Si se desactiva un plan, usuarios con ese nivel deben ser notificados o migrados

---

## 🚀 PRÓXIMOS PASOS

1. Aplicar migración SQL (Fase 1)
2. Actualizar tipos TypeScript (Fase 2)
3. Implementar dropdown dinámico (Fase 3)
4. Testing exhaustivo
5. Deploy

---

**Fin del documento**


















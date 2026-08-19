# 📋 PLAN LPMS - MEJORAS DE MEMBRESÍAS
**Lead Product Manager Senior**  
**Fecha:** 2025-01-30  
**Estado:** 🚀 EN EJECUCIÓN

---

## 🎯 OBJETIVOS

### **Mejora 1: Contador de Pendientes en Admin**
**Objetivo:** Mostrar número de suscripciones pendientes en botón "Pendientes"

**Beneficios:**
- Admin ve inmediatamente si hay trabajo pendiente
- Mejora visibilidad de solicitudes
- Reduce tiempo de respuesta

**Requisitos:**
- Función para contar pendientes
- Badge visual en botón
- Actualización automática

---

### **Mejora 2: Página "Mis Membresías" para Usuario**
**Objetivo:** Usuario puede ver estado de sus suscripciones

**Beneficios:**
- Transparencia para el usuario
- Reduce consultas a soporte
- Mejora experiencia de usuario

**Requisitos:**
- Página `/dashboard/membership` o `/memberships/my`
- Mostrar suscripciones activas
- Mostrar suscripciones pendientes
- Mostrar historial
- Estado claro de cada una

---

## 📊 ANÁLISIS TÉCNICO

### **Estado Actual:**
- ✅ Existe página `/admin/memberships/pending`
- ✅ Existe función para cargar pendientes
- ❌ No hay contador visible
- ❌ No hay página para usuario ver sus membresías

### **Patrones Existentes:**
- `src/app/admin/payouts/page.tsx` tiene contador de pendientes (línea 110)
- Usa badge con número
- Se actualiza al cargar datos

---

## 🔧 IMPLEMENTACIÓN

### **Fase 1: Contador de Pendientes**

**Archivos a modificar:**
1. `src/lib/services/membershipService.ts` - Agregar función `getPendingSubscriptionsCount()`
2. `src/app/admin/memberships/page.tsx` - Cargar y mostrar contador

**Código necesario:**
```typescript
// En membershipService.ts
export async function getPendingSubscriptionsCount(): Promise<number> {
  const { count, error } = await supabase
    .from('membership_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
  
  return count || 0;
}

// En admin/memberships/page.tsx
const [pendingCount, setPendingCount] = useState(0);

// Cargar contador
const count = await getPendingSubscriptionsCount();
setPendingCount(count);

// Mostrar badge
{pendingCount > 0 && (
  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
    {pendingCount}
  </span>
)}
```

---

### **Fase 2: Página "Mis Membresías"**

**Archivos a crear:**
1. `src/app/dashboard/membership/page.tsx` (NUEVO)

**Funcionalidad:**
- Cargar suscripciones del usuario (activas, pendientes, expiradas)
- Mostrar estado claro de cada una
- Mostrar detalles (plan, tipo, fecha, monto)
- Acciones según estado

**Estructura:**
```
/dashboard/membership
├── Suscripción Activa (si existe)
│   ├── Plan, tipo, expiración
│   └── Beneficios actuales
├── Suscripciones Pendientes
│   ├── Estado: Pendiente
│   └── Instrucciones
└── Historial
    └── Suscripciones anteriores
```

---

## ✅ CRITERIOS DE ÉXITO

### **Contador:**
- ✅ Se muestra número correcto
- ✅ Se actualiza al cargar página
- ✅ Badge visible y claro
- ✅ No afecta performance

### **Página Usuario:**
- ✅ Muestra todas las suscripciones del usuario
- ✅ Estado claro de cada una
- ✅ Información completa
- ✅ UX intuitiva

---

## 🧪 TESTING

### **Testing Contador:**
1. Crear suscripción pendiente
2. Verificar que contador aumenta
3. Aprobar suscripción
4. Verificar que contador disminuye

### **Testing Página Usuario:**
1. Usuario con membresía activa
2. Usuario con membresía pendiente
3. Usuario sin membresía
4. Usuario con historial

---

*Plan generado por LPMS - Mercadito Online PY*

















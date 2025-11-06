# 📋 OTROS COMPONENTES Y ARCHIVOS ELIMINADOS

## 🔴 ARCHIVOS ELIMINADOS DEL REPOSITORIO

### 1. **Páginas Duplicadas (Eliminadas intencionalmente)**
- ❌ `src/app/admin/page.tsx` - Eliminado por duplicado (commit `8f8ed9c`)
- ❌ `src/app/(marketplace)/stores/page.tsx` - Eliminado por duplicado de rutas (commit `774dadb`)
- ❌ `supabase/migrations/20250128000001_security_audit.sql` - Migración eliminada

### 2. **Componente Badge (Duplicado en múltiples archivos)**
- ⚠️ `Badge` está implementado localmente en:
  - `src/components/AuctionsNavLink.tsx` (líneas 14-30)
  - `src/components/RafflesNavLink.tsx` (líneas 14-30)
- **Problema**: Código duplicado. Debería existir un componente compartido `Badge.tsx`

### 3. **Carpetas Vacías (Sin contenido)**
- ❌ `src/components/charts/` - Vacía
- ❌ `src/components/common/` - Vacía

---

## 🔧 COMPONENTES QUE DEBERÍAN EXISTIR

### 1. **Badge Component** ✅ RESTAURADO
**Ubicación:** `src/components/ui/Badge.tsx`

**Razón:** El componente Badge estaba duplicado en 2 archivos. Ahora es un componente reutilizable.

**Estado:** ✅ Creado y actualizados los archivos que lo usan:
- `src/components/AuctionsNavLink.tsx` - Actualizado para usar Badge importado
- `src/components/RafflesNavLink.tsx` - Actualizado para usar Badge importado

**Implementación actual:**
```typescript
function Badge({ children, variant = 'success', size = 'sm', className = '' }: { 
  children: React.ReactNode; 
  variant?: 'success' | 'warning'; 
  size?: 'sm' | 'md'; 
  className?: string 
}) {
  const variantClasses = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
  };
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };
  
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
      {children}
    </span>
  );
}
```

**Beneficios de extraerlo:**
- ✅ Evitar duplicación de código
- ✅ Fácil mantenimiento
- ✅ Consistencia visual
- ✅ Reutilizable en otros componentes

---

## 📁 ARCHIVOS DE ASSETS FALTANTES

### 1. **Imágenes PWA**
- ❌ `public/icons/icon-96x96.png` - Logo para header (actualmente hay fallback)
- ❌ `public/og-image.jpg` - Imagen OpenGraph (1200x630px)
- ⚠️ `public/favicon.ico` - Verificar si existe

### 2. **Migrations Eliminadas**
- ❌ `supabase/migrations/20250128000001_security_audit.sql` - Eliminada (razón desconocida)

---

## 🎨 COMPONENTES UI POTENCIALMENTE FALTANTES

### Basado en el uso común de Next.js/React:

1. **Button Component** - Botón reutilizable con variantes
2. **Input Component** - Input con estilos consistentes
3. **Modal Component** - Para diálogos y modales
4. **Loading Component** - Spinner/loader reutilizable
5. **Card Component** - Tarjetas con estilos consistentes

**Nota:** Estos no están confirmados como eliminados, pero podrían ser útiles para evitar duplicación.

---

## 🔍 VERIFICACIONES RECOMENDADAS

### 1. Verificar si existen archivos de assets
```bash
ls public/icons/icon-96x96.png
ls public/og-image.jpg
ls public/favicon.ico
```

### 2. Buscar referencias a componentes que podrían no existir
```bash
grep -r "from.*Badge" src/
grep -r "import.*Button" src/
grep -r "import.*Modal" src/
```

### 3. Verificar migraciones de Supabase
```bash
ls supabase/migrations/ | grep security_audit
```

---

## ✅ RECOMENDACIONES

### Prioridad Alta:
1. ✅ **Crear componente Badge.tsx** - COMPLETADO
2. **Verificar assets PWA** - Asegurar que existen las imágenes
3. **Limpiar carpetas vacías** - Eliminar `charts/` y `common/` si no se usarán

### Prioridad Media:
4. **Crear componentes UI básicos** - Button, Input, Modal si se necesitan
5. **Documentar migrations eliminadas** - Si hay razón específica

### Prioridad Baja:
6. **Revisar historial completo** - Buscar otros archivos eliminados en commits antiguos

---

**Última actualización:** Ahora
**Estado:** Componentes principales restaurados, faltan componentes UI reutilizables


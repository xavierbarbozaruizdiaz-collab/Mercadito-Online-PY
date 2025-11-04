# 📋 Plan Completo de Mejoras - Mercadito Online PY

## 🔍 Análisis del Estado Actual

### ✅ Funcionalidades YA Implementadas

1. **Sistema de Notificaciones**
   - ✅ `NotificationsPanel` componente
   - ✅ `notificationService` con CRUD completo
   - ✅ Tabla `notifications` en BD
   - ✅ Notificaciones en tiempo real con Supabase Realtime
   - ⚠️ **Falta**: Integración completa en todas las acciones del usuario

2. **Loading States**
   - ✅ `Skeleton.tsx` componente
   - ✅ `LoadingSpinner.tsx` componente
   - ⚠️ **Falta**: Usar más skeleton loaders en lugar de spinners

3. **Theme Provider**
   - ✅ `ThemeContext.tsx` implementado
   - ✅ Guarda preferencia en localStorage
   - ⚠️ **Falta**: CSS completo para modo oscuro en todos los componentes

4. **Analytics**
   - ✅ `AnalyticsService` implementado
   - ✅ `AnalyticsDashboard` para admins
   - ✅ Tabla `analytics_events` en BD
   - ⚠️ **Falta**: Dashboard para vendedores con métricas específicas

5. **Email System**
   - ✅ API routes: `/api/email/order-confirmation`
   - ✅ API routes: `/api/email/welcome`
   - ⚠️ **Falta**: Email para ganadores de sorteos
   - ⚠️ **Falta**: Email para notificaciones importantes

6. **Lazy Loading**
   - ✅ `LazyImage.tsx` componente
   - ✅ `useLazyLoad.ts` hook
   - ⚠️ **Falta**: Aplicar más agresivamente en listas de productos

### ❌ Funcionalidades NO Implementadas

1. **Toast Notifications**
   - ❌ No hay componente de Toast
   - ❌ Se usa `alert()` en muchos lugares
   - ❌ No hay sistema de notificaciones toast persistente

2. **Sistema de Cupones/Descuentos**
   - ❌ No existe tabla de cupones
   - ❌ No hay UI para aplicar cupones
   - ❌ No hay validación de cupones en checkout

3. **Calculadora Mayorista en Tiempo Real**
   - ❌ No hay cálculo dinámico mientras usuario cambia cantidad
   - ❌ No hay preview del ahorro antes de agregar al carrito

4. **Breadcrumbs**
   - ❌ No hay componente de breadcrumbs
   - ❌ No hay navegación contextual en páginas internas

5. **Historial de Sorteos Ganados**
   - ❌ No hay sección en perfil para sorteos ganados
   - ❌ No hay notificación cuando se gana un sorteo

6. **Dashboard Analytics para Vendedores**
   - ❌ No hay métricas específicas para vendedores
   - ❌ No hay gráficos de ventas por período
   - ❌ No hay análisis de productos más vendidos

---

## 📝 Plan de Implementación Detallado

### FASE 1: Mejoras de UX Críticas (Prioridad Alta)

#### 1.1 Sistema de Toast Notifications
**Objetivo**: Reemplazar todos los `alert()` con toasts elegantes

**Archivos a crear/modificar**:
- `src/components/ui/Toast.tsx` - Componente Toast
- `src/components/ui/Toaster.tsx` - Container de toasts
- `src/contexts/ToastContext.tsx` - Context para manejar toasts globalmente
- `src/hooks/useToast.ts` - Hook para usar toasts
- Reemplazar `alert()` en:
  - `src/components/AddToCartButton.tsx`
  - `src/components/BuyRaffleTicketsButton.tsx`
  - `src/app/dashboard/page.tsx`
  - `src/app/checkout/page.tsx`
  - Y otros archivos que usen `alert()`

**Flujo**:
1. Crear componente Toast con variantes (success, error, warning, info)
2. Crear ToastContext para estado global
3. Integrar en layout principal
4. Reemplazar alerts progresivamente

#### 1.2 Calculadora Mayorista en Tiempo Real
**Objetivo**: Mostrar precio mayorista mientras usuario cambia cantidad

**Archivos a modificar**:
- `src/app/products/[id]/ProductQuantitySelector.tsx`
- Agregar cálculo dinámico con debounce
- Mostrar preview del ahorro

**Flujo**:
1. Agregar cálculo en tiempo real en selector de cantidad
2. Mostrar badge "Ahorras X Gs" cuando aplica mayorista
3. Actualizar precio final dinámicamente

#### 1.3 Badge Visual para Precio Mayorista
**Objetivo**: Indicar visualmente productos con precio mayorista

**Archivos a modificar**:
- `src/components/ProductsListClient.tsx`
- `src/components/ui/ProductCard.tsx`
- Agregar badge "Precio Mayorista" en cards

---

### FASE 2: Sistema de Sorteos Mejorado (Prioridad Media)

#### 2.1 Email para Ganadores de Sorteos
**Objetivo**: Notificar automáticamente cuando alguien gana

**Archivos a crear/modificar**:
- `src/app/api/email/raffle-winner/route.ts`
- Modificar `src/lib/services/raffleService.ts` función `drawRaffleWinner`
- Agregar trigger en BD o llamada después de sortear

**Flujo**:
1. Cuando se sortea ganador, llamar API de email
2. Enviar email con detalles del premio
3. Crear notificación en panel

#### 2.2 Historial de Sorteos Ganados
**Objetivo**: Mostrar en perfil los sorteos que el usuario ganó

**Archivos a crear/modificar**:
- `src/app/dashboard/profile/page.tsx`
- Agregar sección "Sorteos Ganados"
- Query para obtener sorteos donde `winner_id = user.id`

---

### FASE 3: Sistema de Cupones (Prioridad Media)

#### 3.1 Base de Datos
**Archivos a crear**:
- `supabase/migrations/YYYYMMDD_coupons_system.sql`
- Tabla `coupons` con campos:
  - code, discount_type, discount_value, min_purchase, max_uses, valid_from, valid_until, is_active

#### 3.2 UI para Aplicar Cupones
**Archivos a crear/modificar**:
- `src/components/CouponInput.tsx`
- `src/app/checkout/page.tsx` - Agregar campo de cupón
- `src/lib/services/couponService.ts`

**Flujo**:
1. Usuario ingresa código en checkout
2. Validar cupón (vigencia, usos, mínimo de compra)
3. Aplicar descuento al total
4. Guardar en order_items o orders

---

### FASE 4: Analytics para Vendedores (Prioridad Media)

#### 4.1 Dashboard de Analytics
**Archivos a crear/modificar**:
- `src/app/dashboard/analytics/page.tsx`
- `src/lib/services/sellerAnalyticsService.ts`
- Agregar gráficos con métricas:
  - Ventas por período
  - Productos más vendidos
  - Conversión de visitas
  - Ingresos por mes

---

### FASE 5: Mejoras de UI/UX (Prioridad Baja)

#### 5.1 Breadcrumbs
**Archivos a crear**:
- `src/components/Breadcrumbs.tsx`
- Integrar en páginas internas

#### 5.2 Modo Oscuro Completo
**Archivos a modificar**:
- `src/app/globals.css` - Agregar variables CSS para dark mode
- Todos los componentes principales - Agregar clases dark:
- `src/components/ui/*.tsx`

---

## 🎯 Orden de Implementación Recomendado

1. ✅ **FASE 1.1**: Toast Notifications (Impacto alto, esfuerzo medio) - **COMPLETADO**
2. ✅ **FASE 1.2**: Calculadora Mayorista (Impacto medio, esfuerzo bajo) - **COMPLETADO**
3. ✅ **FASE 1.3**: Badge Mayorista (Impacto medio, esfuerzo bajo) - **COMPLETADO**
4. ✅ **FASE 2.1**: Email Ganadores (Impacto medio, esfuerzo medio) - **COMPLETADO**
5. **FASE 2.2**: Historial Sorteos (Impacto bajo, esfuerzo bajo) - **PENDIENTE**
6. **FASE 3**: Sistema Cupones (Impacto alto, esfuerzo alto) - **PENDIENTE**
7. **FASE 4**: Analytics Vendedores (Impacto medio, esfuerzo alto) - **PENDIENTE**
8. **FASE 5**: Mejoras UI/UX (Impacto bajo, esfuerzo medio) - **PENDIENTE**

---

## 📊 Métricas de Éxito

- **Toast Notifications**: 0 `alert()` en código de producción
- **Calculadora Mayorista**: Tiempo de respuesta < 100ms
- **Email Ganadores**: 100% de ganadores notificados
- **Cupones**: Tasa de uso > 5% de órdenes
- **Analytics**: Dashboard usado por > 50% de vendedores activos


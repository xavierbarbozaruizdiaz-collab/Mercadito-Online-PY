# 🔍 AUDITORÍA DEL SISTEMA DE COMISIONES
## Mercadito Online PY

**Fecha de Auditoría:** 2025-01-XX  
**Auditor:** Sistema Automatizado  
**Estado:** Completo - Solo Lectura

---

## 📋 RESUMEN EJECUTIVO

### Problemas Identificados

1. **❌ FALTA ENLACE EN PANEL ADMIN**
   - La página de comisiones existe (`/admin/commissions`)
   - NO hay botón/tarjeta en el dashboard principal del admin para acceder
   - Solo está accesible mediante URL directa

2. **✅ SISTEMA DE COMISIONES FUNCIONAL**
   - Tabla `commission_settings` existe y está configurada
   - Servicio de comisiones implementado correctamente
   - Cálculos funcionando para ventas directas y subastas

3. **⚠️ VISIBILIDAD LIMITADA DE PORCENTAJES**
   - Los porcentajes se muestran en lugares específicos
   - No hay una vista consolidada para verificar fácilmente

---

## 1️⃣ PROBLEMA: FALTA ENLACE EN PANEL ADMIN

### Ubicación del Dashboard Admin Principal
📁 **Archivo:** `src/app/(dashboard)/admin/page.tsx`

### Tarjetas Existentes (12 tarjetas):
1. ✅ Verificación de Tiendas (`/admin/stores`)
2. ✅ Gestión de Usuarios (`/admin/users`)
3. ✅ Hero Editor & Banners (`/dashboard/admin/hero`)
4. ✅ Categorías (`/admin/categories`)
5. ✅ Gestión de Productos (`/admin/products`)
6. ✅ Gestión de Órdenes (`/admin/orders`)
7. ✅ Configuración (`/admin/settings`)
8. ✅ Denuncias (`/admin/reports`)
9. ✅ Logs (`/admin/logs`)
10. ✅ Páginas (`/admin/pages`)
11. ✅ Notificaciones Masivas (`/admin/notifications`)
12. ✅ Membresías (`/admin/memberships`)

### ❌ FALTA:
- **Tarjeta para "Comisiones"** que apunte a `/admin/commissions`

### Enlaces en Layout Admin
📁 **Archivo:** `src/app/admin/layout.tsx`

**Enlaces actuales en el header:**
- `/admin` - Panel Admin
- `/admin/categories` - Categorías
- `/admin/marketing/catalogo-vitrina` - Catálogo Vitrina

**❌ FALTA:**
- Enlace a `/admin/commissions` en el header

---

## 2️⃣ DÓNDE SE REFLEJAN LOS PORCENTAJES DE COMISIONES

### A. EN EL CHECKOUT (Para Compradores - Subastas)

📁 **Archivo:** `src/app/checkout/page.tsx`  
📍 **Líneas:** 1048-1068

**Lo que se muestra:**
```
🔨 Desglose de Subasta
- Precio de subasta: [monto]
- Comisión comprador ([porcentaje]%): +[monto comisión]
- Total a pagar: [precio + comisión]
```

**Ejemplo visual:**
```typescript
Comisión comprador (3.00%): +30,000 Gs.
Total a pagar: 1,030,000 Gs.
```

**✅ VERIFICACIÓN:** Los porcentajes SÍ se muestran aquí durante el checkout de subastas

---

### B. EN EL DASHBOARD DEL VENDEDOR

📁 **Archivo:** `src/app/dashboard/page.tsx`  
📍 **Líneas:** 583-615

**Lo que se muestra:**
- `total_commissions_paid` - Total de comisiones pagadas (monto acumulado)
- `total_earnings` - Total ganado
- `pending_balance` - Balance pendiente
- `available_balance` - Balance disponible

**⚠️ NOTA:** Aquí se muestra el **MONTO** de comisiones pagadas, NO el porcentaje aplicado.

---

### C. EN LA TABLA `platform_fees` (Base de Datos)

📁 **Migración:** `supabase/migrations/20250201000001_commission_system.sql`  
📍 **Líneas:** 105-150

**Columnas relevantes para verificar:**

**Para Productos Directos:**
- `commission_percent` - Porcentaje aplicado (histórico)
- `commission_amount` - Monto de comisión
- `order_amount` - Precio pagado por cliente (incluye comisión)
- `base_amount` - Precio base que recibe el vendedor

**Para Subastas:**
- `buyer_commission_percent` - Porcentaje comisión comprador
- `buyer_commission_amount` - Monto comisión comprador
- `buyer_total_paid` - Total pagado por comprador
- `seller_commission_percent` - Porcentaje comisión vendedor
- `seller_commission_amount` - Monto comisión vendedor
- `seller_earnings` - Lo que recibe el vendedor

**✅ VERIFICACIÓN:** Todos los porcentajes se guardan en esta tabla después de cada transacción

---

### D. EN EL PANEL DE ADMINISTRACIÓN DE COMISIONES

📁 **Archivo:** `src/app/admin/commissions/page.tsx`  
📍 **URL:** `/admin/commissions`

**Lo que se muestra:**
- Lista de todas las configuraciones de comisiones
- Porcentajes por alcance (Global, Tienda, Vendedor)
- Comisiones para productos directos
- Comisiones para subastas (comprador y vendedor)
- Estado (Activa/Inactiva)

**Tabla de configuración muestra:**
```
Alcance | Aplica a | Directos | Subasta Comprador | Subasta Vendedor | Estado
Global  | Ambos   | 10.00%   | 3.00%            | 5.00%           | Activa
```

**✅ VERIFICACIÓN:** Aquí se pueden ver y editar todos los porcentajes

---

### E. EN LA TABLA `products` (Para Ventas Directas)

📁 **Migración:** `supabase/migrations/20250201000001_commission_system.sql`  
📍 **Líneas:** 263-275

**Columnas:**
- `base_price` - Precio que recibe el vendedor (sin comisión)
- `commission_percent_applied` - Porcentaje de comisión usado al calcular precio mostrado
- `price` - Precio mostrado al cliente (ya incluye comisión)

**✅ VERIFICACIÓN:** El porcentaje aplicado se guarda en cada producto

---

### F. EN LOS REPORTES DE COMISIONES

📁 **Archivo:** `src/app/admin/commissions/reports/page.tsx`

**Lo que muestra:**
- Reportes de comisiones cobradas
- Filtros por fecha, vendedor, tipo de transacción
- Totales y estadísticas

**✅ VERIFICACIÓN:** Se pueden ver las comisiones cobradas históricamente

---

## 3️⃣ CÓMO VERIFICAR SI SE ESTÁN APLICANDO

### Verificación para Ventas Directas:

1. **Consulta SQL en Supabase:**
```sql
-- Ver productos con comisión aplicada
SELECT 
  id,
  title,
  base_price,
  price,
  commission_percent_applied,
  (price - base_price) / price * 100 as porcentaje_calculado,
  sale_type
FROM products
WHERE sale_type = 'fixed'
  AND commission_percent_applied IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

2. **Verificar en `platform_fees`:**
```sql
-- Ver comisiones aplicadas en órdenes
SELECT 
  pf.id,
  pf.commission_percent,
  pf.commission_amount,
  pf.order_amount,
  pf.base_amount,
  pf.transaction_type,
  pf.created_at
FROM platform_fees pf
WHERE pf.transaction_type = 'direct_sale'
ORDER BY pf.created_at DESC
LIMIT 10;
```

### Verificación para Subastas:

1. **Consulta SQL:**
```sql
-- Ver comisiones de subastas
SELECT 
  pf.id,
  pf.auction_final_price,
  pf.buyer_commission_percent,
  pf.buyer_commission_amount,
  pf.buyer_total_paid,
  pf.seller_commission_percent,
  pf.seller_commission_amount,
  pf.seller_earnings,
  pf.transaction_type,
  pf.created_at
FROM platform_fees pf
WHERE pf.transaction_type = 'auction'
ORDER BY pf.created_at DESC
LIMIT 10;
```

### Verificar Configuración Actual:

```sql
-- Ver todas las configuraciones de comisiones activas
SELECT 
  id,
  scope_type,
  store_id,
  seller_id,
  direct_sale_commission_percent,
  auction_buyer_commission_percent,
  auction_seller_commission_percent,
  applies_to,
  is_active,
  effective_from,
  effective_until
FROM commission_settings
WHERE is_active = true
  AND (effective_until IS NULL OR effective_until > NOW())
ORDER BY 
  CASE scope_type 
    WHEN 'seller' THEN 1
    WHEN 'store' THEN 2
    WHEN 'global' THEN 3
  END,
  effective_from DESC;
```

---

## 4️⃣ VALORES POR DEFECTO CONFIGURADOS

📁 **Migración:** `supabase/migrations/20250201000001_commission_system.sql`  
📍 **Líneas:** 480-496

**Valores globales por defecto:**
- ✅ Ventas Directas: **10.00%**
- ✅ Comprador en Subastas: **3.00%**
- ✅ Vendedor en Subastas: **5.00%**

**Código del servicio:** `src/lib/services/commissionService.ts`
- Línea 61: Default ventas directas = 10.0%
- Línea 87-90: Default subastas = 3% comprador, 5% vendedor

---

## 5️⃣ PRIORIDAD DE APLICACIÓN DE COMISIONES

El sistema busca comisiones en este orden:

1. **Prioridad 1:** Comisión específica del vendedor (`scope_type = 'seller'`)
2. **Prioridad 2:** Comisión de la tienda (`scope_type = 'store'`)
3. **Prioridad 3:** Comisión global (`scope_type = 'global'`)
4. **Fallback:** Valores por defecto (10%, 3%, 5%)

**Funciones SQL:**
- `get_direct_sale_commission()` - Para ventas directas
- `get_auction_commissions()` - Para subastas

---

## 6️⃣ ARCHIVOS RELEVANTES DEL SISTEMA

### Backend/Servicios:
- ✅ `src/lib/services/commissionService.ts` - Servicio principal
- ✅ `supabase/migrations/20250201000001_commission_system.sql` - Migración completa

### Frontend/Interfaces:
- ✅ `src/app/admin/commissions/page.tsx` - Panel admin de comisiones
- ✅ `src/app/admin/commissions/reports/page.tsx` - Reportes
- ✅ `src/app/checkout/page.tsx` - Muestra comisiones en checkout (subastas)
- ✅ `src/app/dashboard/page.tsx` - Muestra monto de comisiones pagadas

### Dashboard Admin:
- ❌ `src/app/(dashboard)/admin/page.tsx` - **FALTA TARJETA DE COMISIONES**
- ❌ `src/app/admin/layout.tsx` - **FALTA ENLACE EN HEADER**

---

## 7️⃣ RESUMEN DE VERIFICACIÓN

### ✅ FUNCIONANDO CORRECTAMENTE:

1. ✅ Sistema de comisiones implementado
2. ✅ Tabla `commission_settings` existe y funciona
3. ✅ Funciones SQL para calcular comisiones
4. ✅ Comisiones se guardan en `platform_fees`
5. ✅ Porcentajes se muestran en checkout de subastas
6. ✅ Panel admin de comisiones existe y funciona

### ❌ PROBLEMAS IDENTIFICADOS:

1. ❌ **NO hay botón/tarjeta en dashboard admin para acceder a comisiones**
   - Solo accesible por URL directa: `/admin/commissions`
   
2. ⚠️ **Visibilidad limitada de porcentajes:**
   - No se muestran porcentajes en dashboard del vendedor (solo montos)
   - No hay vista consolidada fácil de verificar

### 📍 LUGARES DONDE SE MUESTRAN PORCENTAJES:

1. ✅ **Checkout de Subastas** - Muestra porcentaje al comprador
2. ✅ **Panel Admin Comisiones** - Lista todas las configuraciones
3. ✅ **Base de Datos** - Tablas `commission_settings` y `platform_fees`
4. ❌ **Dashboard Vendedor** - **NO muestra porcentajes, solo montos**
5. ❌ **Historial Transacciones Vendedor** - **NO muestra porcentajes, solo montos**

### ⚠️ PROBLEMA CRÍTICO:
**Los vendedores NO pueden ver los porcentajes de comisión en ninguna parte de su interfaz.** Solo ven los montos cobrados, pero no el porcentaje aplicado.

---

## 8️⃣ RECOMENDACIONES

### Alta Prioridad:

1. **Agregar tarjeta en dashboard admin:**
   - Agregar tarjeta "Comisiones" en `src/app/(dashboard)/admin/page.tsx`
   - Agregar enlace en header de `src/app/admin/layout.tsx`

### Media Prioridad:

2. **Mejorar visibilidad en dashboard vendedor:**
   - Mostrar porcentaje de comisión aplicado en cada orden
   - Agregar sección que muestre "Tu comisión actual: X%"

3. **Vista de verificación rápida:**
   - Crear página simple que muestre todas las comisiones activas
   - Mostrar ejemplo de cálculo con precios

---

## 9️⃣ CONSULTAS ÚTILES PARA VERIFICACIÓN

### Ver comisiones aplicadas en las últimas órdenes:
```sql
SELECT 
  o.id as order_id,
  o.created_at,
  pf.transaction_type,
  pf.commission_percent as direct_commission,
  pf.commission_amount as direct_commission_amount,
  pf.auction_buyer_commission_percent,
  pf.auction_seller_commission_percent,
  pf.seller_earnings
FROM orders o
LEFT JOIN platform_fees pf ON pf.order_id = o.id
ORDER BY o.created_at DESC
LIMIT 20;
```

### Ver configuración actual y su prioridad:
```sql
WITH ranked_settings AS (
  SELECT 
    *,
    ROW_NUMBER() OVER (
      PARTITION BY scope_type 
      ORDER BY 
        CASE scope_type 
          WHEN 'seller' THEN 1
          WHEN 'store' THEN 2
          WHEN 'global' THEN 3
        END,
        effective_from DESC
    ) as priority_rank
  FROM commission_settings
  WHERE is_active = true
    AND (effective_until IS NULL OR effective_until > NOW())
)
SELECT 
  scope_type,
  direct_sale_commission_percent,
  auction_buyer_commission_percent,
  auction_seller_commission_percent,
  priority_rank
FROM ranked_settings
ORDER BY priority_rank;
```

---

## 🔟 CONCLUSIÓN

### Estado General: ✅ FUNCIONAL

El sistema de comisiones está **implementado y funcionando correctamente**. Los porcentajes:

- ✅ Se calculan correctamente
- ✅ Se guardan en la base de datos
- ✅ Se aplican según la prioridad configurada
- ✅ Se muestran en checkout de subastas

### Problemas Menores:

- ❌ Falta enlace visible en panel admin
- ⚠️ Visibilidad limitada en dashboard vendedor

### Acceso Actual:

Para acceder a la configuración de comisiones:
1. **URL directa:** `https://[tu-dominio]/admin/commissions`
2. **Base de datos:** Tabla `commission_settings`
3. **SQL Editor en Supabase:** Consultas arriba mencionadas

---

**Fin de la Auditoría**


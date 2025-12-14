# 📍 DÓNDE VEN LOS VENDEDORES LOS PORCENTAJES DE COMISIONES

## ❌ PROBLEMA IDENTIFICADO

**Los vendedores NO ven los porcentajes de comisiones directamente en ninguna parte de su interfaz.**

Solo ven los **montos** de comisiones cobradas, pero NO los porcentajes aplicados.

---

## ✅ LO QUE SÍ VEN LOS VENDEDORES

### 1. **Dashboard Principal** (`/dashboard`)
📁 Archivo: `src/app/dashboard/page.tsx`

**Lo que muestra:**
- `totalCommissionsPaid` - Total de comisiones pagadas (monto acumulado)
- `totalEarnings` - Total ganado
- `pendingBalance` - Balance pendiente
- `availableBalance` - Balance disponible

**❌ NO muestra:** Porcentajes de comisión

---

### 2. **Historial de Transacciones** (`/dashboard/transactions`)
📁 Archivo: `src/app/dashboard/transactions/page.tsx`

**Lo que muestra:**
- Monto de comisión cobrada: `commission_amount`
- Lo que recibió: `seller_earnings` o `base_amount`
- Estado de la transacción

**Ejemplo:**
```
Comisión por Venta
Comisión: -100,000 Gs.  ← Solo el monto, NO el porcentaje
```

**❌ NO muestra:** Porcentaje aplicado

**Línea 291:** Solo muestra el monto:
```typescript
Comisión: -{transaction.platform_fee.commission_amount.toLocaleString('es-PY')} Gs.
```

---

## 🔍 DÓNDE ESTÁN LOS PORCENTAJES (En Base de Datos)

Los porcentajes SÍ se guardan en la base de datos, pero no se muestran al vendedor:

### Tabla `platform_fees`

**Para Ventas Directas:**
- `commission_percent` ✅ Existe - Porcentaje aplicado (histórico)
- `commission_amount` ✅ Se muestra - Monto de comisión
- `order_amount` ✅ Existe - Precio pagado por cliente
- `base_amount` ✅ Se muestra - Precio base que recibe vendedor

**Para Subastas:**
- `buyer_commission_percent` ✅ Existe - Porcentaje comisión comprador
- `seller_commission_percent` ✅ Existe - Porcentaje comisión vendedor
- `seller_commission_amount` ✅ Existe - Monto comisión vendedor
- `seller_earnings` ✅ Se muestra - Lo que recibe el vendedor

---

## 💡 SOLUCIÓN: Dónde DEBERÍAN ver los porcentajes

### Opción 1: **Agregar a Historial de Transacciones**

Modificar `src/app/dashboard/transactions/page.tsx`:

1. **Incluir porcentajes en la consulta SQL** (línea 51-62):
```typescript
.select(`
  id,
  order_id,
  transaction_type,
  commission_amount,
  commission_percent,              // ← AGREGAR
  base_amount,
  seller_earnings,
  auction_buyer_commission_percent, // ← AGREGAR para subastas
  auction_seller_commission_percent, // ← AGREGAR para subastas
  seller_commission_percent,         // ← AGREGAR para subastas
  status,
  payment_status,
  created_at,
  order:orders(id, total_amount)
`)
```

2. **Mostrar el porcentaje en la UI** (después de línea 291):
```typescript
{transaction.platform_fee && (
  <div className="text-xs text-gray-500 mt-1 space-y-1">
    {transaction.platform_fee.commission_percent && (
      <p>
        Comisión: -{transaction.platform_fee.commission_amount.toLocaleString('es-PY')} Gs.
        ({transaction.platform_fee.commission_percent}%)
      </p>
    )}
    {transaction.platform_fee.seller_commission_percent && (
      <p>
        Comisión subasta: -{transaction.platform_fee.seller_commission_amount?.toLocaleString('es-PY')} Gs.
        ({transaction.platform_fee.seller_commission_percent}%)
      </p>
    )}
  </div>
)}
```

---

### Opción 2: **Página de Detalles de Comisiones**

Crear nueva página: `/dashboard/commissions`

Mostrar:
- Comisión actual aplicada (consultando `commission_settings`)
- Historial con porcentajes
- Ejemplos de cálculo

---

### Opción 3: **Agregar al Dashboard Principal**

Mostrar una sección que diga:
```
Tu comisión actual: 10% (ventas directas)
Comisión subastas: 5% (vendedor), 3% (comprador)
```

Consultando `getCommissionForDirectSale()` y `getCommissionForAuction()`

---

## 📊 RESUMEN ACTUAL

| Lugar | ¿Ve Porcentajes? | ¿Qué Ve? |
|-------|------------------|----------|
| Dashboard Principal | ❌ NO | Solo montos acumulados |
| Historial Transacciones | ❌ NO | Solo montos por transacción |
| Base de Datos | ✅ SÍ | Porcentajes guardados pero no visibles |
| Panel Admin | ✅ SÍ | Configuración completa de porcentajes |

---

## 🎯 CONCLUSIÓN

**ACTUALMENTE:** Los vendedores NO pueden ver los porcentajes de comisión en ninguna parte de su interfaz.

**SOLUCIÓN RECOMENDADA:** 
1. Agregar porcentajes a la página de Transacciones (más rápido)
2. Crear página dedicada de Comisiones para vendedores (más completo)

Los porcentajes están en la base de datos pero no se están mostrando en el frontend.












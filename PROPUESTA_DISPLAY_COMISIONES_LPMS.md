# 💼 PROPUESTA LPMS: DÓNDE Y CÓMO MOSTRAR PORCENTAJES DE COMISIONES
## Basado en Mejores Prácticas de MercadoLibre, eBay, Etsy y Amazon

**Fecha:** 2025-01-XX  
**Versión:** 1.0  
**Estado:** Propuesta para Implementación

---

## 📋 RESUMEN EJECUTIVO

Esta propuesta establece **dónde, cuándo y cómo** mostrar los porcentajes de comisiones a los vendedores, siguiendo las mejores prácticas de las principales plataformas de marketplace. La estrategia se basa en el principio de **transparencia proactiva**: informar al vendedor antes de que tome decisiones críticas.

---

## 🎯 PRINCIPIOS RECTORES

Basados en análisis de **MercadoLibre**, **eBay**, **Etsy**, y **Amazon Marketplace**:

1. **📊 Transparencia Anticipada:** Informar antes de que el vendedor confirme la acción
2. **💰 Claridad Financiera:** Mostrar exactamente cuánto recibirá el vendedor
3. **✅ Contexto Relevante:** Mostrar la información en el momento más útil
4. **🔍 Visibilidad sin Intrusión:** Presentar de forma clara pero no invasiva

---

## 1️⃣ PRODUCTOS DE PRECIO FIJO

### 📍 DÓNDE: Al Momento de Crear el Producto

**Justificación:**
- **MercadoLibre:** Muestra las comisiones durante la creación del anuncio
- **eBay:** Proporciona una calculadora de tarifas integrada en el formulario de listado
- **Etsy:** Informa las comisiones antes de publicar
- **Amazon:** Muestra el fee structure durante la creación del listing

**Razón de negocio:** El vendedor necesita saber **antes de confirmar** cuánto recibirá realmente. Esto:
- ✅ Reduce reclamos posteriores
- ✅ Mejora la experiencia del vendedor
- ✅ Aumenta la confianza en la plataforma
- ✅ Permite ajustar precios si es necesario

---

### 🎨 CÓMO IMPLEMENTARLO

#### **Ubicación en el Formulario**

**Archivo:** `src/app/dashboard/new-product/page.tsx`

**Ubicación Ideal:** Después del campo de precio, antes del botón "Publicar"

#### **Diseño Propuesto:**

```typescript
// Componente: CommissionPreview
<div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
  <div className="flex items-start gap-2 mb-2">
    <Info className="w-5 h-5 text-blue-600 mt-0.5" />
    <h4 className="font-semibold text-blue-900">Información de Comisiones</h4>
  </div>
  
  {priceNumber > 0 && saleType === 'direct' && (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-gray-700">Precio de venta:</span>
        <span className="font-medium">{formatCurrency(priceNumber)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-700">Comisión ({commissionPercent}%):</span>
        <span className="text-red-600">-{formatCurrency(commissionAmount)}</span>
      </div>
      <div className="border-t border-blue-200 pt-2 flex justify-between">
        <span className="font-semibold text-gray-900">Lo que recibirás:</span>
        <span className="font-bold text-green-600">
          {formatCurrency(sellerEarnings)}
        </span>
      </div>
      
      {/* Mensaje informativo */}
      <p className="text-xs text-gray-600 mt-2 italic">
        * La comisión se calcula sobre el precio base. El cliente verá el precio con comisión incluida.
      </p>
    </div>
  )}
</div>
```

#### **Lógica de Cálculo en Tiempo Real:**

```typescript
// En el componente NewProduct
const [commissionPercent, setCommissionPercent] = useState<number | null>(null);

// Efecto para cargar comisión cuando hay precio y tipo de venta
useEffect(() => {
  if (saleType === 'direct' && priceNumber > 0 && user?.id) {
    loadCommission();
  } else {
    setCommissionPercent(null);
  }
}, [priceNumber, saleType, user?.id, storeId]);

async function loadCommission() {
  try {
    const { getCommissionForDirectSale, calculatePriceWithCommission } = 
      await import('@/lib/services/commissionService');
    
    const percent = await getCommissionForDirectSale(user.id, storeId || undefined);
    setCommissionPercent(percent);
    
    // Calcular precio mostrado (con comisión incluida)
    const priceWithCommission = calculatePriceWithCommission(priceNumber, percent);
    // Este precio será el que se guarde como "price" en la BD
  } catch (err) {
    console.error('Error loading commission:', err);
  }
}
```

#### **Ejemplo Visual (UI/UX):**

```
┌─────────────────────────────────────────────┐
│ 💰 Precio de Venta                          │
│ [100,000] Gs.                               │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ ℹ️ Información de Comisiones                │
│                                             │
│ Precio de venta:          100,000 Gs.      │
│ Comisión (10%):           -10,000 Gs.      │
│ ──────────────────────────────────────────  │
│ Lo que recibirás:          90,000 Gs.      │
│                                             │
│ * La comisión se calcula sobre el precio   │
│   base. El cliente verá el precio con      │
│   comisión incluida.                       │
└─────────────────────────────────────────────┘
```

---

## 2️⃣ SUBASTAS

### 📍 DÓNDE: Al Finalizar la Subasta

**Justificación:**
- **eBay:** Proporciona un resumen detallado inmediatamente después de que la subasta cierra
- **MercadoLibre:** Envía notificación con desglose de comisiones al finalizar
- **Amazon Auctions:** Muestra el resumen financiero en la página de detalles de la subasta cerrada

**Razón de negocio:** En subastas, el precio final es **desconocido** hasta que termina. Mostrar comisiones antes sería especulativo e inexacto. Al finalizar:
- ✅ Precio final es definitivo
- ✅ Cálculos son precisos
- ✅ Vendedor recibe información clara de lo que ganó
- ✅ Reduce consultas de soporte

---

### 🎨 CÓMO IMPLEMENTARLO

#### **Ubicación: Notificación + Vista de Detalles de Subasta Finalizada**

**Archivos relevantes:**
- `supabase/migrations/20250201000010_update_auction_close_with_commissions.sql`
- Función que cierra subastas y envía notificaciones

#### **Diseño Propuesto:**

##### **A) En la Notificación al Vendedor:**

```typescript
// Al finalizar la subasta (en la función close_auction)
const notificationMessage = `
🎉 Tu subasta ha finalizado

📦 Producto: ${productTitle}
💰 Precio final: ${formatCurrency(finalPrice)}

📊 Resumen de Comisiones:
   • Precio de subasta: ${formatCurrency(finalPrice)}
   • Comisión vendedor (${sellerCommissionPercent}%): -${formatCurrency(sellerCommissionAmount)}
   ──────────────────────────────
   • Lo que recibirás: ${formatCurrency(sellerEarnings)}

✅ Ganador asignado. El comprador será notificado.
`;
```

##### **B) En la Vista de Detalles de la Subasta Finalizada:**

**Nueva sección en:** Dashboard del vendedor → Subastas finalizadas → Detalles

```typescript
// Componente: AuctionEndedSummary
<div className="mt-6 p-6 bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 rounded-lg">
  <div className="flex items-center gap-2 mb-4">
    <CheckCircle className="w-6 h-6 text-green-600" />
    <h3 className="text-lg font-bold text-gray-900">Subasta Finalizada</h3>
  </div>
  
  <div className="space-y-3">
    {/* Precio final */}
    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
      <span className="text-gray-700 font-medium">Precio final de la subasta:</span>
      <span className="text-2xl font-bold text-gray-900">
        {formatCurrency(auctionFinalPrice)}
      </span>
    </div>
    
    {/* Desglose de comisiones */}
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <h4 className="font-semibold text-gray-900 mb-3">Desglose de Comisiones</h4>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Precio de subasta:</span>
          <span className="font-medium">{formatCurrency(auctionFinalPrice)}</span>
        </div>
        
        <div className="flex justify-between text-red-600">
          <span>Comisión vendedor ({sellerCommissionPercent}%):</span>
          <span className="font-medium">-{formatCurrency(sellerCommissionAmount)}</span>
        </div>
        
        <div className="border-t border-gray-300 pt-2 flex justify-between">
          <span className="font-bold text-gray-900">Lo que recibirás:</span>
          <span className="text-xl font-bold text-green-600">
            {formatCurrency(sellerEarnings)}
          </span>
        </div>
      </div>
    </div>
    
    {/* Información adicional */}
    <div className="p-3 bg-blue-50 rounded-lg">
      <p className="text-xs text-blue-800">
        <Info className="w-4 h-4 inline mr-1" />
        El comprador pagará un adicional de {buyerCommissionPercent}% ({formatCurrency(buyerCommissionAmount)}) 
        como comisión. Total que pagará: {formatCurrency(buyerTotalPaid)}
      </p>
    </div>
  </div>
</div>
```

#### **Ejemplo Visual (UI/UX):**

```
┌─────────────────────────────────────────────┐
│ ✅ Subasta Finalizada                       │
│                                             │
│ 📦 iPhone 14 Pro Max                        │
│                                             │
│ ┌───────────────────────────────────────┐  │
│ │ Precio final de la subasta:           │  │
│ │           5,000,000 Gs.                │  │
│ └───────────────────────────────────────┘  │
│                                             │
│ ┌───────────────────────────────────────┐  │
│ │ Desglose de Comisiones                │  │
│ │                                       │  │
│ │ Precio de subasta:      5,000,000 Gs. │  │
│ │ Comisión vendedor (5%):   -250,000 Gs.│  │
│ │ ─────────────────────────────────────  │  │
│ │ Lo que recibirás:         4,750,000 Gs.│  │
│ └───────────────────────────────────────┘  │
│                                             │
│ ℹ️ El comprador pagará un adicional de 3%  │
│    (150,000 Gs.) como comisión.            │
│    Total que pagará: 5,150,000 Gs.        │
└─────────────────────────────────────────────┘
```

---

## 📊 COMPARATIVA CON GRANDES EMPRESAS

| Empresa | Precio Fijo | Subastas | Método |
|---------|-------------|----------|--------|
| **eBay** | ✅ Calculadora durante creación | ✅ Resumen al finalizar | Integrado en formulario |
| **MercadoLibre** | ✅ Banner informativo | ✅ Notificación + detalles | Vista previa en tiempo real |
| **Etsy** | ✅ Tooltip en campo precio | N/A | Modal informativo |
| **Amazon** | ✅ Fee calculator | ✅ Invoice al cerrar | Documento PDF detallado |

**Nuestra Propuesta:** Combina lo mejor de todos:
- ✅ Preview en tiempo real (como MercadoLibre)
- ✅ Calculadora integrada (como eBay)
- ✅ Resumen detallado post-transacción (como Amazon)

---

## 🎯 BENEFICIOS DE LA IMPLEMENTACIÓN

### Para los Vendedores:
1. **Transparencia total** - Saben exactamente cuánto recibirán
2. **Toma de decisiones informada** - Pueden ajustar precios antes de publicar
3. **Confianza aumentada** - No hay sorpresas después
4. **Mejor planificación financiera** - Conocen su margen desde el inicio

### Para la Plataforma:
1. **Menos consultas de soporte** - Información clara reduce dudas
2. **Mayor satisfacción** - Vendedores más contentos
3. **Compliance legal** - Transparencia en términos y condiciones
4. **Competitividad** - Igual o mejor que la competencia

---

## 🔧 DETALLES TÉCNICOS DE IMPLEMENTACIÓN

### Para Productos de Precio Fijo:

#### 1. **Agregar Estado para Comisión**
```typescript
// En NewProduct component
const [commissionInfo, setCommissionInfo] = useState<{
  percent: number;
  amount: number;
  sellerEarnings: number;
} | null>(null);
```

#### 2. **Función para Cargar Comisión**
```typescript
async function loadCommissionInfo() {
  if (!user?.id || !priceNumber || saleType !== 'direct') {
    setCommissionInfo(null);
    return;
  }
  
  try {
    const { getCommissionForDirectSale } = 
      await import('@/lib/services/commissionService');
    
    const commissionPercent = await getCommissionForDirectSale(
      user.id, 
      storeId || undefined
    );
    
    const commissionAmount = Math.round(priceNumber * commissionPercent / 100);
    const sellerEarnings = priceNumber - commissionAmount;
    
    setCommissionInfo({
      percent: commissionPercent,
      amount: commissionAmount,
      sellerEarnings: sellerEarnings
    });
  } catch (err) {
    console.error('Error loading commission:', err);
  }
}
```

#### 3. **Componente de Vista Previa**
```typescript
// Nuevo componente: CommissionPreview.tsx
export function CommissionPreview({ 
  price, 
  commissionPercent, 
  commissionAmount, 
  sellerEarnings 
}: {
  price: number;
  commissionPercent: number;
  commissionAmount: number;
  sellerEarnings: number;
}) {
  if (!price || price <= 0) return null;
  
  return (
    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      {/* Ver diseño propuesto arriba */}
    </div>
  );
}
```

#### 4. **Ubicación en el Formulario**
Insertar después del campo de precio (línea ~900 en `new-product/page.tsx`):
```typescript
{/* Campo de Precio */}
<div>
  <label>Precio *</label>
  <input 
    type="number" 
    value={price}
    onChange={(e) => {
      setPrice(e.target.value);
      // Trigger recalculation
      setTimeout(loadCommissionInfo, 500);
    }}
  />
</div>

{/* NUEVO: Vista previa de comisiones */}
{saleType === 'direct' && commissionInfo && (
  <CommissionPreview
    price={priceNumber}
    commissionPercent={commissionInfo.percent}
    commissionAmount={commissionInfo.amount}
    sellerEarnings={commissionInfo.sellerEarnings}
  />
)}
```

### Para Subastas:

#### 1. **Actualizar Notificación al Cerrar Subasta**

Ya existe en: `supabase/migrations/20250201000010_update_auction_close_with_commissions.sql`

**Mejorar el mensaje de notificación:**
```sql
-- En la función close_expired_auctions
-- Agregar desglose detallado al mensaje
v_notification_message := format(
  '🎉 Tu subasta "%s" ha finalizado

💰 Precio final: Gs. %s

📊 Resumen de Comisiones:
   • Precio de subasta: Gs. %s
   • Comisión vendedor (%s%%): -Gs. %s
   ──────────────────────────────
   • Lo que recibirás: Gs. %s

✅ Ganador asignado.',
  v_product_title,
  v_final_price,
  v_final_price,
  v_seller_commission_percent,
  v_seller_commission_amount,
  v_seller_earnings
);
```

#### 2. **Crear Vista de Detalles de Subasta Finalizada**

**Nuevo componente:** `src/components/auction/AuctionEndedSummary.tsx`

```typescript
export function AuctionEndedSummary({ 
  auctionId 
}: { 
  auctionId: string 
}) {
  const [summary, setSummary] = useState<AuctionEndedSummary | null>(null);
  
  useEffect(() => {
    loadSummary();
  }, [auctionId]);
  
  async function loadSummary() {
    // Cargar desde platform_fees donde transaction_type = 'auction'
    // y order_id corresponde a la orden generada
  }
  
  // Renderizar diseño propuesto arriba
}
```

#### 3. **Agregar a Dashboard de Vendedor**

En: `src/app/(dashboard)/seller/page.tsx` o nueva página `/dashboard/auctions/[id]`

Mostrar el resumen cuando `auction_status === 'ended'`

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Productos de Precio Fijo
- [ ] Crear componente `CommissionPreview.tsx`
- [ ] Agregar estado de comisión en `NewProduct`
- [ ] Implementar función `loadCommissionInfo()`
- [ ] Insertar componente después del campo precio
- [ ] Agregar recálculo cuando cambia el precio
- [ ] Agregar indicador de carga
- [ ] Probar con diferentes porcentajes (global, tienda, vendedor)

### Fase 2: Subastas
- [ ] Mejorar mensaje de notificación en SQL
- [ ] Crear componente `AuctionEndedSummary.tsx`
- [ ] Crear página/vista de detalles de subasta finalizada
- [ ] Agregar enlace desde dashboard de vendedor
- [ ] Mostrar desglose completo (comprador + vendedor)
- [ ] Probar con diferentes escenarios (con/sin ganador)

### Fase 3: Testing
- [ ] Pruebas con comisiones globales
- [ ] Pruebas con comisiones por tienda
- [ ] Pruebas con comisiones por vendedor
- [ ] Pruebas de cálculos (montos exactos)
- [ ] Pruebas de UI/UX (responsive, accesibilidad)

---

## 📝 NOTAS ADICIONALES

### Consideraciones de UX:
1. **No intrusivo:** El componente debe ser informativo pero no bloquear el flujo
2. **Actualización en tiempo real:** Recalcular cuando cambia el precio
3. **Manejo de errores:** Si falla la carga, mostrar valor por defecto (10%)
4. **Accesibilidad:** Usar ARIA labels y contraste adecuado

### Consideraciones de Performance:
1. **Debounce en input:** Esperar 500ms antes de recalcular
2. **Cache de comisiones:** Guardar en estado para no consultar repetidas veces
3. **Lazy loading:** Solo cargar cuando el precio es válido (> 0)

---

## 🎯 CONCLUSIÓN

Esta propuesta implementa las mejores prácticas de las principales plataformas de marketplace, garantizando:

✅ **Transparencia total** - El vendedor sabe exactamente cuánto recibirá  
✅ **Momento oportuno** - Información cuando más la necesita  
✅ **Experiencia superior** - UI clara y profesional  
✅ **Competitividad** - Igual o mejor que la competencia  

**Recomendación:** Implementar ambas fases en orden (Precio Fijo primero, luego Subastas) para maximizar el impacto positivo en la experiencia del vendedor.

---

**Fin de la Propuesta**












# 🕐 Explicación: Zona Horaria y Filtrado de Subastas

## 📋 Las 3 Condiciones de Filtrado para Subastas "Scheduled"

Cuando una subasta tiene `auction_status: 'scheduled'`, el sistema la incluye si cumple **cualquiera** de estas condiciones:

### 1️⃣ **No tiene fecha de inicio** (para pruebas inmediatas)
```javascript
if (!startAt) {
  return true; // Se incluye automáticamente
}
```
**¿Por qué?** Si no configuraste una fecha de inicio, el sistema asume que quieres que la subasta esté disponible inmediatamente para pruebas.

### 2️⃣ **La fecha de inicio ya pasó** (debería estar activa)
```javascript
const startTime = new Date(startAt).getTime(); // Hora de inicio en milisegundos
const now = Date.now(); // Hora actual en milisegundos
const shouldStart = startTime <= now; // ¿Ya debería haber comenzado?

if (shouldStart) {
  return true; // Se incluye porque ya debería estar activa
}
```
**¿Por qué?** Si configuraste una fecha de inicio en el pasado, la subasta debería estar activa. El sistema la incluye aunque todavía tenga status "scheduled" porque la actualización automática puede tardar unos segundos.

### 3️⃣ **Está muy cerca** (dentro de 1 minuto en el futuro - tolerancia)
```javascript
const timeDiff = now - startTime; // Diferencia en milisegundos
if (timeDiff > -60000) { // -60000 = 1 minuto en el futuro
  return true; // Se incluye con tolerancia
}
```
**¿Por qué?** Si la fecha de inicio es en menos de 1 minuto, se incluye por tolerancia. Esto previene problemas de sincronización de relojes o delays de red.

---

## 🌍 PROBLEMA: Diferencia entre Horario del Servidor y Paraguay

### ⚠️ **El Problema:**

1. **Paraguay usa UTC-4** (horario estándar) o UTC-3 (horario de verano)
2. **El servidor/Supabase usa UTC** (Coordinated Universal Time)
3. **JavaScript en el navegador** usa la hora local de la computadora del usuario

### 📊 **Ejemplo del Problema:**

Supongamos que estás en Paraguay (UTC-4) y quieres crear una subasta para:
- **Hora local (Paraguay):** 31/10/2025 14:00
- **Hora UTC (servidor):** 31/10/2025 18:00 (4 horas más)

**Lo que pasa:**
1. Tú ingresas: `31/10/2025 14:00` en el formulario
2. JavaScript convierte: `31/10/2025 18:00 UTC` (suma 4 horas automáticamente)
3. Se guarda en BD: `2025-10-31T18:00:00Z` (UTC)
4. Al comparar: El servidor compara `18:00 UTC` con `ahora UTC`, pero tú pensaste que sería `14:00 local`

### 🔍 **Ejemplo Concreto:**

```javascript
// Tú ingresas en el formulario (hora local de Paraguay UTC-4):
"31/10/2025 14:00"

// JavaScript lo convierte a ISO (asume hora local y convierte a UTC):
new Date("2025-10-31T14:00:00").toISOString()
// Resultado: "2025-10-31T18:00:00.000Z" (UTC)
//                                           ↑ Se sumaron 4 horas!

// Pero si tu computadora está en UTC-4, JavaScript hace:
const fecha = new Date("2025-10-31T14:00:00");
fecha.getTime(); // Internamente usa la zona horaria local
// Al convertir a ISO, ajusta a UTC automáticamente
```

---

## ✅ SOLUCIÓN: Convertir Correctamente la Hora Local a UTC

### **Opción 1: Usar la Hora Local Correctamente (Recomendado)**

Modificar el código para que al crear la subasta, se interprete la hora como hora local y se convierta explícitamente a UTC:

```javascript
// En new-product/page.tsx y edit-product/[id]/page.tsx
if (saleType === 'auction') {
  // auctionStartDate viene del input datetime-local en formato: "2025-10-31T14:00"
  // Este formato es hora LOCAL (no UTC)
  
  // Crear fecha interpretando como hora local
  const localDate = new Date(auctionStartDate);
  
  // Obtener offset de zona horaria en minutos
  const timezoneOffset = localDate.getTimezoneOffset(); // Para Paraguay UTC-4: retorna 240 minutos
  
  // Convertir a UTC explícitamente
  const utcDate = new Date(localDate.getTime() - (timezoneOffset * 60 * 1000));
  
  // Guardar en formato ISO UTC
  auctionStartAt = utcDate.toISOString();
}
```

### **Opción 2: Especificar Zona Horaria de Paraguay Explícitamente**

Usar una librería como `date-fns-tz` o manejar manualmente UTC-4:

```javascript
// Función helper para convertir hora local de Paraguay a UTC
function paraguayToUTC(localDateTime: string): string {
  // Formato input: "2025-10-31T14:00" (hora local)
  // Paraguay está en UTC-4 (estándar) o UTC-3 (verano)
  // Por ahora asumimos UTC-4
  
  const localDate = new Date(localDateTime);
  // Restar 4 horas para convertir a UTC
  const utcDate = new Date(localDate.getTime() - (4 * 60 * 60 * 1000));
  return utcDate.toISOString();
}
```

### **Opción 3: Guardar Hora Local y Convertir al Comparar**

Guardar la hora tal como la ingresa el usuario y convertir solo al comparar:

```javascript
// Guardar en BD con offset explícito
auctionStartAt = `${localDateTime}T00:00:00-04:00`; // UTC-4 de Paraguay
```

---

## 🔧 Implementación Recomendada

La **Opción 1** es la mejor porque JavaScript ya maneja automáticamente la zona horaria local del usuario. Solo necesitamos asegurarnos de que la conversión sea explícita.

### Código Actual (PROBLEMÁTICO):
```javascript
const startDate = new Date(auctionStartDate);
auctionStartAt = startDate.toISOString();
```

### Código Corregido:
```javascript
// auctionStartDate viene como "2025-10-31T14:00" (hora local del navegador)
const startDate = new Date(auctionStartDate);
// toISOString() ya convierte a UTC automáticamente basándose en la zona horaria del navegador
// Pero asegurémonos de que el navegador tenga la zona horaria correcta
auctionStartAt = startDate.toISOString();
```

**El problema real** es que si tu navegador/OS tiene la zona horaria incorrecta, la conversión será incorrecta.

---

## 📝 Resumen

1. **Las 3 condiciones** permiten que subastas programadas aparezcan si:
   - No tienen fecha (pruebas inmediatas)
   - Su fecha ya pasó (debería estar activa)
   - Están muy cerca (tolerancia de 1 minuto)

2. **El problema de zona horaria:**
   - Paraguay: UTC-4
   - Servidor: UTC
   - JavaScript convierte automáticamente basándose en la zona horaria del navegador

3. **La solución:**
   - JavaScript ya maneja esto correctamente si la zona horaria del sistema está bien configurada
   - `new Date().toISOString()` convierte automáticamente hora local → UTC
   - El problema puede estar en que el navegador del usuario tiene zona horaria incorrecta

---

## ✅ Verificación

Para verificar si hay problema de zona horaria:

```javascript
// En la consola del navegador:
console.log('Zona horaria del navegador:', Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log('Offset actual:', new Date().getTimezoneOffset());
console.log('Hora actual local:', new Date().toString());
console.log('Hora actual UTC:', new Date().toISOString());
```

Si el offset no es -240 (UTC-4) o -180 (UTC-3), hay un problema de configuración del sistema.


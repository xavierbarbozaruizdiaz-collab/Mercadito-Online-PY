# 💰 Upstash Redis - Plan Gratuito

## ✅ SÍ, Upstash tiene un plan gratuito generoso

**Plan Gratuito incluye:**
- ✅ 10,000 comandos/día
- ✅ 256 MB de almacenamiento
- ✅ Bases de datos **Regional** (no Global)
- ✅ Suficiente para desarrollo y producción pequeña/mediana

---

## ⚠️ Cómo Crear una Base de Datos GRATUITA

### Configuración Correcta (Plan Gratuito):

1. **Name**: 
   - Pon cualquier nombre (ej: `mercadito-online-redis`)

2. **Primary Region**: 
   - ✅ Selecciona una región (ej: `us-east-1`, `us-west-1`, `eu-west-1`)
   - **IMPORTANTE**: Debe ser una base de datos **"Regional"**, NO "Global"

3. **Read Regions**: 
   - ❌ **NO selecciones nada** (déjalo vacío)
   - **"Read regions are only available for paid plans"** ← Esto es solo para planes pagos
   - Si seleccionas algo aquí, te pedirá método de pago

4. **Eviction**: 
   - ✅ Puedes dejarlo desactivado (toggle OFF)
   - O activarlo si quieres (no afecta el plan gratuito)

---

## 🚫 Lo que NO debes seleccionar (requiere pago):

- ❌ **"Global"** type (solo planes pagos)
- ❌ **"Read Regions"** (solo planes pagos)
- ❌ Cualquier feature premium

---

## ✅ Pasos Correctos:

1. **Name**: Escribe `mercadito-online-redis`
2. **Primary Region**: Selecciona una región (ej: `us-east-1`)
3. **Read Regions**: **DÉJALO VACÍO** (no selecciones nada)
4. **Eviction**: Déjalo como está (OFF está bien)
5. **Haz clic en "Next"**

Si el botón "Next" sigue deshabilitado:
- Verifica que hayas escrito un **Name**
- Verifica que hayas seleccionado una **Primary Region**
- **NO selecciones nada en "Read Regions"**

---

## 💡 Si Aparece la Advertencia de Pago

Si ves: **"Add a payment method for paid plans"**:

**Causa**: Probablemente seleccionaste algo en "Read Regions" o estás intentando crear una base de datos "Global".

**Solución**:
1. **Deselecciona** cualquier cosa en "Read Regions"
2. Asegúrate de que el tipo de base de datos sea **"Regional"** (no "Global")
3. La advertencia debería desaparecer

---

## 📊 Comparación de Planes

### Plan Gratuito (Regional):
- ✅ 10,000 comandos/día
- ✅ 256 MB almacenamiento
- ✅ 1 región
- ✅ Perfecto para tu caso

### Plan Pago (Global):
- 💰 Desde $0.20/100K comandos
- ✅ Múltiples regiones
- ✅ Mejor latencia global
- ❌ **NO necesario** para empezar

---

## 🎯 Recomendación

**Para tu proyecto:**
- ✅ Usa el **plan gratuito (Regional)**
- ✅ Selecciona la región más cercana a Paraguay (ej: `us-east-1` o `sa-east-1`)
- ✅ **NO selecciones "Read Regions"**
- ✅ Con esto tendrás suficiente para:
  - Locks distribuidos en pujas
  - Rate limiting
  - Cache de subastas

**Cuando crezcas** (miles de usuarios simultáneos), puedes considerar el plan pago, pero el gratuito es suficiente para empezar.

---

**Resumen**: Selecciona solo **Primary Region**, **NO selecciones Read Regions**, y podrás crear la base de datos gratis.






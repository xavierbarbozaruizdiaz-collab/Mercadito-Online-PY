# 🔍 ¿De dónde obtengo el dominio y qué pongo en PAGOPAR_ENVIRONMENT?

---

## 📌 PREGUNTA 1: ¿De dónde obtengo el dominio?

### ✅ Método más fácil: Revisar dónde está hosteado tu sitio

#### **Si estás en Vercel:**
1. Ve a tu proyecto en Vercel
2. Tu dominio será: `tu-proyecto.vercel.app`
   - O si tienes dominio personalizado: `tu-dominio.com.py`

#### **Si estás en desarrollo local:**
- Usa: `http://localhost:3000`

#### **Si ya tienes el sitio funcionando:**
1. Abre tu navegador
2. Ve a tu sitio web
3. Mira la barra de direcciones: **ese es tu dominio**

#### **Ejemplo basado en tu imagen:**
Si en el panel de Pagopar viste `xbar.com.py`, ese es tu dominio de producción.

---

## 📝 URLs para Pagopar según tu situación:

### 🏠 **Desarrollo Local (para probar primero):**
```
URL DE REDIRECCIONAMIENTO: http://localhost:3000/pagopar/retorno/($hash)
URL DE RESPUESTA: http://localhost:3000/api/webhooks/pagopar
```
⚠️ **NOTA**: Pagopar NO puede acceder a `localhost` desde sus servidores. Para probar webhooks localmente necesitas usar **ngrok** o esperar a probar en producción.

### 🌐 **Producción (si tu dominio es xbar.com.py):**
```
URL DE REDIRECCIONAMIENTO: https://xbar.com.py/pagopar/retorno/($hash)
URL DE RESPUESTA: https://xbar.com.py/api/webhooks/pagopar
```

### 🌐 **Producción (si estás en Vercel sin dominio personalizado):**
```
URL DE REDIRECCIONAMIENTO: https://tu-proyecto.vercel.app/pagopar/retorno/($hash)
URL DE RESPUESTA: https://tu-proyecto.vercel.app/api/webhooks/pagopar
```

---

## 📌 PREGUNTA 2: ¿PAGOPAR_ENVIRONMENT=sandbox lo copio tal cual?

### ✅ **SÍ, cópialo tal cual para empezar**

```env
PAGOPAR_ENVIRONMENT=sandbox
```

### 🔄 **¿Cuándo cambiarlo a `production`?**

**MANTÉNLO EN `sandbox` cuando:**
- ✅ Estás probando
- ✅ Estás desarrollando
- ✅ No quieres hacer pagos reales todavía
- ✅ Estás aprendiendo cómo funciona

**CÁMBIALO A `production` cuando:**
- ✅ Ya probaste todo y funciona bien en sandbox
- ✅ Ya tienes tus credenciales de PRODUCCIÓN de Pagopar
- ✅ Estás listo para recibir pagos reales
- ✅ Tu sitio está en producción y funcionando

---

## 📋 Resumen de variables de entorno:

```env
# Reemplaza estos con tus tokens reales de Pagopar:
PAGOPAR_PUBLIC_TOKEN=pega_aqui_tu_token_publico_de_sandbox
PAGOPAR_PRIVATE_TOKEN=pega_aqui_tu_token_privado_de_sandbox

# Déjalo así para empezar (pruebas):
PAGOPAR_ENVIRONMENT=sandbox

# Cuando estés listo para producción:
# PAGOPAR_ENVIRONMENT=production
# (Y usa los tokens de PRODUCCIÓN, que son diferentes a los de sandbox)
```

---

## 🎯 Pasos recomendados:

### **PASO 1: Desarrollo Local**
1. Configura las variables en `.env.local` con tokens de **sandbox**
2. Deja `PAGOPAR_ENVIRONMENT=sandbox`
3. Para las URLs de Pagopar:
   - Si quieres probar el flujo completo, usa un servicio como **ngrok** para exponer localhost
   - O configura las URLs con tu dominio de producción y prueba directamente ahí

### **PASO 2: Producción (Sandbox)**
1. Usa tu dominio real: `https://xbar.com.py`
2. Mantén `PAGOPAR_ENVIRONMENT=sandbox`
3. Usa tokens de sandbox
4. Prueba todo con pagos de prueba

### **PASO 3: Producción (Real)**
1. Cambia a `PAGOPAR_ENVIRONMENT=production`
2. Usa tokens de **PRODUCCIÓN** (son diferentes)
3. Configura URLs con tu dominio de producción
4. Listo para recibir pagos reales

---

## 💡 Consejos:

1. **Siempre prueba primero en sandbox** - Es gratis y no afecta dinero real
2. **Los tokens de sandbox y producción son diferentes** - Pagopar te da ambos
3. **No cambies a production hasta que estés 100% seguro** - Puede haber cargos reales

---

## 🆘 ¿No sabes cuál es tu dominio?

### **Opción 1: Revisar el navegador**
1. Abre tu sitio web
2. Mira la barra de direcciones
3. Copia el dominio (sin el `/` al final)

### **Opción 2: Revisar variables de entorno**
1. Busca en tu proyecto la variable `NEXT_PUBLIC_APP_URL`
2. Esa es tu URL base

### **Opción 3: Revisar donde está hosteado**
- **Vercel**: Ve al dashboard de Vercel, verás tu URL
- **Netlify**: Ve al dashboard de Netlify
- **Otro hosting**: Revisa la configuración del dominio







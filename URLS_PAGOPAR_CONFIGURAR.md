# 🔗 URLs para Configurar en Pagopar

Basándote en la imagen que me mostraste del panel de Pagopar, aquí están las URLs exactas que debes pegar:

---

## 📋 URLs a Configurar

### 1️⃣ **URL DE REDIRECCIONAMIENTO**

**Pega esto en el campo "URL DE REDIRECCIONAMIENTO":**

```
https://xbar.com.py/pagopar/retorno/($hash)
```

**¿Qué hace?**
- Después de que el cliente intenta pagar en Pagopar, Pagopar lo redirige aquí
- El `($hash)` es un parámetro que Pagopar añade automáticamente con información del pago
- Esta página verifica el estado del pago y redirige al cliente a la página de éxito

---

### 2️⃣ **URL DE RESPUESTA (Webhook)**

**Pega esto en el campo "URL DE RESPUESTA":**

```
https://xbar.com.py/api/webhooks/pagopar
```

**¿Qué hace?**
- Pagopar envía notificaciones automáticas aquí cuando hay un cambio en el estado del pago
- Es una comunicación servidor-a-servidor (el cliente no ve esto)
- Se usa para actualizar automáticamente el estado de las órdenes cuando se paga

---

## ⚠️ IMPORTANTE

### ✅ Reemplaza el dominio si es diferente

Si tu dominio NO es `xbar.com.py`, reemplázalo:

**Ejemplo si tu dominio es `mercadito.com.py`:**
- URL DE REDIRECCIONAMIENTO: `https://mercadito.com.py/pagopar/retorno/($hash)`
- URL DE RESPUESTA: `https://mercadito.com.py/api/webhooks/pagopar`

**Ejemplo si estás en localhost (solo para pruebas):**
- URL DE REDIRECCIONAMIENTO: `http://localhost:3000/pagopar/retorno/($hash)`
- URL DE RESPUESTA: `http://localhost:3000/api/webhooks/pagopar`

---

## 🔍 ¿Cuál es tu dominio?

Para saber cuál usar, revisa:

1. **Si estás en producción:**
   - Tu dominio real (ej: `xbar.com.py`, `mercadito.com.py`, etc.)

2. **Si estás en desarrollo:**
   - Puedes usar `localhost:3000` para pruebas locales
   - O usar un servicio como ngrok para exponer localhost públicamente

3. **Si estás en Vercel:**
   - Tu URL de Vercel (ej: `tu-proyecto.vercel.app`)

---

## ✅ Después de Configurar

1. **Guarda los cambios** en el panel de Pagopar
2. **Prueba** haciendo un pago de prueba
3. **Verifica** que:
   - El cliente es redirigido correctamente después de pagar
   - El webhook recibe las notificaciones (revisa los logs del servidor)

---

## 🆘 ¿Necesitas ayuda?

Si no sabes cuál es tu dominio:
- Revisa la URL cuando abres tu sitio web
- O revisa la configuración en Vercel/Netlify/su hosting

Si tienes problemas:
- Verifica que las URLs sean accesibles públicamente (no localhost a menos que uses ngrok)
- Verifica que usas HTTPS en producción
- Revisa los logs del servidor para ver errores














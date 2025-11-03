# 🚀 Pasos para Integrar Pagopar - Guía Paso a Paso

## ⚠️ IMPORTANTE: Lee esto primero

Esta es una guía paso a paso basada en la documentación oficial de Pagopar. Sigue estos pasos en orden.

---

## 📋 PASO 1: Registrarse en Pagopar

### 1.1. Crear cuenta
1. Ve a: **https://www.pagopar.com/**
2. Haz clic en **"Registrarse"** o **"Crear cuenta"**
3. Completa el formulario de registro con:
   - Nombre de tu negocio/empresa
   - Email
   - Teléfono
   - Datos de contacto
4. Confirma tu email

### 1.2. Verificar tu cuenta
- Pagopar puede requerir verificación de identidad para negocios
- Revisa tu email para confirmar la cuenta
- Completa cualquier documentación requerida

---

## 🔑 PASO 2: Obtener las Credenciales de API

### 2.1. Acceder al panel
1. Inicia sesión en tu cuenta de Pagopar
2. Ve al **Panel de Control** o **Dashboard**

### 2.2. Encontrar las credenciales
1. Busca la sección: **"Integrar con mi sitio web"** o **"API"** o **"Integración"**
2. Aquí encontrarás:
   - **Token Público** (public_key)
   - **Token Privado** (private_key)

### 2.3. Copiar las credenciales
- **IMPORTANTE**: Guarda estas credenciales en un lugar seguro
- **NO** las compartas públicamente
- **NO** las subas a Git

---

## 🔧 PASO 3: Configurar Variables de Entorno

### 3.1. Abrir archivo de configuración
1. En tu proyecto, busca el archivo `.env.local` (o créalo si no existe)
2. Si no tienes `.env.local`, copia `env.example` y renómbralo a `.env.local`

### 3.2. Agregar variables de Pagopar
Abre `.env.local` y agrega:

```env
# Pagopar Configuration
PAGOPAR_PUBLIC_TOKEN=tu_token_publico_aqui
PAGOPAR_PRIVATE_TOKEN=tu_token_privado_aqui
PAGOPAR_ENVIRONMENT=sandbox
```

**Nota**: 
- Reemplaza `tu_token_publico_aqui` con tu Token Público real
- Reemplaza `tu_token_privado_aqui` con tu Token Privado real
- Para pruebas usa `sandbox`, para producción usa `production`

### 3.3. Verificar que el archivo está guardado
- Guarda el archivo `.env.local`
- **IMPORTANTE**: Este archivo NO debe estar en Git (ya está en .gitignore)

---

## 🧪 PASO 4: Probar la Conexión (OPCIONAL pero recomendado)

### 4.1. Verificar que las variables están cargadas
1. Reinicia tu servidor de desarrollo si está corriendo
2. Las variables de entorno solo se cargan al iniciar el servidor

### 4.2. Probar creación de token (test básico)
- El sistema intentará crear un token cuando uses Pagopar en checkout
- Revisa los logs del servidor para ver si hay errores

---

## 🌐 PASO 5: Configurar URLs en Pagopar (En el panel de Pagopar)

### 5.1. Configurar URL de respuesta/webhook
1. En el panel de Pagopar, busca **"Webhooks"** o **"Notificaciones"** o **"URLs de respuesta"**
2. Configura la URL:
   ```
   https://tu-dominio.com/api/webhooks/pagopar
   ```
   **Nota**: Reemplaza `tu-dominio.com` con tu dominio real (ej: `mercadito.com.py`)

### 5.2. Configurar URL de redirección (si Pagopar lo requiere)
- Algunas integraciones requieren URL de retorno después del pago
- Configura: `https://tu-dominio.com/checkout/success`

### 5.3. Guardar configuración
- Guarda los cambios en el panel de Pagopar

---

## 💻 PASO 6: Verificar que el Código está Listo

### 6.1. Verificar archivos creados
El sistema ya tiene los siguientes archivos implementados:
- ✅ `src/lib/services/pagoparService.ts` - Servicio de Pagopar
- ✅ `src/app/api/payments/pagopar/create-invoice/route.ts` - Crear factura
- ✅ `src/app/api/payments/pagopar/status/route.ts` - Consultar estado
- ✅ `src/app/api/webhooks/pagopar/route.ts` - Recibir notificaciones
- ✅ `src/app/checkout/page.tsx` - Integración en checkout

### 6.2. Verificar que todo compila
Ejecuta:
```bash
npm run build
```

Si hay errores, revisa los logs y corrígelos.

---

## 🧪 PASO 7: Probar en Modo Sandbox (PRUEBAS)

### 7.1. Usar ambiente de pruebas
- Asegúrate de tener `PAGOPAR_ENVIRONMENT=sandbox` en `.env.local`
- Pagopar te dará credenciales de prueba separadas

### 7.2. Hacer una prueba de pago
1. Inicia tu servidor: `npm run dev`
2. Ve al checkout con un producto de prueba
3. Selecciona **"Pago con Pagopar"**
4. Deberías ser redirigido a Pagopar
5. Completa el pago de prueba
6. Verifica que vuelves a tu sitio

### 7.3. Verificar webhook
- Pagopar debería enviar una notificación a tu webhook
- Revisa los logs para verificar que se recibió

---

## 🚀 PASO 8: Pasar a Producción

### 8.1. Obtener credenciales de producción
1. En el panel de Pagopar, busca credenciales de **PRODUCCIÓN** (no sandbox)
2. Son diferentes a las de pruebas

### 8.2. Actualizar variables de entorno en producción
- En Vercel (o tu plataforma de hosting):
  - Ve a **Settings** > **Environment Variables**
  - Agrega:
    - `PAGOPAR_PUBLIC_TOKEN` = Tu token público de producción
    - `PAGOPAR_PRIVATE_TOKEN` = Tu token privado de producción
    - `PAGOPAR_ENVIRONMENT` = `production`

### 8.3. Actualizar URLs de webhook
- En Pagopar, actualiza la URL del webhook a tu dominio de producción
- Asegúrate de usar HTTPS

### 8.4. Hacer deploy
- Haz deploy de tu aplicación
- Prueba un pago real pequeño primero

---

## ✅ Checklist Final

Antes de considerar la integración completa:

- [ ] Cuenta creada en Pagopar
- [ ] Credenciales (Token Público y Privado) obtenidas
- [ ] Variables de entorno configuradas en `.env.local`
- [ ] Servidor reiniciado después de agregar variables
- [ ] URLs de webhook configuradas en Pagopar
- [ ] Probado en modo sandbox exitosamente
- [ ] Credenciales de producción obtenidas
- [ ] Variables de producción configuradas en hosting
- [ ] Probado en producción con un pago real pequeño

---

## 🆘 ¿Qué hacer si algo no funciona?

### Error: "Pagopar credentials not configured"
→ Verifica que las variables estén en `.env.local` y reinicia el servidor

### Error: "Invalid token"
→ Verifica que copiaste los tokens completos (sin espacios al inicio/final)

### No me redirige a Pagopar
→ Revisa la consola del navegador y los logs del servidor para ver el error

### El webhook no funciona
→ Verifica que la URL sea accesible públicamente y use HTTPS en producción

---

## 📞 ¿Necesitas ayuda?

1. **Documentación oficial**: https://soporte.pagopar.com/portal/es/kb/api
2. **Soporte de Pagopar**: Contacta desde tu panel de control
3. **Logs del servidor**: Revisa los logs para ver errores específicos

---

## 📝 Notas Importantes

- ⚠️ **NUNCA** compartas tus tokens públicamente
- ✅ Usa `sandbox` para desarrollo y pruebas
- ✅ Usa `production` solo cuando esté todo probado
- ✅ Los webhooks requieren HTTPS en producción
- ✅ Siempre prueba primero con montos pequeños





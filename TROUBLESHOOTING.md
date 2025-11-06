# 🔧 Guía de Troubleshooting - Mercadito Online PY

## 🚨 Problemas Comunes y Soluciones

### Problemas de Autenticación

#### "No se puede iniciar sesión"
**Síntomas:**
- El botón de login no responde
- Mensaje de "Credenciales inválidas"
- Error 401 al intentar acceder

**Soluciones:**
1. Verifica que tu email esté correctamente escrito
2. Verifica que hayas verificado tu email (revisa spam)
3. Intenta restablecer tu contraseña
4. Limpia las cookies del navegador
5. Verifica que JavaScript esté habilitado

#### "Sesión expirada"
**Síntomas:**
- Te desconecta después de un tiempo
- Necesitas iniciar sesión constantemente

**Soluciones:**
1. Asegúrate de no estar en modo incógnito
2. No elimines las cookies del sitio
3. Verifica la configuración de cookies de tu navegador

### Problemas con Productos

#### "Las imágenes no se cargan"
**Síntomas:**
- Las imágenes aparecen rotas
- Placeholders en lugar de imágenes
- Error al subir imágenes

**Soluciones:**
1. Verifica tu conexión a internet
2. Intenta recargar la página (Ctrl+F5 / Cmd+Shift+R)
3. Verifica que el formato de imagen sea JPG, PNG o WEBP
4. Reduce el tamaño de las imágenes antes de subirlas
5. Verifica que Supabase Storage esté configurado correctamente

#### "No puedo publicar un producto"
**Síntomas:**
- Formulario no se envía
- Error "Debes iniciar sesión"
- Error de validación

**Soluciones:**
1. Asegúrate de estar autenticado como vendedor
2. Completa todos los campos requeridos (marcados con *)
3. Verifica que el precio sea mayor a 0
4. Asegúrate de subir al menos una imagen
5. Verifica que la categoría esté seleccionada

### Problemas con el Carrito

#### "El producto no se agrega al carrito"
**Síntomas:**
- Click en "Agregar al carrito" no hace nada
- Mensaje de error
- Producto no aparece en el carrito

**Soluciones:**
1. Verifica que estés autenticado
2. Verifica que haya stock disponible
3. Recarga la página y vuelve a intentar
4. Limpia la caché del navegador
5. Verifica la consola del navegador para errores

#### "El carrito se vacía al recargar"
**Síntomas:**
- Productos desaparecen del carrito
- Carrito aparece vacío después de recargar

**Soluciones:**
1. Asegúrate de estar autenticado (el carrito se guarda en la cuenta)
2. Verifica que las cookies estén habilitadas
3. No uses modo incógnito para compras

### Problemas con Checkout

#### "No puedo completar el checkout"
**Síntomas:**
- Botón "Confirmar Pedido" no funciona
- Error al procesar el pago
- Formulario no se envía

**Soluciones:**
1. Verifica que todos los campos estén completos
2. Asegúrate de tener productos en el carrito
3. Verifica que los productos tengan stock disponible
4. Revisa que la dirección de envío sea válida
5. Intenta desde otro navegador o dispositivo

#### "No recibo confirmación de pedido"
**Síntomas:**
- No llega email de confirmación
- Pedido no aparece en "Mis Pedidos"

**Soluciones:**
1. Revisa tu carpeta de spam
2. Verifica que tu email esté correcto en tu perfil
3. Espera unos minutos (puede haber delay)
4. Revisa "Mis Pedidos" en el dashboard

### Problemas con Chat

#### "No puedo enviar mensajes"
**Síntomas:**
- Mensajes no se envían
- Error al cargar conversaciones
- Chat no se carga

**Soluciones:**
1. Verifica que estés autenticado
2. Verifica tu conexión a internet
3. Recarga la página
4. Verifica que el vendedor/comprador exista
5. Limpia la caché del navegador

#### "No recibo notificaciones de mensajes"
**Síntomas:**
- No aparecen notificaciones
- No se actualizan los mensajes en tiempo real

**Soluciones:**
1. Verifica que las notificaciones estén habilitadas en tu navegador
2. Verifica la configuración de notificaciones en tu perfil
3. Asegúrate de que no estés en modo "No molestar"
4. Verifica la conexión WebSocket (consola del navegador)

### Problemas de Búsqueda

#### "La búsqueda no encuentra productos"
**Síntomas:**
- Resultados vacíos
- No aparecen sugerencias
- Búsqueda muy lenta

**Soluciones:**
1. Verifica la ortografía de tu búsqueda
2. Intenta términos más generales
3. Usa menos filtros a la vez
4. Recarga la página
5. Intenta desde otro dispositivo

#### "Filtros no funcionan"
**Síntomas:**
- Los filtros no afectan los resultados
- Resultados incorrectos

**Soluciones:**
1. Limpia todos los filtros y vuelve a aplicarlos
2. Recarga la página
3. Verifica que los filtros sean consistentes (ej: min_price < max_price)

### Problemas de Performance

#### "La página carga muy lento"
**Síntomas:**
- Carga de páginas demora mucho
- Imágenes tardan en aparecer
- Timeouts frecuentes

**Soluciones:**
1. Verifica tu conexión a internet
2. Cierra otras pestañas del navegador
3. Limpia la caché del navegador
4. Desactiva extensiones del navegador
5. Intenta desde otro navegador
6. Verifica que no haya procesos pesados ejecutándose

#### "La página se congela"
**Síntomas:**
- El navegador no responde
- JavaScript no funciona
- Errores en consola

**Soluciones:**
1. Recarga la página (F5)
2. Recarga forzando caché (Ctrl+F5)
3. Cierra y vuelve a abrir el navegador
4. Actualiza tu navegador a la última versión
5. Desactiva extensiones

### Problemas en Móviles

#### "El sitio no se ve bien en mi teléfono"
**Síntomas:**
- Elementos desordenados
- Botones muy pequeños
- Imágenes se salen del frame

**Soluciones:**
1. Instala la PWA (Progressive Web App)
2. Actualiza tu navegador móvil
3. Recarga la página
4. Verifica la orientación de la pantalla
5. Limpia la caché del navegador móvil

#### "No puedo subir fotos desde el móvil"
**Síntomas:**
- Selector de imágenes no abre
- Fotos no se suben
- Error al seleccionar imagen

**Soluciones:**
1. Verifica los permisos de cámara/fotos del navegador
2. Asegúrate de que JavaScript esté habilitado
3. Intenta con fotos más pequeñas
4. Verifica que tengas espacio en tu dispositivo
5. Intenta desde otro navegador móvil

### Problemas con PWA

#### "No puedo instalar la app"
**Síntomas:**
- No aparece el banner de instalación
- Instalación falla
- App no funciona offline

**Soluciones:**
1. Usa un navegador compatible (Chrome, Edge, Safari)
2. Asegúrate de estar en HTTPS
3. Recarga la página
4. Verifica que el service worker esté activo
5. Intenta desde otro dispositivo

## 🐛 Errores Específicos

### Error: "No se encontró perfil para este usuario"
**Causa:** El perfil del usuario no existe en la base de datos.

**Solución:**
1. Cierra sesión y vuelve a iniciar sesión
2. Si persiste, contacta a soporte para que creen tu perfil manualmente

### Error: "invalid input syntax for type json"
**Causa:** Datos mal formateados enviados a la API.

**Solución:**
1. Recarga la página
2. Intenta nuevamente la operación
3. Si persiste, contacta a soporte

### Error: "Row Level Security policy violation"
**Causa:** Permisos insuficientes para realizar la operación.

**Solución:**
1. Verifica que estés autenticado
2. Verifica que tengas los permisos necesarios (vendedor/comprador)
3. Contacta a soporte si crees que deberías tener acceso

### Error: "Network request failed"
**Causa:** Problema de conectividad o servidor.

**Solución:**
1. Verifica tu conexión a internet
2. Espera unos minutos y vuelve a intentar
3. Verifica el estado del servidor en status.mercadito-online-py.com
4. Si persiste, contacta a soporte

## 📞 Contactar Soporte

Si ninguna de las soluciones anteriores resuelve tu problema:

### Información a proporcionar:
1. **Descripción del problema:** Qué estabas intentando hacer
2. **Pasos para reproducir:** Qué acciones llevaron al problema
3. **Mensaje de error exacto:** Copia el mensaje completo
4. **Navegador y versión:** Ej: Chrome 120.0
5. **Sistema operativo:** Ej: Windows 11, iOS 17
6. **Capturas de pantalla:** Si es posible
7. **Consola del navegador:** Errores en F12 → Console

### Canales de soporte:
- **Email:** soporte@mercadito-online-py.com
- **Horario:** Lunes a Viernes, 9:00 AM - 6:00 PM (GMT-4)
- **Respuesta:** En un plazo de 24-48 horas

## 🔍 Herramientas de Diagnóstico

### Verificar tu conexión:
```bash
# Verifica que puedas acceder a Supabase
ping hqdatzhliaordlsqtjea.supabase.co
```

### Verificar la consola del navegador:
1. Presiona **F12** (o Cmd+Option+I en Mac)
2. Ve a la pestaña **Console**
3. Busca errores en rojo
4. Toma captura de pantalla y envíala a soporte

### Limpiar caché y cookies:
1. **Chrome/Edge:** Ctrl+Shift+Delete → Selecciona "Caché" y "Cookies" → "Borrar datos"
2. **Firefox:** Ctrl+Shift+Delete → Selecciona "Caché" y "Cookies" → "Borrar ahora"
3. **Safari:** Cmd+Option+E (vaciar caché) + Preferencias → Privacidad → "Eliminar datos de sitios web"

---

**Última actualización**: Enero 2025


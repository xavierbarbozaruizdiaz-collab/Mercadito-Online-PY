# 📧 Notificaciones Masivas - Guía de Configuración

## ✅ Funcionalidades Implementadas

### 1. **Notificaciones In-App** (Funcional)
- ✅ Aparecen en tiempo real usando Supabase Realtime
- ✅ Se guardan en la tabla `notifications`
- ✅ Los usuarios las ven en el panel de notificaciones
- ✅ Respetan las preferencias de usuario

### 2. **Notificaciones por Email** (Requiere configuración)
- ✅ Templates HTML profesionales con diseño responsive
- ✅ Colores e iconos según el tipo (promoción, sistema, anuncio, urgente)
- ✅ Envío en lotes de 50 emails (límite de Resend)
- ✅ Manejo de errores y conteo de éxitos/fallos

### 3. **Sistema Completo**
- ✅ Tabla `bulk_notifications` para logs
- ✅ Estadísticas de notificaciones enviadas
- ✅ Historial con detalles de cada envío
- ✅ Filtros por destinatarios (todos, compradores, vendedores, admins)

## 🔧 Configuración Requerida

### Variables de Entorno

Agrega estas variables a tu archivo `.env.local`:

```env
# Servicio de Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@tudominio.com

# URL de la aplicación (para links en emails)
NEXT_PUBLIC_APP_URL=https://mercadito-online-py.com
```

### Pasos para Configurar Resend

1. **Crear cuenta en Resend**
   - Ve a https://resend.com
   - Crea una cuenta gratuita (100 emails/día gratis)

2. **Obtener API Key**
   - Ve a API Keys en el dashboard
   - Crea una nueva API Key
   - Copia la clave (empieza con `re_`)

3. **Verificar dominio** (Opcional pero recomendado)
   - En Domains, agrega tu dominio
   - Agrega los registros DNS que te indica
   - Una vez verificado, puedes usar `noreply@tudominio.com`

4. **Configurar en el proyecto**
   - Agrega `RESEND_API_KEY` a `.env.local`
   - Si no tienes dominio verificado, usa `onboarding@resend.dev` (solo para testing)

## 📝 Uso del Sistema

### Desde el Panel Admin (`/admin/notifications`)

1. **Crear notificación:**
   - Click en "Nueva Notificación"
   - Completa título y mensaje
   - Selecciona destinatarios
   - Elige canales (In-app ✓, Email, Push)
   - Click en "Enviar"

2. **Ver estadísticas:**
   - Total de notificaciones enviadas
   - Total de destinatarios
   - Actividad de últimos 30 días
   - Desglose por tipo

3. **Ver historial:**
   - Lista de todas las notificaciones masivas
   - Detalles de cada envío (destinatarios, canales, éxito/fallo)

## 🎨 Templates de Email

Los emails tienen diseño profesional con:

- **Colores por tipo:**
  - 🎉 Promoción: Verde (#10b981)
  - ⚙️ Sistema: Azul (#3b82f6)
  - 📢 Anuncio: Púrpura (#8b5cf6)
  - 🚨 Urgente: Rojo (#dc2626)

- **Características:**
  - Responsive (se ve bien en móvil)
  - Botón de acción opcional
  - Link para desactivar notificaciones
  - Diseño moderno y limpio

## 📊 Flujo de Funcionamiento

```
Admin crea notificación
  ↓
Sistema identifica destinatarios según filtro
  ↓
Para cada destinatario:
  ├─ Crea notificación en BD (in-app) ✓
  ├─ Envía email (si está configurado) ✓
  └─ Prepara push (futuro)
  ↓
Guarda log en bulk_notifications
  ↓
Muestra resultados al admin
```

## ⚠️ Notas Importantes

1. **Límites de Resend:**
   - Plan gratuito: 100 emails/día
   - Se envía en lotes de 50 para evitar rate limits

2. **Sin API Key:**
   - Las notificaciones in-app funcionan igual
   - Los emails simplemente no se envían (se registra en logs)

3. **Respeto a preferencias:**
   - El sistema verifica preferencias de usuario
   - No envía emails si el usuario los desactivó
   - Respeta "horas silenciosas"

## 🚀 Próximos Pasos (Opcionales)

- [ ] Notificaciones push del navegador
- [ ] Programación de notificaciones (cron job)
- [ ] Segmentación avanzada (por ubicación, compras anteriores, etc.)
- [ ] A/B testing de notificaciones
- [ ] Templates personalizables

## 📞 Soporte

Si tienes problemas:
1. Verifica que `RESEND_API_KEY` esté configurado
2. Revisa los logs en la consola del navegador
3. Verifica que el dominio esté verificado en Resend
4. Revisa el historial en `/admin/notifications` para ver errores


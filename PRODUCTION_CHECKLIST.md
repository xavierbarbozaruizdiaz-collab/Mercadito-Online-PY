# ✅ Checklist de Preparación para Producción

## 📋 Pre-Deployment

### 🔐 Seguridad
- [ ] Verificar que todas las variables de entorno están configuradas
- [ ] Revisar y actualizar `NEXT_PUBLIC_SUPABASE_ANON_KEY` (solo permitir acceso necesario)
- [ ] Configurar `SUPABASE_SERVICE_ROLE_KEY` solo en servidor (nunca en cliente)
- [ ] Verificar que RLS está habilitado en todas las tablas (ejecutar `/admin/security`)
- [ ] Revisar políticas RLS para evitar accesos no autorizados
- [ ] Configurar CSP headers (ya implementado en `next.config.ts`)
- [ ] Habilitar HTTPS en todos los ambientes
- [ ] Configurar rate limiting en Supabase

### 🗄️ Base de Datos
- [ ] Verificar que todas las migraciones están aplicadas
- [ ] Ejecutar `SELECT * FROM audit_security_status()` para verificar seguridad
- [ ] Crear backups automáticos configurados
- [ ] Configurar índices para optimizar queries pesadas
- [ ] Revisar y optimizar queries lentas con `EXPLAIN ANALYZE`
- [ ] Configurar retention policies para logs antiguos

### 🎨 Frontend
- [ ] Eliminar console.log() y comentarios de debug del código de producción
- [ ] Verificar que todos los errores están manejados con try/catch
- [ ] Configurar error boundaries para capturar errores de React
- [ ] Verificar que todas las imágenes tienen alt text
- [ ] Revisar accesibilidad (WCAG 2.1 AA mínimo)
- [ ] Optimizar imágenes antes de subir (ya hay compresión en upload)

### ⚡ Performance
- [ ] Ejecutar Lighthouse y alcanzar 90+ en todas las métricas
- [ ] Verificar que lazy loading está activo para imágenes
- [ ] Optimizar bundle size con `npm run build --analyze` (si está configurado)
- [ ] Configurar CDN para assets estáticos
- [ ] Habilitar compression en servidor (gzip/brotli)
- [ ] Verificar que next/image está optimizando imágenes correctamente

### 📧 Notificaciones y Emails
- [ ] Configurar servicio de email para notificaciones (SendGrid, Resend, etc.)
- [ ] Configurar templates de email (confirmación de pedidos, etc.)
- [ ] Probar envío de emails en staging
- [ ] Configurar SMS provider si se usa (Twilio, etc.)
- [ ] Verificar que push notifications funcionan correctamente

### 💳 Pagos
- [ ] Configurar gateway de pagos en modo producción
- [ ] Configurar webhooks para pagos (Pagopar, Stripe, etc.)
- [ ] Probar flujo completo de checkout en staging
- [ ] Configurar notificaciones de pagos exitosos/fallidos
- [ ] Implementar reembolsos y cancelaciones

### 🚚 Envíos
- [ ] Configurar integración con proveedor de envíos
- [ ] Configurar tracking numbers automáticos
- [ ] Probar flujo completo de shipping
- [ ] Configurar notificaciones de envío a clientes

### 📊 Analytics y Monitoreo
- [ ] Configurar Google Analytics 4 o similar
- [ ] Configurar Sentry o similar para error tracking
- [ ] Configurar Vercel Analytics si se usa Vercel
- [ ] Configurar alerts para errores críticos
- [ ] Configurar dashboard de métricas en tiempo real

### 🧪 Testing
- [ ] Ejecutar todos los tests E2E: `npm run test:e2e`
- [ ] Probar flujos críticos manualmente:
  - [ ] Registro y login
  - [ ] Crear producto
  - [ ] Agregar al carrito
  - [ ] Checkout completo
  - [ ] Chat entre usuarios
  - [ ] Sistema de reviews
- [ ] Testear en múltiples navegadores (Chrome, Firefox, Safari, Edge)
- [ ] Testear en dispositivos móviles reales
- [ ] Verificar que PWA funciona correctamente

### 🌍 SEO
- [ ] Verificar sitemap en `/sitemap.xml`
- [ ] Verificar robots.txt en `/robots.txt`
- [ ] Probar structured data con Google Rich Results Test
- [ ] Verificar meta tags con Open Graph Debugger
- [ ] Configurar Google Search Console
- [ ] Verificar que todas las URLs son canónicas

### 🔄 CI/CD
- [ ] Verificar que GitHub Actions está configurado correctamente
- [ ] Probar deployment automático en staging
- [ ] Configurar branch protection rules en GitHub
- [ ] Configurar approval requerido para merges a main
- [ ] Configurar deployment automático a producción (opcional)

## 🚀 Deployment

### Vercel (Recomendado)
- [ ] Conectar repositorio en Vercel
- [ ] Configurar todas las variables de entorno en Vercel Dashboard
- [ ] Configurar dominio personalizado
- [ ] Habilitar SSL automático
- [ ] Configurar preview deployments
- [ ] Configurar production branch (main/master)
- [ ] Habilitar Vercel Analytics

### Variables de Entorno Requeridas
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_APP_ENV=production

# Email (opcional pero recomendado)
SENDGRID_API_KEY=your-sendgrid-key
# o
RESEND_API_KEY=your-resend-key

# Analytics (opcional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
SENTRY_DSN=your-sentry-dsn

# Payments (cuando esté listo)
PAGOPAR_TOKEN=your-pagopar-token
# o
STRIPE_SECRET_KEY=your-stripe-key
```

## ✅ Post-Deployment

### Verificaciones Inmediatas
- [ ] Verificar que el sitio carga correctamente
- [ ] Probar login/registro
- [ ] Verificar que las imágenes se cargan
- [ ] Probar búsqueda de productos
- [ ] Verificar que el carrito funciona
- [ ] Revisar logs de errores en Vercel/Supabase

### Monitoreo Semanal
- [ ] Revisar errores en Sentry/logs
- [ ] Revisar métricas de performance (Core Web Vitals)
- [ ] Revisar analytics y conversiones
- [ ] Revisar uso de almacenamiento en Supabase
- [ ] Revisar límites de rate limiting
- [ ] Revisar backups de base de datos

### Mantenimiento Mensual
- [ ] Actualizar dependencias: `npm audit` y `npm update`
- [ ] Revisar y optimizar queries lentas
- [ ] Limpiar logs antiguos
- [ ] Revisar y actualizar documentación
- [ ] Revisar seguridad con herramientas automáticas

## 🆘 Troubleshooting Común

### Problemas Comunes

**Error: "Invalid API key"**
- Verificar que las variables de entorno están correctas en Vercel
- Verificar que el proyecto de Supabase está activo

**Error: "RLS policy violation"**
- Revisar políticas RLS en Supabase Dashboard
- Ejecutar `/admin/security` para verificar estado

**Error: "Image optimization failed"**
- Verificar que las imágenes están en Supabase Storage
- Verificar permisos de storage bucket

**Performance lenta**
- Verificar índices en base de datos
- Revisar queries pesadas con Supabase Dashboard
- Optimizar imágenes y assets

## 📞 Soporte

Si encuentras problemas:
1. Revisar logs en Vercel Dashboard
2. Revisar logs en Supabase Dashboard
3. Ejecutar tests: `npm run test:e2e`
4. Revisar errores en Sentry (si configurado)


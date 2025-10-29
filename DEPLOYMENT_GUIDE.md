# 🚀 Guía de Deployment - Mercadito Online PY

## 📋 Pre-Deployment Checklist

### 1. Cuentas Necesarias

- [ ] **Supabase**: Ya configurado ✅
- [ ] **Vercel**: Crear cuenta en https://vercel.com
- [ ] **Resend**: Crear cuenta en https://resend.com (para emails)
- [ ] **Sentry** (opcional): Crear cuenta en https://sentry.io (para error tracking)

### 2. Configurar Resend (Email)

1. Ve a https://resend.com y crea cuenta
2. Verifica tu dominio (o usa el dominio de prueba `onboarding.resend.dev`)
3. Ve a "API Keys" y crea una nueva key
4. Copia la key (empieza con `re_`)

### 3. Deployment a Vercel

#### Opción A: Desde GitHub (Recomendado)

1. **Sube tu código a GitHub** (si no lo has hecho):
   ```bash
   git remote add origin https://github.com/tu-usuario/mercadito-online-py.git
   git push -u origin main
   ```

2. **Conecta con Vercel**:
   - Ve a https://vercel.com
   - Click en "Add New Project"
   - Importa tu repositorio de GitHub
   - Vercel detectará Next.js automáticamente

3. **Configura Variables de Entorno** en Vercel:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
   RESEND_API_KEY=re_tu-api-key
   RESEND_FROM_EMAIL=noreply@onboarding.resend.dev
   NEXT_PUBLIC_APP_URL=https://tu-app.vercel.app
   ```

4. **Deploy**:
   - Click en "Deploy"
   - Espera 2-3 minutos
   - Tu app estará en `tu-app.vercel.app`

#### Opción B: Desde CLI

1. **Instala Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Configura variables de entorno**:
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add RESEND_API_KEY
   vercel env add RESEND_FROM_EMAIL
   vercel env add NEXT_PUBLIC_APP_URL
   ```

5. **Production deploy**:
   ```bash
   vercel --prod
   ```

### 4. Configurar Dominio (Opcional)

1. En Vercel Dashboard, ve a tu proyecto
2. Ve a "Settings" → "Domains"
3. Agrega tu dominio
4. Sigue las instrucciones de DNS
5. Vercel configurará SSL automáticamente

### 5. Post-Deployment

#### Verificar que todo funciona:

1. ✅ Abrir tu URL de Vercel
2. ✅ Probar registro de usuario
3. ✅ Verificar que recibes email de bienvenida
4. ✅ Probar login
5. ✅ Crear producto
6. ✅ Hacer checkout de prueba

#### Si hay errores:

1. **Revisar logs en Vercel Dashboard**
2. **Verificar variables de entorno**
3. **Revisar Supabase Dashboard para errores de base de datos**
4. **Verificar que Resend está configurado correctamente**

### 6. Configurar Sentry (Error Tracking)

1. Ve a https://sentry.io y crea cuenta
2. Crea nuevo proyecto (Next.js)
3. Copia el DSN
4. Agrega a Vercel:
   ```
   SENTRY_DSN=tu-sentry-dsn
   NEXT_PUBLIC_SENTRY_DSN=tu-sentry-dsn
   ```
5. (El código de Sentry se agregará en el siguiente paso si lo necesitas)

## 🔧 Troubleshooting

### Error: "Environment variable not found"
- Verifica que todas las variables están en Vercel Dashboard
- Reinicia el deployment después de agregar variables

### Error: "Failed to send email"
- Verifica que `RESEND_API_KEY` está correcta
- Verifica que `RESEND_FROM_EMAIL` está verificado en Resend
- Revisa logs en Resend Dashboard

### Error: "Supabase connection failed"
- Verifica que las URLs y keys de Supabase son correctas
- Verifica que el proyecto de Supabase está activo
- Revisa RLS policies en Supabase

### Build falla
- Revisa logs de build en Vercel
- Verifica que todas las dependencias están en `package.json`
- Ejecuta `npm run build` localmente para ver errores

## 📊 Monitoreo Post-Deployment

1. **Vercel Analytics**: Habilitar en Dashboard
2. **Supabase Logs**: Revisar logs en Supabase Dashboard
3. **Resend Dashboard**: Verificar envío de emails
4. **Sentry** (si configurado): Revisar errores

## 🎉 ¡Listo!

Tu aplicación debería estar funcionando en producción. 

**URL de producción:** `https://tu-app.vercel.app`

**Próximos pasos:**
- Invitar usuarios beta
- Recibir feedback
- Corregir bugs
- Agregar más features


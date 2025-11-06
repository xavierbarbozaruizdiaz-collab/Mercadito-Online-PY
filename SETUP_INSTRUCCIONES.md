# 📝 Instrucciones de Setup Rápido

## 🚀 Para Empezar (5 minutos)

### 1. Configurar Email (Resend)

**Sin esto, los emails NO funcionarán**

1. Ve a https://resend.com
2. Crea cuenta (gratis)
3. Verifica tu email
4. Ve a "API Keys" → "Create API Key"
5. Copia la key (empieza con `re_`)
6. Abre `.env.local` y agrega:
   ```env
   RESEND_API_KEY=re_tu-api-key-aqui
   RESEND_FROM_EMAIL=noreply@onboarding.resend.dev
   ```

**Nota:** `onboarding.resend.dev` es el dominio de prueba. Para producción, verifica tu dominio propio.

### 2. Variables de Entorno Mínimas

Tu `.env.local` debe tener al menos:
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
RESEND_API_KEY=re_tu-api-key
RESEND_FROM_EMAIL=noreply@onboarding.resend.dev
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Probar Localmente

```bash
npm run dev
```

Abre http://localhost:3000

### 4. Probar Email de Bienvenida

1. Ve a `/auth/sign-in`
2. Crea una nueva cuenta
3. Revisa tu email (spam si no llega)
4. Deberías recibir email de bienvenida

## 🌐 Deployment a Vercel

### Paso a Paso:

1. **Sube código a GitHub** (si no lo has hecho)
2. **Ve a https://vercel.com** y crea cuenta
3. **"Add New Project"** → Importa tu repo
4. **Agrega estas variables de entorno** en Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - `NEXT_PUBLIC_APP_URL` (tu URL de Vercel)
5. **Click "Deploy"**
6. **Espera 2-3 minutos**

✅ Tu app estará en `tu-app.vercel.app`

## 🔍 Configurar Sentry (Opcional, pero Recomendado)

1. Ve a https://sentry.io
2. Crea cuenta (gratis)
3. Crea proyecto "Next.js"
4. Copia el DSN
5. Agrega a Vercel:
   - `NEXT_PUBLIC_SENTRY_DSN=tu-dsn`
   - `SENTRY_ORG=tu-org`
   - `SENTRY_PROJECT=tu-project`

## ✅ Checklist Rápido

- [ ] Resend configurado con API key
- [ ] Variables de entorno en `.env.local`
- [ ] Probado registro localmente (email de bienvenida llega)
- [ ] Código subido a GitHub
- [ ] Deployment en Vercel
- [ ] Variables de entorno en Vercel
- [ ] Probado en producción

## 🆘 Problemas Comunes

### Email no llega:
- ✅ Verifica que `RESEND_API_KEY` está correcta
- ✅ Revisa spam folder
- ✅ Verifica logs en Resend Dashboard

### Error en build:
- ✅ Ejecuta `npm run build` localmente
- ✅ Revisa errores en terminal
- ✅ Verifica que todas las dependencias están instaladas

### Supabase errors:
- ✅ Verifica URL y keys
- ✅ Revisa que RLS policies están correctas
- ✅ Verifica que migraciones están aplicadas

## 📞 Siguiente Paso

Una vez que tengas:
1. ✅ Email funcionando
2. ✅ App en Vercel
3. ✅ Probado en producción

**¡Estás listo para invitar usuarios beta!** 🎉


# Configuración de OAuth (Google y Facebook)

Este documento explica cómo configurar el login con Google y Facebook en Mercadito Online PY.

## ⚠️ IMPORTANTE: Error "provider is not enabled"

Si ves el error `"Unsupported provider: provider is not enabled"`, significa que el proveedor OAuth no está habilitado en Supabase. **Sigue los pasos de configuración a continuación** para habilitarlo.

## 📋 Requisitos Previos

1. Tener un proyecto en Supabase
2. Tener acceso al dashboard de Supabase
3. Tener cuentas de desarrollador en Google Cloud Console y Facebook Developers

## 🔧 Configuración en Supabase

### 1. Configurar Google OAuth

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la API de Google+:
   - Ve a "APIs & Services" > "Library"
   - Busca "Google+ API" y habilítala
4. Crea credenciales OAuth 2.0:
   - Ve a "APIs & Services" > "Credentials"
   - Click en "Create Credentials" > "OAuth client ID"
   - Selecciona "Web application"
   - Agrega las siguientes URLs autorizadas:
     - **Authorized JavaScript origins:**
       - `http://localhost:3000` (para desarrollo)
       - `https://mercadito-online-py.vercel.app` (para producción)
       - Tu URL de Supabase: `https://[tu-proyecto].supabase.co`
     - **Authorized redirect URIs:**
       - `https://[tu-proyecto-id].supabase.co/auth/v1/callback`
5. Copia el **Client ID** y **Client Secret**

6. En Supabase Dashboard:
   - Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
   - Navega a **Authentication** > **Providers** en el menú lateral
   - Busca **Google** en la lista de proveedores
   - **Habilita el toggle** para activar Google
   - Ingresa el **Client ID** (obtenido de Google Cloud Console)
   - Ingresa el **Client Secret** (obtenido de Google Cloud Console)
   - **Guarda los cambios** (botón "Save" o "Update")

### 2. Configurar Facebook OAuth

1. Ve a [Facebook Developers](https://developers.facebook.com/)
2. Crea una nueva app o selecciona una existente
3. Agrega el producto "Facebook Login":
   - Ve a "Add Product" > "Facebook Login" > "Set Up"
4. Configura las URLs:
   - **Valid OAuth Redirect URIs:**
     - `https://[tu-proyecto-id].supabase.co/auth/v1/callback`
   - **Site URL:**
     - `https://mercadito-online-py.vercel.app` (para producción)
     - `http://localhost:3000` (para desarrollo)
5. Obtén el **App ID** y **App Secret** desde "Settings" > "Basic"

6. En Supabase Dashboard:
   - Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
   - Navega a **Authentication** > **Providers** en el menú lateral
   - Busca **Facebook** en la lista de proveedores
   - **Habilita el toggle** para activar Facebook
   - Ingresa el **App ID** (obtenido de Facebook Developers)
   - Ingresa el **App Secret** (obtenido de Facebook Developers)
   - **Guarda los cambios** (botón "Save" o "Update")
   
   **⚠️ NOTA:** Si no ves el toggle o los campos, asegúrate de estar en la pestaña correcta y que tu plan de Supabase soporte OAuth providers.

## 🔗 Configurar Redirect URLs en Supabase

1. En Supabase Dashboard:
   - Ve a "Authentication" > "URL Configuration"
   - Agrega las siguientes URLs en "Redirect URLs":
     - `http://localhost:3000/auth/callback` (desarrollo)
     - `https://mercadito-online-py.vercel.app/auth/callback` (producción)

## ✅ Verificación

1. **Probar en desarrollo:**
   ```bash
   npm run dev
   ```
   - Ve a `http://localhost:3000/auth/sign-in`
   - Click en "Google" o "Facebook"
   - Deberías ser redirigido al proveedor OAuth
   - Después de autenticar, serás redirigido de vuelta

2. **Verificar en producción:**
   - Asegúrate de que las URLs de producción estén configuradas correctamente
   - Prueba el login desde la URL de producción

## 🔍 Troubleshooting

### Error: "redirect_uri_mismatch"
- Verifica que las URLs en Google Cloud Console coincidan exactamente con las configuradas en Supabase
- Asegúrate de incluir `https://` y no `http://` en producción

### Error: "Invalid OAuth configuration"
- Verifica que el Client ID y Client Secret sean correctos
- Asegúrate de que los proveedores estén habilitados en Supabase

### El usuario no se crea automáticamente
- Verifica que el trigger `on_auth_user_created` esté activo en la base de datos
- Revisa los logs de Supabase para ver si hay errores

### El perfil no se actualiza con datos de OAuth
- Verifica que los permisos de OAuth soliciten los datos necesarios (email, nombre, foto)
- Revisa que la función de callback esté ejecutándose correctamente

## 📝 Notas Importantes

- Los usuarios que se registran con OAuth automáticamente obtienen el rol `buyer`
- El perfil se crea automáticamente cuando el usuario se autentica por primera vez
- Los datos de OAuth (nombre, avatar) se sincronizan automáticamente si no existen en el perfil
- Si un usuario ya tiene una cuenta con email/password y se autentica con OAuth usando el mismo email, las cuentas se pueden vincular (depende de la configuración de Supabase)

## 🔐 Seguridad

- **NUNCA** commitees los Client Secrets o App Secrets en el código
- Usa variables de entorno para configuraciones sensibles
- Mantén las URLs de redirect actualizadas y seguras
- Revisa regularmente los permisos de OAuth en Google y Facebook

## 📚 Recursos Adicionales

- [Documentación de Supabase Auth](https://supabase.com/docs/guides/auth)
- [Guía de OAuth de Google](https://developers.google.com/identity/protocols/oauth2)
- [Guía de Facebook Login](https://developers.facebook.com/docs/facebook-login/web)


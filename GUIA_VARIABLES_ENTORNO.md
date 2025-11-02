# 📝 GUÍA COMPLETA: Variables de Entorno

## 🔐 CRON_SECRET

### **¿Qué es?**
Es una clave secreta que protege tus endpoints de cron jobs para que solo Vercel pueda ejecutarlos automáticamente.

### **¿Cómo obtenerlo?**
**OPCIÓN 1: Generar automáticamente (Recomendado)**
```bash
# En PowerShell (Windows)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# En Git Bash o WSL
openssl rand -base64 32

# O usar Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**OPCIÓN 2: Generar manualmente**
Crea cualquier string aleatorio de al menos 32 caracteres, por ejemplo:
```
mi-super-secreto-cron-key-2025-mercadito-online-py-xyz
```

**OPCIÓN 3: Usar generador online**
- Visita: https://randomkeygen.com/
- Selecciona "CodeIgniter Encryption Keys" o "Secure Wifi Keys"
- Copia una clave de al menos 32 caracteres

### **Ejemplo de CRON_SECRET válido:**
```
a8f5f167f44f4964e6c998dee827110c1234567890abcdef
```

---

## 📧 RESEND_API_KEY

### **¿Qué es?**
Es la API key del servicio de emails Resend que usamos para enviar notificaciones (como las alertas de auditoría al admin).

### **¿Cómo obtenerlo?**

#### **PASO 1: Crear cuenta en Resend**
1. Visita: https://resend.com/
2. Haz clic en **"Sign Up"** o **"Get Started"**
3. Crea tu cuenta (puedes usar Google, GitHub o email)
4. Confirma tu email si es necesario

#### **PASO 2: Verificar dominio (Opcional para producción)**
- Puedes empezar con el dominio de prueba de Resend
- Para producción, verifica tu propio dominio

#### **PASO 3: Obtener API Key**
1. Una vez dentro de Resend Dashboard
2. Ve a **"API Keys"** en el menú lateral
3. Haz clic en **"Create API Key"**
4. Dale un nombre (ej: "Mercadito Online Production")
5. Selecciona los permisos: **"Sending access"**
6. Haz clic en **"Add"**
7. **⚠️ IMPORTANTE:** Copia la API Key inmediatamente (solo se muestra una vez)
   - Se verá algo como: `re_1234567890abcdefghijklmnopqrstuvwxyz`

#### **PASO 4: Obtener Email de Remitente**
- Resend te da un email de prueba: `onboarding@resend.dev`
- Para producción, verifica tu dominio y usa: `noreply@tu-dominio.com`

### **Plan Gratuito de Resend:**
- ✅ 3,000 emails/mes gratis
- ✅ 100 emails/día
- ✅ Perfecto para empezar

---

## 🚀 DÓNDE CONFIGURARLAS EN VERCEL

### **PASO 1: Ir a Vercel Dashboard**
1. Visita: https://vercel.com/
2. Inicia sesión con tu cuenta
3. Selecciona tu proyecto **"mercadito-online-py"**

### **PASO 2: Agregar Variables de Entorno**
1. En el Dashboard de tu proyecto, ve a **"Settings"**
2. En el menú lateral, haz clic en **"Environment Variables"**
3. Haz clic en **"Add New"**

### **PASO 3: Agregar CRON_SECRET**
1. **Name:** `CRON_SECRET`
2. **Value:** Pega el secret que generaste (mínimo 32 caracteres)
3. **Environment:** Selecciona:
   - ☑️ **Production**
   - ☑️ **Preview** (opcional)
   - ☑️ **Development** (opcional, solo si trabajas localmente)
4. Haz clic en **"Save"**

### **PASO 4: Agregar RESEND_API_KEY**
1. **Name:** `RESEND_API_KEY`
2. **Value:** Pega tu API key de Resend (empieza con `re_`)
3. **Environment:** Selecciona:
   - ☑️ **Production**
   - ☑️ **Preview** (opcional)
   - ☑️ **Development** (opcional)
4. Haz clic en **"Save"**

### **PASO 5: Agregar RESEND_FROM_EMAIL (Opcional pero recomendado)**
1. **Name:** `RESEND_FROM_EMAIL`
2. **Value:** 
   - Para desarrollo: `onboarding@resend.dev`
   - Para producción: `noreply@tu-dominio.com` (después de verificar dominio)
3. **Environment:** Selecciona según corresponda
4. Haz clic en **"Save"**

### **PASO 6: Redeploy**
Después de agregar las variables, Vercel debería hacer un redeploy automático. Si no:
1. Ve a **"Deployments"**
2. Haz clic en los **3 puntos** del último deployment
3. Selecciona **"Redeploy"**

---

## ✅ VERIFICAR QUE FUNCIONA

### **Verificar CRON_SECRET:**
```bash
# En PowerShell, genera un token de prueba
$secret = "tu-cron-secret-aqui"
$headers = @{ "Authorization" = "Bearer $secret" }
Invoke-WebRequest -Uri "https://tu-dominio.com/api/cron/nightly-audit" -Headers $headers -Method GET
```

### **Verificar RESEND_API_KEY:**
- Las alertas de auditoría deberían enviar emails al admin
- Verifica en Resend Dashboard → **"Emails"** que se están enviando

---

## 🔒 SEGURIDAD

### **⚠️ IMPORTANTE:**
- **NUNCA** subas estas variables a Git
- **NUNCA** las compartas públicamente
- Vercel ya las tiene en `.gitignore` automáticamente
- Si alguien obtiene tu `CRON_SECRET`, puede ejecutar tus cron jobs

### **Mejores Prácticas:**
1. ✅ Usa diferentes `CRON_SECRET` para producción y desarrollo
2. ✅ Rota tus API keys periódicamente
3. ✅ No hagas commit de archivos `.env` o `.env.local`

---

## 📋 CHECKLIST RÁPIDO

- [ ] Generar `CRON_SECRET` (32+ caracteres)
- [ ] Crear cuenta en Resend
- [ ] Obtener `RESEND_API_KEY` de Resend Dashboard
- [ ] Agregar `CRON_SECRET` en Vercel → Settings → Environment Variables
- [ ] Agregar `RESEND_API_KEY` en Vercel → Settings → Environment Variables
- [ ] (Opcional) Agregar `RESEND_FROM_EMAIL`
- [ ] Redeploy en Vercel
- [ ] Verificar que los cron jobs funcionan

---

## 🆘 TROUBLESHOOTING

### **Error: "Unauthorized" en cron jobs**
- ✅ Verifica que `CRON_SECRET` tiene exactamente el mismo valor en Vercel y en tu código
- ✅ Verifica que el header es: `Authorization: Bearer TU_SECRET`

### **Error: "Resend API error"**
- ✅ Verifica que `RESEND_API_KEY` es correcta (empieza con `re_`)
- ✅ Verifica que el email del admin existe en `profiles` con `role='admin'`
- ✅ Verifica que `RESEND_FROM_EMAIL` está configurado

### **No se reciben emails**
- ✅ Revisa la carpeta de spam
- ✅ Verifica en Resend Dashboard → Emails que se enviaron
- ✅ Verifica que el admin tiene un email válido

---

## 📞 RECURSOS ÚTILES

- **Resend Dashboard:** https://resend.com/api-keys
- **Resend Docs:** https://resend.com/docs
- **Vercel Environment Variables:** https://vercel.com/docs/projects/environment-variables
- **Generador de Secrets:** https://randomkeygen.com/

---

**¿Necesitas ayuda adicional?** Revisa los logs en Vercel Dashboard → Deployments → Functions para ver errores específicos.


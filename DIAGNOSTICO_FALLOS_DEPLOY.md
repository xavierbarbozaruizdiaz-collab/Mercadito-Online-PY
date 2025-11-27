# 🔍 Diagnóstico de Fallos de Deploy

## 📋 Información Necesaria para Diagnosticar

Para solucionar los fallos de deploy, necesito la siguiente información:

### 1. **Logs de Vercel (Crítico)**
   - **Cómo obtener:**
     1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
     2. Selecciona el proyecto `mercadito-online-py`
     3. Ve a la pestaña **"Deployments"**
     4. Haz clic en el deployment que falló (estado "Error" en rojo)
     5. Haz clic en **"View Function Logs"** o **"View Build Logs"**
     6. Copia los últimos 100-200 líneas del log

   - **Qué buscar:**
     - Mensajes de error en rojo
     - Errores de build (`npm run build`)
     - Errores de TypeScript
     - Errores de dependencias
     - Errores de Node.js version
     - Timeouts

### 2. **Logs de GitHub Actions (Si aplica)**
   - **Cómo obtener:**
     1. Ve a [GitHub Actions](https://github.com/xavierbarbozaruizdiaz-collab/Mercadito-Online-PY/actions)
     2. Selecciona el workflow que falló (ej: "Production Deployment #192")
     3. Haz clic en el job que falló
     4. Expande los pasos que tienen ❌ (error)
     5. Copia el output completo del paso que falló

   - **Qué buscar:**
     - Errores de `npm ci`
     - Errores de `npm run build`
     - Errores de TypeScript
     - Errores de ESLint
     - Errores de tests

### 3. **Captura de Pantalla del Error**
   - Captura de la pantalla de Vercel mostrando el deployment fallido
   - Captura del mensaje de error específico

### 4. **Información del Deployment Fallido**
   - **URL del deployment fallido:** (ej: `https://mercadito-online-xxxxx-barboza.vercel.app`)
   - **Commit hash:** (ej: `b675ff6`)
   - **Hora del fallo:** (ej: "hace 5 minutos")
   - **Mensaje de error específico:** (el texto exacto del error)

### 5. **Variables de Entorno en Vercel**
   - Verifica que todas estas variables estén configuradas en Vercel Dashboard:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `UPSTASH_REDIS_REST_URL`
     - `UPSTASH_REDIS_REST_TOKEN`
     - `NEXT_PUBLIC_APP_URL`
     - Cualquier otra variable que el proyecto requiera

## 🔧 Comandos para Obtener Información Localmente

### Obtener logs de un deployment específico:
```bash
npx vercel inspect <URL_DEL_DEPLOYMENT> --logs
```

### Listar deployments recientes:
```bash
npx vercel ls --prod
```

### Verificar build localmente:
```bash
npm run build
```

### Verificar linting:
```bash
npm run lint
```

### Verificar TypeScript:
```bash
npm run typecheck
```

## 📝 Checklist de Diagnóstico

- [ ] Logs de Vercel del deployment fallido
- [ ] Logs de GitHub Actions (si aplica)
- [ ] Captura de pantalla del error
- [ ] URL del deployment fallido
- [ ] Commit hash del deployment fallido
- [ ] Variables de entorno verificadas en Vercel
- [ ] Build local funciona (`npm run build`)
- [ ] Linting local funciona (`npm run lint`)

## 🎯 Próximos Pasos

Una vez que tengas esta información, podré:
1. Identificar la causa raíz del fallo
2. Proponer una solución específica
3. Aplicar la corrección
4. Verificar que el deploy funcione

---

**Nota:** Si puedes compartir los logs directamente, será más rápido diagnosticar el problema.




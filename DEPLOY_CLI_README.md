# 🚀 Guía de Deployment con CLI

## Script Automatizado

He creado un script de PowerShell que automatiza todo el proceso de deployment con Vercel CLI.

### Uso Rápido

```powershell
# Desde la raíz del proyecto
.\deploy-vercel.ps1
```

El script hará lo siguiente automáticamente:
1. ✅ Verificar si Vercel CLI está instalado (si no, lo instala)
2. ✅ Verificar autenticación (si no, te pedirá login)
3. ✅ Verificar estado de Git
4. ✅ Preguntarte si quieres deployar a Preview o Producción
5. ✅ Ejecutar el deployment con `--force` para evitar cache

---

## Uso Manual

Si prefieres hacerlo manualmente:

### 1. Instalar Vercel CLI

```powershell
npm install -g vercel
```

### 2. Autenticarse

```powershell
vercel login
```

Esto abrirá una ventana del navegador para autenticarte.

### 3. Deployar a Producción

```powershell
# Desde la raíz del proyecto
vercel --prod --force
```

### 4. Deployar a Preview (desarrollo)

```powershell
vercel --force
```

---

## Comandos Útiles

### Ver información de tu cuenta

```powershell
vercel whoami
```

### Ver deployments recientes

```powershell
vercel ls
```

### Ver logs de un deployment

```powershell
vercel logs [deployment-url]
```

### Promover un preview a producción

```powershell
vercel promote [deployment-url]
```

---

## Solución de Problemas

### Error: "vercel no se reconoce"

**Solución:** Instala Vercel CLI globalmente:
```powershell
npm install -g vercel
```

### Error: "Not authenticated"

**Solución:** Haz login:
```powershell
vercel login
```

### Error: "Build failed"

**Posibles causas:**
1. Variables de entorno faltantes en Vercel Dashboard
2. Errores de TypeScript o ESLint
3. Problemas con dependencias

**Solución:**
1. Ve a Vercel Dashboard → Settings → Environment Variables
2. Verifica que todas las variables estén configuradas
3. Revisa los build logs en Vercel Dashboard

### El deployment sigue usando código antiguo

**Solución:** Usa `--force` para evitar cache:
```powershell
vercel --prod --force
```

O elimina el cache en Vercel Dashboard:
1. Settings → General → Clear Build Cache
2. Luego haz un nuevo deployment

---

## Verificación Post-Deployment

Después del deployment, verifica:

1. ✅ **Build Logs en Vercel Dashboard**
   - Debe mostrar "Compiled successfully"
   - Debe mostrar el commit correcto

2. ✅ **Sitio en Producción**
   - Visita: https://mercadito-online-py.vercel.app
   - Verifica que los cambios aparecen

3. ✅ **Variables de Entorno**
   - Verifica que todas las variables estén configuradas
   - Especialmente: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Variables de Entorno Requeridas

Asegúrate de que estas variables estén configuradas en Vercel Dashboard:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_ENV=production`
- `NODE_ENV=production`

Para ver todas las variables requeridas, revisa: `env.example` o `env.production.example`

---

## Notas Importantes

- ⚠️ **`--force`**: Fuerza un nuevo build sin usar cache. Útil cuando hay problemas con deployments antiguos.
- ⚠️ **`--prod`**: Deploya directamente a producción (sin preview).
- ⚠️ **Sin `--prod`**: Crea un deployment de preview que puedes revisar antes de promover a producción.

---

## Alternativas

Si el CLI no funciona, puedes:

1. **Vercel Dashboard**: Crear deployment manual desde la interfaz web
2. **GitHub Actions**: Los workflows automáticos deberían deployar en cada push a `main`
3. **Vercel API**: Usar la API directamente (avanzado)

---

**¿Necesitas ayuda?** Revisa los archivos:
- `SOLUCION_VERCEL_DEPLOYMENT.md`
- `GUIA_DEPLOYMENT_MANUAL_VERCEL.md`
- `INSTRUCCIONES_DEPLOYMENT_MANUAL.md`


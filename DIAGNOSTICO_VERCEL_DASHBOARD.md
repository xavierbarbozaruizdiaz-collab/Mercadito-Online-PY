# 🔍 Guía: Revisar Logs de Build en Vercel Dashboard

## 📋 Pasos para Diagnosticar el Problema

### Paso 1: Acceder a Vercel Dashboard

1. Ve a: https://vercel.com/dashboard
2. Inicia sesión con tu cuenta
3. Selecciona el proyecto: **mercadito-online-py** o **barboza/mercadito-online-py**

### Paso 2: Ver Deployments Recientes

1. En el menú lateral, haz clic en **"Deployments"**
2. Verás una lista de todos los deployments
3. Los deployments fallidos aparecen con un ícono rojo ❌
4. Los deployments exitosos aparecen con un ícono verde ✅

### Paso 3: Revisar un Deployment Fallido

1. Haz clic en el deployment más reciente (debería ser uno que falló)
2. En la página del deployment, verás:
   - **Estado**: Failed, Building, Ready, etc.
   - **Source**: Commit, branch, autor
   - **Build Logs**: El log completo del build

### Paso 4: Analizar Build Logs

1. Haz clic en **"View Build Logs"** o desplázate hacia abajo
2. Busca las siguientes secciones:

#### ✅ Instalación de Dependencias
```
Running "install" command: `npm install`...
```
- Debe mostrar: `added XXX packages`
- Busca errores en esta sección

#### ✅ Postinstall Script
```
> mercadito-online-py@0.1.0 postinstall
> npm rebuild lightningcss --no-save || true
```
- Debe mostrar: `rebuilt dependencies successfully`
- Si falla aquí, el problema es en la instalación

#### ✅ Build
```
Running "npm run build"
> next build --webpack
```
- Busca el error específico:
  - `Error: Cannot find module '../lightningcss.linux-x64-gnu.node'`
  - Este es el error que estamos investigando

### Paso 5: Ver Detalles del Error

Cuando encuentres el error, revisa:

1. **Ruta del módulo faltante**:
   ```
   /vercel/path0/node_modules/lightningcss/node/index.js
   ```
   
2. **Archivo que intenta cargar**:
   ```
   ../lightningcss.linux-x64-gnu.node
   ```

3. **Ubicación esperada**:
   - Debería estar en: `/vercel/path0/node_modules/lightningcss/`
   - Pero el archivo `.node` no existe

### Paso 6: Verificar Variables de Entorno

1. Ve a **Settings** → **Environment Variables**
2. Verifica que todas las variables estén configuradas:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NODE_ENV=production`

### Paso 7: Revisar Configuración del Proyecto

1. Ve a **Settings** → **General**
2. Verifica:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Install Command**: `npm install` (o `npm ci`)
   - **Output Directory**: `.next`
   - **Node Version**: 20.x

### Paso 8: Revisar Cache

1. Ve a **Settings** → **General** → **Build Cache**
2. Puedes limpiar el cache si es necesario:
   - Haz clic en **"Clear Build Cache"**
   - Esto fuerza una instalación limpia en el próximo deployment

---

## 🔍 Información Específica a Buscar

### 1. Verificar si lightningcss se instaló

En los build logs, busca:
```
added 879 packages, and audited 880 packages
```

Y luego:
```
> npm rebuild lightningcss --no-save || true
rebuilt dependencies successfully
```

### 2. Verificar estructura de archivos

En los logs, deberías ver algo como:
```
Downloading 633 deployment files...
```

Esto indica qué archivos se subieron al build.

### 3. Verificar versión de Node.js

Busca:
```
Node.js version: 20.x.x
```

### 4. Verificar plataforma del build

Busca:
```
Running build in Washington, D.C., USA (East) – iad1
Build machine configuration: 4 cores, 8 GB
```

Esto te dice dónde se ejecuta el build.

---

## 📸 Capturas Útiles

Si puedes, toma capturas de pantalla de:

1. ✅ La sección de **Build Logs** donde aparece el error
2. ✅ La sección de **Install Command** donde se ejecuta `npm install`
3. ✅ La sección de **Postinstall** donde se ejecuta el rebuild
4. ✅ La configuración del proyecto en **Settings** → **General**

---

## 🎯 Qué Buscar Específicamente

### Problema Actual: lightningcss.linux-x64-gnu.node

El error dice:
```
Error: Cannot find module '../lightningcss.linux-x64-gnu.node'
```

**Lo que significa:**
- El paquete `lightningcss` se instaló, pero el binario nativo no
- El binario nativo debería estar en `node_modules/lightningcss/lightningcss.linux-x64-gnu.node`
- Pero ese archivo no existe después de la instalación

**Posibles causas:**
1. El binario no se descargó durante `npm install`
2. El binario se descargó pero no para la plataforma correcta (linux-x64-gnu)
3. Hay un problema con la instalación de binarios nativos en Vercel

---

## 🛠️ Acciones de Diagnóstico

### 1. Verificar si el archivo existe en el build

En los build logs, busca si hay algún mensaje sobre:
- `lightningcss` siendo instalado
- Binarios nativos siendo descargados
- Errores durante la descarga de binarios

### 2. Verificar versión de lightningcss

En `package-lock.json` o en los logs, verifica qué versión de `lightningcss` se instaló:
```
lightningcss@1.27.0
```

### 3. Verificar si hay warnings

Busca warnings como:
```
npm warn ...
```

Estos pueden indicar problemas durante la instalación.

---

## 📝 Reportar el Problema

Si encuentras información útil, anota:

1. ✅ **Versión de lightningcss instalada**: `1.27.0`
2. ✅ **Versión de Node.js**: `20.x.x`
3. ✅ **Plataforma del build**: `linux-x64-gnu`
4. ✅ **Error exacto**: Copia el mensaje completo
5. ✅ **Momento del error**: ¿Durante install, postinstall, o build?
6. ✅ **Warnings**: Cualquier warning relacionado

---

## 🔗 Links Útiles

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Documentación de Vercel**: https://vercel.com/docs
- **LightningCSS GitHub**: https://github.com/parcel-bundler/lightningcss
- **Tailwind CSS v4 Docs**: https://tailwindcss.com/docs

---

## 💡 Próximos Pasos Después del Diagnóstico

Una vez que tengas la información:

1. **Si el binario no se descarga**: Necesitamos forzar la descarga
2. **Si hay un error de plataforma**: Necesitamos especificar la plataforma correcta
3. **Si es un problema de versión**: Necesitamos actualizar/downgrade lightningcss
4. **Si es un problema de Vercel**: Necesitamos contactar soporte

---

**¿Necesitas ayuda para revisar algo específico?** Comparte los logs o capturas y te ayudo a interpretarlos.


# ⚙️ Configuración de Node Version en Vercel

## ⚠️ IMPORTANTE: Discrepancia Detectada

**Problema identificado:**
- `package.json` especifica: Node **22.x**
- `.nvmrc` contiene: **22**
- `.vercel/project.json` tiene: Node **20.x** ⚠️

**Impacto:**
Vercel puede estar usando Node 20.x mientras el código requiere Node 22.x, causando errores de build.

---

## ✅ Solución: Configurar Node 22.x en Vercel

### Opción 1: Desde Vercel Dashboard (Recomendado)

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona el proyecto `mercadito-online-py`
3. Ve a **Settings** → **General**
4. Busca la sección **Node.js Version**
5. Selecciona **22.x**
6. Guarda los cambios
7. Haz un nuevo deploy

**Ventaja**: Esta configuración tiene prioridad sobre `.vercel/project.json`

---

### Opción 2: Actualizar vercel.json

Ya se agregó `"nodeVersion": "22.x"` en `vercel.json`, pero Vercel Dashboard tiene prioridad.

**Nota**: Si configuras desde Dashboard, esta línea en `vercel.json` es redundante pero no causa problemas.

---

### Opción 3: Actualizar .vercel/project.json (NO RECOMENDADO)

**⚠️ NO HACER**: Este archivo se regenera automáticamente y puede sobrescribirse.

---

## 🔍 Verificación

Después de configurar Node 22.x:

1. Haz un nuevo deploy
2. En Vercel Dashboard → Deployments → Selecciona el deploy
3. Ve a la pestaña **Build Logs**
4. Verifica que diga: `Node.js version: 22.x.x`

---

## 📝 Nota sobre .vercel/project.json

El archivo `.vercel/project.json` muestra `"nodeVersion": "20.x"` porque fue creado cuando Vercel usaba Node 20.x por defecto.

**Solución**: Configurar desde Dashboard (Opción 1) para que tenga prioridad.

---

**Última actualización**: 2024






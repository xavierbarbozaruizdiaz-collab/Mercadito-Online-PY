# 🔍 GUÍA: Identificar Diferencias Visuales Entre Local y Producción

## 🎯 PROBLEMA

Enormes diferencias visuales entre el proyecto en producción y localhost.

---

## 🔧 CÓMO IDENTIFICAR LAS CAUSAS

### **Paso 1: Ejecutar Diagnóstico Automático**

```bash
npm run diagnostico:visual
```

Este script verifica:
- ✅ Configuración de Tailwind CSS
- ✅ Configuración de Next.js
- ✅ Variables CSS
- ✅ Clases dinámicas (problema común)
- ✅ Variables de entorno
- ✅ Configuración de PostCSS
- ✅ Build output

---

### **Paso 2: Extraer Clases Dinámicas**

```bash
npm run extraer:clases-dinamicas
```

Este script:
- 🔍 Busca todas las clases usadas dinámicamente en el código
- 📋 Genera un archivo `tailwind-safelist-sugerido.json`
- 💡 Sugiere qué clases agregar a `safelist` en `tailwind.config.js`

---

## 🚨 PROBLEMAS COMUNES ENCONTRADOS

### **1. Clases Dinámicas No Detectadas** (CRÍTICO)

**Problema:** Tailwind CSS no puede detectar clases generadas dinámicamente:
```tsx
// ❌ PROBLEMA: Tailwind no detecta estas clases
className={`bg-${color}-500 text-${size}`}
className={condition ? 'hidden' : 'block'}
className={cn('base-class', dynamicClass)}
```

**Solución:** Agregar clases a `safelist` en `tailwind.config.js`:
```js
module.exports = {
  safelist: [
    'bg-blue-500',
    'bg-red-500',
    'hidden',
    'block',
    // ... más clases
  ],
}
```

---

### **2. optimizeCss Eliminando Estilos** (MEDIO)

**Problema:** `optimizeCss: true` en `next.config.js` puede eliminar estilos que Tailwind no detecta.

**Solución:**
- Agregar todas las clases dinámicas a `safelist`
- O deshabilitar temporalmente `optimizeCss` para verificar

---

### **3. Dark Mode con prefers-color-scheme** (BAJO)

**Problema:** Si tienes `@media (prefers-color-scheme: dark)` en CSS, puede causar diferencias según el sistema.

**Solución:** Usar `darkMode: 'class'` en Tailwind y controlar manualmente.

---

### **4. Caché de Vercel/Navegador** (BAJO)

**Problema:** CSS antiguo en caché.

**Solución:**
- Limpiar caché de Vercel
- Hard refresh en navegador (Ctrl+Shift+R)
- Verificar headers de caché

---

## 📋 CHECKLIST DE VERIFICACIÓN

### **Configuración**

- [ ] `tailwind.config.js` tiene `content` paths correctos
- [ ] `safelist` incluye todas las clases dinámicas
- [ ] `postcss.config.mjs` tiene `@tailwindcss/postcss`
- [ ] `globals.css` importa Tailwind: `@import "tailwindcss"`
- [ ] `NEXT_PUBLIC_APP_ENV=development` en local

### **Build**

- [ ] Ejecutar `npm run build` localmente
- [ ] Comparar tamaño de CSS generado (`.next/static/css/`)
- [ ] Verificar que todas las clases estén en el CSS generado

### **Producción**

- [ ] Verificar Network tab en DevTools (CSS se carga?)
- [ ] Revisar consola por errores de CSS
- [ ] Comparar HTML generado (clases presentes?)
- [ ] Verificar que no haya errores 404 de CSS

---

## 🔍 MÉTODOS MANUALES DE DIAGNÓSTICO

### **1. Inspeccionar CSS Generado**

```bash
# Local
npm run build
cat .next/static/css/*.css | grep "bg-blue-500"

# Producción
# Descargar CSS de Network tab y buscar clases
```

### **2. Comparar HTML Generado**

```bash
# Local
curl http://localhost:3000 > local.html

# Producción
curl https://mercadito-online-py.vercel.app > prod.html

# Comparar clases en ambos archivos
```

### **3. Verificar Variables CSS**

```bash
# En DevTools Console
getComputedStyle(document.documentElement).getPropertyValue('--primary')
```

### **4. Verificar Clases en Runtime**

```javascript
// En DevTools Console
document.querySelectorAll('[class*="bg-"]').forEach(el => {
  console.log(el.className);
});
```

---

## 🛠️ SOLUCIONES PASO A PASO

### **Solución 1: Agregar Clases a Safelist**

1. Ejecutar `npm run extraer:clases-dinamicas`
2. Revisar `tailwind-safelist-sugerido.json`
3. Agregar clases necesarias a `tailwind.config.js`:
```js
safelist: [
  ...existingClasses,
  // Agregar clases del archivo sugerido
],
```
4. Rebuild: `npm run build`

---

### **Solución 2: Usar Patrones en Safelist**

Para clases con patrones dinámicos:
```js
safelist: [
  {
    pattern: /bg-(blue|red|green)-(500|600|700)/,
  },
  {
    pattern: /text-(sm|md|lg|xl)/,
  },
]
```

---

### **Solución 3: Deshabilitar optimizeCss Temporalmente**

En `next.config.js`:
```js
experimental: {
  optimizeCss: false, // Temporalmente deshabilitar
}
```

---

## 📊 COMPARACIÓN LOCAL vs PRODUCCIÓN

### **Checklist de Comparación:**

1. **CSS Generado:**
   - [ ] Tamaño del archivo CSS (similar?)
   - [ ] Clases presentes en ambos
   - [ ] Variables CSS definidas igual

2. **HTML:**
   - [ ] Mismas clases en elementos
   - [ ] Mismos atributos de estilo inline
   - [ ] Mismas fuentes cargadas

3. **JavaScript:**
   - [ ] Mismos componentes renderizados
   - [ ] Mismas condiciones evaluadas
   - [ ] Mismos datos de la API

4. **Network:**
   - [ ] CSS se carga (200 OK?)
   - [ ] Fuentes se cargan?
   - [ ] Imágenes se cargan?
   - [ ] No hay errores 404

---

## 🎯 PRÓXIMOS PASOS DESPUÉS DEL DIAGNÓSTICO

1. ✅ Ejecutar `npm run diagnostico:visual`
2. ✅ Ejecutar `npm run extraer:clases-dinamicas`
3. ✅ Agregar clases a `safelist`
4. ✅ Rebuild local: `npm run build`
5. ✅ Comparar CSS generado
6. ✅ Push a producción
7. ✅ Verificar en producción

---

## 📝 NOTAS IMPORTANTES

- **Tailwind CSS purga clases no usadas en producción**
- **Las clases dinámicas NO se detectan automáticamente**
- **`safelist` fuerza a Tailwind a incluir clases específicas**
- **`optimizeCss` puede eliminar estilos no detectados**
- **Caché puede mostrar versiones antiguas**

---

**Última actualización:** $(date)


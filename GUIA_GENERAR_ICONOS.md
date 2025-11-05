# 🎨 Guía para Generar Iconos PWA

## 📋 Pasos para Generar los Iconos

### 1. Preparar la Imagen Base

Coloca tu imagen base (logo) en la siguiente ubicación:
```
public/logo-base.png
```

**Especificaciones recomendadas:**
- **Formato**: PNG, JPG o SVG
- **Tamaño mínimo**: 512x512 píxeles (recomendado: 1024x1024 o superior)
- **Fondo**: La imagen debe tener fondo sólido o transparente
- **Contenido**: Tu logo con el martillo de juez y la flecha

### 2. Generar los Iconos

Ejecuta el siguiente comando en la terminal:

```bash
npm run generate:icons
```

O si prefieres ejecutar directamente:

```bash
node scripts/generate-icons.js
```

### 3. Verificar los Iconos Generados

Después de ejecutar el script, encontrarás todos los iconos en:
```
public/icons/
```

**Iconos generados:**
- ✅ `icon-72x72.png` hasta `icon-512x512.png` (8 tamaños)
- ✅ `favicon-16x16.png` y `favicon-32x32.png` (favicons)
- ✅ `apple-touch-icon-152x152.png`, `167x167.png`, `180x180.png` (iOS)

### 4. Verificar que Funcionan

Una vez generados los iconos:
1. Reinicia el servidor de desarrollo (`npm run dev`)
2. Abre la aplicación en el navegador
3. Verifica en DevTools → Application → Manifest que los iconos se carguen correctamente

## 🔧 Solución de Problemas

### Error: "No se encontró la imagen base"
- Verifica que la imagen esté en `public/logo-base.png`
- Asegúrate de que el archivo tenga ese nombre exacto

### Los iconos se ven borrosos
- Usa una imagen base de mayor resolución (1024x1024 o superior)
- Asegúrate de que la imagen base sea de alta calidad

### Los iconos no se actualizan en el navegador
- Limpia la caché del navegador (Ctrl+Shift+Delete)
- Reinicia el servidor de desarrollo
- En modo producción, puede requerir un nuevo deployment

## 📝 Notas

- El script usa `sharp` para redimensionar las imágenes
- Los iconos mantendrán el fondo negro de la imagen base
- Todos los iconos se generan en formato PNG con alta calidad


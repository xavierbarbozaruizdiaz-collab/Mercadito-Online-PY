# 🎨 Instrucciones para Generar Iconos desde SVG

## Archivos SVG Creados

1. **`public/logo-mercadito.svg`** - Logo principal (1024×1024)
2. **`public/favicon.svg`** - Favicon optimizado (1024×1024)

## 📋 Pasos para Generar los Formatos PNG

### Opción 1: Usando Inkscape (Recomendado - Gratis)

#### Instalar Inkscape
- Descarga desde: https://inkscape.org/release/
- Instala Inkscape

#### Generar Iconos desde la Terminal/CMD:

```bash
# Navegar a la carpeta public
cd public

# Generar favicon.ico (16×16 y 32×32)
# Nota: Inkscape puede exportar a PNG, luego usar ImageMagick para .ico
inkscape --export-filename=favicon-16.png --export-width=16 --export-height=16 favicon.svg
inkscape --export-filename=favicon-32.png --export-width=32 --export-height=32 favicon.svg

# Generar iconos PWA
inkscape --export-filename=icons/icon-192x192.png --export-width=192 --export-height=192 logo-mercadito.svg
inkscape --export-filename=icons/icon-512x512.png --export-width=512 --export-height=512 logo-mercadito.svg

# Generar Apple Touch Icon
inkscape --export-filename=icons/apple-touch-icon.png --export-width=180 --export-height=180 logo-mercadito.svg

# Generar Maskable Icons (con padding para Android)
# Para maskable, necesitas agregar padding/margen de seguridad
# Exporta a 192 y 512, pero el contenido debe estar en el centro con ~20% de margen
inkscape --export-filename=icons/maskable-icon-192x192.png --export-width=192 --export-height=192 logo-mercadito.svg
inkscape --export-filename=icons/maskable-icon-512x512.png --export-width=512 --export-height=512 logo-mercadito.svg

# Convertir PNGs a favicon.ico usando ImageMagick (opcional)
# Si tienes ImageMagick instalado:
magick convert favicon-16.png favicon-32.png favicon.ico
```

### Opción 2: Usando Figma (Online)

1. Abre Figma (https://figma.com)
2. Crea un nuevo archivo
3. Importa `logo-mercadito.svg` o `favicon.svg`
4. Selecciona el elemento
5. En el panel derecho, haz clic en "Export"
6. Selecciona formato PNG y el tamaño deseado
7. Exporta cada tamaño necesario

### Opción 3: Usando Node.js y sharp (Automático)

Crea un script `scripts/generate-icons.js`:

```javascript
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [
  { name: 'favicon-16x16.png', size: 16, input: 'favicon.svg' },
  { name: 'favicon-32x32.png', size: 32, input: 'favicon.svg' },
  { name: 'icon-192x192.png', size: 192, input: 'logo-mercadito.svg' },
  { name: 'icon-512x512.png', size: 512, input: 'logo-mercadito.svg' },
  { name: 'apple-touch-icon.png', size: 180, input: 'logo-mercadito.svg' },
  { name: 'maskable-icon-192x192.png', size: 192, input: 'logo-mercadito.svg' },
  { name: 'maskable-icon-512x512.png', size: 512, input: 'logo-mercadito.svg' },
];

async function generateIcons() {
  const publicDir = path.join(__dirname, '..', 'public');
  const iconsDir = path.join(publicDir, 'icons');
  
  // Crear carpeta icons si no existe
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }
  
  for (const { name, size, input } of sizes) {
    const inputPath = path.join(publicDir, input);
    const outputPath = name.startsWith('favicon') 
      ? path.join(publicDir, name)
      : path.join(iconsDir, name);
    
    try {
      await sharp(inputPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generado: ${name}`);
    } catch (error) {
      console.error(`❌ Error generando ${name}:`, error);
    }
  }
  
  console.log('\n🎉 ¡Todos los iconos generados!');
}

generateIcons();
```

Luego ejecuta:
```bash
npm install sharp --save-dev
node scripts/generate-icons.js
```

### Opción 4: Usando herramientas online

1. **SVG to PNG**: https://svgtopng.com/
2. **CloudConvert**: https://cloudconvert.com/svg-to-png
3. **Convertio**: https://convertio.co/svg-png/

Sube el SVG, selecciona el tamaño y descarga.

## 📱 Generar favicon.ico

El formato `.ico` puede contener múltiples tamaños. Usa:

1. **ImageMagick** (recomendado):
```bash
magick convert favicon-16x16.png favicon-32x32.png favicon.ico
```

2. **Online**: https://www.favicon-generator.org/
   - Sube `favicon.svg` o `favicon-16x16.png`
   - Descarga el `favicon.ico` generado

3. **RealFaviconGenerator**: https://realfavicongenerator.net/
   - Sube `favicon.svg`
   - Genera todos los formatos automáticamente

## 🎯 Maskable Icons (Android)

Los maskable icons necesitan un **margen de seguridad del 20%** alrededor del contenido importante.

Para crear versiones maskable:

1. Abre el SVG en Inkscape/Figma
2. Agrega un padding del 20% alrededor del diseño
3. Asegúrate de que el contenido importante esté en el centro
4. Exporta a 192×192 y 512×512

O usa el mismo SVG pero con un viewBox ajustado que incluya padding.

## ✅ Checklist de Archivos Necesarios

- [ ] `public/favicon.ico` (16×16 y 32×32)
- [ ] `public/icons/favicon-16x16.png`
- [ ] `public/icons/favicon-32x32.png`
- [ ] `public/icons/icon-192x192.png`
- [ ] `public/icons/icon-512x512.png`
- [ ] `public/icons/apple-touch-icon.png` (180×180)
- [ ] `public/icons/maskable-icon-192x192.png` (opcional pero recomendado)
- [ ] `public/icons/maskable-icon-512x512.png` (opcional pero recomendado)

## 🔧 Configuración en Next.js

Los iconos ya están configurados en `src/app/layout.tsx`. Solo necesitas:

1. Generar los archivos PNG según las instrucciones arriba
2. Colocarlos en las carpetas correctas
3. El sistema los detectará automáticamente














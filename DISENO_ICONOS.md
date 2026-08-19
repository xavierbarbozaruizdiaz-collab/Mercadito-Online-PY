# 🎨 Diseño de Iconos - Mercadito Online PY

## 📐 Concepto de Diseño

### Elementos Visuales
- **Carrito de compras**: Elemento principal, reconocible y universal
- **Pin de ubicación**: Representa Paraguay y la ubicación/localización
- **Productos decorativos**: Pequeños círculos y formas dentro del carrito para dar vida
- **Ruedas del carrito**: Agregan profundidad y movimiento

### Paleta de Colores
- **Azul Principal (#1D4ED8)**: Carrito, ruedas, círculo interno del pin
- **Amarillo Acento (#FACC15)**: Pin de ubicación, productos decorativos
- **Blanco (#FFFFFF)**: Detalles, puntos centrales, ruedas internas

### Estilo
- **Flat Design**: Sin sombras complejas, formas planas
- **Bordes Redondeados**: rx="30-35" para suavidad
- **Formas Simples**: Optimizado para reconocimiento en 16×16px
- **Alto Contraste**: Colores vibrantes para mejor visibilidad

## 📁 Archivos SVG Creados

### 1. `public/logo-mercadito.svg`
- **Tamaño**: 1024×1024 viewBox
- **Uso**: Logo principal, base para todos los iconos grandes
- **Características**: Diseño completo con todos los detalles

### 2. `public/favicon.svg`
- **Tamaño**: 1024×1024 viewBox  
- **Uso**: Favicon del navegador, base para iconos pequeños
- **Características**: Versión simplificada, elementos más gruesos para legibilidad en 16×16

## 🔧 Generación de Formatos PNG

### Opción Recomendada: Script Automático

```bash
# Instalar sharp (si no está instalado)
npm install sharp --save-dev

# Ejecutar script de generación
node scripts/generate-icons.mjs
```

Este script generará automáticamente todos los iconos necesarios.

### Opción Manual: Inkscape

```bash
# Navegar a public
cd public

# Generar cada tamaño
inkscape --export-filename=icons/icon-192x192.png --export-width=192 --export-height=192 logo-mercadito.svg
inkscape --export-filename=icons/icon-512x512.png --export-width=512 --export-height=512 logo-mercadito.svg
# ... repetir para cada tamaño
```

### Opción Online: RealFaviconGenerator

1. Ve a: https://realfavicongenerator.net/
2. Sube `public/favicon.svg`
3. Configura los tamaños necesarios
4. Descarga el paquete completo
5. Extrae los archivos a `public/icons/`

## 📱 Formatos Requeridos

### Favicons
- `public/icons/favicon-16x16.png` - Favicon pequeño
- `public/icons/favicon-32x32.png` - Favicon estándar
- `public/favicon.ico` - Multi-tamaño (16×16 + 32×32)

### PWA Icons
- `public/icons/icon-192x192.png` - Android Chrome (mínimo)
- `public/icons/icon-512x512.png` - Android Chrome (recomendado)
- `public/icons/maskable-icon-192x192.png` - Android maskable
- `public/icons/maskable-icon-512x512.png` - Android maskable

### Apple Icons
- `public/icons/apple-touch-icon.png` - 180×180 (iPhone)
- `public/icons/apple-touch-icon-152x152.png` - iPad
- `public/icons/apple-touch-icon-167x167.png` - iPad Pro
- `public/icons/apple-touch-icon-180x180.png` - iPhone

## 🎯 Maskable Icons (Android)

Los maskable icons necesitan un **margen de seguridad del 20%** alrededor del contenido importante.

**Características:**
- El contenido importante debe estar en el centro 60% del icono
- Los bordes exteriores (20% en cada lado) pueden ser cortados por Android
- Nuestro diseño ya está centrado, pero asegúrate de que el pin y carrito estén bien centrados

**Generación:**
- Usa el mismo SVG base
- El script automático ya maneja esto correctamente
- O exporta con padding manual en Inkscape/Figma

## ⚙️ Configuración Next.js

### 1. Actualizar `src/app/layout.tsx`

Los iconos ya están configurados en el metadata. Solo asegúrate de que los archivos existan:

```typescript
icons: {
  icon: [
    { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
  ],
  apple: [
    { url: '/icons/apple-touch-icon-180x180.png', sizes: '180x180', type: 'image/png' },
  ],
},
```

### 2. Actualizar `src/app/manifest.ts`

El manifest ya está configurado. Solo verifica que los paths coincidan:

```typescript
icons: [
  {
    src: '/icons/icon-192x192.png',
    sizes: '192x192',
    type: 'image/png',
    purpose: 'any',
  },
  {
    src: '/icons/icon-512x512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'any',
  },
  // Maskable icons
  {
    src: '/icons/maskable-icon-192x192.png',
    sizes: '192x192',
    type: 'image/png',
    purpose: 'maskable',
  },
  {
    src: '/icons/maskable-icon-512x512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'maskable',
  },
]
```

### 3. Agregar favicon.ico al HTML

En `src/app/layout.tsx`, dentro del `<head>`:

```tsx
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

## ✅ Checklist de Implementación

- [x] SVG base creado (`logo-mercadito.svg`)
- [x] SVG favicon creado (`favicon.svg`)
- [ ] Generar PNGs desde SVG (usar script o herramienta)
- [ ] Crear `favicon.ico` (16×16 + 32×32)
- [ ] Colocar todos los PNGs en `public/icons/`
- [ ] Verificar que el manifest.ts apunte a los archivos correctos
- [ ] Probar en navegador (favicon visible)
- [ ] Probar instalación PWA (icono visible)
- [ ] Probar en iOS (Apple touch icon)

## 🎨 Mejoras Futuras (Opcional)

- Versión monocromática para modo oscuro
- Versión con texto "Mercadito" para header grande
- Animación SVG para loading states
- Variantes de color para diferentes secciones














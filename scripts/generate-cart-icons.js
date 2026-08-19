// ============================================
// GENERADOR DE ICONOS DE CARRITO DE COMPRAS
// Genera todos los iconos necesarios para favicon y PWA
// ============================================

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// SVG de carrito de compras (diseño moderno 2025)
const cartIconSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Fondo circular -->
  <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="url(#cartGradient)" stroke="#1e40af" stroke-width="2"/>
  
  <!-- Carrito de compras -->
  <g transform="translate(${size/2}, ${size/2}) scale(${size/100})">
    <!-- Base del carrito -->
    <path d="M-25,15 L-25,35 L25,35 L25,15 L20,15 L20,5 L-20,5 L-20,15 Z" 
          fill="white" stroke="none" opacity="0.95"/>
    
    <!-- Ruedas del carrito -->
    <circle cx="-15" cy="40" r="5" fill="white" opacity="0.95"/>
    <circle cx="15" cy="40" r="5" fill="white" opacity="0.95"/>
    
    <!-- Asa del carrito -->
    <path d="M-20,5 Q-20,-5 0,-5 Q20,-5 20,5" 
          fill="none" stroke="white" stroke-width="3" stroke-linecap="round" opacity="0.95"/>
    
    <!-- Productos dentro del carrito -->
    <circle cx="-10" cy="20" r="4" fill="#fbbf24" opacity="0.9"/>
    <circle cx="5" cy="18" r="3" fill="#f59e0b" opacity="0.9"/>
    <rect x="-5" y="22" width="8" height="6" rx="1" fill="#10b981" opacity="0.9"/>
  </g>
</svg>
`;

// Tamaños requeridos
const sizes = {
  favicon: [16, 32],
  pwa: [72, 96, 128, 144, 152, 192, 384, 512],
  apple: [152, 167, 180]
};

// Función para generar PNG desde SVG
async function generateIcon(size, filename) {
  const svg = cartIconSVG(size);
  const iconsDir = path.join(__dirname, '..', 'public', 'icons');
  
  // Asegurar que el directorio existe
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }
  
  const filePath = path.join(iconsDir, filename);
  
  try {
    await sharp(Buffer.from(svg))
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(filePath);
    
    console.log(`✅ Generado: ${filename} (${size}x${size})`);
  } catch (error) {
    console.error(`❌ Error generando ${filename}:`, error.message);
  }
}

// Función principal
async function generateAllIcons() {
  console.log('🛒 Generando iconos de carrito de compras...\n');

  // Favicons
  console.log('📌 Favicons:');
  for (const size of sizes.favicon) {
    await generateIcon(size, `favicon-${size}x${size}.png`);
  }

  // Iconos PWA
  console.log('\n📱 Iconos PWA:');
  for (const size of sizes.pwa) {
    await generateIcon(size, `icon-${size}x${size}.png`);
  }

  // Iconos Apple
  console.log('\n🍎 Iconos Apple:');
  for (const size of sizes.apple) {
    await generateIcon(size, `apple-touch-icon-${size}x${size}.png`);
  }

  // También generar favicon.ico (usando el tamaño 32x32)
  console.log('\n📄 Generando favicon.ico:');
  try {
    const iconsDir = path.join(__dirname, '..', 'public', 'icons');
    const favicon32Path = path.join(iconsDir, 'favicon-32x32.png');
    const faviconIcoPath = path.join(__dirname, '..', 'public', 'favicon.ico');
    
    if (fs.existsSync(favicon32Path)) {
      await sharp(favicon32Path)
        .resize(32, 32)
        .toFormat('ico')
        .toFile(faviconIcoPath);
      console.log('✅ Generado: favicon.ico');
    }
  } catch (error) {
    console.error('⚠️  No se pudo generar favicon.ico:', error.message);
  }

  console.log('\n✨ ¡Todos los iconos generados exitosamente!');
  console.log('📁 Archivos guardados en: public/icons/');
}

// Ejecutar
generateAllIcons().catch(console.error);

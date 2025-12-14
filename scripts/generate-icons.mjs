#!/usr/bin/env node
/**
 * Script para generar todos los iconos PWA desde SVG
 * Usa sharp para convertir SVG a PNG en múltiples tamaños
 * 
 * Uso: node scripts/generate-icons.mjs
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const iconsDir = path.join(publicDir, 'icons');

// Configuración de iconos a generar
const iconConfigs = [
  // Favicons
  { name: 'favicon-16x16.png', size: 16, input: 'favicon.svg', outputDir: 'icons' },
  { name: 'favicon-32x32.png', size: 32, input: 'favicon.svg', outputDir: 'icons' },
  
  // Iconos PWA principales
  { name: 'icon-72x72.png', size: 72, input: 'logo-mercadito.svg', outputDir: 'icons' },
  { name: 'icon-96x96.png', size: 96, input: 'logo-mercadito.svg', outputDir: 'icons' },
  { name: 'icon-128x128.png', size: 128, input: 'logo-mercadito.svg', outputDir: 'icons' },
  { name: 'icon-144x144.png', size: 144, input: 'logo-mercadito.svg', outputDir: 'icons' },
  { name: 'icon-152x152.png', size: 152, input: 'logo-mercadito.svg', outputDir: 'icons' },
  { name: 'icon-192x192.png', size: 192, input: 'logo-mercadito.svg', outputDir: 'icons' },
  { name: 'icon-384x384.png', size: 384, input: 'logo-mercadito.svg', outputDir: 'icons' },
  { name: 'icon-512x512.png', size: 512, input: 'logo-mercadito.svg', outputDir: 'icons' },
  
  // Apple Touch Icons
  { name: 'apple-touch-icon-152x152.png', size: 152, input: 'logo-mercadito.svg', outputDir: 'icons' },
  { name: 'apple-touch-icon-167x167.png', size: 167, input: 'logo-mercadito.svg', outputDir: 'icons' },
  { name: 'apple-touch-icon-180x180.png', size: 180, input: 'logo-mercadito.svg', outputDir: 'icons' },
  { name: 'apple-touch-icon.png', size: 180, input: 'logo-mercadito.svg', outputDir: 'icons' },
  
  // Maskable Icons (con padding del 20% para Android)
  { name: 'maskable-icon-192x192.png', size: 192, input: 'logo-mercadito.svg', outputDir: 'icons', maskable: true },
  { name: 'maskable-icon-512x512.png', size: 512, input: 'logo-mercadito.svg', outputDir: 'icons', maskable: true },
];

// Crear carpeta icons si no existe
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
  console.log('📁 Carpeta icons creada');
}

async function generateIcon(config) {
  const { name, size, input, outputDir, maskable } = config;
  
  const inputPath = path.join(publicDir, input);
  const outputPath = path.join(publicDir, outputDir, name);
  
  // Verificar que el archivo SVG existe
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ No se encontró: ${input}`);
    return false;
  }
  
  try {
    let image = sharp(inputPath);
    
    // Para maskable icons, agregar padding del 20%
    if (maskable) {
      // El SVG ya tiene viewBox centrado, solo necesitamos redimensionar
      // Sharp automáticamente mantiene el aspecto y centra el contenido
      image = image.resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      });
    } else {
      image = image.resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      });
    }
    
    await image.png().toFile(outputPath);
    console.log(`✅ ${name} (${size}×${size})`);
    return true;
  } catch (error) {
    console.error(`❌ Error generando ${name}:`, error.message);
    return false;
  }
}

async function generateAllIcons() {
  console.log('🎨 Generando iconos desde SVG...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const config of iconConfigs) {
    const success = await generateIcon(config);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log(`\n📊 Resumen:`);
  console.log(`   ✅ Generados: ${successCount}`);
  console.log(`   ❌ Fallidos: ${failCount}`);
  
  if (failCount === 0) {
    console.log('\n🎉 ¡Todos los iconos generados exitosamente!');
    console.log('\n📝 Próximos pasos:');
    console.log('   1. Genera favicon.ico manualmente usando ImageMagick o herramienta online');
    console.log('   2. Los iconos ya están listos para usar en la PWA');
    console.log('   3. Verifica que los archivos estén en public/icons/');
  } else {
    console.log('\n⚠️  Algunos iconos fallaron. Revisa los errores arriba.');
  }
}

// Ejecutar
generateAllIcons().catch(console.error);














#!/usr/bin/env node
/**
 * Script para generar favicon.ico desde PNGs
 * Usa sharp para crear un archivo ICO con múltiples tamaños
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

async function generateFaviconIco() {
  try {
    const favicon16 = path.join(iconsDir, 'favicon-16x16.png');
    const favicon32 = path.join(iconsDir, 'favicon-32x32.png');
    const outputPath = path.join(publicDir, 'favicon.ico');

    // Verificar que los archivos existan
    if (!fs.existsSync(favicon16) || !fs.existsSync(favicon32)) {
      console.error('❌ No se encontraron los archivos PNG necesarios');
      return;
    }

    // Sharp no soporta ICO directamente, pero podemos crear un PNG simple
    // Para un verdadero ICO multi-resolución, necesitarías una librería especializada
    // Por ahora, creamos un PNG de 32x32 como favicon.ico (los navegadores lo aceptan)
    await sharp(favicon32)
      .resize(32, 32)
      .png()
      .toFile(outputPath);

    console.log('✅ favicon.ico generado (formato PNG compatible)');
    console.log('📝 Nota: Para un ICO verdadero multi-resolución, usa una herramienta online como:');
    console.log('   https://www.favicon-generator.org/');
    console.log('   https://realfavicongenerator.net/');
  } catch (error) {
    console.error('❌ Error generando favicon.ico:', error.message);
  }
}

generateFaviconIco();














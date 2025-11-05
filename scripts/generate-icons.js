const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Colores y configuración
const BACKGROUND_COLOR = '#000000'; // Fondo negro como en la imagen base
const ICON_SIZES = [
  72, 96, 128, 144, 152, 192, 384, 512
];

// Rutas
const BASE_IMAGE_PATH = path.join(__dirname, '../public/logo-base.png');
const OUTPUT_DIR = path.join(__dirname, '../public/icons');

// Crear directorio de salida si no existe
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function generateIcons() {
  try {
    // Verificar que la imagen base existe
    if (!fs.existsSync(BASE_IMAGE_PATH)) {
      console.error(`❌ Error: No se encontró la imagen base en: ${BASE_IMAGE_PATH}`);
      console.log(`\n📋 Por favor, coloca tu imagen base (logo) en:`);
      console.log(`   ${BASE_IMAGE_PATH}`);
      console.log(`\n💡 La imagen debe ser PNG, JPG o SVG con dimensiones recomendadas de 512x512 o superior.`);
      process.exit(1);
    }

    console.log('🎨 Generando iconos PWA...\n');
    console.log(`📁 Imagen base: ${BASE_IMAGE_PATH}`);
    console.log(`📁 Directorio de salida: ${OUTPUT_DIR}\n`);

    // Obtener información de la imagen base
    const metadata = await sharp(BASE_IMAGE_PATH).metadata();
    console.log(`📐 Dimensiones originales: ${metadata.width}x${metadata.height}`);
    console.log(`🎨 Formato: ${metadata.format}\n`);

    // Generar cada tamaño de icono
    for (const size of ICON_SIZES) {
      const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);
      
      await sharp(BASE_IMAGE_PATH)
        .resize(size, size, {
          fit: 'contain',
          background: BACKGROUND_COLOR,
        })
        .png({
          quality: 100,
          compressionLevel: 9,
        })
        .toFile(outputPath);

      console.log(`✅ Generado: icon-${size}x${size}.png`);
    }

    // Generar favicons
    console.log('\n📌 Generando favicons...');
    for (const size of [16, 32]) {
      const outputPath = path.join(OUTPUT_DIR, `favicon-${size}x${size}.png`);
      
      await sharp(BASE_IMAGE_PATH)
        .resize(size, size, {
          fit: 'contain',
          background: BACKGROUND_COLOR,
        })
        .png({
          quality: 100,
          compressionLevel: 9,
        })
        .toFile(outputPath);

      console.log(`✅ Generado: favicon-${size}x${size}.png`);
    }

    // Generar iconos Apple
    console.log('\n🍎 Generando iconos Apple...');
    const appleSizes = [152, 167, 180];
    for (const size of appleSizes) {
      const outputPath = path.join(OUTPUT_DIR, `apple-touch-icon-${size}x${size}.png`);
      
      await sharp(BASE_IMAGE_PATH)
        .resize(size, size, {
          fit: 'contain',
          background: BACKGROUND_COLOR,
        })
        .png({
          quality: 100,
          compressionLevel: 9,
        })
        .toFile(outputPath);

      console.log(`✅ Generado: apple-touch-icon-${size}x${size}.png`);
    }

    console.log('\n🎉 ¡Iconos generados exitosamente!');
    console.log(`\n📁 Ubicación: ${OUTPUT_DIR}`);
    console.log(`\n✅ Total de iconos generados: ${ICON_SIZES.length + 2 + appleSizes.length}`);

  } catch (error) {
    console.error('❌ Error al generar iconos:', error.message);
    if (error.message.includes('Input file is missing')) {
      console.error(`\n💡 Verifica que la imagen base esté en: ${BASE_IMAGE_PATH}`);
    }
    process.exit(1);
  }
}

// Ejecutar
generateIcons();


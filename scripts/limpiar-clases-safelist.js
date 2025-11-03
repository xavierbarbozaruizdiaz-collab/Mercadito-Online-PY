#!/usr/bin/env node

/**
 * Limpia y optimiza las clases para safelist
 */

const fs = require('fs');
const path = require('path');

const inputPath = path.join(process.cwd(), 'tailwind-safelist-sugerido.json');
const outputPath = path.join(process.cwd(), 'tailwind-safelist-limpio.json');

if (!fs.existsSync(inputPath)) {
  console.error('❌ tailwind-safelist-sugerido.json no encontrado');
  console.error('   Ejecuta primero: npm run extraer:clases-dinamicas');
  process.exit(1);
}

const clases = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

// Limpiar clases: eliminar comillas extra, caracteres inválidos, etc.
const clasesLimpias = new Set();

clases.forEach(clase => {
  // Limpiar la clase
  let claseLimpia = clase
    .replace(/'/g, '') // Eliminar comillas simples
    .replace(/`/g, '') // Eliminar backticks
    .replace(/}/g, '') // Eliminar llaves
    .replace(/\s+/g, '') // Eliminar espacios
    .trim();
  
  // Solo agregar si es una clase válida de Tailwind
  if (claseLimpia && 
      (claseLimpia.match(/^[a-z-]+-/) || // bg-blue-500, text-sm, etc.
       claseLimpia.match(/^(flex|grid|hidden|block|absolute|relative|fixed|sticky)/) || // Utilidades de layout
       claseLimpia.match(/^(hover|focus|active|disabled|dark):/) || // Variantes
       claseLimpia.match(/^\[.*\]$/) || // Clases arbitrarias [bg-blue-500]
       claseLimpia.match(/^rounded|^shadow|^border$/))) { // Utilidades comunes
    clasesLimpias.add(claseLimpia);
  }
});

const clasesOrdenadas = Array.from(clasesLimpias).sort();

console.log(`✅ Clases limpiadas: ${clasesOrdenadas.length} (de ${clases.length} originales)`);
console.log(`   Eliminadas: ${clases.length - clasesOrdenadas.length} clases inválidas\n`);

// Guardar archivo limpio
fs.writeFileSync(outputPath, JSON.stringify(clasesOrdenadas, null, 2));
console.log(`💾 Clases limpias guardadas en: ${outputPath}\n`);

// Mostrar algunas clases como ejemplo
console.log('📋 Ejemplo de clases limpias (primeras 20):');
clasesOrdenadas.slice(0, 20).forEach(clase => console.log(`   - ${clase}`));
console.log('');

console.log('✅ Limpieza completada');


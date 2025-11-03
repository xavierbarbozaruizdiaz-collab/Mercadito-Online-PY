#!/usr/bin/env node

/**
 * ============================================
 * EXTRACTOR DE CLASES DINÁMICAS
 * Extrae clases usadas dinámicamente para agregar a safelist
 * ============================================
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(process.cwd(), 'src');
const dynamicClasses = new Set();
const templateLiteralClasses = new Set();
const conditionalClasses = new Set();

// Patrones para detectar clases dinámicas
const patterns = {
  // Template literals: className={`${variable} text-blue-500`}
  templateLiteral: /className\s*=\s*\{`([^`]+)`\}/g,
  
  // Concatenación: className={'prefix-' + variable + ' suffix'}
  concatenation: /className\s*=\s*\{['"]([^'"]+)['"]\s*\+\s*[^}]+\}/g,
  
  // Ternarios: className={condition ? 'class1' : 'class2'}
  ternary: /className\s*=\s*\{[^}]*\?\s*['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]/g,
  
  // clsx/cn calls: className={cn('base', condition && 'conditional')}
  clsx: /className\s*=\s*\{[^}]*['"]([^'"]+)['"]/g,
};

// Extraer clases de un string
function extractClasses(str) {
  if (!str) return [];
  
  // Dividir por espacios y filtrar clases válidas de Tailwind
  return str.split(/\s+/).filter(cls => {
    // Filtrar solo clases que parecen ser de Tailwind
    return cls && (
      cls.match(/^[a-z]+-[0-9]+/) || // bg-500, text-600
      cls.match(/^[a-z]+-\[/) || // bg-[#fff]
      cls.match(/^(hover|focus|active|disabled|dark):[a-z-]+/) || // hover:bg-blue
      cls.match(/^(flex|grid|hidden|block|inline|absolute|relative)/) || // Utilidades comunes
      cls.match(/^(p|m|w|h|max|min)-/) || // Padding, margin, width, height
      cls.match(/^(rounded|border|shadow|text|bg|border)/) // Clases comunes
    );
  });
}

function searchInDirectory(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    // Ignorar node_modules, .next, etc.
    if (file.isDirectory()) {
      if (!file.name.includes('node_modules') && 
          !file.name.includes('.next') &&
          !file.name.includes('.git')) {
        searchInDirectory(fullPath);
      }
    } else if (file.isFile() && (file.name.endsWith('.tsx') || file.name.endsWith('.ts') || file.name.endsWith('.jsx') || file.name.endsWith('.js'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Buscar template literals
      let match;
      while ((match = patterns.templateLiteral.exec(content)) !== null) {
        const classes = extractClasses(match[1]);
        classes.forEach(cls => templateLiteralClasses.add(cls));
      }
      
      // Buscar ternarios
      while ((match = patterns.ternary.exec(content)) !== null) {
        if (match[1]) {
          const classes1 = extractClasses(match[1]);
          classes1.forEach(cls => conditionalClasses.add(cls));
        }
        if (match[2]) {
          const classes2 = extractClasses(match[2]);
          classes2.forEach(cls => conditionalClasses.add(cls));
        }
      }
      
      // Buscar en clsx/cn
      while ((match = patterns.clsx.exec(content)) !== null) {
        const classes = extractClasses(match[1]);
        classes.forEach(cls => dynamicClasses.add(cls));
      }
    }
  }
}

console.log('🔍 Extrayendo clases dinámicas...\n');
searchInDirectory(srcDir);

// Combinar todas las clases
const allDynamicClasses = new Set([
  ...templateLiteralClasses,
  ...conditionalClasses,
  ...dynamicClasses
]);

console.log(`✅ Encontradas ${allDynamicClasses.size} clases dinámicas únicas\n`);

if (allDynamicClasses.size > 0) {
  console.log('📋 CLASES ENCONTRADAS:\n');
  
  // Agrupar por tipo
  const grouped = {
    colors: [],
    spacing: [],
    layout: [],
    typography: [],
    effects: [],
    other: []
  };
  
  allDynamicClasses.forEach(cls => {
    if (cls.match(/^(bg|text|border)-/)) {
      grouped.colors.push(cls);
    } else if (cls.match(/^(p|m|w|h|max|min|top|left|right|bottom)-/)) {
      grouped.spacing.push(cls);
    } else if (cls.match(/^(flex|grid|hidden|block|inline|absolute|relative|fixed|sticky)/)) {
      grouped.layout.push(cls);
    } else if (cls.match(/^(text|font|leading|tracking)/)) {
      grouped.typography.push(cls);
    } else if (cls.match(/^(shadow|rounded|opacity|transition|animate)/)) {
      grouped.effects.push(cls);
    } else {
      grouped.other.push(cls);
    }
  });
  
  // Mostrar por categorías
  Object.entries(grouped).forEach(([category, classes]) => {
    if (classes.length > 0) {
      console.log(`${category.toUpperCase()} (${classes.length}):`);
      classes.sort().forEach(cls => console.log(`  - ${cls}`));
      console.log('');
    }
  });
  
  // Generar código para safelist
  console.log('📝 CÓDIGO PARA AGREGAR A tailwind.config.js safelist:\n');
  console.log('safelist: [');
  console.log('  // Clases dinámicas detectadas automáticamente');
  Array.from(allDynamicClasses).sort().forEach(cls => {
    console.log(`  '${cls}',`);
  });
  console.log('],');
  console.log('');
  
  // Guardar en archivo
  const outputPath = path.join(process.cwd(), 'tailwind-safelist-sugerido.json');
  const safelistArray = Array.from(allDynamicClasses).sort();
  fs.writeFileSync(outputPath, JSON.stringify(safelistArray, null, 2));
  console.log(`💾 Clases guardadas en: ${outputPath}`);
  console.log('');
  console.log('💡 Para aplicar:');
  console.log('   1. Revisar tailwind-safelist-sugerido.json');
  console.log('   2. Agregar las clases necesarias a safelist en tailwind.config.js');
  console.log('   3. Rebuild del proyecto');
} else {
  console.log('✅ No se encontraron clases dinámicas problemáticas');
}

console.log('\n✅ Extracción completada');


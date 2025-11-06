#!/usr/bin/env node

/**
 * ============================================
 * FORZAR CLASES EN CSS
 * Crea un archivo CSS con clases que Tailwind no detecta
 * ============================================
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 FORZANDO CLASES EN CSS\n');
console.log('='.repeat(60));
console.log('');

// Clases que deben estar siempre presentes
const forcedClasses = [
  // Padding valores medios
  'px-2.5',
  'py-1.5',
  
  // Hover states críticos
  'hover:bg-blue-700',
  'hover:bg-gray-700',
  'hover:bg-red-700',
  'hover:bg-gray-50',
  'hover:bg-gray-100',
  
  // Focus states críticos
  'focus:ring-blue-500',
  'focus:ring-gray-500',
  'focus:ring-red-500',
  
  // Active states
  'active:scale-95',
  
  // Colores adicionales
  'bg-blue-800',
  'bg-green-800',
  'bg-red-800',
  'bg-yellow-800',
  'bg-neutral-300',
  'bg-purple-500',
  'bg-purple-900',
  
  // Borders
  'border-b-0',
  
  // Text
  'text-2xl',
];

// Crear archivo CSS con estas clases forzadas
const globalsCssPath = path.join(process.cwd(), 'src', 'app', 'globals.css');
let globalsContent = fs.readFileSync(globalsCssPath, 'utf8');

// Verificar si ya existe una sección de clases forzadas
if (!globalsContent.includes('/* CLASES FORZADAS PARA TAILWIND V4 */')) {
  const forcedClassesCss = `
/* ============================================
   CLASES FORZADAS PARA TAILWIND V4
   Estas clases se fuerzan porque Tailwind v4
   no las detecta correctamente en clases dinámicas
   ============================================ */
@layer utilities {
  /* Padding valores medios - Tailwind v4 puede no tener estos */
  .px-2\\.5 { padding-left: 0.625rem; padding-right: 0.625rem; }
  .py-1\\.5 { padding-top: 0.375rem; padding-bottom: 0.375rem; }
  
  /* Hover states - Forzar generación */
  .hover\\:bg-blue-700:hover { background-color: rgb(29 78 216); }
  .hover\\:bg-gray-700:hover { background-color: rgb(55 65 81); }
  .hover\\:bg-red-700:hover { background-color: rgb(185 28 28); }
  .hover\\:bg-gray-50:hover { background-color: rgb(249 250 251); }
  .hover\\:bg-gray-100:hover { background-color: rgb(243 244 246); }
  
  /* Focus states - Forzar generación */
  .focus\\:ring-blue-500:focus { --tw-ring-color: rgb(59 130 246); }
  .focus\\:ring-gray-500:focus { --tw-ring-color: rgb(107 114 128); }
  .focus\\:ring-red-500:focus { --tw-ring-color: rgb(239 68 68); }
  
  /* Active states */
  .active\\:scale-95:active { transform: scale(0.95); }
  
  /* Colores adicionales */
  .bg-blue-800 { background-color: rgb(30 64 175); }
  .bg-green-800 { background-color: rgb(22 101 52); }
  .bg-red-800 { background-color: rgb(153 27 27); }
  .bg-yellow-800 { background-color: rgb(133 77 14); }
  .bg-neutral-300 { background-color: rgb(212 212 212); }
  .bg-purple-500 { background-color: rgb(168 85 247); }
  .bg-purple-900 { background-color: rgb(88 28 135); }
  
  /* Borders */
  .border-b-0 { border-bottom-width: 0px; }
  
  /* Text */
  .text-2xl { font-size: 1.5rem; line-height: 2rem; }
}
`;

  // Agregar al final del archivo
  globalsContent += '\n' + forcedClassesCss;
  
  fs.writeFileSync(globalsCssPath, globalsContent, 'utf8');
  console.log('✅ Clases forzadas agregadas a globals.css');
} else {
  console.log('⚠️  Clases forzadas ya existen en globals.css');
}

console.log(`\n📝 ${forcedClasses.length} clases forzadas`);


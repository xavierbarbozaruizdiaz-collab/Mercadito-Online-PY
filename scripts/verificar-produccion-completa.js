#!/usr/bin/env node

/**
 * ============================================
 * VERIFICACIÓN COMPLETA DE PRODUCCIÓN
 * Verifica que todo está listo para producción
 * ============================================
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFICACIÓN COMPLETA DE PRODUCCIÓN\n');
console.log('='.repeat(60));
console.log('');

const checks = {
  build: false,
  routes: false,
  tailwind: false,
  env: false,
  config: false,
};

// 1. Verificar Build
console.log('📦 1. VERIFICANDO BUILD...\n');
const nextDir = path.join(process.cwd(), '.next');
if (fs.existsSync(nextDir)) {
  const cssDir = path.join(nextDir, 'static', 'css');
  if (fs.existsSync(cssDir)) {
    const cssFiles = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));
    if (cssFiles.length > 0) {
      const cssFile = path.join(cssDir, cssFiles[0]);
      const cssSize = (fs.statSync(cssFile).size / 1024).toFixed(2);
      console.log(`   ✅ Build existe`);
      console.log(`   ✅ CSS generado: ${cssSize} KB`);
      checks.build = true;
    } else {
      console.log(`   ❌ No se encontraron archivos CSS`);
    }
  } else {
    console.log(`   ❌ Directorio .next/static/css no existe`);
  }
} else {
  console.log(`   ❌ Directorio .next no existe`);
  console.log(`   💡 Ejecuta: npm run build`);
}

// 2. Verificar Rutas Duplicadas
console.log('\n🛣️  2. VERIFICANDO RUTAS...\n');
const adminPage1 = path.join(process.cwd(), 'src', 'app', 'admin', 'page.tsx');
const adminPage2 = path.join(process.cwd(), 'src', 'app', '(dashboard)', 'admin', 'page.tsx');

if (fs.existsSync(adminPage1) && fs.existsSync(adminPage2)) {
  console.log(`   ❌ Ruta duplicada encontrada: /admin/page.tsx`);
  console.log(`   💡 Elimina una de las rutas duplicadas`);
} else if (fs.existsSync(adminPage2)) {
  console.log(`   ✅ Ruta admin correcta: /(dashboard)/admin/page.tsx`);
  checks.routes = true;
} else {
  console.log(`   ⚠️  Ruta admin no encontrada`);
}

// 3. Verificar Tailwind
console.log('\n🎨 3. VERIFICANDO TAILWIND...\n');
const tailwindConfig = path.join(process.cwd(), 'tailwind.config.js');
const safelistFile = path.join(process.cwd(), 'src', 'styles', 'tailwind-safelist.ts');
const globalsCss = path.join(process.cwd(), 'src', 'app', 'globals.css');

if (fs.existsSync(tailwindConfig)) {
  const configContent = fs.readFileSync(tailwindConfig, 'utf8');
  if (configContent.includes('src/styles')) {
    console.log(`   ✅ tailwind.config.js incluye src/styles`);
  } else {
    console.log(`   ⚠️  tailwind.config.js no incluye src/styles`);
  }
} else {
  console.log(`   ⚠️  tailwind.config.js no encontrado`);
}

if (fs.existsSync(safelistFile)) {
  console.log(`   ✅ tailwind-safelist.ts existe`);
  checks.tailwind = true;
} else {
  console.log(`   ⚠️  tailwind-safelist.ts no encontrado`);
}

if (fs.existsSync(globalsCss)) {
  const cssContent = fs.readFileSync(globalsCss, 'utf8');
  if (cssContent.includes('@import "tailwindcss"')) {
    console.log(`   ✅ globals.css importa tailwindcss`);
  } else {
    console.log(`   ⚠️  globals.css no importa tailwindcss`);
  }
}

// 4. Verificar optimizeCss
console.log('\n⚙️  4. VERIFICANDO CONFIGURACIÓN...\n');
const nextConfig = path.join(process.cwd(), 'next.config.js');
if (fs.existsSync(nextConfig)) {
  const configContent = fs.readFileSync(nextConfig, 'utf8');
  // Buscar si optimizeCss está habilitado (no comentado)
  // Buscar líneas que NO estén comentadas y tengan optimizeCss: true
  const lines = configContent.split('\n');
  let optimizeCssEnabled = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Si la línea está comentada, ignorarla
    if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) {
      continue;
    }
    // Buscar optimizeCss: true
    if (line.match(/optimizeCss\s*:\s*true/)) {
      optimizeCssEnabled = true;
      break;
    }
  }
  
  if (optimizeCssEnabled) {
    console.log(`   ⚠️  optimizeCss está habilitado (puede eliminar clases)`);
  } else {
    console.log(`   ✅ optimizeCss está deshabilitado (correcto para debug)`);
    checks.config = true;
  }
}

// 5. Verificar Variables de Entorno
console.log('\n🔐 5. VERIFICANDO VARIABLES DE ENTORNO...\n');
const envLocal = path.join(process.cwd(), '.env.local');
const envExample = path.join(process.cwd(), '.env.example');

if (fs.existsSync(envLocal)) {
  console.log(`   ✅ .env.local existe`);
  const envContent = fs.readFileSync(envLocal, 'utf8');
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  
  let missingVars = [];
  requiredVars.forEach(varName => {
    if (envContent.includes(varName)) {
      console.log(`   ✅ ${varName} definida`);
    } else {
      missingVars.push(varName);
      console.log(`   ❌ ${varName} NO definida`);
    }
  });
  
  if (missingVars.length === 0) {
    checks.env = true;
  }
} else {
  console.log(`   ⚠️  .env.local no encontrado`);
}

// 6. Verificar Vercel Config
console.log('\n🚀 6. VERIFICANDO VERCEL...\n');
const vercelConfig = path.join(process.cwd(), 'vercel.json');
if (fs.existsSync(vercelConfig)) {
  console.log(`   ✅ vercel.json existe`);
  try {
    const vercelContent = JSON.parse(fs.readFileSync(vercelConfig, 'utf8'));
    if (vercelContent.env) {
      console.log(`   ✅ Variables de entorno en vercel.json`);
    }
    if (vercelContent.buildCommand) {
      console.log(`   ✅ Build command: ${vercelContent.buildCommand}`);
    }
  } catch (e) {
    console.log(`   ⚠️  Error leyendo vercel.json: ${e.message}`);
  }
} else {
  console.log(`   ⚠️  vercel.json no encontrado`);
}

// Resumen
console.log('\n' + '='.repeat(60));
console.log('\n📊 RESUMEN:\n');

const totalChecks = Object.keys(checks).length;
const passedChecks = Object.values(checks).filter(v => v === true).length;

console.log(`   ✅ Checks pasados: ${passedChecks}/${totalChecks}`);

if (passedChecks === totalChecks) {
  console.log('\n   🎉 ¡Todo listo para producción!');
  console.log('\n   💡 Próximos pasos:');
  console.log('      1. Esperar deploy en Vercel');
  console.log('      2. Verificar en producción');
  console.log('      3. Comparar con localhost');
  process.exit(0);
} else {
  console.log('\n   ⚠️  Hay problemas que resolver antes de producción');
  process.exit(1);
}


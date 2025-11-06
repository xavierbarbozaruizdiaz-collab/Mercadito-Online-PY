#!/usr/bin/env node

/**
 * ============================================
 * VERIFICAR BUILD LOCAL
 * Verifica que el build local incluye los cambios
 * ============================================
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFICANDO BUILD LOCAL\n');
console.log('='.repeat(60));
console.log('');

// 1. Verificar que page.tsx tiene los cambios
const pageTsx = path.join(process.cwd(), 'src', 'app', 'page.tsx');
if (fs.existsSync(pageTsx)) {
  const content = fs.readFileSync(pageTsx, 'utf8');
  
  if (content.includes('FORZAR HERO ACTIVO PARA DEBUG')) {
    console.log('✅ page.tsx tiene cambios de debug');
  } else {
    console.log('❌ page.tsx NO tiene cambios de debug');
  }
  
  if (content.includes('const FEATURE_HERO = true')) {
    console.log('✅ FEATURE_HERO está forzado a true');
  } else {
    console.log('❌ FEATURE_HERO NO está forzado');
  }
  
  if (content.includes('DEBUG HERO')) {
    console.log('✅ Tiene banner de debug');
  } else {
    console.log('❌ NO tiene banner de debug');
  }
} else {
  console.log('❌ page.tsx no existe');
}

// 2. Verificar que dashboard layout tiene cambios
const dashboardLayout = path.join(process.cwd(), 'src', 'app', '(dashboard)', 'layout.tsx');
if (fs.existsSync(dashboardLayout)) {
  const content = fs.readFileSync(dashboardLayout, 'utf8');
  
  if (content.includes('DEBUG MODE')) {
    console.log('✅ Dashboard layout tiene banner de debug');
  } else {
    console.log('❌ Dashboard layout NO tiene banner de debug');
  }
  
  if (content.includes('permitiendo acceso temporalmente')) {
    console.log('✅ Dashboard permite acceso temporal');
  } else {
    console.log('❌ Dashboard NO permite acceso temporal');
  }
} else {
  console.log('❌ Dashboard layout no existe');
}

// 3. Verificar build
const nextDir = path.join(process.cwd(), '.next');
if (fs.existsSync(nextDir)) {
  console.log('\n✅ Build existe');
  
  // Verificar que page.tsx está en el build
  const serverDir = path.join(nextDir, 'server', 'app');
  if (fs.existsSync(serverDir)) {
    const pageJs = path.join(serverDir, 'page.js');
    if (fs.existsSync(pageJs)) {
      const content = fs.readFileSync(pageJs, 'utf8');
      if (content.includes('DEBUG HERO') || content.includes('FEATURE_HERO')) {
        console.log('✅ Build incluye cambios de debug');
      } else {
        console.log('⚠️  Build puede no incluir cambios');
        console.log('   Ejecuta: npm run build');
      }
    }
  }
} else {
  console.log('\n❌ Build no existe');
  console.log('   Ejecuta: npm run build');
}

console.log('\n' + '='.repeat(60));
console.log('\n💡 Si los cambios están en el código pero no en producción:');
console.log('   1. Vercel puede estar usando cache');
console.log('   2. Necesitas redeploy sin cache');
console.log('   3. O el build en Vercel está fallando silenciosamente');


#!/usr/bin/env node

/**
 * Script para sincronizar código desde PRODUCCIÓN (Git)
 * 
 * Uso:
 *   node scripts/sync-git.js [branch]
 * 
 * Ejemplo:
 *   node scripts/sync-git.js dev
 */

const { execSync } = require('child_process');
const fs = require('fs');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, options = {}) {
  try {
    const output = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'inherit',
      ...options 
    });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  const branch = process.argv[2] || 'dev';
  
  log('🚀 Sincronizando código desde PRODUCCIÓN (Git)', 'blue');
  log('='.repeat(60), 'blue');
  
  // Verificar que estamos en un repositorio Git
  if (!fs.existsSync('.git')) {
    log('❌ Error: No se encontró repositorio Git', 'red');
    process.exit(1);
  }
  
  // Verificar estado del repositorio
  log('\n📋 Verificando estado del repositorio...', 'cyan');
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  
  if (status.trim()) {
    log('⚠️  ADVERTENCIA: Tienes cambios sin commitear:', 'yellow');
    log(status, 'yellow');
    log('\n¿Deseas continuar? (Ctrl+C para cancelar)', 'yellow');
    log('Esperando 5 segundos...', 'yellow');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  // 1. Obtener información del remoto
  log(`\n📡 Conectando con remoto 'origin'...`, 'cyan');
  const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
  log(`   Remoto: ${remoteUrl}`, 'cyan');
  
  // 2. Fetch de la rama de producción
  log(`\n📥 Obteniendo cambios de la rama '${branch}'...`, 'cyan');
  const fetchResult = exec(`git fetch origin ${branch}`);
  
  if (!fetchResult.success) {
    log('❌ Error al hacer fetch', 'red');
    process.exit(1);
  }
  
  // 3. Ver diferencias
  log(`\n📊 Comparando con origin/${branch}...`, 'cyan');
  const diffResult = execSync(`git diff HEAD origin/${branch} --stat`, { encoding: 'utf8' });
  
  if (diffResult.trim()) {
    log('Diferencias encontradas:', 'yellow');
    log(diffResult, 'yellow');
  } else {
    log('✅ Ya estás sincronizado con producción', 'green');
    process.exit(0);
  }
  
  // 4. Preguntar qué hacer
  log('\n¿Qué deseas hacer?', 'cyan');
  log('1. Merge (recomendado) - Combina cambios', 'cyan');
  log('2. Rebase - Reaplica tus cambios sobre producción', 'cyan');
  log('3. Reset - Descarta cambios locales y usa producción', 'red');
  log('4. Cancelar', 'yellow');
  
  // Por defecto, hacer merge
  log('\n⏳ Ejecutando merge (puedes cancelar con Ctrl+C)...', 'yellow');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // 5. Hacer merge
  log(`\n🔄 Haciendo merge de origin/${branch}...`, 'cyan');
  const mergeResult = exec(`git merge origin/${branch} --no-edit`);
  
  if (!mergeResult.success) {
    log('❌ Error en merge - Puede haber conflictos', 'red');
    log('   Resuelve los conflictos manualmente y luego:', 'yellow');
    log('   git add .', 'yellow');
    log('   git commit', 'yellow');
    process.exit(1);
  }
  
  log('✅ Merge completado exitosamente', 'green');
  
  // 6. Resumen
  log('\n' + '='.repeat(60), 'blue');
  log('📊 RESUMEN', 'blue');
  log('='.repeat(60), 'blue');
  log('✅ Código sincronizado desde producción', 'green');
  log(`📦 Rama: ${branch}`, 'cyan');
  log('\n💡 Próximos pasos:', 'yellow');
  log('   1. Revisa los cambios: git log', 'yellow');
  log('   2. Prueba la aplicación: npm run dev', 'yellow');
  log('   3. Si hay errores, revisa y corrige', 'yellow');
  
  // Verificar si hay que instalar dependencias
  if (fs.existsSync('package.json')) {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    log('\n📦 ¿Instalar dependencias? (npm install)', 'cyan');
    log('   Ejecuta: npm install', 'yellow');
  }
}

main().catch(error => {
  log(`\n❌ Error fatal: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});


// Simple icon verifier (no deps). No bloquea; solo warning/ok.
import fs from 'fs';
import path from 'path';

const roots = [
  'public/icons',
  'public/icon',
  'src/icons',
  'assets/icons'
];

const exts = new Set(['.svg', '.png', '.ico']);
let foundAny = false;
let errors = 0;
let warnings = 0;

function isSvgValid(str) {
  // Chequeo mínimo: etiqueta <svg ...>
  return /<svg[\s>]/i.test(str);
}

for (const rel of roots) {
  const dir = path.resolve(process.cwd(), rel);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;

  const files = fs.readdirSync(dir).filter(f => exts.has(path.extname(f)));
  if (files.length === 0) continue;

  foundAny = true;
  console.log(`[verify:icons] Carpeta: ${rel} (${files.length} archivos)`);

  for (const file of files) {
    const full = path.join(dir, file);
    const ext = path.extname(full).toLowerCase();

    try {
      const buf = fs.readFileSync(full);
      if (ext === '.svg') {
        const ok = isSvgValid(buf.toString('utf8'));
        if (!ok) {
          console.warn(`[verify:icons] ⚠️  SVG inválido (no se encontró <svg>): ${rel}/${file}`);
          warnings++;
        }
      } else {
        // PNG/ICO: solo existencia y tamaño > 0
        if (buf.length === 0) {
          console.warn(`[verify:icons] ⚠️  Archivo vacío: ${rel}/${file}`);
          warnings++;
        }
      }
    } catch (e) {
      console.error(`[verify:icons] ❌ Error leyendo ${rel}/${file}: ${e.message}`);
      errors++;
    }
  }
}

if (!foundAny) {
  console.log('[verify:icons] Sin carpetas/archivos de íconos detectados. (ok)');
}

// No bloquea el pipeline fast:
if (errors > 0) {
  console.log(`[verify:icons] Terminado con ${errors} errores y ${warnings} warnings (no bloquea en FAST).`);
  process.exit(0);
}
console.log(`[verify:icons] OK con ${warnings} warnings.`);

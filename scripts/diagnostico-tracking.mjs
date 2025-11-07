import fs from 'fs';

const mustIcons = [
  'public/icons/favicon-16x16.png',
  'public/icons/favicon-32x32.png',
  'public/icons/icon-96x96.png',
];

const missingIcons = mustIcons.filter((p) => !fs.existsSync(p));
console.log('ICONS_MISSING:', missingIcons.length ? missingIcons.join(', ') : 'NONE');

const roots = [
  'src/app',
  'src/components',
  'src/lib',
  'src/pages',
  'src/app/(marketplace)',
];

const productsRefs = [];

function scan(dir) {
  const entries = fs.readdirSync(dir);
  for (const name of entries) {
    const fullPath = `${dir}/${name}`;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scan(fullPath);
    } else if (/\.(tsx?|jsx?|mjs)$/.test(name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes("'/products'") || content.includes('"/products"')) {
        productsRefs.push(fullPath);
      }
    }
  }
}

for (const root of roots) {
  if (fs.existsSync(root)) {
    scan(root);
  }
}

console.log('PRODUCTS_REFS:', productsRefs.length ? productsRefs.join('\n') : 'NONE');

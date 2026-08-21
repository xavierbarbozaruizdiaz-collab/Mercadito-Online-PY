import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(process.cwd());
const svg = fs.readFileSync(path.join(root, 'public', 'favicon.svg'));
const iconsDir = path.join(root, 'public', 'icons');

const sizes = [16, 32, 72, 96, 128, 144, 152, 167, 180, 192, 384, 512];

function pngToIco(pngBuffer) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry[0] = 32;
  entry[1] = 32;
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(22, 12);
  return Buffer.concat([header, entry, pngBuffer]);
}

async function raster(size) {
  return sharp(svg).resize(size, size, { fit: 'fill' }).png().toBuffer();
}

async function maskable(size) {
  const pad = Math.round(size * 0.18);
  const inner = size - pad * 2;
  const icon = await sharp(svg).resize(inner, inner, { fit: 'fill' }).png().toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 34, g: 197, b: 94, alpha: 1 },
    },
  })
    .composite([{ input: icon, left: pad, top: pad }])
    .png()
    .toBuffer();
}

async function main() {
  fs.mkdirSync(iconsDir, { recursive: true });

  for (const size of sizes) {
    const buf = await raster(size);
    if (size === 16) fs.writeFileSync(path.join(iconsDir, 'favicon-16x16.png'), buf);
    if (size === 32) fs.writeFileSync(path.join(iconsDir, 'favicon-32x32.png'), buf);
    if (size === 152) fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon-152x152.png'), buf);
    if (size === 167) fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon-167x167.png'), buf);
    if (size === 180) {
      fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon-180x180.png'), buf);
      fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), buf);
    }
    fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}.png`), buf);
  }

  for (const size of [192, 512]) {
    const buf = await maskable(size);
    fs.writeFileSync(path.join(iconsDir, `maskable-icon-${size}x${size}.png`), buf);
  }

  const icoPng = await raster(32);
  fs.writeFileSync(path.join(root, 'public', 'favicon.ico'), pngToIco(icoPng));

  console.log('Brand icons generated');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

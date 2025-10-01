// Generate PWA icons from public/logo.png
// Usage: npm run pwa:icons (or: node scripts/gen-icons.mjs [sourcePath])

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const src = process.argv[2] || path.join('public', 'logo.png');
const outDir = path.join('public', 'icons');

async function ensureDir(p) {
  try { await fs.mkdir(p, { recursive: true }); } catch {}
}

async function makeIcon(size) {
  const out = path.join(outDir, `icon-${size}.png`);
  const bg = { r: 0, g: 0, b: 0, alpha: 0 };
  // Fit contain to add a little safe padding for maskable icons
  await sharp(src)
    .resize(size, size, { fit: 'contain', background: bg })
    .png({ compressionLevel: 9 })
    .toFile(out);
}

async function run() {
  await ensureDir(outDir);
  await Promise.all([makeIcon(192), makeIcon(512)]);
  console.log('Generated icons: public/icons/icon-192.png, icon-512.png');
}

run().catch((e) => { console.error(e); process.exit(1); });


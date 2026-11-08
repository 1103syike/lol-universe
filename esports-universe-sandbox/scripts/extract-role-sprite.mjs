import sharp from 'sharp';
import { mkdirSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = resolve(
  'C:/Users/Administrator/.cursor/projects/c-Users-Administrator-Desktop-lol/assets/image-379cea44-461d-444d-87df-3bfa79b96b55.png',
);
const outDir = resolve('public/role-icons');
const cellDir = resolve('public/role-icons/_lane-cells');
mkdirSync(cellDir, { recursive: true });

const meta = await sharp(src).metadata();
console.log({ width: meta.width, height: meta.height });

const cols = 4;
const rows = 2;
const cellW = Math.floor(meta.width / cols);
const cellH = Math.floor(meta.height / rows);
console.log({ cellW, cellH });

for (let r = 0; r < rows; r += 1) {
  for (let c = 0; c < cols; c += 1) {
    const left = c * cellW;
    const top = r * cellH;
    const file = `${cellDir}/r${r}c${c}.png`;
    await sharp(src)
      .extract({ left, top, width: cellW, height: Math.min(cellH, meta.height - top) })
      .png()
      .toFile(file);
  }
}

const coachCell = `${cellDir}/r1c3.png`;
await sharp(coachCell)
  .trim({ threshold: 10 })
  .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .webp({ quality: 95 })
  .toFile(resolve(outDir, 'coach.webp'));

copyFileSync(src, resolve('public/lane-role-icons.png'));
console.log({ coachFrom: 'r1c3', saved: 'public/role-icons/coach.webp' });

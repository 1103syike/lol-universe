import sharp from 'sharp';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const src = resolve(
  'C:/Users/Administrator/.cursor/projects/c-Users-Administrator-Desktop-lol/assets/image-379cea44-461d-444d-87df-3bfa79b96b55.png',
);
const outDir = resolve('public/role-icons');
const cellDir = resolve('public/role-icons/_lane-cells');
mkdirSync(cellDir, { recursive: true });

const cell = 32;
const positions = {
  fill: [1, 1],
  top: [34, 1],
  jungle: [67, 1],
  mid: [100, 1],
  r1c0: [1, 67],
  r1c1: [34, 67],
  r1c2: [67, 67],
  r1c3: [100, 67],
  midBelowAlt: [100, 50],
  underTopAlt: [34, 34],
  underMidAlt: [100, 34],
};

for (const [name, [left, top]] of Object.entries(positions)) {
  await sharp(src)
    .extract({ left, top, width: cell, height: Math.min(cell, 134 - top) })
    .png()
    .toFile(`${cellDir}/${name}.png`);
}

console.log('wrote probe cells');

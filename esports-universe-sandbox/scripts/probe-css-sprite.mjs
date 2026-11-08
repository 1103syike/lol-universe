import sharp from 'sharp';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const src = resolve(
  'C:/Users/Administrator/.cursor/projects/c-Users-Administrator-Desktop-lol/assets/image-379cea44-461d-444d-87df-3bfa79b96b55.png',
);
const dir = resolve('public/role-icons/_lane-cells');
mkdirSync(dir, { recursive: true });

const meta = await sharp(src).metadata();
await sharp(src).resize(63, null, { fit: 'inside' }).png().toFile(resolve(dir, 'scaled-inside-63.png'));
const scaledMeta = await sharp(resolve(dir, 'scaled-inside-63.png')).metadata();

const probes = [];
for (const y of [0, 16, 20, 24, 28, 32]) {
  for (const x of [0, 16, 32, 48]) {
    const name = `p-x${x}-y${y}.png`;
    await sharp(resolve(dir, 'scaled-inside-63.png'))
      .extract({
        left: x,
        top: y,
        width: Math.min(15, scaledMeta.width - x),
        height: Math.min(15, scaledMeta.height - y),
      })
      .png()
      .toFile(resolve(dir, name));
    probes.push({ x, y, name });
  }
}

writeFileSync(
  resolve(dir, 'probe-map.json'),
  JSON.stringify({ original: meta, scaled: scaledMeta, probes }, null, 2),
);
console.log({ original: meta, scaled: scaledMeta, probes: probes.length });

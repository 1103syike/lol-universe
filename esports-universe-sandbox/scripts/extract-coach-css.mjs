import sharp from 'sharp';
import { resolve } from 'node:path';
import { copyFileSync } from 'node:fs';

const src = resolve(
  'C:/Users/Administrator/.cursor/projects/c-Users-Administrator-Desktop-lol/assets/image-379cea44-461d-444d-87df-3bfa79b96b55.png',
);
const out = resolve('public/role-icons/coach.webp');
const preview = resolve('public/role-icons/coach-preview.png');

const meta = await sharp(src).metadata();
const cssSpriteWidth = 63;
const cssX = 48;
const cssY = 16;
const cssSize = 15;
const scale = meta.width / cssSpriteWidth;

const left = Math.round(cssX * scale);
const top = Math.round(cssY * scale);
const size = Math.round(cssSize * scale);

console.log({
  image: { width: meta.width, height: meta.height },
  scale,
  extract: { left, top, size },
});

const crop = sharp(src).extract({
  left: Math.max(0, left),
  top: Math.max(0, top),
  width: Math.min(size, meta.width - left),
  height: Math.min(size, meta.height - top),
});

await crop.clone().png().toFile(preview);
await crop
  .clone()
  .trim({ threshold: 5 })
  .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .webp({ quality: 95 })
  .toFile(out);

copyFileSync(src, resolve('public/lane-role-icons.png'));
console.log({ saved: out, preview });

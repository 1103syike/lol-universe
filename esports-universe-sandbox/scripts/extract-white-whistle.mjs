import sharp from 'sharp';
import { resolve } from 'node:path';

const src = resolve(
  'C:/Users/Administrator/.cursor/projects/c-Users-Administrator-Desktop-lol/assets/image-9a10ecfb-3263-4d04-ade7-4ccfffaf2c13.png',
);

const meta = await sharp(src).metadata();
const inset = 2;
const { data, info } = await sharp(src)
  .extract({
    left: inset,
    top: inset,
    width: meta.width - inset * 2,
    height: meta.height - inset * 2,
  })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const out = Buffer.alloc(data.length);
for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const a = data[i + 3];
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const isWhistle = a >= 16 && lum < 90;
  out[i] = 255;
  out[i + 1] = 255;
  out[i + 2] = 255;
  out[i + 3] = isWhistle ? 255 : 0;
}

await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
  .trim()
  .resize(32, 32, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toFile(resolve('public/role-icons/coach.png'));

await sharp(resolve('public/role-icons/coach.png'))
  .webp({ lossless: true })
  .toFile(resolve('public/role-icons/coach.webp'));

console.log('saved clean white whistle');

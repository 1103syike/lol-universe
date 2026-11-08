import fs from 'fs';
import path from 'path';
import { CHAMPION_DATA_VERSION, CHAMPIONS } from '../src/app/core/data/champions';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'public', 'champions', 'tiles');
fs.mkdirSync(outDir, { recursive: true });

let ok = 0;
for (const champion of CHAMPIONS) {
  const url = `https://ddragon.leagueoflegends.com/cdn/${CHAMPION_DATA_VERSION}/img/champion/${champion.id}.png`;
  const response = await fetch(url);
  if (!response.ok) {
    console.error('fail', champion.id, response.status);
    continue;
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(path.join(outDir, `${champion.id}.png`), buffer);
  ok += 1;
}

console.log(`downloaded ${ok}/${CHAMPIONS.length} tiles`);

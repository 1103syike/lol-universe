import { CHAMPION_KITS } from '../src/app/core/data/champion-kits.ts';
import fs from 'node:fs';

const src = fs.readFileSync('./src/app/shared/sim-v2/economy/shop-builds.ts', 'utf8');
const start = src.indexOf('const CHAMPION_PLAN_POOL');
const end = src.indexOf('function hashPick');
const block = src.slice(start, end);
const poolKeys = [...block.matchAll(/\n\s+([A-Za-z][A-Za-z0-9]*):\s*\[/g)].map((x) => x[1]);
const pool = new Set(poolKeys);
const missing = Object.entries(CHAMPION_KITS).filter(([id]) => !pool.has(id));
console.log('pool', pool.size, 'kits', Object.keys(CHAMPION_KITS).length, 'missing', missing.length);
const byClass = {};
for (const [id, kit] of missing) {
  const key = `${kit.combatClass}/${kit.damageType}`;
  (byClass[key] ??= []).push(`${id}[e${kit.style.engage}/p${kit.style.poke}|${kit.positions.join(',')}]`);
}
for (const key of Object.keys(byClass).sort()) {
  console.log(`\n${key} (${byClass[key].length})`);
  console.log(byClass[key].join('\n'));
}

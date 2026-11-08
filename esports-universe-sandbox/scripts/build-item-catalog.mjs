import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const VERSION = '14.24.1';
const CELL = 48;
const COLS = 16;
const OUT_PUBLIC = path.join(ROOT, 'public', 'items');
const OUT_DATA = path.join(ROOT, 'src', 'app', 'core', 'data', 'items.ts');
const OUT_MAP = path.join(ROOT, 'docs', 'item-sprite-mapping.json');

function slugName(name) {
  return name
    .normalize('NFKD')
    .replace(/['’.]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .replace(/^\d+/, (m) => `N${m}`);
}

function num(stats, key) {
  const value = stats?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function pickStats(stats = {}) {
  return {
    ad: num(stats, 'FlatPhysicalDamageMod'),
    ap: num(stats, 'FlatMagicDamageMod'),
    hp: num(stats, 'FlatHPPoolMod'),
    mana: num(stats, 'FlatMPPoolMod'),
    armor: num(stats, 'FlatArmorMod'),
    mr: num(stats, 'FlatSpellBlockMod'),
    attackSpeed: num(stats, 'PercentAttackSpeedMod'),
    moveSpeed: num(stats, 'FlatMovementSpeedMod') + num(stats, 'PercentMovementSpeedMod') * 100,
    crit: num(stats, 'FlatCritChanceMod'),
    lifeSteal: num(stats, 'PercentLifeStealMod'),
    hpRegen: num(stats, 'FlatHPRegenMod'),
    manaRegen: num(stats, 'FlatMPRegenMod'),
  };
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`fetch failed ${res.status} ${url}`);
  }
  return res.json();
}

function shouldInclude(id, item, byId) {
  if (!item?.image?.full) {
    return false;
  }
  const key = Number(id);
  if (key >= 3865 && key <= 3877) {
    return true;
  }
  if (item.maps && item.maps['11'] === false) {
    return false;
  }
  if (/^15\d{2}$/.test(id)) {
    return false;
  }
  if (item.requiredChampion || item.requiredAlly) {
    return false;
  }
  if (item.specialRecipe && !item.gold?.purchasable && !(item.from?.length > 0)) {
    return false;
  }
  const tags = item.tags ?? [];
  if (tags.includes('Trinket') && item.gold?.total === 0) {
    return true;
  }
  if (item.gold?.purchasable) {
    return true;
  }
  if ((item.into ?? []).some((child) => byId[child]?.gold?.purchasable)) {
    return true;
  }
  if ((item.from ?? []).length > 0 && item.gold?.total > 0) {
    return true;
  }
  return false;
}

async function downloadIcon(id, fileName) {
  const url = `https://ddragon.leagueoflegends.com/cdn/${VERSION}/img/item/${fileName}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`icon ${id} ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const [en, zh] = await Promise.all([
    fetchJson(`https://ddragon.leagueoflegends.com/cdn/${VERSION}/data/en_US/item.json`),
    fetchJson(`https://ddragon.leagueoflegends.com/cdn/${VERSION}/data/zh_TW/item.json`).catch(() => null),
  ]);
  const byId = en.data;
  const entries = Object.entries(byId)
    .filter(([id, item]) => shouldInclude(id, item, byId))
    .sort((a, b) => Number(a[0]) - Number(b[0]));

  fs.mkdirSync(OUT_PUBLIC, { recursive: true });
  fs.mkdirSync(path.join(OUT_PUBLIC, 'tiles'), { recursive: true });

  const catalog = [];
  const composites = [];
  let index = 0;
  for (const [id, item] of entries) {
    const stats = pickStats(item.stats);
    const zhName = zh?.data?.[id]?.name ?? item.name;
    const slug = slugName(item.name) || `Item${id}`;
    let icon;
    try {
      icon = await downloadIcon(id, item.image.full);
    } catch {
      continue;
    }
    const tilePath = path.join(OUT_PUBLIC, 'tiles', `${id}.png`);
    await sharp(icon).resize(CELL, CELL, { fit: 'fill' }).png().toFile(tilePath);
    const col = index % COLS;
    const row = Math.floor(index / COLS);
    composites.push({
      input: tilePath,
      left: col * CELL,
      top: row * CELL,
    });
    const buildsFromKeys = [...(item.from ?? [])];
    const buildsIntoKeys = [...(item.into ?? [])];
    if (id === '3865' && !buildsIntoKeys.includes('3866')) {
      buildsIntoKeys.push('3866');
    }
    if (id === '3866') {
      if (!buildsFromKeys.includes('3865')) {
        buildsFromKeys.push('3865');
      }
      if (!buildsIntoKeys.includes('3867')) {
        buildsIntoKeys.push('3867');
      }
    }
    if (id === '3867' && !buildsFromKeys.includes('3866')) {
      buildsFromKeys.push('3866');
    }
    catalog.push({
      id: slug,
      key: Number(id),
      name: item.name,
      nameZh: zhName,
      spriteIndex: index,
      cost: item.gold?.total ?? 0,
      combineCost: item.gold?.base ?? item.gold?.total ?? 0,
      purchasable: item.gold?.purchasable !== false || (Number(id) >= 3865 && Number(id) <= 3877),
      buildsFromKeys,
      buildsIntoKeys,
      tags: item.tags ?? [],
      ...stats,
    });
    index += 1;
  }

  const keyToSlug = new Map(catalog.map((item) => [String(item.key), item.id]));
  for (const item of catalog) {
    item.buildsFrom = item.buildsFromKeys.map((key) => keyToSlug.get(String(key))).filter(Boolean);
    item.buildsInto = item.buildsIntoKeys.map((key) => keyToSlug.get(String(key))).filter(Boolean);
    delete item.buildsFromKeys;
    delete item.buildsIntoKeys;
  }

  const rows = Math.ceil(catalog.length / COLS);
  const width = COLS * CELL;
  const height = rows * CELL;
  const spritePath = path.join(OUT_PUBLIC, 'item-sprite.webp');
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .webp({ quality: 90 })
    .toFile(spritePath);

  const userSprite = path.resolve(ROOT, '..', 'Team Logo', 'ItemSprite.webp');
  if (fs.existsSync(userSprite)) {
    fs.copyFileSync(userSprite, path.join(OUT_PUBLIC, 'item-sprite-source.webp'));
  }

  fs.writeFileSync(
    OUT_MAP,
    JSON.stringify(
      {
        ver: VERSION,
        cell: CELL,
        cols: COLS,
        rows,
        count: catalog.length,
        mapping: catalog.map((item) => ({
          id: item.id,
          key: item.key,
          name: item.name,
          spriteIndex: item.spriteIndex,
        })),
      },
      null,
      2,
    ),
  );

  const lines = [];
  lines.push(`export const ITEM_SPRITE_URL = '/items/item-sprite.webp';`);
  lines.push(`export const ITEM_SPRITE_CELL = ${CELL};`);
  lines.push(`export const ITEM_SPRITE_COLUMNS = ${COLS};`);
  lines.push(`export const ITEM_SPRITE_WIDTH = ${width};`);
  lines.push(`export const ITEM_SPRITE_HEIGHT = ${height};`);
  lines.push(`export const ITEM_DATA_VERSION = '${VERSION}';`);
  lines.push('');
  lines.push(`export type ItemTag = string;`);
  lines.push('');
  lines.push(`export interface ItemDefinition {`);
  lines.push(`  id: string;`);
  lines.push(`  key: number;`);
  lines.push(`  name: string;`);
  lines.push(`  nameZh: string;`);
  lines.push(`  spriteIndex: number;`);
  lines.push(`  cost: number;`);
  lines.push(`  combineCost: number;`);
  lines.push(`  purchasable: boolean;`);
  lines.push(`  buildsFrom: readonly string[];`);
  lines.push(`  buildsInto: readonly string[];`);
  lines.push(`  tags: readonly ItemTag[];`);
  lines.push(`  ad: number;`);
  lines.push(`  ap: number;`);
  lines.push(`  hp: number;`);
  lines.push(`  mana: number;`);
  lines.push(`  armor: number;`);
  lines.push(`  mr: number;`);
  lines.push(`  attackSpeed: number;`);
  lines.push(`  moveSpeed: number;`);
  lines.push(`  crit: number;`);
  lines.push(`  lifeSteal: number;`);
  lines.push(`  hpRegen: number;`);
  lines.push(`  manaRegen: number;`);
  lines.push(`}`);
  lines.push('');
  lines.push(`export const ITEMS: readonly ItemDefinition[] = ${JSON.stringify(catalog, null, 2)};`);
  lines.push('');
  lines.push(`export const ITEMS_BY_ID: Readonly<Record<string, ItemDefinition>> = Object.fromEntries(`);
  lines.push(`  ITEMS.map((item) => [item.id, item]),`);
  lines.push(`);`);
  lines.push('');
  lines.push(`export const ITEMS_BY_KEY: Readonly<Record<number, ItemDefinition>> = Object.fromEntries(`);
  lines.push(`  ITEMS.map((item) => [item.key, item]),`);
  lines.push(`);`);
  lines.push('');
  lines.push(`export function itemSpritePosition(spriteIndex: number): { column: number; row: number } {`);
  lines.push(`  return {`);
  lines.push(`    column: spriteIndex % ITEM_SPRITE_COLUMNS,`);
  lines.push(`    row: Math.floor(spriteIndex / ITEM_SPRITE_COLUMNS),`);
  lines.push(`  };`);
  lines.push(`}`);
  lines.push('');
  fs.writeFileSync(OUT_DATA, lines.join('\n'));
  console.log(`items=${catalog.length} sprite=${width}x${height} -> ${spritePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

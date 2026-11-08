import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const baseVer = '9.22.1';
const curVer = '14.24.1';

const ROLE_MAP: Record<string, string> = {
  Fighter: 'fighter',
  Tank: 'tank',
  Mage: 'mage',
  Assassin: 'assassin',
  Marksman: 'marksman',
  Support: 'support',
};

const RELEASE_ORDER = [
  'Aphelios',
  'Sett',
  'Lillia',
  'Yone',
  'Samira',
  'Seraphine',
  'Rell',
  'Viego',
  'Gwen',
  'Akshan',
  'Vex',
  'Zeri',
  'Renata',
  'Belveth',
  'Nilah',
  'KSante',
  'Milio',
  'Naafiri',
  'Briar',
  'Hwei',
  'Smolder',
  'Aurora',
  'Ambessa',
] as const;

const [baseEn, curEn, curZh] = await Promise.all([
  fetch(`https://ddragon.leagueoflegends.com/cdn/${baseVer}/data/en_US/champion.json`).then((r) => r.json()),
  fetch(`https://ddragon.leagueoflegends.com/cdn/${curVer}/data/en_US/champion.json`).then((r) => r.json()),
  fetch(`https://ddragon.leagueoflegends.com/cdn/${curVer}/data/zh_TW/champion.json`).then((r) => r.json()),
]);

const baseIds = Object.keys(baseEn.data).sort((a, b) => a.localeCompare(b));
const baseSet = new Set(baseIds);
const appended = RELEASE_ORDER.filter((id) => curEn.data[id] && !baseSet.has(id));
const order = ['', ...baseIds, ...appended];

const champions = order
  .map((id, spriteIndex) => {
    if (!id) {
      return null;
    }
    const en = curEn.data[id];
    const zh = curZh.data[id];
    return {
      id: en.id as string,
      key: Number(en.key),
      name: en.name as string,
      nameZh: (zh?.name ?? en.name) as string,
      title: en.title as string,
      titleZh: (zh?.title ?? en.title) as string,
      tags: en.tags as string[],
      roles: (en.tags as string[]).map((tag) => ROLE_MAP[tag] ?? tag.toLowerCase()),
      resource: en.partype as string,
      spriteIndex,
    };
  })
  .filter((item): item is NonNullable<typeof item> => item !== null);

const publicDir = path.join(root, 'public', 'champions');
fs.mkdirSync(publicDir, { recursive: true });
fs.copyFileSync(
  path.join(root, '..', 'Team Logo', 'ChampionSprite.webp'),
  path.join(publicDir, 'champion-sprite.webp'),
);

const champLiteral = JSON.stringify(champions, null, 2).replace(/"([^"]+)":/g, '$1:');

const source = `export const CHAMPION_SPRITE_URL = '/champions/champion-sprite.webp';
export const CHAMPION_SPRITE_CELL = 58;
export const CHAMPION_SPRITE_COLUMNS = 16;
export const CHAMPION_SPRITE_WIDTH = 928;
export const CHAMPION_SPRITE_HEIGHT = 742;
export const CHAMPION_DATA_VERSION = '${curVer}';
export const CHAMPION_SPRITE_BASE_VERSION = '${baseVer}';

export type ChampionTag = 'Fighter' | 'Tank' | 'Mage' | 'Assassin' | 'Marksman' | 'Support';
export type ChampionRole = 'fighter' | 'tank' | 'mage' | 'assassin' | 'marksman' | 'support';

export interface ChampionDefinition {
  id: string;
  key: number;
  name: string;
  nameZh: string;
  title: string;
  titleZh: string;
  tags: ChampionTag[];
  roles: ChampionRole[];
  resource: string;
  spriteIndex: number;
}

export const CHAMPIONS: readonly ChampionDefinition[] = ${champLiteral};

const CHAMPION_BY_ID: ReadonlyMap<string, ChampionDefinition> = new Map(
  CHAMPIONS.map((champion) => [champion.id, champion]),
);

const CHAMPION_BY_KEY: ReadonlyMap<number, ChampionDefinition> = new Map(
  CHAMPIONS.map((champion) => [champion.key, champion]),
);

export function getChampionById(id: string): ChampionDefinition | null {
  return CHAMPION_BY_ID.get(id) ?? null;
}

export function getChampionByKey(key: number): ChampionDefinition | null {
  return CHAMPION_BY_KEY.get(key) ?? null;
}

export function listChampions(): readonly ChampionDefinition[] {
  return CHAMPIONS;
}
`;

const outFile = path.join(root, 'src', 'app', 'core', 'data', 'champions.ts');
fs.writeFileSync(outFile, source, 'utf8');

const probeDir = path.join(root, '..', 'Team Logo', '_champ-probe3');
fs.mkdirSync(probeDir, { recursive: true });
for (const champion of champions.slice(-4)) {
  const column = champion.spriteIndex % 16;
  const row = Math.floor(champion.spriteIndex / 16);
  await sharp(path.join(root, '..', 'Team Logo', 'ChampionSprite.webp'))
    .extract({ left: column * 58, top: row * 58, width: 58, height: 58 })
    .png()
    .toFile(path.join(probeDir, `end-${champion.id}.png`));
}

console.log('wrote', outFile);
console.log('champions', champions.length);
console.log(
  'first',
  champions.slice(0, 5).map((c) => `${c.id}:${c.spriteIndex}`),
);
console.log(
  'last',
  champions.slice(-5).map((c) => `${c.id}:${c.spriteIndex}`),
);

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const kitsPath = join(root, 'src/app/core/data/champion-kits.ts');
const itemsPath = join(root, 'src/app/core/data/items.ts');
const outPath = join(root, 'src/app/shared/sim-v2/economy/opgg-item-builds.json');

const ROLE_TO_OPGG = {
  TOP: 'top',
  JUNGLE: 'jungle',
  MID: 'mid',
  BOT: 'adc',
  SUPPORT: 'support',
};

const STARTER_KEYS = new Set([1055, 1054, 1056, 1082, 1101, 1102, 1103, 3865, 3866, 3867]);
const BOOT_KEYS = new Set([3006, 3009, 3020, 3047, 3111, 3117, 3158, 1001]);
const SKIP_KEYS = new Set([2003, 2031, 2055, 2010, 2140, 2138, 2139]);
const JUNGLE_PET_KEYS = new Set([1101, 1102, 1103]);

function slugify(championId) {
  return championId.replace(/'/g, '').toLowerCase();
}

function parseKits(source) {
  const entries = [];
  const blockRe = /^\s{2}([A-Za-z0-9]+):\s*\{([\s\S]*?)^\s{2}\},?/gm;
  let match;
  while ((match = blockRe.exec(source))) {
    const id = match[1];
    const body = match[2];
    const positions = [...body.matchAll(/'([A-Z]+)'/g)]
      .map((item) => item[1])
      .filter((role) => ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'].includes(role));
    if (positions.length === 0) {
      continue;
    }
    entries.push({ id, positions: [...new Set(positions)] });
  }
  return entries;
}

function parseItemKeyMap(source) {
  const map = new Map();
  for (const match of source.matchAll(/"id":\s*"([^"]+)",\s*"key":\s*(\d+)/g)) {
    map.set(Number(match[2]), match[1]);
  }
  return map;
}

function extractBuild(html, keyToId) {
  const mapId = (key) => keyToId.get(key) ?? null;
  const pngKeys = [...html.matchAll(/item\/(\d+)\.png/g)].map((m) => Number(m[1]));
  const uniqPng = [...new Set(pngKeys)];

  let starter = null;
  for (const key of uniqPng) {
    if (STARTER_KEYS.has(key)) {
      starter = mapId(key);
      if (starter) {
        break;
      }
    }
  }

  let boots = null;
  for (const key of uniqPng) {
    if (BOOT_KEYS.has(key) && key !== 1001) {
      boots = mapId(key);
      if (boots) {
        break;
      }
    }
  }
  if (!boots) {
    boots = 'Boots';
  }

  const coreIdx = html.indexOf('core_items_0');
  const coreSlice = coreIdx >= 0 ? html.slice(coreIdx, coreIdx + 4500) : '';
  const coreKeys = [...coreSlice.matchAll(/\\"metaId\\":(\d+)/g)].map((m) => Number(m[1]));
  const core = [];
  for (const key of coreKeys) {
    const id = mapId(key);
    if (!id || STARTER_KEYS.has(key) || BOOT_KEYS.has(key)) {
      continue;
    }
    if (!core.includes(id)) {
      core.push(id);
    }
    if (core.length >= 3) {
      break;
    }
  }

  const later = [];
  for (const key of uniqPng) {
    if (STARTER_KEYS.has(key) || BOOT_KEYS.has(key) || SKIP_KEYS.has(key)) {
      continue;
    }
    const id = mapId(key);
    if (!id || core.includes(id) || later.includes(id)) {
      continue;
    }
    later.push(id);
    if (later.length >= 4) {
      break;
    }
  }

  if (core.length === 0 && later.length === 0) {
    return null;
  }

  const items = [];
  if (starter) {
    items.push(starter);
  }
  items.push('Boots');
  if (boots && boots !== 'Boots') {
    items.push(boots);
  }
  for (const id of [...core, ...later]) {
    if (!items.includes(id)) {
      items.push(id);
    }
  }
  return { starter, boots, core, later, items };
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      accept: 'text/html',
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.text();
}

async function scrapeOne(championId, role, keyToId) {
  const slug = slugify(championId);
  const position = ROLE_TO_OPGG[role] ?? 'mid';
  const url = `https://op.gg/lol/champions/${slug}/build?position=${position}&hl=en_US`;
  const html = await fetchText(url);
  const build = extractBuild(html, keyToId);
  if (!build) {
    return null;
  }
  if (role !== 'JUNGLE') {
    build.items = build.items.filter((id) => {
      const key = [...keyToId.entries()].find((entry) => entry[1] === id)?.[0];
      return !JUNGLE_PET_KEYS.has(key);
    });
    if (JUNGLE_PET_KEYS.has([...keyToId.entries()].find((entry) => entry[1] === build.starter)?.[0])) {
      build.starter = null;
      build.items = build.items.filter((id) => id !== build.starter);
    }
  }
  if (role === 'SUPPORT' && !build.items.includes('WorldAtlas')) {
    build.items = ['WorldAtlas', ...build.items];
  }
  return {
    role,
    starter: build.starter,
    boots: build.boots,
    core: build.core,
    later: build.later,
    items: build.items,
    source: `op.gg ${slug} ${position}`,
  };
}

async function main() {
  const kits = parseKits(readFileSync(kitsPath, 'utf8'));
  const keyToId = parseItemKeyMap(readFileSync(itemsPath, 'utf8'));
  const out = {};
  let ok = 0;
  let fail = 0;
  for (const entry of kits) {
    const roles = entry.positions.slice(0, 2);
    const rows = [];
    for (const role of roles) {
      try {
        const row = await scrapeOne(entry.id, role, keyToId);
        if (row) {
          rows.push(row);
          ok += 1;
          console.log(`ok ${entry.id} ${role} ${row.core.join('>') || '-'}`);
        } else {
          fail += 1;
          console.log(`miss ${entry.id} ${role}`);
        }
      } catch (error) {
        fail += 1;
        console.log(`err ${entry.id} ${role} ${error.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 110));
    }
    if (rows.length > 0) {
      out[entry.id] = rows;
    }
  }
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(
    outPath,
    `${JSON.stringify(
      {
        patch: 'op.gg live scrape',
        scrapedAt: new Date().toISOString(),
        champions: out,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`done ok=${ok} fail=${fail} champions=${Object.keys(out).length} -> ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

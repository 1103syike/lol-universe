import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const kitsPath = join(root, 'src/app/core/data/champion-kits.ts');
const outPath = join(root, 'src/app/shared/sim-v2/champion/opgg-skill-orders.json');

const ROLE_TO_OPGG = {
  TOP: 'top',
  JUNGLE: 'jungle',
  MID: 'mid',
  BOT: 'adc',
  SUPPORT: 'support',
};

function slugify(championId) {
  return championId
    .replace(/([a-z0-9])([A-Z])/g, '$1$2')
    .replace(/'/g, '')
    .toLowerCase();
}

function parseKits(source) {
  const entries = [];
  const blockRe = /^\s{2}([A-Za-z0-9]+):\s*\{([\s\S]*?)^\s{2}\},?/gm;
  let match;
  while ((match = blockRe.exec(source))) {
    const id = match[1];
    const body = match[2];
    const positions = [...body.matchAll(/'([A-Z]+)'/g)].map((item) => item[1]).filter((role) =>
      ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'].includes(role),
    );
    if (positions.length === 0) {
      continue;
    }
    entries.push({ id, positions: [...new Set(positions)] });
  }
  return entries;
}

function normalizeSkillToken(token) {
  if (token === 'Q' || token === 'W' || token === 'E' || token === 'R') {
    return token;
  }
  if (token.startsWith('R-') || token.includes('-')) {
    return 'R';
  }
  return null;
}

function extractMastery(html) {
  const marker = '\\"skill_masteries\\":[{';
  const idx = html.indexOf(marker);
  if (idx < 0) {
    return null;
  }
  const slice = html.slice(idx, idx + 3500);
  const idsMatch = slice.match(
    /\\"ids\\":\[((?:\\"[QWER]\\",?){3,4})\]/,
  );
  const orderMatch = slice.match(/\\"order\\":\[((?:\\"[^"\\]+\\",?){12,18})\]/);
  if (!idsMatch || !orderMatch) {
    return null;
  }
  const ids = [...idsMatch[1].matchAll(/[QWER]/g)].map((item) => item[0]);
  const maxOrder = ids.filter((slot) => slot !== 'R').slice(0, 3);
  while (maxOrder.length < 3) {
    for (const slot of ['Q', 'E', 'W']) {
      if (!maxOrder.includes(slot)) {
        maxOrder.push(slot);
      }
      if (maxOrder.length >= 3) {
        break;
      }
    }
  }
  const path = [...orderMatch[1].matchAll(/\\"([^"\\]+)\\"/g)]
    .map((item) => normalizeSkillToken(item[1]))
    .filter(Boolean);
  if (path.length < 12) {
    return null;
  }
  return { maxOrder: maxOrder.slice(0, 3), path };
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
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.text();
}

async function scrapeOne(championId, role) {
  const slug = slugify(championId);
  const position = ROLE_TO_OPGG[role] ?? 'mid';
  const url = `https://op.gg/lol/champions/${slug}/skills?position=${position}&hl=en_US`;
  const html = await fetchText(url);
  const mastery = extractMastery(html);
  if (!mastery) {
    return null;
  }
  return {
    role,
    maxOrder: mastery.maxOrder,
    path: mastery.path,
    source: `op.gg ${slug} ${position}`,
  };
}

async function main() {
  const kits = parseKits(readFileSync(kitsPath, 'utf8'));
  const out = {};
  let ok = 0;
  let fail = 0;
  for (const entry of kits) {
    const roles = entry.positions.slice(0, 2);
    const rows = [];
    for (const role of roles) {
      try {
        const row = await scrapeOne(entry.id, role);
        if (row) {
          rows.push(row);
          ok += 1;
          console.log(`ok ${entry.id} ${role} ${row.maxOrder.join('>')}`);
        } else {
          fail += 1;
          console.log(`miss ${entry.id} ${role}`);
        }
      } catch (error) {
        fail += 1;
        console.log(`err ${entry.id} ${role} ${error.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 120));
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

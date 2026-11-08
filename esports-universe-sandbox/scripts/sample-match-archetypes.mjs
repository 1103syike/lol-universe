import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

async function loadSim() {
  try {
    return await import(join(root, 'dist-sample/match-engine.js'));
  } catch {
    return null;
  }
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function attrs(level) {
  return {
    laning: { current: level, potential: level + 5, growthRate: 1 },
    mechanics: { current: level, potential: level + 5, growthRate: 1 },
    teamfighting: { current: level, potential: level + 5, growthRate: 1 },
    gameSense: { current: level, potential: level + 5, growthRate: 1 },
    consistency: { current: level, potential: level + 5, growthRate: 1 },
    adaptability: { current: level, potential: level + 5, growthRate: 1 },
  };
}

function makePlayer(id, teamId, gamertag, position, level) {
  return {
    id,
    displayName: gamertag,
    gamertag,
    nationality: 'TW',
    position,
    teamId,
    birthday: '2000-01-01',
    rarity: 'SR',
    attributes: attrs(level),
    form: level,
    contract: {
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      annualSalary: 1000000,
    },
    careerRecords: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function makeCoach(id, teamId, level = 80) {
  return {
    id,
    displayName: 'Coach',
    gamertag: 'Coach',
    nationality: 'TW',
    teamId,
    birthday: '1990-01-01',
    rarity: 'SR',
    attributes: {
      draftStrategy: level,
      metaAdaptation: level,
      tacticalPlanning: level,
      teamIntegration: level,
      inGameLeadership: level,
      playerDevelopment: level,
    },
    specialties: ['teamfighting', 'gameSense'],
    contract: {
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      annualSalary: 1000000,
    },
    careerRecords: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function side(teamId, level) {
  const roles = ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'];
  return {
    teamId,
    coach: makeCoach(`c-${teamId}`, teamId, level),
    players: roles.map((position, index) =>
      makePlayer(`p-${teamId}-${index}`, teamId, `${teamId}-${position}`, position, level + (index - 2) * 2),
    ),
  };
}

const CONFLICTS = [
  ['stomp', 'comeback'],
  ['stomp', 'epic-battle'],
  ['stomp', 'narrow-victory'],
  ['bloodbath', 'macro-game'],
  ['perfect-game', 'comeback'],
  ['perfect-game', 'narrow-victory'],
];

function hasConflict(ids) {
  return CONFLICTS.some(([a, b]) => ids.includes(a) && ids.includes(b));
}

async function main() {
  const { pathToFileURL } = await import('node:url');
  const { register } = await import('node:module');
  try {
    register('ts-node/esm', pathToFileURL('./'));
  } catch {
  }

  let simulateGame;
  let classifyMatchArchetypes;
  try {
    const engine = await import(
      pathToFileURL(join(root, 'src/app/shared/sim/match-engine.ts')).href
    );
    const archetype = await import(
      pathToFileURL(join(root, 'src/app/shared/sim/match-archetype.ts')).href
    );
    simulateGame = engine.simulateGame;
    classifyMatchArchetypes = archetype.classifyMatchArchetypes;
  } catch (error) {
    console.error('無法直接載入 TS 模組，改用 vitest 內建抽樣路徑。');
    console.error(error);
    process.exit(1);
  }

  const primaryCounts = {};
  const secondaryCounts = {};
  let nonePrimary = 0;
  let conflictCount = 0;
  const samples = [];

  for (let index = 0; index < 100; index += 1) {
    const random = mulberry32(1000 + index * 97);
    const homeLevel = 70 + Math.floor(random() * 35);
    const awayLevel = 70 + Math.floor(random() * 35);
    const report = simulateGame({
      home: side('home', homeLevel),
      away: side('away', awayLevel),
      random,
    });
    const archetypes = report.archetypes ?? classifyMatchArchetypes({ box: report.boxScore });
    const primary = archetypes.primaryArchetype?.id ?? null;
    if (!primary) {
      nonePrimary += 1;
    } else {
      primaryCounts[primary] = (primaryCounts[primary] ?? 0) + 1;
    }
    const ids = [
      ...(primary ? [primary] : []),
      ...archetypes.secondaryTags.map((tag) => tag.id),
    ];
    for (const id of archetypes.secondaryTags.map((tag) => tag.id)) {
      secondaryCounts[id] = (secondaryCounts[id] ?? 0) + 1;
    }
    if (hasConflict(ids)) {
      conflictCount += 1;
    }
    samples.push({
      index,
      durationSec: report.boxScore.durationSec,
      primary,
      secondary: archetypes.secondaryTags.map((tag) => tag.id),
      reasons: archetypes.reasons,
    });
  }

  const summary = {
    games: 100,
    nonePrimary,
    nonePrimaryRate: nonePrimary / 100,
    primaryCounts,
    secondaryCounts,
    conflictCount,
    samples: samples.slice(0, 20),
  };

  const out = join(root, 'docs/match-archetype-sample-100.json');
  writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  console.log(`wrote ${out}`);
}

main();

import { ITEMS } from '../src/app/core/data/items.ts';
import { simulateV2Match } from '../src/app/shared/sim-v2/engine.ts';
import { writeFileSync } from 'node:fs';

function isLegendary(item) {
  if (!item || !item.purchasable) return false;
  if ((item.buildsFrom?.length ?? 0) === 0) return false;
  if (item.tags?.includes('Boots')) return false;
  if ((item.buildsInto?.length ?? 0) > 0 && item.cost < 2500) return false;
  return item.cost >= 2200;
}

function isEpic(item) {
  if (!item || (item.buildsFrom?.length ?? 0) === 0) return false;
  if (item.tags?.includes('Boots')) return false;
  if (isLegendary(item)) return false;
  return item.cost >= 1000;
}

const recipe = ITEMS.filter((i) => i.buildsFrom.length > 0 && i.purchasable).map((i) => ({
  id: i.id,
  cost: i.cost,
  legendary: isLegendary(i),
  epic: isEpic(i),
  into: i.buildsInto.length,
}));

function roster(side) {
  return ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'].map((position) => ({
    playerId: `${side}_${position}`,
    gamertag: `${side}_${position}`,
    position,
    championId:
      position === 'TOP'
        ? 'Garen'
        : position === 'JUNGLE'
          ? 'LeeSin'
          : position === 'MID'
            ? 'Annie'
            : position === 'BOT'
              ? 'Ashe'
              : 'Thresh',
    laning: 72,
    mechanics: 70,
    teamfighting: 70,
    gameSense: 70,
    consistency: 68,
    adaptability: 65,
  }));
}

function bag(state, champ) {
  let legendary = 0;
  let epic = 0;
  let boots = 0;
  let components = 0;
  const names = [];
  for (const id of champ.items) {
    const item = state.lockedPack.items[id];
    if (!item) continue;
    names.push(id);
    if (item.tags?.includes?.('Boots') || id === 'Boots') {
      boots += 1;
      continue;
    }
    if (isLegendary(item)) {
      legendary += 1;
      continue;
    }
    if (isEpic(item)) {
      epic += 1;
      continue;
    }
    components += 1;
  }
  const half = legendary + (epic + components >= 2 ? 0.5 : epic + components >= 1 ? 0.25 : 0);
  return { legendary, epic, boots, components, half, items: names, goldK: +(champ.earnedGold / 1000).toFixed(1) };
}

const rows = [];
for (const seed of [1000, 1100, 2000]) {
  const { state, replay } = simulateV2Match({
    versionId: 'demo-a',
    seed,
    blueTeamId: 'blue',
    redTeamId: 'red',
    blue: roster('blue'),
    red: roster('red'),
    maxDurationSec: 1800,
  });
  const byRole = {};
  for (const role of ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT']) {
    byRole[role] = state.champions
      .filter((c) => c.positionLabel === role)
      .map((c) => ({ side: c.side, ...bag(state, c), pocket: Math.round(c.gold) }));
  }
  const buys = replay.events
    .filter((e) => e.type === 'item_buy' && !e.payload?.sold)
    .map((e) => {
      const champ = state.champions.find((c) => c.id === e.actorId);
      return {
        t: Math.round(e.t),
        role: champ?.positionLabel,
        item: e.payload?.itemId,
        legendary: isLegendary(state.lockedPack.items[e.payload?.itemId]),
      };
    });
  const firstLegendaryByRole = {};
  for (const role of ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT']) {
    const times = buys.filter((b) => b.role === role && b.legendary).map((b) => b.t);
    firstLegendaryByRole[role] = times.slice(0, 4);
  }
  rows.push({
    seed,
    t: Math.round(state.scheduler.time),
    byRole,
    firstLegendaryByRole,
  });
}

writeFileSync(
  'item-pace-diag.json',
  JSON.stringify(
    {
      ref29: {
        ahead: [2.5, 3, 3, 4, 4],
        behind: [2.5, 2.5, 2.5, 3, 3],
        roles: ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'],
      },
      legendaryIds: recipe.filter((r) => r.legendary).map((r) => r.id),
      epicIds: recipe.filter((r) => r.epic).map((r) => r.id),
      rows,
    },
    null,
    2,
  ),
);

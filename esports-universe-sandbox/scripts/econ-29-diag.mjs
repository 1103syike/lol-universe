import { simulateV2Match } from '../src/app/shared/sim-v2/engine.ts';
import { writeFileSync } from 'node:fs';

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

function completedCount(state, champ) {
  let done = 0;
  let components = 0;
  for (const itemId of champ.items) {
    const item = state.lockedPack.items[itemId];
    if (!item) continue;
    if (item.buildsFrom.length > 0) done += 1;
    else components += 1;
  }
  return { done, components, half: done + (components >= 2 ? 0.5 : components >= 1 ? 0.25 : 0) };
}

const ref = {
  label: 'BFX vs T1 ~29:00 (user)',
  ahead: { gold: [11.9, 12.3, 12.0, 17.0, 8.9], items: [2.5, 3, 3, 4, 4] },
  behind: { gold: [9.2, 9.5, 10.9, 11.6, 6.6], items: [2.5, 2.5, 2.5, 3, 3] },
  roles: ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'],
};

const rows = [];
for (const seed of [1000, 1100, 1200, 2000]) {
  const { state } = simulateV2Match({
    versionId: 'demo-a',
    seed,
    blueTeamId: 'blue',
    redTeamId: 'red',
    blue: roster('blue'),
    red: roster('red'),
    maxDurationSec: 1740,
  });
  const minutes = state.scheduler.time / 60;
  const byRole = {};
  for (const role of ref.roles) {
    const champs = state.champions.filter((c) => c.positionLabel === role);
    byRole[role] = champs.map((c) => {
      const bag = completedCount(state, c);
      return {
        side: c.side,
        goldK: Number((c.earnedGold / 1000).toFixed(1)),
        gpm: Math.round(c.earnedGold / Math.max(1, minutes)),
        done: bag.done,
        half: bag.half,
        items: c.items,
        lvl: c.level,
        r: c.abilities.find((a) => a.slot === 'R')?.level ?? 0,
        dmg: Math.round(c.damageToChampions),
      };
    });
  }
  rows.push({
    seed,
    t: Math.round(state.scheduler.time),
    minutes: Number(minutes.toFixed(1)),
    byRole,
  });
}

writeFileSync('econ-29-diag.json', JSON.stringify({ ref, rows }, null, 2));

import { simulateV2Match } from '../src/app/shared/sim-v2/engine.ts';

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

const byRole = { TOP: [], JUNGLE: [], MID: [], BOT: [], SUPPORT: [] };
const games = [];
for (const seed of [1000, 1100, 1200, 2000]) {
  const { state } = simulateV2Match({
    versionId: 'demo-a',
    seed,
    blueTeamId: 'blue',
    redTeamId: 'red',
    blue: roster('blue'),
    red: roster('red'),
    maxDurationSec: 1800,
  });
  const mins = state.scheduler.time / 60;
  const teamDmg =
    state.champions.reduce((s, c) => s + c.damageToChampions, 0) / 2;
  games.push({
    seed,
    mins: Number(mins.toFixed(1)),
    teamKills: Math.round(
      state.champions.filter((c) => c.side === 'blue').reduce((s, c) => s + c.kills, 0),
    ),
    teamDpm: Math.round(teamDmg / mins),
  });
  for (const role of Object.keys(byRole)) {
    for (const c of state.champions.filter((x) => x.positionLabel === role)) {
      byRole[role].push({
        dmg: Math.round(c.damageToChampions),
        dpm: Math.round(c.damageToChampions / mins),
        share: 0,
        side: c.side,
      });
    }
  }
}

console.log('games', JSON.stringify(games));
console.log('LCK ref ~30m DMG: TOP 18-22k | JG 13-15k | MID 20-24k | BOT 22-26k | SUP 5-8k');
console.log('LCK team DPM ~2100-2700; dmg% BOT~27 MID~23 TOP~22 JG~17 SUP~8');
for (const role of Object.keys(byRole)) {
  const xs = byRole[role];
  const avg = Math.round(xs.reduce((s, x) => s + x.dmg, 0) / xs.length);
  const dpm = Math.round(xs.reduce((s, x) => s + x.dpm, 0) / xs.length);
  const sorted = xs.map((x) => x.dmg).sort((a, b) => a - b);
  console.log(
    role,
    'avgDmg',
    avg,
    'avgDPM',
    dpm,
    'min',
    sorted[0],
    'max',
    sorted[sorted.length - 1],
  );
}

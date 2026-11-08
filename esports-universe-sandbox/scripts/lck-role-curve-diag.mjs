import { simulateV2Match } from '../src/app/shared/sim-v2/engine.ts';

function roster(side) {
  return ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'].map((position) => ({
    playerId: `${side}_${position}`,
    gamertag: `${side}_${position}`,
    position,
    championId:
      position === 'TOP'
        ? 'Aatrox'
        : position === 'JUNGLE'
          ? 'LeeSin'
          : position === 'MID'
            ? 'Ahri'
            : position === 'BOT'
              ? 'Jinx'
              : 'Thresh',
    laning: 74,
    mechanics: 72,
    teamfighting: 72,
    gameSense: 72,
    consistency: 70,
    adaptability: 68,
  }));
}

const roles = ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'];
const buckets = Object.fromEntries(
  roles.map((role) => [role, { gpm: [], csm: [], dpm: [], dtpm: [], samples: [] }]),
);

for (const seed of [1000, 1100, 1200, 2000, 3000, 4000, 5000, 7000]) {
  const { state } = simulateV2Match({
    versionId: 'demo-a',
    seed,
    blueTeamId: 'blue',
    redTeamId: 'red',
    blue: roster('blue'),
    red: roster('red'),
    maxDurationSec: 1800,
  });
  const mins = Math.max(1, state.scheduler.time / 60);
  for (const champ of state.champions) {
    const gpm = champ.earnedGold / mins;
    const csm = champ.cs / mins;
    const dpm = champ.damageToChampions / mins;
    const dtpm = champ.damageTaken / mins;
    const bucket = buckets[champ.positionLabel];
    bucket.gpm.push(gpm);
    bucket.csm.push(csm);
    bucket.dpm.push(dpm);
    bucket.dtpm.push(dtpm);
    bucket.samples.push({
      seed,
      side: champ.side,
      mins: Number(mins.toFixed(1)),
      gpm: Math.round(gpm),
      csm: Number(csm.toFixed(2)),
      dpm: Math.round(dpm),
      dtpm: Math.round(dtpm),
      gold: Math.round(champ.earnedGold),
      cs: champ.cs,
    });
  }
}

function summarize(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mean = arr.reduce((s, x) => s + x, 0) / arr.length;
  return {
    n: arr.length,
    min: Number(sorted[0].toFixed(2)),
    p10: Number(sorted[Math.floor((sorted.length - 1) * 0.1)].toFixed(2)),
    avg: Number(mean.toFixed(2)),
    p90: Number(sorted[Math.floor((sorted.length - 1) * 0.9)].toFixed(2)),
    max: Number(sorted[sorted.length - 1].toFixed(2)),
  };
}

const report = {};
for (const role of roles) {
  report[role] = {
    gpm: summarize(buckets[role].gpm),
    csm: summarize(buckets[role].csm),
    dpm: summarize(buckets[role].dpm),
    dtpm: summarize(buckets[role].dtpm),
  };
}

console.log(JSON.stringify(report, null, 2));

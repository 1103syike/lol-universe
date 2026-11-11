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

function mean(arr) {
  return arr.reduce((sum, n) => sum + n, 0) / Math.max(1, arr.length);
}

const seeds = [1000, 1100, 1200];
const byRole = {};
const viaTotals = {};

for (const seed of seeds) {
  const { state, replay } = simulateV2Match({
    versionId: 'demo-a',
    seed,
    blueTeamId: 'blue',
    redTeamId: 'red',
    blue: roster('blue'),
    red: roster('red'),
    maxDurationSec: 1800,
  });
  const mins = Math.max(1, state.scheduler.time / 60);
  for (const event of replay.events) {
    if (event.type !== 'minion_death') {
      continue;
    }
    const via = event.payload?.via ?? 'none';
    viaTotals[via] = (viaTotals[via] ?? 0) + 1;
  }
  for (const champ of state.champions) {
    const bucket = (byRole[champ.positionLabel] ??= { csm: [], gpm: [], cs: [] });
    bucket.csm.push(champ.cs / mins);
    bucket.gpm.push(champ.earnedGold / mins);
    bucket.cs.push(champ.cs);
  }
}

console.log(
  JSON.stringify(
    {
      viaTotals,
      roles: Object.fromEntries(
        Object.entries(byRole).map(([role, bucket]) => [
          role,
          {
            csm: Number(mean(bucket.csm).toFixed(2)),
            gpm: Math.round(mean(bucket.gpm)),
            cs: Math.round(mean(bucket.cs)),
          },
        ]),
      ),
    },
    null,
    2,
  ),
);

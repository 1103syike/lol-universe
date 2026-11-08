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

const { state } = simulateV2Match({
  versionId: 'demo-a',
  seed: 1200,
  blueTeamId: 'blue',
  redTeamId: 'red',
  blue: roster('blue'),
  red: roster('red'),
  maxDurationSec: 1740,
});

const mins = state.scheduler.time / 60;
console.log('t', mins.toFixed(1) + 'm');
for (const role of ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT']) {
  for (const c of state.champions.filter((x) => x.positionLabel === role)) {
    const src = Object.fromEntries(
      Object.entries(c.goldBySource || {}).map(([k, v]) => [k, Math.round(Number(v))]),
    );
    console.log(
      role,
      c.side,
      'gold',
      Math.round(c.earnedGold),
      'gpm',
      Math.round(c.earnedGold / mins),
      'cs',
      c.cs,
      'csm',
      (c.cs / mins).toFixed(2),
      'src',
      JSON.stringify(src),
    );
  }
}

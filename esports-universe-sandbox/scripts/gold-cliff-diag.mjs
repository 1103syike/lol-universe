import { simulateV2Match } from '../src/app/shared/sim-v2/engine.ts';
import { toMatchReport } from '../src/app/shared/sim-v2/adapter/to-match-report.ts';

function roster(side) {
  return ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'].map((position) => ({
    playerId: `${side}_${position}`,
    gamertag: `${side}_${position}`,
    position,
    championId:
      position === 'TOP'
        ? side === 'blue'
          ? 'Maokai'
          : 'Ornn'
        : position === 'JUNGLE'
          ? side === 'blue'
            ? 'Sejuani'
            : 'Elise'
          : position === 'MID'
            ? side === 'blue'
              ? 'Orianna'
              : 'Syndra'
            : position === 'BOT'
              ? side === 'blue'
                ? 'Ashe'
                : 'Ezreal'
              : side === 'blue'
                ? 'Leona'
                : 'Nautilus',
    laning: 72,
    mechanics: 70,
    teamfighting: 70,
    gameSense: 70,
    consistency: 68,
    adaptability: 65,
  }));
}

const cliffs = [];
for (const seed of [1000, 1100, 1200, 2000, 3000, 4000, 5000, 7000, 9000, 42]) {
  const result = simulateV2Match({
    versionId: 'demo-a',
    seed,
    blueTeamId: 'SMG',
    redTeamId: 'BYG',
    blue: roster('blue'),
    red: roster('red'),
    maxDurationSec: 1800,
  });
  const report = toMatchReport(result);
  const series = report.boxScore.goldSeries;
  const samples = result.state.goldSamples;
  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  const lastSample = samples[samples.length - 1];
  const lastDiff = last.homeGold - last.awayGold;
  const prevDiff = prev.homeGold - prev.awayGold;
  const signFlip =
    (prevDiff > 500 && lastDiff < -500) || (prevDiff < -500 && lastDiff > 500);
  const gapSec = last.t - (lastSample?.t ?? last.t);
  cliffs.push({
    seed,
    duration: report.boxScore.durationSec,
    winner: report.boxScore.winnerTeamId,
    endReason: result.state.endReason,
    sampleCount: samples.length,
    lastSampleT: lastSample ? Math.round(lastSample.t) : null,
    lastSampleDiff: lastSample
      ? Math.round(lastSample.blue - lastSample.red)
      : null,
    prevT: Math.round(prev.t),
    prevDiff: Math.round(prevDiff),
    lastT: Math.round(last.t),
    lastDiff: Math.round(lastDiff),
    jump: Math.round(lastDiff - prevDiff),
    gapSec: Math.round(gapSec),
    signFlip,
    homeGold: last.homeGold,
    awayGold: last.awayGold,
  });
}

console.log(JSON.stringify(cliffs, null, 2));
console.log(
  'flips',
  cliffs.filter((c) => c.signFlip).length,
  '/',
  cliffs.length,
  'avgJump',
  Math.round(cliffs.reduce((s, c) => s + Math.abs(c.jump), 0) / cliffs.length),
  'avgGap',
  Math.round(cliffs.reduce((s, c) => s + c.gapSec, 0) / cliffs.length),
);

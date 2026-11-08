import { simulateV2Match } from '../src/app/shared/sim-v2/engine.ts';
import { writeFileSync } from 'fs';

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

function bucket(t) {
  if (t < 300) return '0-5';
  if (t < 600) return '5-10';
  if (t < 900) return '10-15';
  if (t < 1200) return '15-20';
  if (t < 1500) return '20-25';
  return '25+';
}

function analyze(seed) {
  const { state, replay } = simulateV2Match({
    versionId: 'demo-a',
    seed,
    blueTeamId: 'blue',
    redTeamId: 'red',
    blue: roster('blue'),
    red: roster('red'),
    maxDurationSec: 2400,
  });

  const byId = Object.fromEntries(state.champions.map((c) => [c.id, c]));
  const deaths = replay.events.filter((e) => e.type === 'death');
  const byBucket = {};
  const byRole = {};
  const bySide = { blue: 0, red: 0 };
  const gaps = [];
  const lastDeath = {};
  const streak = {};
  let maxStreak = 0;
  let quickRedeaths = 0;

  for (const event of deaths) {
    const victim = byId[event.actorId];
    if (!victim) continue;
    const b = bucket(event.t);
    byBucket[b] = (byBucket[b] ?? 0) + 1;
    byRole[victim.positionLabel] = (byRole[victim.positionLabel] ?? 0) + 1;
    bySide[victim.side] += 1;

    const prev = lastDeath[victim.id];
    if (prev != null) {
      const gap = event.t - prev;
      gaps.push(gap);
      if (gap < 45) quickRedeaths += 1;
      streak[victim.id] = (streak[victim.id] ?? 1) + 1;
    } else {
      streak[victim.id] = 1;
    }
    maxStreak = Math.max(maxStreak, streak[victim.id] ?? 1);
    lastDeath[victim.id] = event.t;
    for (const other of state.champions) {
      if (other.side === victim.side && other.id !== victim.id) continue;
      if (other.side !== victim.side) streak[other.id] = 0;
    }
  }

  gaps.sort((a, b) => a - b);
  const medianGap = gaps.length ? gaps[Math.floor(gaps.length / 2)] : null;
  const kda = state.champions.map((c) => ({
    side: c.side,
    role: c.positionLabel,
    k: c.kills,
    d: c.deaths,
    a: c.assists,
    gold: Math.round(c.earnedGold),
    lvl: c.level,
  }));

  return {
    seed,
    duration: Math.round(state.scheduler.time),
    score: `${bySide.red} survivors? wait`,
    blueDeaths: bySide.blue,
    redDeaths: bySide.red,
    totalKills: deaths.length,
    kpm: Number((deaths.length / Math.max(1, state.scheduler.time / 60)).toFixed(2)),
    byBucket,
    byRole,
    medianDeathGapSec: medianGap == null ? null : Number(medianGap.toFixed(1)),
    quickRedeathsUnder45s: quickRedeaths,
    maxPersonalDeathStreak: Math.max(...Object.values(streak), 0),
    kda,
  };
}

const rows = [1000, 1001, 1002, 2000, 3000].map(analyze);
for (const row of rows) {
  row.score = `${row.redDeaths}:${row.blueDeaths}`;
}
writeFileSync('kill-pace-diag.json', JSON.stringify(rows, null, 2));
console.log(JSON.stringify(rows, null, 2));

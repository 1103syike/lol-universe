import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Player } from '../src/app/core/models/player.model.ts';
import type { Coach } from '../src/app/core/models/coach.model.ts';
import { calculateChemistry } from '../src/app/shared/sim/chemistry.ts';
import { simulateLiveMatch } from '../src/app/shared/sim/live-match.ts';
import { emptyModifiers, type MatchLiveModifiers } from '../src/app/shared/sim/match-state.ts';
import { buildTeamProfile } from '../src/app/shared/sim/team-profile.ts';
import type { TimelineEvent } from '../src/app/shared/sim/match-stats.ts';
import { SIM_BALANCE } from '../src/app/shared/sim/balance.ts';

const db = JSON.parse(readFileSync(resolve('db/db.json'), 'utf8'));
const universe = (
  db.entries as Array<{ id: string; value: unknown }>
).find((entry) => entry.id.startsWith('eus.universe.') && (entry.value as { players?: unknown })?.players)!
  .value as {
  teams: Array<{ id: string; abbreviation: string }>;
  players: Player[];
  coaches: Coach[];
};

function side(abbr: string) {
  const team = universe.teams.find((item) => item.abbreviation === abbr);
  if (!team) throw new Error(`missing ${abbr}`);
  return {
    teamId: team.id,
    players: universe.players.filter((player) => player.teamId === team.id),
    coach: universe.coaches.find((coach) => coach.teamId === team.id) ?? null,
  };
}

function cloneSide(source: ReturnType<typeof side>, newTeamId: string) {
  return {
    teamId: newTeamId,
    coach: source.coach
      ? { ...source.coach, id: `${source.coach.id}__mirror`, teamId: newTeamId }
      : null,
    players: source.players.map((player) => ({
      ...player,
      id: `${player.id}__mirror`,
      teamId: newTeamId,
    })),
  };
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function clock(sec: number | null): string | null {
  if (sec === null || !Number.isFinite(sec)) return null;
  const total = Math.max(0, Math.round(sec));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function avgClock(values: Array<number | null>): string | null {
  const clean = values.filter((value): value is number => value !== null);
  if (clean.length === 0) return null;
  return clock(mean(clean));
}

function isKill(event: TimelineEvent): boolean {
  return (
    event.type === 'kill' ||
    event.type === 'first-blood' ||
    event.type === 'mistake'
  );
}

function firstEventTime(
  events: TimelineEvent[],
  predicate: (event: TimelineEvent) => boolean,
): number | null {
  const hit = events.find(predicate);
  return hit ? hit.t : null;
}

function analyzeBox(box: NonNullable<ReturnType<typeof simulateLiveMatch>['boxScore']>) {
  const timeline = [...box.timeline].sort((a, b) => a.t - b.t);
  const winnerId = box.winnerTeamId;
  const durationSec = box.durationSec;
  const durationMin = durationSec / 60;
  const kills = timeline.filter(isKill).length;

  const towers = timeline.filter((event) => event.type === 'tower');
  const inhibs = timeline.filter((event) => event.type === 'inhibitor');
  const barons = timeline.filter((event) => event.type === 'baron');
  const nexus = timeline.find((event) => event.type === 'nexus') ?? null;

  const firstOuterSec = firstEventTime(
    towers,
    (event) => event.payload?.towerTier === 1,
  );
  const firstInnerSec = firstEventTime(
    towers,
    (event) => event.payload?.towerTier === 2,
  );
  const firstBaseSec = firstEventTime(
    towers,
    (event) => event.payload?.towerTier === 3,
  );
  const firstInhibSec = firstEventTime(inhibs, () => true);
  const firstBaronSec = firstEventTime(barons, () => true);

  const winnerInhibs = inhibs
    .filter((event) => event.teamId === winnerId)
    .sort((a, b) => a.t - b.t);
  const winnerNexusTowers = towers
    .filter(
      (event) =>
        event.teamId === winnerId && event.payload?.towerTier === 'nexus',
    )
    .sort((a, b) => a.t - b.t);

  const firstWinnerInhibSec = winnerInhibs[0]?.t ?? null;
  const secondNexusTowerSec =
    winnerNexusTowers.length >= 2 ? winnerNexusTowers[1].t : null;
  const canCloseProxySec =
    firstWinnerInhibSec !== null && secondNexusTowerSec !== null
      ? Math.max(firstWinnerInhibSec, secondNexusTowerSec)
      : secondNexusTowerSec ?? firstWinnerInhibSec;

  const lastBaronBeforeEnd =
    nexus === null
      ? null
      : [...barons].reverse().find((event) => event.t <= nexus.t) ?? null;
  const baronToEndSec =
    lastBaronBeforeEnd && nexus ? nexus.t - lastBaronBeforeEnd.t : null;
  const inhibToEndSec =
    firstWinnerInhibSec !== null && nexus !== null
      ? nexus.t - firstWinnerInhibSec
      : null;
  const canCloseToEndSec =
    canCloseProxySec !== null && nexus !== null
      ? nexus.t - canCloseProxySec
      : null;

  const hitSoftMax = durationSec >= SIM_BALANCE.maxMatchSeconds;
  const hitHardBand = durationSec >= SIM_BALANCE.maxMatchSeconds + 4 * 60;
  const endedByTimeoutSummary = Boolean(
    nexus?.summary?.includes('時限') || nexus?.summary?.includes('強推'),
  );

  return {
    durationSec,
    durationMin: Number(durationMin.toFixed(2)),
    durationClock: clock(durationSec),
    totalKills: kills,
    kpm: Number((kills / Math.max(1, durationMin)).toFixed(2)),
    towerCount: towers.length,
    inhibCount: inhibs.length,
    baronCount: barons.length,
    winnerInhibCount: winnerInhibs.length,
    winnerNexusTowerCount: winnerNexusTowers.length,
    firstOuterSec,
    firstInnerSec,
    firstBaseSec,
    firstInhibSec,
    firstBaronSec,
    canCloseProxySec,
    inhibToEndSec,
    canCloseToEndSec,
    baronToEndSec,
    hitSoftMax,
    hitHardBand,
    endedByTimeoutSummary,
    nexusSummary: nexus?.summary ?? null,
  };
}

type Row = ReturnType<typeof analyzeBox>;

function bucketCounts(rows: Row[]) {
  const buckets = {
    under25: 0,
    m25to30: 0,
    m30to35: 0,
    m35to40: 0,
    m40to45: 0,
    over45: 0,
  };
  for (const row of rows) {
    const min = row.durationMin;
    if (min < 25) buckets.under25 += 1;
    else if (min < 30) buckets.m25to30 += 1;
    else if (min < 35) buckets.m30to35 += 1;
    else if (min < 40) buckets.m35to40 += 1;
    else if (min < 45) buckets.m40to45 += 1;
    else buckets.over45 += 1;
  }
  const n = rows.length || 1;
  return {
    counts: buckets,
    pct: {
      under25: Number(((buckets.under25 / n) * 100).toFixed(1)),
      m25to30: Number(((buckets.m25to30 / n) * 100).toFixed(1)),
      m30to35: Number(((buckets.m30to35 / n) * 100).toFixed(1)),
      m35to40: Number(((buckets.m35to40 / n) * 100).toFixed(1)),
      m40to45: Number(((buckets.m40to45 / n) * 100).toFixed(1)),
      over45: Number(((buckets.over45 / n) * 100).toFixed(1)),
    },
  };
}

function summarize(rows: Row[]) {
  const durations = rows.map((row) => row.durationSec);
  const durationBucket = bucketCounts(rows);
  const timed = <K extends keyof Row>(key: K) =>
    rows
      .map((row) => row[key])
      .filter((value): value is number => typeof value === 'number');

  return {
    runs: rows.length,
    avgDurationMin: Number(mean(rows.map((row) => row.durationMin)).toFixed(1)),
    avgDurationClock: clock(mean(durations)),
    p25DurationClock: clock(percentile(durations, 25)),
    p50DurationClock: clock(percentile(durations, 50)),
    p75DurationClock: clock(percentile(durations, 75)),
    p90DurationClock: clock(percentile(durations, 90)),
    minDurationClock: clock(Math.min(...durations)),
    maxDurationClock: clock(Math.max(...durations)),
    durationBuckets: durationBucket,
    pctGe40: Number(
      ((rows.filter((row) => row.durationMin >= 40).length / rows.length) * 100).toFixed(1),
    ),
    pctGe45: Number(
      ((rows.filter((row) => row.durationMin >= 45).length / rows.length) * 100).toFixed(1),
    ),
    pctHitSoftMax: Number(
      ((rows.filter((row) => row.hitSoftMax).length / rows.length) * 100).toFixed(1),
    ),
    pctHitHardBand: Number(
      ((rows.filter((row) => row.hitHardBand).length / rows.length) * 100).toFixed(1),
    ),
    pctTimeoutSummary: Number(
      (
        (rows.filter((row) => row.endedByTimeoutSummary).length / rows.length) *
        100
      ).toFixed(1),
    ),
    avgTotalKills: Number(mean(rows.map((row) => row.totalKills)).toFixed(1)),
    avgKpm: Number(mean(rows.map((row) => row.kpm)).toFixed(2)),
    avgTowers: Number(mean(rows.map((row) => row.towerCount)).toFixed(1)),
    avgInhibs: Number(mean(rows.map((row) => row.inhibCount)).toFixed(1)),
    avgBarons: Number(mean(rows.map((row) => row.baronCount)).toFixed(1)),
    avgWinnerInhibs: Number(mean(rows.map((row) => row.winnerInhibCount)).toFixed(1)),
    avgFirstOuterClock: avgClock(rows.map((row) => row.firstOuterSec)),
    avgFirstInnerClock: avgClock(rows.map((row) => row.firstInnerSec)),
    avgFirstBaseClock: avgClock(rows.map((row) => row.firstBaseSec)),
    avgFirstInhibClock: avgClock(rows.map((row) => row.firstInhibSec)),
    avgFirstBaronClock: avgClock(rows.map((row) => row.firstBaronSec)),
    avgCanCloseProxyClock: avgClock(rows.map((row) => row.canCloseProxySec)),
    avgInhibToEndSec: Math.round(mean(timed('inhibToEndSec'))),
    avgCanCloseToEndSec: Math.round(mean(timed('canCloseToEndSec'))),
    avgBaronToEndSec: Math.round(mean(timed('baronToEndSec'))),
    pctHasBaron: Number(
      ((rows.filter((row) => row.baronCount > 0).length / rows.length) * 100).toFixed(1),
    ),
    pctWinnerInhibGe2: Number(
      (
        (rows.filter((row) => row.winnerInhibCount >= 2).length / rows.length) *
        100
      ).toFixed(1),
    ),
    pctWinnerInhibGe3: Number(
      (
        (rows.filter((row) => row.winnerInhibCount >= 3).length / rows.length) *
        100
      ).toFixed(1),
    ),
  };
}

function runBand(
  name: string,
  games: number,
  pick: (index: number) => {
    home: ReturnType<typeof side>;
    away: ReturnType<typeof side>;
    modifiers: MatchLiveModifiers;
    seed: number;
  },
) {
  const rows: Row[] = [];
  for (let index = 0; index < games; index += 1) {
    const { home, away, modifiers, seed } = pick(index);
    const random = mulberry32(seed);
    const homeProfile = buildTeamProfile(
      home.teamId,
      home.players,
      home.coach,
      random,
      calculateChemistry(home.players, home.coach),
    );
    const awayProfile = buildTeamProfile(
      away.teamId,
      away.players,
      away.coach,
      random,
      calculateChemistry(away.players, away.coach),
    );
    const { boxScore } = simulateLiveMatch({
      home: homeProfile,
      away: awayProfile,
      random,
      modifiers,
    });
    rows.push(analyzeBox(boxScore!));
  }
  return {
    name,
    ...summarize(rows),
    samples: rows.slice(0, 5).map((row) => ({
      durationClock: row.durationClock,
      kills: row.totalKills,
      firstOuter: clock(row.firstOuterSec),
      firstInner: clock(row.firstInnerSec),
      firstInhib: clock(row.firstInhibSec),
      firstBaron: clock(row.firstBaronSec),
      canClose: clock(row.canCloseProxySec),
      baronToEndSec: row.baronToEndSec,
      hitSoftMax: row.hitSoftMax,
      nexusSummary: row.nexusSummary,
    })),
  };
}

const evenSources = ['MCX', 'OCE', 'RM', 'JT', 'GT'];
const even = runBand('even', 100, (index) => {
  const abbr = evenSources[index % evenSources.length];
  const home = side(abbr);
  return {
    home,
    away: cloneSide(home, `${home.teamId}__mirror`),
    modifiers: emptyModifiers(),
    seed: 910000 + index * 17,
  };
});

const midPairs: Array<[string, string]> = [
  ['RM', 'JT'],
  ['JT', 'RM'],
  ['GT', 'ahq'],
  ['ahq', 'GT'],
];
const mid = runBand('mid', 100, (index) => {
  const [homeAbbr, awayAbbr] = midPairs[index % midPairs.length];
  return {
    home: side(homeAbbr),
    away: side(awayAbbr),
    modifiers: {
      draftEdge: index % 2 === 0 ? 1.2 : -1.2,
      matchupByPhase: { early: 0.4, mid: 0.3, late: 0.2 },
    },
    seed: 920000 + index * 19,
  };
});

const stompPairs: Array<[string, string]> = [
  ['MCX', 'OCE'],
  ['OCE', 'MCX'],
  ['RM', 'ahq'],
  ['GT', 'JT'],
];
const stomp = runBand('stomp', 100, (index) => {
  const [homeAbbr, awayAbbr] = stompPairs[index % stompPairs.length];
  return {
    home: side(homeAbbr),
    away: side(awayAbbr),
    modifiers: {
      draftEdge: index % 2 === 0 ? 3.5 : -3.5,
      matchupByPhase: { early: 1.2, mid: 1.0, late: 0.8 },
    },
    seed: 930000 + index * 23,
  };
});

const proBenchmark = {
  source: 'LCK 2025 / LPL 2024 / Worlds 2024-2025',
  avgDurationTarget: '31-34 min',
  avgKillsTarget: '27-30',
  durationBucketsTargetPct: {
    under25: '~2%',
    m25to30: '~35%',
    m30to35: '~37%',
    m35to40: '~16%',
    m40to45: '~7%',
    over45: '~2%',
  },
  notes: [
    '職業場均約 32-33 分；45 分以上是極端長局不是常態',
    'First baron 勝率約 85%，Baron 後通常快速開基收尾',
    'Stomp 應明顯短於 even；若兩者接近代表領先沒換成地圖節奏',
  ],
};

const out = {
  balance: {
    maxMatchSeconds: SIM_BALANCE.maxMatchSeconds,
    minMatchSeconds: SIM_BALANCE.minMatchSeconds,
    minOuterTowerSec: SIM_BALANCE.minOuterTowerSec,
    towerChanceBase: SIM_BALANCE.towerChanceBase,
    siegeWavePressureNeedNexus: SIM_BALANCE.siegeWavePressureNeedNexus,
    inhibitorSiegeCooldownSec: SIM_BALANCE.inhibitorSiegeCooldownSec,
    nexusTowerSiegeGapSec: SIM_BALANCE.nexusTowerSiegeGapSec,
    nexusCloseGapSec: SIM_BALANCE.nexusCloseGapSec,
  },
  proBenchmark,
  even,
  mid,
  stomp,
};

const outPath = resolve('scripts/phase-duration-pro-align-out.json');
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(JSON.stringify({
  wrote: outPath,
  even: {
    avg: even.avgDurationClock,
    p50: even.p50DurationClock,
    ge40: even.pctGe40,
    ge45: even.pctGe45,
    softMax: even.pctHitSoftMax,
    firstOuter: even.avgFirstOuterClock,
    firstInhib: even.avgFirstInhibClock,
    firstBaron: even.avgFirstBaronClock,
    canClose: even.avgCanCloseProxyClock,
    baronToEnd: even.avgBaronToEndSec,
  },
  mid: {
    avg: mid.avgDurationClock,
    p50: mid.p50DurationClock,
    ge40: mid.pctGe40,
    ge45: mid.pctGe45,
    softMax: mid.pctHitSoftMax,
    firstOuter: mid.avgFirstOuterClock,
    firstInhib: mid.avgFirstInhibClock,
    canClose: mid.avgCanCloseProxyClock,
  },
  stomp: {
    avg: stomp.avgDurationClock,
    p50: stomp.p50DurationClock,
    ge40: stomp.pctGe40,
    ge45: stomp.pctGe45,
    softMax: stomp.pctHitSoftMax,
    firstOuter: stomp.avgFirstOuterClock,
    firstInhib: stomp.avgFirstInhibClock,
    canClose: stomp.avgCanCloseProxyClock,
  },
}, null, 2));

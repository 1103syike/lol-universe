import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { simulateGame } from '../src/app/shared/sim/match-engine.ts';
import type { Player } from '../src/app/core/models/player.model.ts';
import type { Coach } from '../src/app/core/models/coach.model.ts';
import type { TimelineEvent } from '../src/app/shared/sim/match-stats.ts';

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
    team,
    input: {
      teamId: team.id,
      players: universe.players.filter((player) => player.teamId === team.id),
      coach: universe.coaches.find((coach) => coach.teamId === team.id) ?? null,
    },
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

function clock(t: number): string {
  return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
}

function structureEvents(timeline: TimelineEvent[]) {
  return timeline
    .filter(
      (event) =>
        event.type === 'tower' || event.type === 'inhibitor' || event.type === 'nexus',
    )
    .map((event) => ({
      t: event.t,
      clock: clock(event.t),
      type: event.type,
      teamId: event.teamId,
      lane: event.payload?.towerLane ?? null,
      tier: event.payload?.towerTier ?? null,
      defenderTeamId: event.payload?.defenderTeamId ?? null,
      summary: event.summary,
      forcedHint: event.summary.includes('時限攻城強推') || event.summary.includes('超兵線推進'),
    }));
}

function analyzeSiege(box: NonNullable<ReturnType<typeof simulateGame>['boxScore']>) {
  const structures = structureEvents(box.timeline);
  const inhibs = structures.filter((event) => event.type === 'inhibitor');
  const nexusTowerEvents = structures.filter(
    (event) => event.type === 'tower' && event.tier === 'nexus',
  );
  const laneTowers = structures.filter(
    (event) => event.type === 'tower' && event.tier !== 'nexus',
  );
  const nexus = structures.find((event) => event.type === 'nexus');

  const winnerId = box.winnerTeamId;
  const winnerInhibs = inhibs
    .filter((event) => event.teamId === winnerId)
    .sort((left, right) => left.t - right.t);
  const winnerNexusTowers = nexusTowerEvents
    .filter((event) => event.teamId === winnerId)
    .sort((left, right) => left.t - right.t);

  const lastInhib = winnerInhibs[winnerInhibs.length - 1] ?? null;
  const firstInhib = winnerInhibs[0] ?? null;
  const lastNexusTower = winnerNexusTowers[winnerNexusTowers.length - 1] ?? null;

  const sameSecondGroups = new Map<number, string[]>();
  for (const event of structures) {
    const list = sameSecondGroups.get(event.t) ?? [];
    list.push(`${event.type}:${String(event.tier ?? event.lane ?? '')}`);
    sameSecondGroups.set(event.t, list);
  }
  const sameSecondMulti = [...sameSecondGroups.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([t, list]) => ({ t, clock: clock(t), events: list }));

  const missingSiege =
    nexus !== null &&
    (winnerInhibs.length < 1 || winnerNexusTowers.length < 2);

  return {
    score: `${box.home.kills}-${box.away.kills}`,
    durationSec: box.durationSec,
    durationClock: clock(box.durationSec),
    structures,
    laneTowerCount: laneTowers.length,
    inhibCount: inhibs.length,
    winnerInhibCount: winnerInhibs.length,
    winnerNexusTowerCount: winnerNexusTowers.length,
    winnerInhibs: winnerInhibs.map((event) => ({
      clock: event.clock,
      lane: event.lane,
      summary: event.summary,
    })),
    winnerNexusTowers: winnerNexusTowers.map((event) => ({
      clock: event.clock,
      summary: event.summary,
    })),
    firstInhibAt: firstInhib?.t ?? null,
    lastInhibAt: lastInhib?.t ?? null,
    inhibSpanSec:
      firstInhib && lastInhib && winnerInhibs.length >= 2
        ? lastInhib.t - firstInhib.t
        : null,
    tripleInhibUnder90:
      firstInhib && lastInhib && winnerInhibs.length >= 3
        ? lastInhib.t - firstInhib.t <= 90
        : false,
    lastInhibToNexusSec:
      lastInhib && nexus ? nexus.t - lastInhib.t : null,
    lastNexusTowerToNexusSec:
      lastNexusTower && nexus ? nexus.t - lastNexusTower.t : null,
    nexusSummary: nexus?.summary ?? null,
    sameSecondMulti,
    missingSiegeBeforeNexus: missingSiege,
    hasForceHint: structures.some((event) => event.forcedHint),
  };
}

type Analysis = ReturnType<typeof analyzeSiege>;

function collectStats(rows: Analysis[]) {
  const gaps = rows
    .map((row) => row.lastInhibToNexusSec)
    .filter((value): value is number => value !== null && value >= 0);
  const inhibSpans = rows
    .map((row) => row.inhibSpanSec)
    .filter((value): value is number => value !== null);
  return {
    runs: rows.length,
    withWinnerInhib: rows.filter((row) => row.winnerInhibCount > 0).length,
    with3WinnerInhib: rows.filter((row) => row.winnerInhibCount >= 3).length,
    missingSiegeBeforeNexus: rows.filter((row) => row.missingSiegeBeforeNexus).length,
    tripleInhibUnder90: rows.filter((row) => row.tripleInhibUnder90).length,
    lastInhibToNexusUnder90: gaps.filter((gap) => gap <= 90).length,
    lastInhibToNexusUnder45: gaps.filter((gap) => gap <= 45).length,
    avgLastInhibToNexus: gaps.length
      ? Math.round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length)
      : null,
    minLastInhibToNexus: gaps.length ? Math.min(...gaps) : null,
    maxLastInhibToNexus: gaps.length ? Math.max(...gaps) : null,
    avgInhibSpanWhenMulti: inhibSpans.length
      ? Math.round(inhibSpans.reduce((sum, gap) => sum + gap, 0) / inhibSpans.length)
      : null,
    sameSecondStructureTicks: rows.reduce(
      (sum, row) => sum + row.sameSecondMulti.length,
      0,
    ),
  };
}

const mcx = side('MCX');
const oce = side('OCE');

let caseHit: {
  seed: number;
  home: string;
  away: string;
  analysis: Analysis;
} | null = null;

for (let seed = 0; seed < 800 && !caseHit; seed += 1) {
  for (const [homeSide, awaySide, homeAbbr, awayAbbr, base] of [
    [mcx, oce, 'MCX', 'OCE', 760000],
    [oce, mcx, 'OCE', 'MCX', 770000],
  ] as const) {
    const report = simulateGame({
      home: homeSide.input,
      away: awaySide.input,
      random: mulberry32(base + seed),
    });
    const box = report.boxScore!;
    const analysis = analyzeSiege(box);
    const scoreOk =
      (homeAbbr === 'MCX' &&
        box.home.kills === 11 &&
        box.away.kills === 35) ||
      (homeAbbr === 'OCE' &&
        box.home.kills === 35 &&
        box.away.kills === 11);
    const patternOk =
      analysis.winnerInhibCount >= 3 &&
      analysis.inhibSpanSec !== null &&
      analysis.inhibSpanSec <= 120 &&
      analysis.lastInhibToNexusSec !== null &&
      analysis.lastInhibToNexusSec <= 120 &&
      box.durationSec >= 40 * 60 &&
      box.durationSec <= 45 * 60;
    if (scoreOk || patternOk) {
      caseHit = {
        seed: base + seed,
        home: homeAbbr,
        away: awayAbbr,
        analysis: {
          ...analysis,
          score: `${homeAbbr === 'MCX' ? box.home.kills : box.away.kills}-${
            homeAbbr === 'MCX' ? box.away.kills : box.home.kills
          } (home ${homeAbbr} ${box.home.kills}-${box.away.kills})`,
        },
      };
      if (scoreOk) break;
    }
  }
}

if (!caseHit) {
  const report = simulateGame({
    home: mcx.input,
    away: oce.input,
    random: mulberry32(760042),
  });
  caseHit = {
    seed: 760042,
    home: 'MCX',
    away: 'OCE',
    analysis: analyzeSiege(report.boxScore!),
  };
}

const batch: Analysis[] = [];
const pairs: Array<[string, string]> = [
  ['MCX', 'OCE'],
  ['RM', 'JT'],
  ['GT', 'ahq'],
  ['JT', 'RM'],
];
for (let pairIndex = 0; pairIndex < pairs.length; pairIndex += 1) {
  const [homeAbbr, awayAbbr] = pairs[pairIndex];
  const homeSide = side(homeAbbr);
  const awaySide = side(awayAbbr);
  for (let index = 0; index < 25; index += 1) {
    const report = simulateGame({
      home: homeSide.input,
      away: awaySide.input,
      random: mulberry32(790000 + pairIndex * 1000 + index * 13),
    });
    batch.push(analyzeSiege(report.boxScore!));
  }
}

const out = {
  note: 'Phase G-1 siege audit only; no code changes',
  caseSearch: {
    exactUiPersisted: false,
    picked: caseHit,
  },
  batchStats: collectStats(batch),
  fastCloseSamples: batch
    .filter(
      (row) =>
        row.lastInhibToNexusSec !== null &&
        row.lastInhibToNexusSec <= 90 &&
        row.winnerInhibCount >= 1,
    )
    .slice(0, 12)
    .map((row) => ({
      score: row.score,
      durationClock: row.durationClock,
      winnerInhibCount: row.winnerInhibCount,
      inhibSpanSec: row.inhibSpanSec,
      lastInhibToNexusSec: row.lastInhibToNexusSec,
      winnerNexusTowerCount: row.winnerNexusTowerCount,
      nexusSummary: row.nexusSummary,
      sameSecondMulti: row.sameSecondMulti.slice(0, 3),
    })),
};

writeFileSync(resolve('scripts/phase-g1-siege-out.json'), JSON.stringify(out, null, 2));
console.log(
  JSON.stringify(
    {
      case: {
        seed: caseHit.seed,
        home: caseHit.home,
        away: caseHit.away,
        score: caseHit.analysis.score,
        duration: caseHit.analysis.durationClock,
        winnerInhibs: caseHit.analysis.winnerInhibs,
        inhibSpanSec: caseHit.analysis.inhibSpanSec,
        winnerNexusTowers: caseHit.analysis.winnerNexusTowers,
        lastInhibToNexusSec: caseHit.analysis.lastInhibToNexusSec,
        lastNexusTowerToNexusSec: caseHit.analysis.lastNexusTowerToNexusSec,
        missingSiege: caseHit.analysis.missingSiegeBeforeNexus,
        sameSecondMulti: caseHit.analysis.sameSecondMulti,
        nexusSummary: caseHit.analysis.nexusSummary,
      },
      batchStats: out.batchStats,
      fastCloseCount: out.fastCloseSamples.length,
    },
    null,
    2,
  ),
);

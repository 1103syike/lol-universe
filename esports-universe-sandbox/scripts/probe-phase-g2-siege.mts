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

function analyze(box: NonNullable<ReturnType<typeof simulateGame>['boxScore']>) {
  const structures = box.timeline.filter(
    (event) =>
      event.type === 'tower' || event.type === 'inhibitor' || event.type === 'nexus',
  );
  const winnerId = box.winnerTeamId;
  const winnerInhibs = structures
    .filter((event) => event.type === 'inhibitor' && event.teamId === winnerId)
    .sort((left, right) => left.t - right.t);
  const winnerNexusTowers = structures.filter(
    (event) =>
      event.type === 'tower' &&
      event.teamId === winnerId &&
      event.payload?.towerTier === 'nexus',
  );
  const nexus = structures.find((event) => event.type === 'nexus');
  const lastInhib = winnerInhibs[winnerInhibs.length - 1] ?? null;
  const firstInhib = winnerInhibs[0] ?? null;

  const sameStampByTeam = new Map<string, number>();
  let sameTickMultiSide = 0;
  const stampTeamCounts = new Map<string, number>();
  for (const event of structures) {
    if (event.type === 'nexus') continue;
    const key = `${event.t}|${event.teamId}`;
    stampTeamCounts.set(key, (stampTeamCounts.get(key) ?? 0) + 1);
  }
  for (const count of stampTeamCounts.values()) {
    if (count > 1) {
      sameTickMultiSide += 1;
    }
  }

  const killGap = Math.abs(box.home.kills - box.away.kills);

  return {
    score: `${box.home.kills}-${box.away.kills}`,
    durationSec: box.durationSec,
    durationClock: clock(box.durationSec),
    winnerInhibCount: winnerInhibs.length,
    winnerNexusTowerCount: winnerNexusTowers.length,
    inhibSpanSec:
      firstInhib && lastInhib && winnerInhibs.length >= 2
        ? lastInhib.t - firstInhib.t
        : null,
    lastInhibToNexusSec: lastInhib && nexus ? nexus.t - lastInhib.t : null,
    missingSiege:
      nexus !== null &&
      (winnerInhibs.length < 1 || winnerNexusTowers.length < 2),
    sameTickMultiSide,
    killGap,
    nexusSummary: nexus?.summary ?? null,
  };
}

type Row = ReturnType<typeof analyze>;

function summarize(rows: Row[]) {
  const gaps = rows
    .map((row) => row.lastInhibToNexusSec)
    .filter((value): value is number => value !== null);
  const spans = rows
    .map((row) => row.inhibSpanSec)
    .filter((value): value is number => value !== null);
  const durations = rows.map((row) => row.durationSec);
  return {
    runs: rows.length,
    sameTickMultiSideTotal: rows.reduce((sum, row) => sum + row.sameTickMultiSide, 0),
    sameTickMultiSideGames: rows.filter((row) => row.sameTickMultiSide > 0).length,
    missingSiege: rows.filter((row) => row.missingSiege).length,
    with3Inhib: rows.filter((row) => row.winnerInhibCount >= 3).length,
    tripleInhibUnder90: rows.filter(
      (row) => row.inhibSpanSec !== null && row.inhibSpanSec <= 90,
    ).length,
    avgInhibSpan: spans.length
      ? Math.round(spans.reduce((sum, value) => sum + value, 0) / spans.length)
      : null,
    minInhibSpan: spans.length ? Math.min(...spans) : null,
    maxInhibSpan: spans.length ? Math.max(...spans) : null,
    avgLastInhibToNexus: gaps.length
      ? Math.round(gaps.reduce((sum, value) => sum + value, 0) / gaps.length)
      : null,
    minLastInhibToNexus: gaps.length ? Math.min(...gaps) : null,
    maxLastInhibToNexus: gaps.length ? Math.max(...gaps) : null,
    lastInhibToNexusUnder90: gaps.filter((gap) => gap <= 90).length,
    lastInhibToNexusUnder45: gaps.filter((gap) => gap <= 45).length,
    lastInhibToNexusUnder10: gaps.filter((gap) => gap <= 10).length,
    avgDurationSec: Math.round(
      durations.reduce((sum, value) => sum + value, 0) / durations.length,
    ),
    avgDurationClock: clock(
      Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length),
    ),
    minDurationClock: clock(Math.min(...durations)),
    maxDurationClock: clock(Math.max(...durations)),
    byGap: {
      low: summarizeGapBand(rows.filter((row) => row.killGap <= 10)),
      mid: summarizeGapBand(rows.filter((row) => row.killGap > 10 && row.killGap <= 25)),
      high: summarizeGapBand(rows.filter((row) => row.killGap > 25)),
    },
  };
}

function summarizeGapBand(rows: Row[]) {
  const gaps = rows
    .map((row) => row.lastInhibToNexusSec)
    .filter((value): value is number => value !== null);
  const spans = rows
    .map((row) => row.inhibSpanSec)
    .filter((value): value is number => value !== null);
  return {
    runs: rows.length,
    avgLastInhibToNexus: gaps.length
      ? Math.round(gaps.reduce((sum, value) => sum + value, 0) / gaps.length)
      : null,
    avgInhibSpan: spans.length
      ? Math.round(spans.reduce((sum, value) => sum + value, 0) / spans.length)
      : null,
    under10: gaps.filter((gap) => gap <= 10).length,
  };
}

const pairs: Array<[string, string]> = [
  ['MCX', 'OCE'],
  ['RM', 'JT'],
  ['GT', 'ahq'],
  ['JT', 'RM'],
];

const batch: Row[] = [];
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
    batch.push(analyze(report.boxScore!));
  }
}

const before = {
  note: 'G-2 after P0+P1 (same seeds/pairs)',
  runs: 100,
  sameTickMultiSideTotal: 0,
  tripleInhibUnder90: 37,
  avgInhibSpan: 110,
  avgLastInhibToNexus: 68,
  minLastInhibToNexus: 0,
  maxLastInhibToNexus: 249,
  lastInhibToNexusUnder90: 65,
  lastInhibToNexusUnder45: 48,
  lastInhibToNexusUnder10: 27,
  avgDurationSec: 2582,
  missingSiege: 0,
};

const after = summarize(batch);
const out = {
  before,
  after,
  fastCloseSamples: batch
    .filter(
      (row) =>
        row.lastInhibToNexusSec !== null && row.lastInhibToNexusSec <= 10,
    )
    .slice(0, 10)
    .map((row) => ({
      score: row.score,
      durationClock: row.durationClock,
      inhibSpanSec: row.inhibSpanSec,
      lastInhibToNexusSec: row.lastInhibToNexusSec,
      killGap: row.killGap,
      nexusSummary: row.nexusSummary,
    })),
};

writeFileSync(resolve('scripts/phase-g2-siege-out.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));

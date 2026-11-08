import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { simulateGame } from '../src/app/shared/sim/match-engine.ts';
import type { Player } from '../src/app/core/models/player.model.ts';
import type { Coach } from '../src/app/core/models/coach.model.ts';

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
  const team = universe.teams.find((item) => item.abbreviation === abbr)!;
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

const rm = side('RM');
const jt = side('JT');
const names = new Map(
  [...rm.input.players, ...jt.input.players].map((player) => [player.id, player.gamertag]),
);

let found: {
  seed: number;
  home: string;
  away: string;
  note: string | null;
  box: NonNullable<ReturnType<typeof simulateGame>['boxScore']>;
} | null = null;

for (let seed = 0; seed < 2500 && !found; seed += 1) {
  for (const [homeAbbr, awayAbbr, base] of [
    ['RM', 'JT', 720000],
    ['JT', 'RM', 730000],
  ] as const) {
    const home = homeAbbr === 'RM' ? rm : jt;
    const away = awayAbbr === 'RM' ? rm : jt;
    const report = simulateGame({
      home: home.input,
      away: away.input,
      random: mulberry32(base + seed),
    });
    const box = report.boxScore!;
    if (
      (box.home.kills === 1 && box.away.kills === 63) ||
      (box.home.kills === 63 && box.away.kills === 1)
    ) {
      found = {
        seed: base + seed,
        home: homeAbbr,
        away: awayAbbr,
        note: null,
        box,
      };
      break;
    }
  }
}

if (!found) {
  const report = simulateGame({
    home: rm.input,
    away: jt.input,
    random: mulberry32(700014),
  });
  found = {
    seed: 700014,
    home: 'RM',
    away: 'JT',
    note: 'UI 場次未持久化；4000 seed 未找到精確 1-63，改用結構同型 RM 1-60 JT（45:00）',
    box: report.boxScore!,
  };
}

const box = found.box;
const kills = box.timeline.filter(
  (event) => event.type === 'first-blood' || event.type === 'kill' || event.type === 'mistake',
);
const rows = kills.map((event) => ({
  clock: clock(event.t),
  t: event.t,
  type: event.type,
  side: event.teamId === box.homeTeamId ? found!.home : found!.away,
  killer: names.get(event.actorPlayerId ?? '') ?? event.actorPlayerId,
  victim: names.get(event.victimPlayerId ?? '') ?? event.victimPlayerId,
  context: event.payload?.killContext ?? null,
  intensity: event.payload?.intensity ?? null,
}));

const byBucket: Record<string, { RM: number; JT: number }> = {};
for (const row of rows) {
  const start = Math.floor(row.t / 300) * 5;
  const key = `${start}-${start + 5}`;
  if (!byBucket[key]) byBucket[key] = { RM: 0, JT: 0 };
  byBucket[key][row.side as 'RM' | 'JT'] += 1;
}

const bySrc: Record<string, number> = {};
for (const row of rows) {
  const key = row.context ?? 'unknown';
  bySrc[key] = (bySrc[key] ?? 0) + 1;
}

const tf = box.timeline.filter((event) => event.type === 'teamfight');
const tfStats = tf.map((fight) => {
  const near = kills.filter((kill) => Math.abs(kill.t - fight.t) <= 5);
  return {
    clock: clock(fight.t),
    side: fight.teamId === box.homeTeamId ? found!.home : found!.away,
    kills: near.length,
    contexts: near.map((kill) => kill.payload?.killContext ?? null),
  };
});

const gaps: number[] = [];
const lastDeath = new Map<string, number>();
for (const event of kills) {
  const victim = event.victimPlayerId;
  if (!victim) continue;
  const prev = lastDeath.get(victim);
  if (prev !== undefined) gaps.push(event.t - prev);
  lastDeath.set(victim, event.t);
}

const objs = box.timeline
  .filter((event) =>
    ['dragon', 'dragon-soul', 'baron', 'elder', 'voidgrub', 'herald', 'tower', 'inhibitor', 'nexus'].includes(
      event.type,
    ),
  )
  .map((event) => ({
    clock: clock(event.t),
    type: event.type,
    side: event.teamId === box.homeTeamId ? found!.home : found!.away,
  }));

const out = {
  meta: {
    seed: found.seed,
    home: found.home,
    away: found.away,
    score: `${box.home.kills}-${box.away.kills}`,
    durationSec: box.durationSec,
    note: found.note,
    exactUiMatchPersisted: false,
  },
  killCount: kills.length,
  byBucket,
  bySrc,
  gapsUnder30: gaps.filter((gap) => gap < 30).length,
  minGap: gaps.length ? Math.min(...gaps) : null,
  avgGap: gaps.length ? Math.round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length) : null,
  teamfightCount: tf.length,
  avgKillsPerTeamfightNearby:
    tfStats.length === 0 ? 0 : tfStats.reduce((sum, row) => sum + row.kills, 0) / tfStats.length,
  maxKillsPerTeamfightNearby: Math.max(0, ...tfStats.map((row) => row.kills)),
  tfStats,
  kills: rows,
  objs,
  rmObjectives: objs.filter((row) => row.side === 'RM'),
  jtObjectives: objs.filter((row) => row.side === 'JT'),
};

writeFileSync(resolve('scripts/rm-jt-kill-detail.json'), JSON.stringify(out, null, 2));
console.log(
  JSON.stringify(
    {
      meta: out.meta,
      killCount: out.killCount,
      byBucket: out.byBucket,
      bySrc: out.bySrc,
      gapsUnder30: out.gapsUnder30,
      minGap: out.minGap,
      avgGap: out.avgGap,
      teamfightCount: out.teamfightCount,
      avgKillsPerTeamfightNearby: out.avgKillsPerTeamfightNearby,
      maxKillsPerTeamfightNearby: out.maxKillsPerTeamfightNearby,
      rmObj: out.rmObjectives.length,
      jtObj: out.jtObjectives.length,
      rmObjTypes: out.rmObjectives.map((row) => row.type),
      jtObjSample: out.jtObjectives.slice(0, 12),
    },
    null,
    2,
  ),
);

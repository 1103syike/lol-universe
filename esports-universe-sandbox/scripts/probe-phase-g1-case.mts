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

const home = side('MCX');
const away = side('OCE');

type Candidate = {
  seed: number;
  score: string;
  duration: string;
  durationSec: number;
  homeK: number;
  awayK: number;
  winner: string;
  inhibs: Array<{ c: string; lane: string | null; s: string }>;
  span: number | null;
  gap: number | null;
  nexus: string | null;
  matchScore: number;
  structures: Array<{
    t: number;
    c: string;
    type: string;
    lane: string | null;
    tier: string | number | null;
    team: string;
    sum: string;
  }>;
};

let best: Candidate | null = null;

for (let seed = 760000; seed < 761500; seed += 1) {
  const report = simulateGame({
    home: home.input,
    away: away.input,
    random: mulberry32(seed),
  });
  const box = report.boxScore!;
  const inhibs = box.timeline
    .filter((event) => event.type === 'inhibitor' && event.teamId === box.winnerTeamId)
    .sort((left, right) => left.t - right.t);
  const nexus = box.timeline.find((event) => event.type === 'nexus');
  const lastInhib = inhibs[inhibs.length - 1];
  const gap = lastInhib && nexus ? nexus.t - lastInhib.t : null;
  const span =
    inhibs.length >= 2 ? inhibs[inhibs.length - 1].t - inhibs[0].t : null;
  const matchScore =
    Math.abs(box.durationSec - (41 * 60 + 56)) +
    Math.abs(box.home.kills - 11) * 8 +
    Math.abs(box.away.kills - 35) * 2 +
    (span !== null ? Math.abs(span - 86) * 0.5 : 50) +
    (gap !== null ? Math.abs(gap - 76) * 0.5 : 50);
  if (!best || matchScore < best.matchScore) {
    best = {
      seed,
      score: `${box.home.kills}-${box.away.kills}`,
      duration: clock(box.durationSec),
      durationSec: box.durationSec,
      homeK: box.home.kills,
      awayK: box.away.kills,
      winner: box.winnerTeamId === home.team.id ? 'MCX' : 'OCE',
      inhibs: inhibs.map((event) => ({
        c: clock(event.t),
        lane: event.payload?.towerLane ?? null,
        s: event.summary,
      })),
      span,
      gap,
      nexus: nexus?.summary ?? null,
      matchScore,
      structures: box.timeline
        .filter(
          (event) =>
            event.type === 'tower' ||
            event.type === 'inhibitor' ||
            event.type === 'nexus',
        )
        .map((event) => ({
          t: event.t,
          c: clock(event.t),
          type: event.type,
          lane: event.payload?.towerLane ?? null,
          tier: event.payload?.towerTier ?? null,
          team: event.teamId === home.team.id ? 'MCX' : 'OCE',
          sum: event.summary,
        })),
    };
  }
}

writeFileSync(resolve('scripts/phase-g1-mcx-oce-best.json'), JSON.stringify(best, null, 2));
console.log(
  JSON.stringify(
    {
      seed: best?.seed,
      score: best?.score,
      duration: best?.duration,
      span: best?.span,
      gap: best?.gap,
      matchScore: best?.matchScore,
      inhibs: best?.inhibs,
      nexus: best?.nexus,
      structureCount: best?.structures.length,
    },
    null,
    2,
  ),
);

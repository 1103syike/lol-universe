import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { simulateGame } from '../src/app/shared/sim/match-engine.ts';
import { respawnDurationAt } from '../src/app/shared/sim/death-state.ts';
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

function auditPair(homeAbbr: string, awayAbbr: string, seeds: number[]) {
  const home = side(homeAbbr);
  const away = side(awayAbbr);
  const rows = [];
  let extreme = 0;
  let illegalRekill = 0;
  for (const seed of seeds) {
    const report = simulateGame({
      home: home.input,
      away: away.input,
      random: mulberry32(seed),
    });
    const box = report.boxScore!;
    const kills = box.timeline.filter(
      (event) => event.type === 'first-blood' || event.type === 'kill' || event.type === 'mistake',
    );
    const lastDeath = new Map<string, number>();
    for (const event of kills) {
      const victim = event.victimPlayerId;
      if (!victim) continue;
      const prev = lastDeath.get(victim);
      if (prev !== undefined && event.t < prev + respawnDurationAt(prev)) {
        illegalRekill += 1;
      }
      lastDeath.set(victim, event.t);
    }
    const min = Math.min(box.home.kills, box.away.kills);
    const max = Math.max(box.home.kills, box.away.kills);
    if (min <= 2 && max >= 50) extreme += 1;
    rows.push({
      seed,
      score: `${box.home.kills}-${box.away.kills}`,
      total: box.home.kills + box.away.kills,
      durationMin: Math.round((box.durationSec / 60) * 10) / 10,
    });
  }
  return {
    pair: `${homeAbbr} vs ${awayAbbr}`,
    runs: seeds.length,
    extremeGe50: extreme,
    sameVictimUnder8s: illegalRekill,
    avgTotalKills: rows.reduce((sum, row) => sum + row.total, 0) / rows.length,
    avgDurationMin: rows.reduce((sum, row) => sum + row.durationMin, 0) / rows.length,
    maxSpread: Math.max(
      ...rows.map((row) => {
        const [a, b] = row.score.split('-').map(Number);
        return Math.abs(a - b);
      }),
    ),
    sample: rows.slice(0, 8),
  };
}

const seeds = Array.from({ length: 40 }, (_, index) => 880000 + index * 17);
const out = {
  note: 'Phase F death-state probe; killSnowball unchanged',
  samePower: auditPair('RM', 'JT', seeds),
  strengthGap: auditPair('GT', 'ahq', seeds.map((seed) => seed + 1000)),
  reverse: auditPair('JT', 'RM', seeds.map((seed) => seed + 2000)),
};

writeFileSync(resolve('scripts/phase-f-death-out.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));

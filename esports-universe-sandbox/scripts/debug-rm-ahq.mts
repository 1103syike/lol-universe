import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Player } from '../src/app/core/models/player.model.ts';
import type { Coach } from '../src/app/core/models/coach.model.ts';
import { calculateChemistry } from '../src/app/shared/sim/chemistry.ts';
import { simulateLiveMatch } from '../src/app/shared/sim/live-match.ts';
import { buildTeamProfile } from '../src/app/shared/sim/team-profile.ts';

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
    teamId: team.id,
    abbr,
    players: universe.players.filter((player) => player.teamId === team.id),
    coach: universe.coaches.find((coach) => coach.teamId === team.id) ?? null,
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

const rm = side('RM');
const ahq = side('ahq');
const rows = [];
for (let index = 0; index < 15; index += 1) {
  const random = mulberry32(42_000 + index * 91);
  const homeProfile = buildTeamProfile(
    ahq.teamId,
    ahq.players,
    ahq.coach,
    random,
    calculateChemistry(ahq.players, ahq.coach),
  );
  const awayProfile = buildTeamProfile(
    rm.teamId,
    rm.players,
    rm.coach,
    random,
    calculateChemistry(rm.players, rm.coach),
  );
  const { boxScore } = simulateLiveMatch({
    home: homeProfile,
    away: awayProfile,
    random,
    modifiers: {
      draftEdge: -3.4,
      matchupByPhase: { early: -0.45, mid: -0.35, late: -0.25 },
    },
  });
  const box = boxScore!;
  const ahqK = box.players
    .filter((player) => player.teamId === ahq.teamId)
    .reduce((sum, player) => sum + player.kills, 0);
  const rmK = box.players
    .filter((player) => player.teamId === rm.teamId)
    .reduce((sum, player) => sum + player.kills, 0);
  const ahqG = box.players
    .filter((player) => player.teamId === ahq.teamId)
    .reduce((sum, player) => sum + player.gold, 0);
  const rmG = box.players
    .filter((player) => player.teamId === rm.teamId)
    .reduce((sum, player) => sum + player.gold, 0);
  rows.push({
    winner: box.winnerTeamId === ahq.teamId ? 'ahq' : 'RM',
    score: `ahq ${ahqK} - RM ${rmK}`,
    goldK: `${(ahqG / 1000).toFixed(1)}-${(rmG / 1000).toFixed(1)}`,
    dur: Number((box.durationSec / 60).toFixed(1)),
    nexus: box.timeline.find((event) => event.type === 'nexus')?.summary ?? null,
    ahqPlayers: homeProfile.players.length,
    rmPlayers: awayProfile.players.length,
    ahqAvgLaning: Number(
      (
        homeProfile.players.reduce((sum, view) => sum + view.effective.laning, 0) /
        homeProfile.players.length
      ).toFixed(1),
    ),
    rmAvgLaning: Number(
      (
        awayProfile.players.reduce((sum, view) => sum + view.effective.laning, 0) /
        awayProfile.players.length
      ).toFixed(1),
    ),
  });
}

console.log(JSON.stringify({
  ahqWins: rows.filter((row) => row.winner === 'ahq').length,
  rows,
}, null, 2));

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MSI_2021_GUESTS } from '../src/app/core/data/msi-2021.ts';
import { getMsiGuestBundle } from '../src/app/core/data/msi-guest-roster.ts';
import { simulateGame } from '../src/app/shared/sim/match-engine.ts';
import { calculatePlayerOvr } from '../src/app/shared/utils/player-ovr.ts';
import type { Player } from '../src/app/core/models/player.model.ts';
import type { Coach } from '../src/app/core/models/coach.model.ts';

const db = JSON.parse(readFileSync(resolve('db/db.json'), 'utf8'));
const universe = (
  db.entries as Array<{ id: string; value: unknown }>
).find((entry) => entry.id.startsWith('eus.universe.'))?.value as {
  teams: Array<{ id: string; abbreviation: string }>;
  players: Player[];
  coaches: Coach[];
};

const jt = universe.teams.find((team) => team.abbreviation === 'JT');
if (!jt) {
  throw new Error('JT missing');
}
const jtPlayers = universe.players.filter((player) => player.teamId === jt.id);
const jtCoach = universe.coaches.find((coach) => coach.teamId === jt.id) ?? null;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const roster = MSI_2021_GUESTS.map((guest) => {
  const bundle = getMsiGuestBundle(guest.id);
  if (!bundle) {
    throw new Error(`missing ${guest.id}`);
  }
  return {
    id: guest.id,
    region: guest.region,
    teamOvr: bundle.teamOvr,
    coach: bundle.coach.gamertag,
    players: bundle.players.map((player) => ({
      tag: player.gamertag,
      pos: player.position,
      ovr: Math.round(calculatePlayerOvr(player.attributes, player.position)),
    })),
  };
});

const samples: unknown[] = [];
for (const guestId of ['dk', 'rng', 'mad', 'c9', 'pgg', 'inf'] as const) {
  const guest = getMsiGuestBundle(guestId);
  if (!guest) continue;
  let guestWins = 0;
  for (let index = 0; index < 20; index += 1) {
    const report = simulateGame({
      home: { teamId: guest.teamId, players: guest.players, coach: guest.coach },
      away: { teamId: jt.id, players: jtPlayers, coach: jtCoach },
      random: mulberry32(5000 + index * 17 + guestId.charCodeAt(0)),
    });
    if (report.winnerTeamId === guest.teamId) guestWins += 1;
  }
  samples.push({
    guest: guestId,
    region: guest.guest.region,
    guestOvr: guest.teamOvr,
    winRateVsJT: `${guestWins}/20`,
  });
}

const out = { roster, samples };
writeFileSync(resolve('scripts/probe-msi-guests-out.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));

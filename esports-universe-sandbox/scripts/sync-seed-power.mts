import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  RETIRED_SEED_PLAYER_TAGS,
  SEED_POWER_REVISION,
  resolvePlayerPower,
} from '../src/app/core/data/player-power-profiles.ts';
import { ATTRIBUTE_KEYS } from '../src/app/core/models/player.model.ts';

const dbPath = resolve('db/db.json');
const db = JSON.parse(readFileSync(dbPath, 'utf8'));
const entry = (db.entries as Array<{ id: string; value: any }>).find(
  (item) => item.id.startsWith('eus.universe.') && item.value?.players,
);

if (!entry) {
  throw new Error('universe entry not found');
}

const universe = entry.value;
const teamById = new Map(universe.teams.map((team: any) => [team.id, team]));
let updated = 0;

universe.players = universe.players.map((player: any) => {
  if (RETIRED_SEED_PLAYER_TAGS.has(player.gamertag)) {
    return player;
  }

  const team = player.teamId ? teamById.get(player.teamId) : null;
  if (!team) {
    return player;
  }

  const power = resolvePlayerPower({
    gamertag: player.gamertag,
    position: player.position,
    teamAbbr: team.abbreviation,
    leagueTier: team.leagueTier,
  });
  updated += 1;
  return {
    ...player,
    attributes: power.attributes,
    form: power.form,
    rarity: power.rarity,
  };
});

universe.seedPowerRevision = SEED_POWER_REVISION;

const teams = universe.teams.map((team: any) => {
  const players = universe.players.filter((player: any) => player.teamId === team.id);
  const avgs = players.map((player: any) => {
    const values = ATTRIBUTE_KEYS.map((key) => player.attributes?.[key]?.current ?? 0);
    return values.reduce((sum: number, value: number) => sum + value, 0) / Math.max(1, values.length);
  });
  const teamAvg = avgs.length
    ? avgs.reduce((sum: number, value: number) => sum + value, 0) / avgs.length
    : 0;
  return {
    abbr: team.abbreviation,
    tier: team.leagueTier,
    teamAvg: Number(teamAvg.toFixed(1)),
  };
});

writeFileSync(dbPath, JSON.stringify(db, null, 2));

const byTier = new Map<string, typeof teams>();
for (const team of teams) {
  const key = String(team.tier ?? 'unknown');
  const list = byTier.get(key) ?? [];
  list.push(team);
  byTier.set(key, list);
}

console.log(
  JSON.stringify(
    {
      revision: SEED_POWER_REVISION,
      updatedPlayers: updated,
      tiers: [...byTier.entries()].map(([tier, list]) => {
        const sorted = [...list].sort((a, b) => b.teamAvg - a.teamAvg);
        const avgs = sorted.map((team) => team.teamAvg);
        return {
          tier,
          floor: Math.min(...avgs),
          ceiling: Math.max(...avgs),
          spread: Number((Math.max(...avgs) - Math.min(...avgs)).toFixed(1)),
          ranking: sorted.map((team) => `${team.abbr} ${team.teamAvg}`),
        };
      }),
    },
    null,
    2,
  ),
);

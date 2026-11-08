import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ATTRIBUTE_KEYS } from '../src/app/core/models/player.model.ts';

const db = JSON.parse(readFileSync(resolve('db/db.json'), 'utf8'));
const universe = (
  db.entries as Array<{ id: string; value: any }>
).find((entry) => entry.id.startsWith('eus.universe.') && entry.value?.players)!.value;

function playerAvg(player: any): number {
  const values = ATTRIBUTE_KEYS.map((key) => player.attributes?.[key]?.current ?? 0);
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

const teams = universe.teams.map((team: any) => {
  const players = universe.players.filter((player: any) => player.teamId === team.id);
  const avgs = players.map(playerAvg);
  const teamAvg = avgs.length
    ? avgs.reduce((sum: number, value: number) => sum + value, 0) / avgs.length
    : 0;
  return {
    id: team.id,
    abbr: team.abbreviation,
    name: team.name,
    leagueId: team.leagueId ?? team.league ?? null,
    region: team.region ?? null,
    tier: team.leagueTier ?? team.tier ?? null,
    playerCount: players.length,
    teamAvg: Number(teamAvg.toFixed(1)),
    minPlayer: avgs.length ? Number(Math.min(...avgs).toFixed(1)) : 0,
    maxPlayer: avgs.length ? Number(Math.max(...avgs).toFixed(1)) : 0,
  };
});

const byLeague = new Map<string, typeof teams>();
for (const team of teams) {
  const key = String(team.tier ?? team.leagueId ?? team.region ?? 'unknown');
  const list = byLeague.get(key) ?? [];
  list.push(team);
  byLeague.set(key, list);
}

const leagues = [...byLeague.entries()]
  .map(([league, list]) => {
    const sorted = [...list].sort((a, b) => b.teamAvg - a.teamAvg);
    const avgs = sorted.map((team) => team.teamAvg);
    return {
      league,
      teams: sorted.length,
      leagueAvg: Number(
        (avgs.reduce((sum, value) => sum + value, 0) / Math.max(1, avgs.length)).toFixed(1),
      ),
      floor: Number(Math.min(...avgs).toFixed(1)),
      ceiling: Number(Math.max(...avgs).toFixed(1)),
      spread: Number((Math.max(...avgs) - Math.min(...avgs)).toFixed(1)),
      ranking: sorted.map((team) => `${team.abbr} ${team.teamAvg}`),
    };
  })
  .sort((a, b) => b.leagueAvg - a.leagueAvg);

const out = {
  teamCount: teams.length,
  weakest: [...teams].sort((a, b) => a.teamAvg - b.teamAvg).slice(0, 10),
  strongest: [...teams].sort((a, b) => b.teamAvg - a.teamAvg).slice(0, 10),
  leagues,
  sampleTeamKeys: universe.teams[0] ? Object.keys(universe.teams[0]) : [],
};

writeFileSync(resolve('scripts/league-power-audit.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));

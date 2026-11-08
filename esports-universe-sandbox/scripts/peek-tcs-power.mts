import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { applySeedCoachDefaults } from '../src/app/core/data/initial-teams.ts';
import { calculateCoachOvr, calculatePlayerOvr } from '../src/app/shared/utils/player-ovr.ts';

const dbPath = resolve('db/db.json');
const db = JSON.parse(readFileSync(dbPath, 'utf8'));
for (const entry of db.entries as Array<{ id: string; value: any }>) {
  if (!entry.id.startsWith('eus.universe.') || !entry.value?.players) {
    continue;
  }
  entry.value.coaches = applySeedCoachDefaults(entry.value.coaches ?? []);
}
writeFileSync(dbPath, JSON.stringify(db, null, 2));

const universe = (
  db.entries as Array<{ id: string; value: any }>
).find((entry) => entry.id === 'eus.universe.d758e2a5-1c0c-4787-a4d8-08f6da638c97')!.value;

const focus = ['GT', 'RM', 'WS', 'FEG', 'JT', 'PSG', 'DCG', 'MAD', 'HKA', 'ahq'];
const rows = focus.map((abbr) => {
  const team = universe.teams.find((item: any) => item.abbreviation === abbr);
  const players = universe.players
    .filter((player: any) => player.teamId === team.id)
    .map((player: any) => ({
      tag: player.gamertag,
      pos: player.position,
      ovr: calculatePlayerOvr(player.attributes, player.position),
    }))
    .sort((a: any, b: any) => b.ovr - a.ovr);
  const avg = players.reduce((sum: number, player: any) => sum + player.ovr, 0) / players.length;
  const coach = universe.coaches.find((item: any) => item.teamId === team.id);
  return {
    abbr,
    avg: Number(avg.toFixed(1)),
    coach: coach
      ? { tag: coach.gamertag, ovr: calculateCoachOvr(coach.attributes) }
      : null,
    players,
  };
});

console.log(JSON.stringify(rows, null, 2));

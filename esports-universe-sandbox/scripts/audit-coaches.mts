import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const db = JSON.parse(readFileSync(resolve('db/db.json'), 'utf8'));
const universe = (
  db.entries as Array<{ id: string; value: any }>
).find((entry) => entry.id.startsWith('eus.universe.') && entry.value?.players)!.value;

const rows = universe.teams.map((team: any) => {
  const byId = universe.coaches.find((coach: any) => coach.id === team.coachId);
  const byTeam = universe.coaches.find((coach: any) => coach.teamId === team.id);
  return {
    abbr: team.abbreviation,
    coachId: team.coachId,
    byId: byId?.gamertag ?? null,
    byTeam: byTeam?.gamertag ?? null,
  };
});

console.log(
  JSON.stringify(
    {
      coachCount: universe.coaches.length,
      missingCoachId: rows.filter((row: any) => !row.coachId).map((row: any) => row.abbr),
      missingByTeam: rows.filter((row: any) => !row.byTeam).map((row: any) => row.abbr),
      rows,
    },
    null,
    2,
  ),
);

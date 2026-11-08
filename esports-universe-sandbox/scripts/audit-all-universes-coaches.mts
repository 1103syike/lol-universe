import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const db = JSON.parse(readFileSync(resolve('db/db.json'), 'utf8'));
const store = (db.entries as Array<{ id: string; value: any }>).find(
  (entry) => entry.id === 'eus.universe-store',
)?.value;

const universes = (db.entries as Array<{ id: string; value: any }>).filter(
  (entry) => entry.id.startsWith('eus.universe.') && entry.value?.teams,
);

const report = universes.map((entry) => {
  const universe = entry.value;
  const missing = universe.teams
    .filter((team: any) => !universe.coaches?.some((coach: any) => coach.teamId === team.id))
    .map((team: any) => team.abbreviation);
  return {
    id: entry.id,
    name: universe.name,
    teamCount: universe.teams?.length ?? 0,
    coachCount: universe.coaches?.length ?? 0,
    missing,
  };
});

console.log(
  JSON.stringify(
    {
      activeUniverseId: store?.activeUniverseId ?? null,
      universeSummaries: store?.universes ?? [],
      report,
    },
    null,
    2,
  ),
);

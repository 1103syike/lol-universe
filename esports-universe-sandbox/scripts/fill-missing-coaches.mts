import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ensureTeamCoaches } from '../src/app/core/data/initial-teams.ts';

const dbPath = resolve('db/db.json');
const db = JSON.parse(readFileSync(dbPath, 'utf8'));
const entries = db.entries as Array<{ id: string; value: any }>;

const results: Array<{ id: string; name: string; before: number; after: number; missing: string[] }> =
  [];

for (const entry of entries) {
  if (!entry.id.startsWith('eus.universe.') || !entry.value?.teams) {
    continue;
  }

  const before = Array.isArray(entry.value.coaches) ? entry.value.coaches.length : 0;
  const ensured = ensureTeamCoaches(entry.value.teams, entry.value.coaches ?? [], {
    startYear: Number(entry.value.startYear ?? 2026),
  });
  entry.value.teams = ensured.teams;
  entry.value.coaches = ensured.coaches;
  entry.value.updatedAt = new Date().toISOString();

  const missing = ensured.teams
    .filter((team) => !ensured.coaches.some((coach) => coach.teamId === team.id))
    .map((team) => team.abbreviation);

  results.push({
    id: entry.id,
    name: entry.value.name,
    before,
    after: ensured.coaches.length,
    missing,
  });
}

writeFileSync(dbPath, JSON.stringify(db, null, 2));
console.log(JSON.stringify({ results }, null, 2));

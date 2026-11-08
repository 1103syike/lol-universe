import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const db = JSON.parse(readFileSync(resolve('db/db.json'), 'utf8'));
const universe = (
  db.entries as Array<{ id: string; value: any }>
).find((entry) => entry.id.startsWith('eus.universe.') && entry.value?.players)!.value;

for (const abbr of ['RM', 'ahq', 'MAD', 'DCG', 'MCX', 'OCE']) {
  const team = universe.teams.find(
    (item: any) => item.abbreviation === abbr || item.abbreviation?.toLowerCase() === abbr.toLowerCase(),
  );
  if (!team) {
    console.log(abbr, 'MISSING');
    continue;
  }
  const players = universe.players.filter((player: any) => player.teamId === team.id);
  console.log(
    JSON.stringify(
      {
        abbr: team.abbreviation,
        n: players.length,
        players: players.map((player: any) => ({
          name: player.gamertag,
          pos: player.position,
          overall: player.overall ?? player.ratings?.overall ?? null,
          keys: Object.keys(player).slice(0, 12),
        })),
      },
      null,
      2,
    ),
  );
}

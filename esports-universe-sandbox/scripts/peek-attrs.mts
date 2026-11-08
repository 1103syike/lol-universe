import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const db = JSON.parse(readFileSync(resolve('db/db.json'), 'utf8'));
const universe = (
  db.entries as Array<{ id: string; value: any }>
).find((entry) => entry.id.startsWith('eus.universe.') && entry.value?.players)!.value;

function summarize(abbr: string) {
  const team = universe.teams.find((item: any) => item.abbreviation === abbr);
  const players = universe.players.filter((player: any) => player.teamId === team.id);
  const rows = players.map((player: any) => {
    const attrs = player.attributes ?? {};
    const values = Object.values(attrs).filter((value): value is number => typeof value === 'number');
    const avg = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    return {
      name: player.gamertag,
      pos: player.position,
      avg: Number(avg.toFixed(1)),
      attrs,
    };
  });
  const teamAvg =
    rows.reduce((sum, row) => sum + row.avg, 0) / Math.max(1, rows.length);
  return { abbr, teamAvg: Number(teamAvg.toFixed(1)), rows };
}

console.log(JSON.stringify({
  RM: summarize('RM'),
  ahq: summarize('ahq'),
  MAD: summarize('MAD'),
  DCG: summarize('DCG'),
}, null, 2));

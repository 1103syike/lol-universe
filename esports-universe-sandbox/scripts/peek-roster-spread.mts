import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ATTRIBUTE_KEYS } from '../src/app/core/models/player.model.ts';

const db = JSON.parse(readFileSync(resolve('db/db.json'), 'utf8'));
const universe = (
  db.entries as Array<{ id: string; value: any }>
).find((entry) => entry.id.startsWith('eus.universe.') && entry.value?.players)!.value;

const focus = new Set(['ahq', 'PSG', 'WS', 'MAD', 'DCG', 'RM', 'JT', 'ANK', 'HKA']);
const rows = universe.teams
  .filter((team: any) => focus.has(team.abbreviation))
  .map((team: any) => {
    const players = universe.players
      .filter((player: any) => player.teamId === team.id)
      .map((player: any) => {
        const values = ATTRIBUTE_KEYS.map((key) => player.attributes[key].current);
        const avg = values.reduce((sum: number, value: number) => sum + value, 0) / values.length;
        return {
          tag: player.gamertag,
          pos: player.position,
          avg: Number(avg.toFixed(1)),
          min: Math.min(...values),
          max: Math.max(...values),
        };
      })
      .sort((a: any, b: any) => b.avg - a.avg);
    const avgs = players.map((player: any) => player.avg);
    return {
      abbr: team.abbreviation,
      spread: Number((Math.max(...avgs) - Math.min(...avgs)).toFixed(1)),
      players,
    };
  });

console.log(JSON.stringify({ revision: universe.seedPowerRevision, rows }, null, 2));

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Player } from '../src/app/core/models/player.model.ts';
import type { Coach } from '../src/app/core/models/coach.model.ts';
import { calculateChemistry } from '../src/app/shared/sim/chemistry.ts';
import { simulateLiveMatch } from '../src/app/shared/sim/live-match.ts';
import { buildTeamProfile } from '../src/app/shared/sim/team-profile.ts';

const db = JSON.parse(readFileSync(resolve('db/db.json'), 'utf8'));
const universe = (
  db.entries as Array<{ id: string; value: unknown }>
).find((entry) => entry.id.startsWith('eus.universe.') && (entry.value as { players?: unknown })?.players)!
  .value as {
  teams: Array<{ id: string; abbreviation: string }>;
  players: Player[];
  coaches: Coach[];
};

function side(abbr: string) {
  const team = universe.teams.find((item) => item.abbreviation === abbr);
  if (!team) throw new Error(`missing ${abbr}`);
  return {
    teamId: team.id,
    abbr,
    players: universe.players.filter((player) => player.teamId === team.id),
    coach: universe.coaches.find((coach) => coach.teamId === team.id) ?? null,
  };
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function goldK(gold: number): string {
  return `${(gold / 1000).toFixed(1)}K`;
}

const mad = side('MAD');
const dcg = side('DCG');
const games = [];

for (let index = 0; index < 20; index += 1) {
  const random = mulberry32(950000 + index * 37);
  const homeProfile = buildTeamProfile(
    mad.teamId,
    mad.players,
    mad.coach,
    random,
    calculateChemistry(mad.players, mad.coach),
  );
  const awayProfile = buildTeamProfile(
    dcg.teamId,
    dcg.players,
    dcg.coach,
    random,
    calculateChemistry(dcg.players, dcg.coach),
  );
  const { boxScore } = simulateLiveMatch({
    home: homeProfile,
    away: awayProfile,
    random,
    modifiers: {
      draftEdge: 3.4,
      matchupByPhase: { early: 1.15, mid: 1.05, late: 0.75 },
    },
  });
  const box = boxScore!;
  const byTeam = (teamId: string) =>
    box.players
      .filter((player) => player.teamId === teamId)
      .sort((a, b) => {
        const order = ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const;
        return order.indexOf(a.position) - order.indexOf(b.position);
      })
      .map((player) => {
        const meta = universe.players.find((row) => row.id === player.playerId);
        return {
          name: meta?.gamertag ?? meta?.displayName ?? player.playerId,
          position: player.position,
          kda: `${player.kills}/${player.deaths}/${player.assists}`,
          kills: player.kills,
          deaths: player.deaths,
          assists: player.assists,
          gold: goldK(player.gold),
          goldRaw: Math.round(player.gold),
        };
      });

  const madPlayers = byTeam(mad.teamId);
  const dcgPlayers = byTeam(dcg.teamId);
  const madKills = madPlayers.reduce((sum, row) => sum + row.kills, 0);
  const dcgKills = dcgPlayers.reduce((sum, row) => sum + row.kills, 0);
  games.push({
    score: `${madKills}-${dcgKills}`,
    durationMin: Number((box.durationSec / 60).toFixed(1)),
    winner: box.winnerTeamId === mad.teamId ? 'MAD' : 'DCG',
    mad: madPlayers,
    dcg: dcgPlayers,
    madSupport: madPlayers.find((row) => row.position === 'SUPPORT') ?? null,
    madBot: madPlayers.find((row) => row.position === 'BOT') ?? null,
    madJungle: madPlayers.find((row) => row.position === 'JUNGLE') ?? null,
    dcgDeaths: dcgPlayers.map((row) => row.deaths),
    madDeaths: madPlayers.map((row) => row.deaths),
  });
}

const madWins = games.filter((game) => game.winner === 'MAD');
const sample =
  madWins.find((game) => {
    const [homeKills, awayKills] = game.score.split('-').map(Number);
    return homeKills - awayKills >= 12;
  }) ??
  madWins[0] ??
  games[0];

const avg = (values: number[]) =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

const out = {
  realReference: {
    note: 'User-provided DCG vs MAD stomp scoreboard',
    score: '7-29 (DCG-MAD)',
    mad: [
      'Rock TOP 5/1/2 30.8K',
      'Gemini JG 5/0/17 42.8K',
      'Pulse MID 7/5/11 53.2K',
      'Bruce BOT 8/1/8 42.7K',
      'Koal SUP 4/0/18 21.0K',
    ],
    patterns: [
      '勝方支援：低經濟、高助攻、低擊殺、低死亡',
      '勝方打野：中高助攻、擊殺不一定最高',
      '勝方中下：高經濟＋高擊殺',
      '敗方：擊殺很少、死亡全面偏高、助攻極低',
      '總分差大（約 29-7）',
    ],
  },
  runs: games.length,
  madWinRate: Number(((madWins.length / games.length) * 100).toFixed(1)),
  avgScoreWhenMadWins: madWins.length
    ? `${avg(madWins.map((game) => Number(game.score.split('-')[0]))).toFixed(1)}-${avg(madWins.map((game) => Number(game.score.split('-')[1]))).toFixed(1)}`
    : null,
  avgDurationWhenMadWins: madWins.length
    ? Number(avg(madWins.map((game) => game.durationMin)).toFixed(1))
    : null,
  roleShapeWhenMadWins: madWins.length
    ? {
        madSupportAvg: {
          k: Number(avg(madWins.map((game) => game.madSupport?.kills ?? 0)).toFixed(1)),
          d: Number(avg(madWins.map((game) => game.madSupport?.deaths ?? 0)).toFixed(1)),
          a: Number(avg(madWins.map((game) => game.madSupport?.assists ?? 0)).toFixed(1)),
          goldK: Number(
            (
              avg(madWins.map((game) => game.madSupport?.goldRaw ?? 0)) / 1000
            ).toFixed(1),
          ),
        },
        madBotAvg: {
          k: Number(avg(madWins.map((game) => game.madBot?.kills ?? 0)).toFixed(1)),
          d: Number(avg(madWins.map((game) => game.madBot?.deaths ?? 0)).toFixed(1)),
          a: Number(avg(madWins.map((game) => game.madBot?.assists ?? 0)).toFixed(1)),
          goldK: Number((avg(madWins.map((game) => game.madBot?.goldRaw ?? 0)) / 1000).toFixed(1)),
        },
        madJungleAvg: {
          k: Number(avg(madWins.map((game) => game.madJungle?.kills ?? 0)).toFixed(1)),
          d: Number(avg(madWins.map((game) => game.madJungle?.deaths ?? 0)).toFixed(1)),
          a: Number(avg(madWins.map((game) => game.madJungle?.assists ?? 0)).toFixed(1)),
          goldK: Number(
            (avg(madWins.map((game) => game.madJungle?.goldRaw ?? 0)) / 1000).toFixed(1),
          ),
        },
        dcgAvgDeaths: Number(
          avg(madWins.flatMap((game) => game.dcgDeaths)).toFixed(1),
        ),
        madAvgDeaths: Number(
          avg(madWins.flatMap((game) => game.madDeaths)).toFixed(1),
        ),
      }
    : null,
  sampleBoard: sample,
};

const outPath = resolve('scripts/mad-dcg-kda-out.json');
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(JSON.stringify({
  wrote: outPath,
  madWinRate: out.madWinRate,
  avgScoreWhenMadWins: out.avgScoreWhenMadWins,
  avgDurationWhenMadWins: out.avgDurationWhenMadWins,
  roleShapeWhenMadWins: out.roleShapeWhenMadWins,
  sampleScore: sample.score,
  sampleDuration: sample.durationMin,
  sampleMad: sample.mad,
  sampleDcg: sample.dcg,
}, null, 2));

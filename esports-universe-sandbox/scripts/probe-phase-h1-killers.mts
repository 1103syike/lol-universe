import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Player, PlayerPosition } from '../src/app/core/models/player.model.ts';
import type { Coach } from '../src/app/core/models/coach.model.ts';
import { calculateChemistry } from '../src/app/shared/sim/chemistry.ts';
import { simulateLiveMatch } from '../src/app/shared/sim/live-match.ts';
import { buildBoxScore } from '../src/app/shared/sim/reduce-stats.ts';
import { emptyModifiers, type MatchLiveModifiers } from '../src/app/shared/sim/match-state.ts';
import { buildTeamProfile } from '../src/app/shared/sim/team-profile.ts';

const label = process.argv[2] ?? 'after';
const outPath = resolve(
  `scripts/phase-h1-killers-${label}.json`,
);

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
    players: universe.players.filter((player) => player.teamId === team.id),
    coach: universe.coaches.find((coach) => coach.teamId === team.id) ?? null,
  };
}

function cloneSide(
  source: ReturnType<typeof side>,
  newTeamId: string,
): ReturnType<typeof side> {
  return {
    teamId: newTeamId,
    coach: source.coach
      ? { ...source.coach, id: `${source.coach.id}__mirror`, teamId: newTeamId }
      : null,
    players: source.players.map((player) => ({
      ...player,
      id: `${player.id}__mirror`,
      teamId: newTeamId,
    })),
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

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

const POSITIONS: PlayerPosition[] = ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'];

function runOne(
  homeInput: ReturnType<typeof side>,
  awayInput: ReturnType<typeof side>,
  seed: number,
  modifiers: MatchLiveModifiers,
) {
  const random = mulberry32(seed);
  const home = buildTeamProfile(
    homeInput.teamId,
    homeInput.players,
    homeInput.coach,
    random,
    calculateChemistry(homeInput.players, homeInput.coach),
  );
  const away = buildTeamProfile(
    awayInput.teamId,
    awayInput.players,
    awayInput.coach,
    random,
    calculateChemistry(awayInput.players, awayInput.coach),
  );
  const { boxScore } = simulateLiveMatch({ home, away, random, modifiers });
  const box = boxScore ?? buildBoxScore({
    homeTeamId: home.teamId,
    awayTeamId: away.teamId,
    durationSec: 0,
    winnerTeamId: home.teamId,
    timeline: [],
    goldSeries: [],
    players: [],
  });

  const byPos: Record<PlayerPosition, { k: number[]; d: number[]; a: number[]; kp: number[] }> = {
    TOP: { k: [], d: [], a: [], kp: [] },
    JUNGLE: { k: [], d: [], a: [], kp: [] },
    MID: { k: [], d: [], a: [], kp: [] },
    BOT: { k: [], d: [], a: [], kp: [] },
    SUPPORT: { k: [], d: [], a: [], kp: [] },
  };

  let maxKillShare = 0;
  let maxDeathShare = 0;
  let topKillerPos: PlayerPosition | null = null;
  let topDeathPos: PlayerPosition | null = null;
  const winnerId = box.winnerTeamId;
  const winnerRows: Array<{ position: PlayerPosition; k: number; d: number; a: number }> = [];
  const loserRows: Array<{ position: PlayerPosition; k: number; d: number; a: number }> = [];

  for (const teamId of [box.homeTeamId, box.awayTeamId]) {
    const teamPlayers = box.players.filter((player) => player.teamId === teamId);
    const teamKills = teamPlayers.reduce((sum, player) => sum + player.kills, 0);
    const teamDeaths = teamPlayers.reduce((sum, player) => sum + player.deaths, 0);
    for (const player of teamPlayers) {
      byPos[player.position].k.push(player.kills);
      byPos[player.position].d.push(player.deaths);
      byPos[player.position].a.push(player.assists);
      byPos[player.position].kp.push(
        teamKills > 0 ? (player.kills + player.assists) / teamKills : 0,
      );
      const killShare = teamKills > 0 ? player.kills / teamKills : 0;
      const deathShare = teamDeaths > 0 ? player.deaths / teamDeaths : 0;
      if (killShare > maxKillShare) {
        maxKillShare = killShare;
        topKillerPos = player.position;
      }
      if (deathShare > maxDeathShare) {
        maxDeathShare = deathShare;
        topDeathPos = player.position;
      }
      const row = {
        position: player.position,
        k: player.kills,
        d: player.deaths,
        a: player.assists,
      };
      if (teamId === winnerId) winnerRows.push(row);
      else loserRows.push(row);
    }
  }

  const deathEvents = box.timeline
    .filter(
      (event) =>
        (event.type === 'kill' ||
          event.type === 'first-blood' ||
          event.type === 'mistake') &&
        event.victimPlayerId,
    )
    .sort((left, right) => left.t - right.t);
  let consecutiveDeathRuns = 0;
  let streakVictim: string | null = null;
  let streakLen = 0;
  for (const event of deathEvents) {
    if (event.victimPlayerId === streakVictim) {
      streakLen += 1;
      if (streakLen === 2) consecutiveDeathRuns += 1;
    } else {
      streakVictim = event.victimPlayerId ?? null;
      streakLen = 1;
    }
  }

  return {
    score: `${box.home.kills}-${box.away.kills}`,
    killGap: Math.abs(box.home.kills - box.away.kills),
    maxKillShare,
    maxDeathShare,
    topKillerPos,
    topDeathPos,
    consecutiveDeathRuns,
    byPos,
    winnerRows,
    loserRows,
  };
}

type Game = ReturnType<typeof runOne>;

function summarize(games: Game[]) {
  const topKiller: Record<PlayerPosition, number> = {
    TOP: 0,
    JUNGLE: 0,
    MID: 0,
    BOT: 0,
    SUPPORT: 0,
  };
  const topDeath: Record<PlayerPosition, number> = {
    TOP: 0,
    JUNGLE: 0,
    MID: 0,
    BOT: 0,
    SUPPORT: 0,
  };
  for (const game of games) {
    if (game.topKillerPos) topKiller[game.topKillerPos] += 1;
    if (game.topDeathPos) topDeath[game.topDeathPos] += 1;
  }
  const pos = Object.fromEntries(
    POSITIONS.map((position) => {
      const k: number[] = [];
      const d: number[] = [];
      const a: number[] = [];
      const kp: number[] = [];
      for (const game of games) {
        k.push(...game.byPos[position].k);
        d.push(...game.byPos[position].d);
        a.push(...game.byPos[position].a);
        kp.push(...game.byPos[position].kp);
      }
      return [
        position,
        {
          avgK: Number(mean(k).toFixed(2)),
          avgD: Number(mean(d).toFixed(2)),
          avgA: Number(mean(a).toFixed(2)),
          avgKP: Number((mean(kp) * 100).toFixed(1)),
        },
      ];
    }),
  );
  const winnerK = Object.fromEntries(
    POSITIONS.map((position) => {
      const values = games.flatMap((game) =>
        game.winnerRows.filter((row) => row.position === position).map((row) => row.k),
      );
      return [position, Number(mean(values).toFixed(2))];
    }),
  );
  const loserK = Object.fromEntries(
    POSITIONS.map((position) => {
      const values = games.flatMap((game) =>
        game.loserRows.filter((row) => row.position === position).map((row) => row.k),
      );
      return [position, Number(mean(values).toFixed(2))];
    }),
  );
  const winnerD = Object.fromEntries(
    POSITIONS.map((position) => {
      const values = games.flatMap((game) =>
        game.winnerRows.filter((row) => row.position === position).map((row) => row.d),
      );
      return [position, Number(mean(values).toFixed(2))];
    }),
  );
  const loserD = Object.fromEntries(
    POSITIONS.map((position) => {
      const values = games.flatMap((game) =>
        game.loserRows.filter((row) => row.position === position).map((row) => row.d),
      );
      return [position, Number(mean(values).toFixed(2))];
    }),
  );
  return {
    runs: games.length,
    avgKillGap: Number(mean(games.map((game) => game.killGap)).toFixed(1)),
    avgMaxKillShare: Number((mean(games.map((game) => game.maxKillShare)) * 100).toFixed(1)),
    avgMaxDeathShare: Number((mean(games.map((game) => game.maxDeathShare)) * 100).toFixed(1)),
    deathShareGe50: games.filter((game) => game.maxDeathShare >= 0.5).length,
    avgConsecutiveDeathRuns: Number(
      mean(games.map((game) => game.consecutiveDeathRuns)).toFixed(2),
    ),
    ge50pct: games.filter((game) => game.maxKillShare >= 0.5).length,
    jgTopKillerRate: Number(((topKiller.JUNGLE / games.length) * 100).toFixed(1)),
    botTopKillerRate: Number(((topKiller.BOT / games.length) * 100).toFixed(1)),
    midTopKillerRate: Number(((topKiller.MID / games.length) * 100).toFixed(1)),
    topDeathRate: Object.fromEntries(
      POSITIONS.map((position) => [
        position,
        Number(((topDeath[position] / games.length) * 100).toFixed(1)),
      ]),
    ),
    topKiller,
    topDeath,
    pos,
    winnerAvgK: winnerK,
    loserAvgK: loserK,
    winnerAvgD: winnerD,
    loserAvgD: loserD,
  };
}

const evenGames: Game[] = [];
const midGames: Game[] = [];
const stompGames: Game[] = [];

const evenSources = ['MCX', 'OCE', 'RM', 'JT', 'GT'];
for (let index = 0; index < 100; index += 1) {
  const abbr = evenSources[index % evenSources.length];
  const home = side(abbr);
  const away = cloneSide(home, `${home.teamId}__mirror`);
  evenGames.push(
    runOne(home, away, 820000 + index * 19, emptyModifiers()),
  );
}

const midPairs: Array<[string, string]> = [
  ['RM', 'JT'],
  ['JT', 'RM'],
  ['GT', 'ahq'],
  ['ahq', 'GT'],
];
for (let index = 0; index < 100; index += 1) {
  const [homeAbbr, awayAbbr] = midPairs[index % midPairs.length];
  midGames.push(
    runOne(
      side(homeAbbr),
      side(awayAbbr),
      830000 + index * 23,
      {
        draftEdge: index % 2 === 0 ? 1.2 : -1.2,
        matchupByPhase: { early: 0.4, mid: 0.3, late: 0.2 },
      },
    ),
  );
}

const stompPairs: Array<[string, string]> = [
  ['MCX', 'OCE'],
  ['OCE', 'MCX'],
  ['RM', 'ahq'],
  ['GT', 'JT'],
];
for (let index = 0; index < 100; index += 1) {
  const [homeAbbr, awayAbbr] = stompPairs[index % stompPairs.length];
  stompGames.push(
    runOne(
      side(homeAbbr),
      side(awayAbbr),
      840000 + index * 29,
      {
        draftEdge: index % 2 === 0 ? 3.5 : -3.5,
        matchupByPhase: { early: 1.2, mid: 1.0, late: 0.8 },
      },
    ),
  );
}

const out = {
  label,
  even: summarize(evenGames),
  mid: summarize(midGames),
  stomp: summarize(stompGames),
};

writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));

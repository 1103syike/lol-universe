import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { simulateGame } from '../src/app/shared/sim/match-engine.ts';
import type { Player, PlayerPosition } from '../src/app/core/models/player.model.ts';
import type { Coach } from '../src/app/core/models/coach.model.ts';
import type { TimelineEvent } from '../src/app/shared/sim/match-stats.ts';

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
    team,
    input: {
      teamId: team.id,
      players: universe.players.filter((player) => player.teamId === team.id),
      coach: universe.coaches.find((coach) => coach.teamId === team.id) ?? null,
    },
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

const POSITIONS: PlayerPosition[] = ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'];

function isKillEvent(event: TimelineEvent): boolean {
  return (
    event.type === 'kill' ||
    event.type === 'first-blood' ||
    event.type === 'mistake'
  );
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

type PlayerRow = {
  playerId: string;
  teamId: string;
  position: PlayerPosition;
  kills: number;
  deaths: number;
  assists: number;
};

type GameAnalysis = {
  score: string;
  killGap: number;
  totalKills: number;
  durationSec: number;
  band: 'even' | 'mid' | 'stomp';
  volume: 'low' | 'mid' | 'high';
  players: PlayerRow[];
  maxKillShare: number;
  maxDeathShare: number;
  topKillerPos: PlayerPosition | null;
  killShareGe40: boolean;
  killShareGe50: boolean;
  killShareGe60: boolean;
  deathShareGe40: boolean;
  deathShareGe50: boolean;
  avgAssistsPerKill: number;
  contextCounts: Record<string, number>;
  consistency: {
    timelineKillEvents: number;
    boxHomeKills: number;
    boxAwayKills: number;
    timelineEqualsBox: boolean;
    playerKMatch: boolean;
    playerDMatch: boolean;
    playerAMatch: boolean;
    orphanActors: number;
    duplicateVictimSameStamp: number;
    assistNotOnCombatSide: number;
    pathCounts: { skirmishLike: number; mistake: number; objective: number; other: number };
  };
  consecutiveDeathRuns: number;
};

function analyzeGame(
  box: NonNullable<ReturnType<typeof simulateGame>['boxScore']>,
): GameAnalysis {
  const killEvents = box.timeline.filter(isKillEvent);
  const players: PlayerRow[] = box.players.map((player) => ({
    playerId: player.playerId,
    teamId: player.teamId,
    position: player.position,
    kills: player.kills,
    deaths: player.deaths,
    assists: player.assists,
  }));

  const byId = new Map(players.map((player) => [player.playerId, player]));
  const rebuildK = new Map<string, number>();
  const rebuildD = new Map<string, number>();
  const rebuildA = new Map<string, number>();
  let orphanActors = 0;
  let assistNotOnCombatSide = 0;
  const stampVictims = new Map<string, Set<string>>();
  let duplicateVictimSameStamp = 0;
  const pathCounts = { skirmishLike: 0, mistake: 0, objective: 0, other: 0 };
  const contextCounts: Record<string, number> = {};
  let assistTotal = 0;

  for (const event of killEvents) {
    const context = event.payload?.killContext ?? 'unknown';
    contextCounts[context] = (contextCounts[context] ?? 0) + 1;
    assistTotal += event.assistPlayerIds?.length ?? 0;

    if (event.type === 'mistake' || context === 'mistake') {
      pathCounts.mistake += 1;
    } else if (context === 'dragon' || context === 'baron' || context === 'elder') {
      pathCounts.objective += 1;
    } else if (
      context === 'lane' ||
      context === 'gank' ||
      context === 'teamfight' ||
      event.type === 'first-blood'
    ) {
      pathCounts.skirmishLike += 1;
    } else {
      pathCounts.other += 1;
    }

    if (!event.actorPlayerId || !byId.has(event.actorPlayerId)) orphanActors += 1;
    if (!event.victimPlayerId || !byId.has(event.victimPlayerId)) orphanActors += 1;
    for (const assistId of event.assistPlayerIds ?? []) {
      if (!byId.has(assistId)) orphanActors += 1;
      const assist = byId.get(assistId);
      if (assist && event.teamId && assist.teamId !== event.teamId) {
        assistNotOnCombatSide += 1;
      }
    }

    if (event.actorPlayerId) {
      rebuildK.set(event.actorPlayerId, (rebuildK.get(event.actorPlayerId) ?? 0) + 1);
    }
    if (event.victimPlayerId) {
      rebuildD.set(event.victimPlayerId, (rebuildD.get(event.victimPlayerId) ?? 0) + 1);
      const stampKey = `${event.t}`;
      const set = stampVictims.get(stampKey) ?? new Set<string>();
      if (set.has(event.victimPlayerId)) duplicateVictimSameStamp += 1;
      set.add(event.victimPlayerId);
      stampVictims.set(stampKey, set);
    }
    for (const assistId of event.assistPlayerIds ?? []) {
      rebuildA.set(assistId, (rebuildA.get(assistId) ?? 0) + 1);
    }
  }

  let playerKMatch = true;
  let playerDMatch = true;
  let playerAMatch = true;
  for (const player of players) {
    if ((rebuildK.get(player.playerId) ?? 0) !== player.kills) playerKMatch = false;
    if ((rebuildD.get(player.playerId) ?? 0) !== player.deaths) playerDMatch = false;
    if ((rebuildA.get(player.playerId) ?? 0) !== player.assists) playerAMatch = false;
  }

  const homeKills = box.home.kills;
  const awayKills = box.away.kills;
  const totalKills = homeKills + awayKills;
  const killGap = Math.abs(homeKills - awayKills);
  const band: GameAnalysis['band'] =
    killGap <= 6 ? 'even' : killGap <= 16 ? 'mid' : 'stomp';
  const volume: GameAnalysis['volume'] =
    totalKills <= 18 ? 'low' : totalKills <= 32 ? 'mid' : 'high';

  let maxKillShare = 0;
  let maxDeathShare = 0;
  let topKillerPos: PlayerPosition | null = null;
  for (const teamId of [box.homeTeamId, box.awayTeamId]) {
    const teamPlayers = players.filter((player) => player.teamId === teamId);
    const teamKills = teamPlayers.reduce((sum, player) => sum + player.kills, 0);
    const teamDeaths = teamPlayers.reduce((sum, player) => sum + player.deaths, 0);
    for (const player of teamPlayers) {
      const killShare = teamKills > 0 ? player.kills / teamKills : 0;
      const deathShare = teamDeaths > 0 ? player.deaths / teamDeaths : 0;
      if (killShare > maxKillShare) {
        maxKillShare = killShare;
        topKillerPos = player.position;
      }
      if (deathShare > maxDeathShare) maxDeathShare = deathShare;
    }
  }

  const deathEvents = killEvents
    .filter((event) => event.victimPlayerId)
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
    score: `${homeKills}-${awayKills}`,
    killGap,
    totalKills,
    durationSec: box.durationSec,
    band,
    volume,
    players,
    maxKillShare,
    maxDeathShare,
    topKillerPos,
    killShareGe40: maxKillShare >= 0.4,
    killShareGe50: maxKillShare >= 0.5,
    killShareGe60: maxKillShare >= 0.6,
    deathShareGe40: maxDeathShare >= 0.4,
    deathShareGe50: maxDeathShare >= 0.5,
    avgAssistsPerKill: killEvents.length > 0 ? assistTotal / killEvents.length : 0,
    contextCounts,
    consistency: {
      timelineKillEvents: killEvents.length,
      boxHomeKills: homeKills,
      boxAwayKills: awayKills,
      timelineEqualsBox: killEvents.length === totalKills,
      playerKMatch,
      playerDMatch,
      playerAMatch,
      orphanActors,
      duplicateVictimSameStamp,
      assistNotOnCombatSide,
      pathCounts,
    },
    consecutiveDeathRuns,
  };
}

const pairs: Array<[string, string]> = [
  ['MCX', 'OCE'],
  ['OCE', 'MCX'],
  ['RM', 'JT'],
  ['JT', 'RM'],
  ['GT', 'ahq'],
  ['ahq', 'GT'],
  ['MCX', 'RM'],
  ['OCE', 'JT'],
];

const games: GameAnalysis[] = [];
for (let pairIndex = 0; pairIndex < pairs.length; pairIndex += 1) {
  const [homeAbbr, awayAbbr] = pairs[pairIndex];
  const homeSide = side(homeAbbr);
  const awaySide = side(awayAbbr);
  for (let index = 0; index < 13; index += 1) {
    const report = simulateGame({
      home: homeSide.input,
      away: awaySide.input,
      random: mulberry32(810000 + pairIndex * 2000 + index * 17),
    });
    games.push(analyzeGame(report.boxScore!));
  }
}

const byPos: Record<
  PlayerPosition,
  { k: number[]; d: number[]; a: number[]; kp: number[] }
> = {
  TOP: { k: [], d: [], a: [], kp: [] },
  JUNGLE: { k: [], d: [], a: [], kp: [] },
  MID: { k: [], d: [], a: [], kp: [] },
  BOT: { k: [], d: [], a: [], kp: [] },
  SUPPORT: { k: [], d: [], a: [], kp: [] },
};

const topKillerPosCount: Record<PlayerPosition, number> = {
  TOP: 0,
  JUNGLE: 0,
  MID: 0,
  BOT: 0,
  SUPPORT: 0,
};

for (const game of games) {
  if (game.topKillerPos) topKillerPosCount[game.topKillerPos] += 1;
  for (const teamId of new Set(game.players.map((player) => player.teamId))) {
    const teamPlayers = game.players.filter((player) => player.teamId === teamId);
    const teamKills = teamPlayers.reduce((sum, player) => sum + player.kills, 0);
    for (const player of teamPlayers) {
      byPos[player.position].k.push(player.kills);
      byPos[player.position].d.push(player.deaths);
      byPos[player.position].a.push(player.assists);
      byPos[player.position].kp.push(
        teamKills > 0 ? (player.kills + player.assists) / teamKills : 0,
      );
    }
  }
}

function posSummary(position: PlayerPosition) {
  const row = byPos[position];
  return {
    position,
    avgK: Number(mean(row.k)?.toFixed(2)),
    avgD: Number(mean(row.d)?.toFixed(2)),
    avgA: Number(mean(row.a)?.toFixed(2)),
    medK: median(row.k),
    medD: median(row.d),
    medA: median(row.a),
    avgKP: Number(((mean(row.kp) ?? 0) * 100).toFixed(1)),
    medKP: Number((((median(row.kp) ?? 0) * 100)).toFixed(1)),
    n: row.k.length,
  };
}

const pathTotals = games.reduce(
  (acc, game) => {
    acc.skirmishLike += game.consistency.pathCounts.skirmishLike;
    acc.mistake += game.consistency.pathCounts.mistake;
    acc.objective += game.consistency.pathCounts.objective;
    acc.other += game.consistency.pathCounts.other;
    return acc;
  },
  { skirmishLike: 0, mistake: 0, objective: 0, other: 0 },
);

const contextTotals: Record<string, number> = {};
for (const game of games) {
  for (const [key, value] of Object.entries(game.contextCounts)) {
    contextTotals[key] = (contextTotals[key] ?? 0) + value;
  }
}

const mcxOceSamples = games
  .filter((game) => game.score.includes('-'))
  .slice(0, 0);

const out = {
  runs: games.length,
  bands: {
    even: games.filter((game) => game.band === 'even').length,
    mid: games.filter((game) => game.band === 'mid').length,
    stomp: games.filter((game) => game.band === 'stomp').length,
  },
  volumes: {
    low: games.filter((game) => game.volume === 'low').length,
    mid: games.filter((game) => game.volume === 'mid').length,
    high: games.filter((game) => game.volume === 'high').length,
  },
  positionKda: POSITIONS.map(posSummary),
  killConcentration: {
    avgMaxKillShare: Number(((mean(games.map((game) => game.maxKillShare)) ?? 0) * 100).toFixed(1)),
    medMaxKillShare: Number(((median(games.map((game) => game.maxKillShare)) ?? 0) * 100).toFixed(1)),
    ge40pct: games.filter((game) => game.killShareGe40).length,
    ge50pct: games.filter((game) => game.killShareGe50).length,
    ge60pct: games.filter((game) => game.killShareGe60).length,
    topKillerPosCount,
    topKillerPosRate: Object.fromEntries(
      POSITIONS.map((position) => [
        position,
        Number(((topKillerPosCount[position] / games.length) * 100).toFixed(1)),
      ]),
    ),
  },
  deathConcentration: {
    avgMaxDeathShare: Number(((mean(games.map((game) => game.maxDeathShare)) ?? 0) * 100).toFixed(1)),
    medMaxDeathShare: Number(((median(games.map((game) => game.maxDeathShare)) ?? 0) * 100).toFixed(1)),
    ge40pct: games.filter((game) => game.deathShareGe40).length,
    ge50pct: games.filter((game) => game.deathShareGe50).length,
    avgConsecutiveDeathRuns: Number(
      (mean(games.map((game) => game.consecutiveDeathRuns)) ?? 0).toFixed(2),
    ),
  },
  assists: {
    avgAssistsPerKill: Number(
      (mean(games.map((game) => game.avgAssistsPerKill)) ?? 0).toFixed(2),
    ),
    byPositionAvgA: Object.fromEntries(
      POSITIONS.map((position) => [position, posSummary(position).avgA]),
    ),
    byPositionAvgKP: Object.fromEntries(
      POSITIONS.map((position) => [position, posSummary(position).avgKP]),
    ),
  },
  paths: pathTotals,
  contexts: contextTotals,
  consistency: {
    timelineEqualsBox: games.filter((game) => game.consistency.timelineEqualsBox).length,
    playerKMatch: games.filter((game) => game.consistency.playerKMatch).length,
    playerDMatch: games.filter((game) => game.consistency.playerDMatch).length,
    playerAMatch: games.filter((game) => game.consistency.playerAMatch).length,
    orphanActorsTotal: games.reduce(
      (sum, game) => sum + game.consistency.orphanActors,
      0,
    ),
    duplicateVictimSameStampTotal: games.reduce(
      (sum, game) => sum + game.consistency.duplicateVictimSameStamp,
      0,
    ),
    assistNotOnCombatSideTotal: games.reduce(
      (sum, game) => sum + game.consistency.assistNotOnCombatSide,
      0,
    ),
  },
  byBand: {
    even: summarizeBand(games.filter((game) => game.band === 'even')),
    mid: summarizeBand(games.filter((game) => game.band === 'mid')),
    stomp: summarizeBand(games.filter((game) => game.band === 'stomp')),
  },
  extremeKillShareSamples: games
    .filter((game) => game.killShareGe50)
    .slice(0, 8)
    .map((game) => ({
      score: game.score,
      maxKillShare: Number((game.maxKillShare * 100).toFixed(1)),
      topKillerPos: game.topKillerPos,
      band: game.band,
    })),
  mcxOceLike: games
    .filter((game) => game.totalKills >= 20 && game.totalKills <= 35 && game.killGap >= 10)
    .slice(0, 5)
    .map((game) => ({
      score: game.score,
      maxKillShare: Number((game.maxKillShare * 100).toFixed(1)),
      topKillerPos: game.topKillerPos,
      avgAssistsPerKill: Number(game.avgAssistsPerKill.toFixed(2)),
      players: game.players.map((player) => ({
        position: player.position,
        kda: `${player.kills}/${player.deaths}/${player.assists}`,
      })),
    })),
};

function summarizeBand(rows: GameAnalysis[]) {
  return {
    runs: rows.length,
    avgMaxKillShare: Number(((mean(rows.map((row) => row.maxKillShare)) ?? 0) * 100).toFixed(1)),
    ge50pct: rows.filter((row) => row.killShareGe50).length,
    avgMaxDeathShare: Number(((mean(rows.map((row) => row.maxDeathShare)) ?? 0) * 100).toFixed(1)),
    avgAssistsPerKill: Number(
      (mean(rows.map((row) => row.avgAssistsPerKill)) ?? 0).toFixed(2),
    ),
  };
}

writeFileSync(resolve('scripts/phase-h-kda-out.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
void mcxOceSamples;

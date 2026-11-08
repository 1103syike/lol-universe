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

function simulateGame(
  favoriteAbbr: string,
  underdogAbbr: string,
  seed: number,
  draftEdge: number,
) {
  const favorite = side(favoriteAbbr);
  const underdog = side(underdogAbbr);
  const random = mulberry32(seed);
  const homeIsFavorite = seed % 2 === 0;
  const home = homeIsFavorite ? favorite : underdog;
  const away = homeIsFavorite ? underdog : favorite;
  const signedEdge = homeIsFavorite ? draftEdge : -draftEdge;
  const homeProfile = buildTeamProfile(
    home.teamId,
    home.players,
    home.coach,
    random,
    calculateChemistry(home.players, home.coach),
  );
  const awayProfile = buildTeamProfile(
    away.teamId,
    away.players,
    away.coach,
    random,
    calculateChemistry(away.players, away.coach),
  );
  const { boxScore } = simulateLiveMatch({
    home: homeProfile,
    away: awayProfile,
    random,
    modifiers: {
      draftEdge: signedEdge,
      matchupByPhase: {
        early: signedEdge > 0 ? 0.45 : -0.45,
        mid: signedEdge > 0 ? 0.35 : -0.35,
        late: signedEdge > 0 ? 0.25 : -0.25,
      },
    },
  });
  const box = boxScore!;
  const favoriteWon = box.winnerTeamId === favorite.teamId;
  const favKills = box.players
    .filter((player) => player.teamId === favorite.teamId)
    .reduce((sum, player) => sum + player.kills, 0);
  const dogKills = box.players
    .filter((player) => player.teamId === underdog.teamId)
    .reduce((sum, player) => sum + player.kills, 0);
  return {
    favoriteWon,
    score: `${favKills}-${dogKills}`,
    killGap: Math.abs(favKills - dogKills),
    durationMin: box.durationSec / 60,
  };
}

function simulateBo3(
  favoriteAbbr: string,
  underdogAbbr: string,
  seed: number,
  draftEdge: number,
) {
  let fav = 0;
  let dog = 0;
  const games = [];
  let gameIndex = 0;
  while (fav < 2 && dog < 2 && gameIndex < 3) {
    const game = simulateGame(
      favoriteAbbr,
      underdogAbbr,
      seed + gameIndex * 97,
      draftEdge,
    );
    games.push(game);
    if (game.favoriteWon) fav += 1;
    else dog += 1;
    gameIndex += 1;
  }
  return {
    series: `${fav}-${dog}`,
    favoriteSwept: fav === 2 && dog === 0,
    underdogTookGame: dog >= 1,
    underdogWonSeries: dog === 2,
    games,
  };
}

function summarizePair(
  name: string,
  favoriteAbbr: string,
  underdogAbbr: string,
  draftEdge: number,
  seriesCount: number,
) {
  const seriesRows = [];
  const gameRows = [];
  for (let index = 0; index < seriesCount; index += 1) {
    const series = simulateBo3(
      favoriteAbbr,
      underdogAbbr,
      1_010_000 + index * 131,
      draftEdge,
    );
    seriesRows.push(series);
    gameRows.push(...series.games);
  }
  const underdogGameWr =
    (gameRows.filter((game) => !game.favoriteWon).length / gameRows.length) * 100;
  return {
    name,
    draftEdge,
    series: seriesCount,
    games: gameRows.length,
    underdogGameWr: Number(underdogGameWr.toFixed(1)),
    favoriteGameWr: Number((100 - underdogGameWr).toFixed(1)),
    pctSeries2to0: Number(
      (
        (seriesRows.filter((row) => row.favoriteSwept).length / seriesCount) *
        100
      ).toFixed(1),
    ),
    pctSeries2to1: Number(
      (
        (seriesRows.filter((row) => row.series === '2-1').length / seriesCount) *
        100
      ).toFixed(1),
    ),
    pctUnderdogSeries: Number(
      (
        (seriesRows.filter((row) => row.underdogWonSeries).length / seriesCount) *
        100
      ).toFixed(1),
    ),
    pctUnderdogTookGame: Number(
      (
        (seriesRows.filter((row) => row.underdogTookGame).length / seriesCount) *
        100
      ).toFixed(1),
    ),
    avgKillGap: Number(
      (
        gameRows.reduce((sum, game) => sum + game.killGap, 0) / gameRows.length
      ).toFixed(1),
    ),
  };
}

const out = {
  lckReference: {
    note: '強隊多數贏，但弱隊偷局常見；2-1 不稀奇，純 2-0 不該接近 90%',
    targetUnderdogGameWr: '18-28%',
    targetFavoriteSweep2to0: '45-60%',
    targetUnderdogSeries: '8-18%',
  },
  pairs: [
    summarizePair('MAD>DCG edge3.4', 'MAD', 'DCG', 3.4, 60),
    summarizePair('MCX>OCE edge3.4', 'MCX', 'OCE', 3.4, 60),
    summarizePair('RM>ahq edge3.4', 'RM', 'ahq', 3.4, 60),
    summarizePair('MAD>DCG edge2.2', 'MAD', 'DCG', 2.2, 40),
    summarizePair('MAD>DCG edge1.4', 'MAD', 'DCG', 1.4, 40),
  ],
};

writeFileSync(resolve('scripts/upset-rate-out.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));

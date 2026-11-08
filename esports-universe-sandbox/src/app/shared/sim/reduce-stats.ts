import type {
  MatchBoxScore,
  MatchSimResult,
  PlayerMatchStats,
  PlayerRuntimeStats,
  TeamMatchStats,
  TimelineEvent,
} from './match-stats';
import { isEndType, isKillType } from './timeline';

function emptyTeam(teamId: string): TeamMatchStats {
  return {
    teamId,
    kills: 0,
    deaths: 0,
    towers: 0,
    dragons: 0,
    dragonSoul: false,
    barons: 0,
    elders: 0,
    inhibitors: 0,
    totalGold: 0,
  };
}

function countObjectives(timeline: TimelineEvent[], teamId: string): Pick<
  TeamMatchStats,
  'towers' | 'dragons' | 'dragonSoul' | 'barons' | 'elders' | 'inhibitors'
> {
  let towers = 0;
  let dragons = 0;
  let dragonSoul = false;
  let barons = 0;
  let elders = 0;
  let inhibitors = 0;
  for (const event of timeline) {
    if (event.teamId !== teamId) {
      continue;
    }
    if (event.type === 'tower') {
      towers += 1;
    } else if (event.type === 'dragon') {
      dragons += 1;
    } else if (event.type === 'dragon-soul') {
      dragons += 1;
      dragonSoul = true;
    } else if (event.type === 'baron') {
      barons += 1;
    } else if (event.type === 'elder') {
      elders += 1;
    } else if (event.type === 'inhibitor') {
      inhibitors += 1;
    }
  }
  return { towers, dragons, dragonSoul, barons, elders, inhibitors };
}

function derivePlayerStats(
  runtime: PlayerRuntimeStats[],
  teamKills: Map<string, number>,
): PlayerMatchStats[] {
  const damageByTeam = new Map<string, number>();
  const goldByTeam = new Map<string, number>();
  for (const player of runtime) {
    damageByTeam.set(player.teamId, (damageByTeam.get(player.teamId) ?? 0) + player.damageToChamps);
    goldByTeam.set(player.teamId, (goldByTeam.get(player.teamId) ?? 0) + player.gold);
  }

  return runtime.map((player) => {
    const teamKill = teamKills.get(player.teamId) ?? 0;
    const teamDamage = damageByTeam.get(player.teamId) ?? 0;
    const teamGold = goldByTeam.get(player.teamId) ?? 0;
    const kda = (player.kills + player.assists) / Math.max(1, player.deaths);
    const { deadUntilSec: _deadUntilSec, ...rest } = player;
    return {
      ...rest,
      items: player.items ?? [],
      kda: Number(kda.toFixed(2)),
      kpPct: teamKill > 0 ? Number(((player.kills + player.assists) / teamKill).toFixed(3)) : 0,
      damagePct: teamDamage > 0 ? Number((player.damageToChamps / teamDamage).toFixed(3)) : 0,
      goldPct: teamGold > 0 ? Number((player.gold / teamGold).toFixed(3)) : 0,
    };
  });
}

function resolveWinner(timeline: TimelineEvent[], fallbackWinnerTeamId: string): string {
  for (let index = timeline.length - 1; index >= 0; index -= 1) {
    const event = timeline[index];
    if (isEndType(event.type) && event.teamId) {
      return event.teamId;
    }
  }
  return fallbackWinnerTeamId;
}

export function buildBoxScore(result: MatchSimResult): MatchBoxScore {
  const home = emptyTeam(result.homeTeamId);
  const away = emptyTeam(result.awayTeamId);
  const teamKills = new Map<string, number>([
    [result.homeTeamId, 0],
    [result.awayTeamId, 0],
  ]);
  const teamDeaths = new Map<string, number>([
    [result.homeTeamId, 0],
    [result.awayTeamId, 0],
  ]);

  for (const player of result.players) {
    teamKills.set(player.teamId, (teamKills.get(player.teamId) ?? 0) + player.kills);
    teamDeaths.set(player.teamId, (teamDeaths.get(player.teamId) ?? 0) + player.deaths);
  }

  home.kills = teamKills.get(result.homeTeamId) ?? 0;
  away.kills = teamKills.get(result.awayTeamId) ?? 0;
  home.deaths = teamDeaths.get(result.homeTeamId) ?? 0;
  away.deaths = teamDeaths.get(result.awayTeamId) ?? 0;
  Object.assign(home, countObjectives(result.timeline, result.homeTeamId));
  Object.assign(away, countObjectives(result.timeline, result.awayTeamId));
  home.totalGold = result.players
    .filter((player) => player.teamId === result.homeTeamId)
    .reduce((sum, player) => sum + player.gold, 0);
  away.totalGold = result.players
    .filter((player) => player.teamId === result.awayTeamId)
    .reduce((sum, player) => sum + player.gold, 0);

  const goldSeries = result.goldSeries.map((sample) => ({ ...sample }));
  const last = goldSeries[goldSeries.length - 1];
  if (last) {
    last.homeGold = home.totalGold;
    last.awayGold = away.totalGold;
    last.t = result.durationSec;
  } else {
    goldSeries.push({
      t: result.durationSec,
      homeGold: home.totalGold,
      awayGold: away.totalGold,
    });
  }

  return {
    durationSec: result.durationSec,
    winnerTeamId: resolveWinner(result.timeline, result.winnerTeamId),
    homeTeamId: result.homeTeamId,
    awayTeamId: result.awayTeamId,
    goldSeries,
    timeline: result.timeline,
    home,
    away,
    players: derivePlayerStats(result.players, teamKills),
  };
}

export function recountKillsFromTimeline(timeline: TimelineEvent[]): {
  killsByPlayer: Map<string, number>;
  deathsByPlayer: Map<string, number>;
  assistsByPlayer: Map<string, number>;
} {
  const killsByPlayer = new Map<string, number>();
  const deathsByPlayer = new Map<string, number>();
  const assistsByPlayer = new Map<string, number>();

  for (const event of timeline) {
    if (!isKillType(event.type) && event.type !== 'mistake') {
      continue;
    }
    if (event.actorPlayerId) {
      killsByPlayer.set(event.actorPlayerId, (killsByPlayer.get(event.actorPlayerId) ?? 0) + 1);
    }
    if (event.victimPlayerId) {
      deathsByPlayer.set(event.victimPlayerId, (deathsByPlayer.get(event.victimPlayerId) ?? 0) + 1);
    }
    for (const assistId of event.assistPlayerIds ?? []) {
      assistsByPlayer.set(assistId, (assistsByPlayer.get(assistId) ?? 0) + 1);
    }
  }

  return { killsByPlayer, deathsByPlayer, assistsByPlayer };
}

export function recountDamageFromTimeline(timeline: TimelineEvent[]): Map<string, number> {
  const damageByPlayer = new Map<string, number>();
  for (const event of timeline) {
    if (event.type !== 'combat') {
      continue;
    }
    for (const [playerId, amount] of Object.entries(event.payload?.damageByPlayer ?? {})) {
      damageByPlayer.set(playerId, (damageByPlayer.get(playerId) ?? 0) + amount);
    }
  }
  return damageByPlayer;
}

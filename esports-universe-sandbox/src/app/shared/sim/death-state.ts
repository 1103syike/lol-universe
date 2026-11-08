import { SIM_BALANCE } from './balance';
import type { PlayerRuntimeStats } from './match-stats';
import type { SimPlayerView, TeamProfile } from './team-profile';

export function respawnDurationAt(t: number): number {
  const minutes = Math.max(0, t / 60);
  return Math.min(
    SIM_BALANCE.respawnMaxSec,
    Math.round(SIM_BALANCE.respawnBaseSec + minutes * SIM_BALANCE.respawnPerMinuteSec),
  );
}

export function isPlayerAlive(player: PlayerRuntimeStats, t: number): boolean {
  return t >= (player.deadUntilSec ?? 0);
}

export function markPlayerDead(player: PlayerRuntimeStats, deathAt: number): void {
  player.deadUntilSec = deathAt + respawnDurationAt(deathAt);
}

export function aliveRuntimePlayers(
  players: PlayerRuntimeStats[],
  teamId: string,
  t: number,
): PlayerRuntimeStats[] {
  return players.filter(
    (player) => player.teamId === teamId && isPlayerAlive(player, t),
  );
}

export function countAlive(
  players: PlayerRuntimeStats[],
  teamId: string,
  t: number,
): number {
  return aliveRuntimePlayers(players, teamId, t).length;
}

export function aliveViews(
  profile: TeamProfile,
  players: PlayerRuntimeStats[],
  t: number,
): SimPlayerView[] {
  const aliveIds = new Set(
    aliveRuntimePlayers(players, profile.teamId, t).map((player) => player.playerId),
  );
  return profile.players.filter((view) => aliveIds.has(view.player.id));
}

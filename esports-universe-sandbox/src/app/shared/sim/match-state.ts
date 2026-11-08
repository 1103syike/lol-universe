import type { PlayerRuntimeStats, PlayPhaseId } from './match-stats';
import { teamGold } from './economy';
import type { MatchupSwing } from './matchup';
import { SIM_BALANCE } from './balance';
import { countAlive } from './death-state';
import {
  anyOuterDown,
  deriveMapModes,
  type MapModeFlags,
  type PlayerPresence,
  type SideTowerGrid,
} from './map-presence';

interface ObjectiveSnapshot {
  homeTowers: number;
  awayTowers: number;
  homeBarons: number;
  awayBarons: number;
  homeDragonSoul: boolean;
  awayDragonSoul: boolean;
  homeDefense: SideTowerGrid;
  awayDefense: SideTowerGrid;
  canRotateHome: boolean;
  canRotateAway: boolean;
  nextDragonAt: number;
  nextBaronAt: number;
  nextElderAt: number | null;
  nextVoidgrubAt: number | null;
  nextHeraldAt: number | null;
  lastTeamfightAt?: number | null;
}

export interface MatchLiveModifiers {
  draftEdge: number;
  matchupByPhase: Record<PlayPhaseId, number>;
}

export interface MatchState {
  t: number;
  phase: PlayPhaseId;
  homeTeamId: string;
  awayTeamId: string;
  homeGold: number;
  awayGold: number;
  goldGap: number;
  homeKills: number;
  awayKills: number;
  killGap: number;
  homeTowers: number;
  awayTowers: number;
  towerGap: number;
  homeBarons: number;
  awayBarons: number;
  homeSoul: boolean;
  awaySoul: boolean;
  homeAlive: number;
  awayAlive: number;
  draftEdge: number;
  matchupEdge: number;
  canRotateHome: boolean;
  canRotateAway: boolean;
  modes: MapModeFlags;
  presence: PlayerPresence[];
  lastTeamfightAt: number | null;
}

export function emptyModifiers(): MatchLiveModifiers {
  return {
    draftEdge: 0,
    matchupByPhase: { early: 0, mid: 0, late: 0 },
  };
}

export function modifiersFromMatchups(
  draftEdge: number,
  matchups: MatchupSwing[],
): MatchLiveModifiers {
  const matchupByPhase: Record<PlayPhaseId, number> = { early: 0, mid: 0, late: 0 };
  for (const swing of matchups) {
    if (swing.phase === 'early' || swing.phase === 'mid' || swing.phase === 'late') {
      matchupByPhase[swing.phase] = swing.homeDelta;
    }
  }
  return { draftEdge, matchupByPhase };
}

export function buildMatchState(input: {
  t: number;
  phase: PlayPhaseId;
  homeTeamId: string;
  awayTeamId: string;
  players: PlayerRuntimeStats[];
  progress: ObjectiveSnapshot;
  modifiers: MatchLiveModifiers;
  presence: PlayerPresence[];
}): MatchState {
  const homeGold = teamGold(input.players, input.homeTeamId);
  const awayGold = teamGold(input.players, input.awayTeamId);
  const homeKills = input.players
    .filter((player) => player.teamId === input.homeTeamId)
    .reduce((sum, player) => sum + player.kills, 0);
  const awayKills = input.players
    .filter((player) => player.teamId === input.awayTeamId)
    .reduce((sum, player) => sum + player.kills, 0);
  const canRotate = input.progress.canRotateHome || input.progress.canRotateAway;
  return {
    t: input.t,
    phase: input.phase,
    homeTeamId: input.homeTeamId,
    awayTeamId: input.awayTeamId,
    homeGold,
    awayGold,
    goldGap: homeGold - awayGold,
    homeKills,
    awayKills,
    killGap: homeKills - awayKills,
    homeTowers: input.progress.homeTowers,
    awayTowers: input.progress.awayTowers,
    towerGap: input.progress.homeTowers - input.progress.awayTowers,
    homeBarons: input.progress.homeBarons,
    awayBarons: input.progress.awayBarons,
    homeSoul: input.progress.homeDragonSoul,
    awaySoul: input.progress.awayDragonSoul,
    homeAlive: countAlive(input.players, input.homeTeamId, input.t),
    awayAlive: countAlive(input.players, input.awayTeamId, input.t),
    draftEdge: input.modifiers.draftEdge,
    matchupEdge: input.modifiers.matchupByPhase[input.phase] ?? 0,
    canRotateHome: input.progress.canRotateHome,
    canRotateAway: input.progress.canRotateAway,
    modes: deriveMapModes({
      t: input.t,
      canRotate,
      nextDragonAt: input.progress.nextDragonAt,
      nextBaronAt: input.progress.nextBaronAt,
      nextVoidgrubAt: input.progress.nextVoidgrubAt,
      nextHeraldAt: input.progress.nextHeraldAt,
      nextElderAt: input.progress.nextElderAt,
      homeOuterDown: anyOuterDown(input.progress.homeDefense),
      awayOuterDown: anyOuterDown(input.progress.awayDefense),
      homeTowersTaken: input.progress.homeTowers,
      awayTowersTaken: input.progress.awayTowers,
    }),
    presence: input.presence,
    lastTeamfightAt: input.progress.lastTeamfightAt ?? null,
  };
}

export function liveEdgeBias(state: MatchState, forHome: boolean): number {
  const sign = forHome ? 1 : -1;
  const gold = (state.goldGap / 2000) * SIM_BALANCE.goldSnowballPer2k;
  const kills = state.killGap * SIM_BALANCE.killSnowballPerKill;
  const towers = state.towerGap * 0.35;
  const baron =
    (state.homeBarons - state.awayBarons) * SIM_BALANCE.baronBuffPower +
    (state.homeSoul ? SIM_BALANCE.soulBuffPower : 0) -
    (state.awaySoul ? SIM_BALANCE.soulBuffPower : 0);
  const draftRaw = state.draftEdge * SIM_BALANCE.draftEdgeLiveScale;
  const draft = Math.max(
    -SIM_BALANCE.draftEdgeLiveCap,
    Math.min(SIM_BALANCE.draftEdgeLiveCap, draftRaw),
  );
  const matchup = state.matchupEdge * SIM_BALANCE.matchupLiveScale;
  return sign * (gold + kills + towers + baron + draft + matchup);
}

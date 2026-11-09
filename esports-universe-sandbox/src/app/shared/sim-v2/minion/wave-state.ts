import { dist } from '../map/pathfinding';
import type { ChampionEntity } from '../state/entities';
import type { GameState } from '../state/game-state';
import type { LaneId, TeamSide } from '../types/ids';

export type WaveZone = 'own' | 'river' | 'enemy';

export interface LaneWaveState {
  lane: LaneId;
  allyCount: number;
  enemyCount: number;
  allyHp: number;
  enemyHp: number;
  clashProgress: number | null;
  ownOuterProgress: number;
  enemyOuterProgress: number;
  zone: WaveZone;
  isCrashingOuter: boolean;
  canPush: boolean;
  allyAdvantage: number;
}

function lanePathProgress(
  state: GameState,
  lane: LaneId,
  point: { x: number; y: number },
): number {
  const path = state.lockedPack.map.lanePaths[lane];
  if (!path || path.length === 0) {
    return 0.5;
  }
  let best = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < path.length; i += 1) {
    const gap = dist(path[i], point);
    if (gap < bestDist) {
      bestDist = gap;
      best = i;
    }
  }
  return best / Math.max(1, path.length - 1);
}

function outerProgress(state: GameState, side: TeamSide, lane: LaneId): number {
  const outer = state.structures.find(
    (structure) =>
      structure.alive &&
      structure.side === side &&
      structure.lane === lane &&
      structure.structureKind === 'outer_tower',
  );
  if (!outer) {
    return side === 'blue' ? 0.38 : 0.62;
  }
  return lanePathProgress(state, lane, outer.position);
}

function enemyOuterStructure(state: GameState, side: TeamSide, lane: LaneId) {
  const enemySide = side === 'blue' ? 'red' : 'blue';
  return (
    state.structures.find(
      (structure) =>
        structure.alive &&
        structure.side === enemySide &&
        structure.lane === lane &&
        structure.structureKind === 'outer_tower',
    ) ?? null
  );
}

function waveZone(
  side: TeamSide,
  clash: number,
  ownOuter: number,
  enemyOuter: number,
): WaveZone {
  if (side === 'blue') {
    if (clash <= ownOuter + 0.03) {
      return 'own';
    }
    if (clash >= enemyOuter - 0.04) {
      return 'enemy';
    }
    return 'river';
  }
  if (clash >= ownOuter - 0.03) {
    return 'own';
  }
  if (clash <= enemyOuter + 0.04) {
    return 'enemy';
  }
  return 'river';
}

export function assessLaneWave(
  state: GameState,
  side: TeamSide,
  lane: LaneId,
): LaneWaveState {
  const allies = state.minions.filter(
    (minion) => minion.alive && minion.side === side && minion.lane === lane,
  );
  const enemies = state.minions.filter(
    (minion) => minion.alive && minion.side !== side && minion.lane === lane,
  );
  const allyHp = allies.reduce((sum, minion) => sum + minion.hp, 0);
  const enemyHp = enemies.reduce((sum, minion) => sum + minion.hp, 0);
  const ownOuterProgress = outerProgress(state, side, lane);
  const enemyOuter = enemyOuterStructure(state, side, lane);
  const enemyOuterProgress = enemyOuter
    ? lanePathProgress(state, lane, enemyOuter.position)
    : side === 'blue'
      ? 0.62
      : 0.38;

  let clashProgress: number | null = null;
  if (allies.length > 0 || enemies.length > 0) {
    const points = [...allies, ...enemies].map((minion) =>
      lanePathProgress(state, lane, minion.position),
    );
    clashProgress = points.reduce((sum, value) => sum + value, 0) / points.length;
  }

  const isCrashingOuter =
    !!enemyOuter &&
    allies.some((minion) => dist(minion.position, enemyOuter.position) < 900);

  const zone: WaveZone =
    clashProgress === null
      ? 'own'
      : waveZone(side, clashProgress, ownOuterProgress, enemyOuterProgress);

  return {
    lane,
    allyCount: allies.length,
    enemyCount: enemies.length,
    allyHp,
    enemyHp,
    clashProgress,
    ownOuterProgress,
    enemyOuterProgress,
    zone,
    isCrashingOuter,
    canPush: enemies.length > 0 || allies.length > 0,
    allyAdvantage: allies.length - enemies.length + (allyHp - enemyHp) / 800,
  };
}

export function assessChampionLaneWave(
  state: GameState,
  champion: ChampionEntity,
  lane: LaneId,
): LaneWaveState {
  return assessLaneWave(state, champion.side, lane);
}

export function freezeHoldProgress(wave: LaneWaveState, side: TeamSide): number {
  if (side === 'blue') {
    return Math.min(wave.enemyOuterProgress - 0.08, wave.ownOuterProgress + 0.035);
  }
  return Math.max(wave.enemyOuterProgress + 0.08, wave.ownOuterProgress - 0.035);
}

export function waveNeedsShoveForRecall(wave: LaneWaveState): boolean {
  if (!wave.canPush) {
    return false;
  }
  if (wave.isCrashingOuter) {
    return false;
  }
  return wave.zone === 'own' || wave.zone === 'river';
}

export function waveNearFreezeSpot(wave: LaneWaveState, side: TeamSide): boolean {
  if (wave.clashProgress === null) {
    return false;
  }
  const hold = freezeHoldProgress(wave, side);
  return Math.abs(wave.clashProgress - hold) <= 0.08;
}

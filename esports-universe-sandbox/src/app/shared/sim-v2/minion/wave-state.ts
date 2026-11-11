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

let waveFrameCache: Map<string, LaneWaveState> | null = null;

export function beginWaveAssessFrame(): void {
  waveFrameCache = new Map();
}

export function endWaveAssessFrame(): void {
  waveFrameCache = null;
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

function buildLaneWave(
  state: GameState,
  side: TeamSide,
  lane: LaneId,
): LaneWaveState {
  const ownOuterProgress = outerProgress(state, side, lane);
  const enemyOuter = enemyOuterStructure(state, side, lane);
  const enemyOuterProgress = enemyOuter
    ? lanePathProgress(state, lane, enemyOuter.position)
    : side === 'blue'
      ? 0.62
      : 0.38;

  let allyCount = 0;
  let enemyCount = 0;
  let allyHp = 0;
  let enemyHp = 0;
  let progressSum = 0;
  let progressN = 0;
  let isCrashingOuter = false;
  const enemyOuterPos = enemyOuter?.position ?? null;

  for (const minion of state.minions) {
    if (!minion.alive || minion.lane !== lane) {
      continue;
    }
    const progress = lanePathProgress(state, lane, minion.position);
    progressSum += progress;
    progressN += 1;
    if (minion.side === side) {
      allyCount += 1;
      allyHp += minion.hp;
      if (enemyOuterPos && dist(minion.position, enemyOuterPos) < 900) {
        isCrashingOuter = true;
      }
    } else {
      enemyCount += 1;
      enemyHp += minion.hp;
    }
  }

  const clashProgress = progressN > 0 ? progressSum / progressN : null;
  const zone: WaveZone =
    clashProgress === null
      ? 'own'
      : waveZone(side, clashProgress, ownOuterProgress, enemyOuterProgress);

  return {
    lane,
    allyCount,
    enemyCount,
    allyHp,
    enemyHp,
    clashProgress,
    ownOuterProgress,
    enemyOuterProgress,
    zone,
    isCrashingOuter,
    canPush: enemyCount > 0 || allyCount > 0,
    allyAdvantage: allyCount - enemyCount + (allyHp - enemyHp) / 800,
  };
}

export function assessLaneWave(
  state: GameState,
  side: TeamSide,
  lane: LaneId,
): LaneWaveState {
  if (waveFrameCache) {
    const key = `${side}:${lane}`;
    const hit = waveFrameCache.get(key);
    if (hit) {
      return hit;
    }
    const built = buildLaneWave(state, side, lane);
    waveFrameCache.set(key, built);
    return built;
  }
  return buildLaneWave(state, side, lane);
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

export function hasLanePriority(wave: LaneWaveState): boolean {
  if (wave.isCrashingOuter) {
    return true;
  }
  if (wave.zone === 'enemy' && wave.enemyCount <= 2 && wave.allyCount >= wave.enemyCount) {
    return true;
  }
  return wave.zone === 'enemy' && wave.enemyCount === 0 && wave.allyCount > 0;
}

export function shouldSlowPush(wave: LaneWaveState): boolean {
  return (
    wave.canPush &&
    !wave.isCrashingOuter &&
    wave.zone !== 'enemy' &&
    wave.allyAdvantage > -0.4 &&
    wave.allyAdvantage < 2.5
  );
}

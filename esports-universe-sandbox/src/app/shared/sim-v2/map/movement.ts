import type { ChampionEntity } from '../state/entities';
import type { GameState } from '../state/game-state';
import type { LaneId } from '../types/ids';
import type { Vec2 } from '../version/version-pack';
import {
  advanceAlongWalkablePath,
  dist,
  findPath,
  isWalkable,
  nearestWalkable,
  type PathAvoidZone,
} from './pathfinding';
import type { ReplayRecorder } from '../replay/recorder';

const EMPTY_TOWER_PATH_PENALTY = 28;
const DEEP_TOWER_PATH_PENALTY = 96;

function emptyEnemyTowerAvoidZones(
  state: GameState,
  champion: ChampionEntity,
): PathAvoidZone[] {
  const zones: PathAvoidZone[] = [];
  const enemyFountain =
    champion.side === 'blue'
      ? state.lockedPack.map.redFountain
      : state.lockedPack.map.blueFountain;
  for (const structure of state.structures) {
    if (
      !structure.alive ||
      structure.side === champion.side ||
      structure.ad <= 0 ||
      structure.range <= 0
    ) {
      continue;
    }
    const covered = state.minions.some(
      (minion) =>
        minion.alive &&
        minion.side === champion.side &&
        dist(minion.position, structure.position) <= structure.range + 80,
    );
    if (covered) {
      continue;
    }
    const allyWaveCrash = state.minions.some(
      (minion) =>
        minion.alive &&
        minion.side === champion.side &&
        dist(minion.position, structure.position) <= structure.range + 220,
    );
    const allyNear = state.champions.filter(
      (ally) =>
        ally.alive &&
        ally.side === champion.side &&
        dist(ally.position, structure.position) <= structure.range + 420,
    ).length;
    const diveNumbersOk = allyWaveCrash && allyNear >= 2;
    const nearBase = dist(structure.position, enemyFountain) < 4200;
    const deepKind =
      structure.structureKind === 'inhib_tower' ||
      structure.structureKind === 'nexus_tower' ||
      structure.structureKind === 'inner_tower';
    zones.push({
      x: structure.position.x,
      y: structure.position.y,
      radius: structure.range + (deepKind || nearBase ? 120 : 40),
      penalty:
        diveNumbersOk
          ? EMPTY_TOWER_PATH_PENALTY
          : deepKind || nearBase
            ? DEEP_TOWER_PATH_PENALTY
            : EMPTY_TOWER_PATH_PENALTY,
    });
  }
  return zones;
}

function pointHitsAvoid(point: Vec2, avoid: readonly PathAvoidZone[]): boolean {
  for (const zone of avoid) {
    if (dist(point, zone) <= zone.radius) {
      return true;
    }
  }
  return false;
}

function clampOutsideAvoidZones(
  point: Vec2,
  avoid: readonly PathAvoidZone[],
  from?: Vec2,
): Vec2 {
  let result = { ...point };
  for (const zone of avoid) {
    const gap = dist(result, zone);
    if (gap > zone.radius) {
      continue;
    }
    let dx = result.x - zone.x;
    let dy = result.y - zone.y;
    let len = Math.hypot(dx, dy);
    if (len < 1e-3 && from) {
      dx = from.x - zone.x;
      dy = from.y - zone.y;
      len = Math.hypot(dx, dy);
    }
    if (len < 1e-3) {
      dx = -1;
      dy = 0;
      len = 1;
    }
    result = {
      x: zone.x + (dx / len) * (zone.radius + 24),
      y: zone.y + (dy / len) * (zone.radius + 24),
    };
  }
  return result;
}

function shouldPreserveAction(action: string): boolean {
  return (
    action === 'gank' ||
    action === 'fight' ||
    action === 'skirmish' ||
    action === 'trade' ||
    action === 'tower_bail' ||
    action === 'retreat' ||
    action === 'recall' ||
    action === 'jungle' ||
    action === 'objective' ||
    action === 'clear' ||
    action === 'path_camp' ||
    action === 'clear_camp' ||
    action === 'siege' ||
    action === 'defend' ||
    action === 'farm' ||
    action === 'lane' ||
    action === 'wave_freeze' ||
    action === 'wave_shove'
  );
}

function nearestLaneIndex(poly: readonly Vec2[], point: Vec2): number {
  let best = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < poly.length; i += 1) {
    const gap = dist(poly[i], point);
    if (gap < bestDist) {
      bestDist = gap;
      best = i;
    }
  }
  return best;
}

export function pathAlongLane(
  poly: readonly Vec2[],
  from: Vec2,
  to: Vec2,
): Vec2[] {
  if (poly.length === 0) {
    return [];
  }
  const fromIndex = nearestLaneIndex(poly, from);
  const toIndex = nearestLaneIndex(poly, to);
  const waypoints: Vec2[] = [];
  if (fromIndex <= toIndex) {
    for (let i = fromIndex; i <= toIndex; i += 1) {
      waypoints.push({ ...poly[i] });
    }
  } else {
    for (let i = fromIndex; i >= toIndex; i -= 1) {
      waypoints.push({ ...poly[i] });
    }
  }
  if (waypoints.length === 0 || dist(waypoints[waypoints.length - 1], to) > 120) {
    waypoints.push({ ...to });
  }
  return waypoints;
}

function applyPath(
  state: GameState,
  champion: ChampionEntity,
  path: Vec2[],
  target: Vec2,
  recorder?: ReplayRecorder,
): boolean {
  if (path.length === 0) {
    return false;
  }
  champion.path = path;
  champion.moving = true;
  if (!shouldPreserveAction(champion.currentAction)) {
    champion.currentAction = 'move';
  }
  recorder?.record(state, {
    type: 'move_order',
    actorId: champion.id,
    x: target.x,
    y: target.y,
  });
  return true;
}

export function orderShortMove(
  state: GameState,
  champion: ChampionEntity,
  goal: Vec2,
  maxStep = 220,
  recorder?: ReplayRecorder,
): boolean {
  if (!champion.alive || champion.recallPhase === 'moving_home') {
    return false;
  }
  const gap = dist(champion.position, goal);
  if (gap < 48) {
    return false;
  }
  const take = Math.min(maxStep, gap);
  const ratio = take / gap;
  const click = {
    x: champion.position.x + (goal.x - champion.position.x) * ratio,
    y: champion.position.y + (goal.y - champion.position.y) * ratio,
  };
  const map = state.lockedPack.map;
  const avoid = emptyEnemyTowerAvoidZones(state, champion);
  const rawTarget = isWalkable(map, click) ? click : nearestWalkable(map, click);
  if (!rawTarget) {
    return false;
  }
  const clamped = clampOutsideAvoidZones(rawTarget, avoid, champion.position);
  const walkTarget = isWalkable(map, clamped) ? clamped : nearestWalkable(map, clamped);
  if (!walkTarget) {
    return false;
  }
  if (champion.moving && champion.path.length > 0) {
    const currentEnd = champion.path[champion.path.length - 1];
    if (dist(currentEnd, walkTarget) < 70) {
      return true;
    }
  }
  const path = findPath(map, champion.position, walkTarget, avoid);
  return applyPath(state, champion, path, walkTarget, recorder);
}

export function orderMove(
  state: GameState,
  champion: ChampionEntity,
  target: Vec2,
  recorder?: ReplayRecorder,
): boolean {
  if (!champion.alive || champion.recallPhase === 'moving_home') {
    return false;
  }
  const map = state.lockedPack.map;
  const avoid = emptyEnemyTowerAvoidZones(state, champion);
  const rawTarget = isWalkable(map, target) ? target : nearestWalkable(map, target);
  if (!rawTarget) {
    return false;
  }
  const clamped = clampOutsideAvoidZones(rawTarget, avoid, champion.position);
  const walkTarget = isWalkable(map, clamped) ? clamped : nearestWalkable(map, clamped);
  if (!walkTarget) {
    return false;
  }
  if (champion.moving && champion.path.length > 0) {
    const currentEnd = champion.path[champion.path.length - 1];
    if (dist(currentEnd, walkTarget) < 220) {
      return true;
    }
  }
  const path = findPath(map, champion.position, walkTarget, avoid);
  return applyPath(state, champion, path, walkTarget, recorder);
}

export function orderMoveOnLane(
  state: GameState,
  champion: ChampionEntity,
  lane: LaneId,
  target: Vec2,
  recorder?: ReplayRecorder,
): boolean {
  if (!champion.alive || !target) {
    return false;
  }
  const map = state.lockedPack.map;
  const avoid = emptyEnemyTowerAvoidZones(state, champion);
  const rawTarget = isWalkable(map, target) ? target : nearestWalkable(map, target);
  if (!rawTarget) {
    return false;
  }
  const clamped = clampOutsideAvoidZones(rawTarget, avoid, champion.position);
  const walkTarget = isWalkable(map, clamped) ? clamped : nearestWalkable(map, clamped);
  if (!walkTarget) {
    return false;
  }
  if (champion.moving && champion.path.length > 0) {
    const currentEnd = champion.path[champion.path.length - 1];
    if (dist(currentEnd, walkTarget) < 220) {
      return true;
    }
  }
  const lanePath = map.lanePaths[lane];
  if (!lanePath || lanePath.length === 0) {
    return orderMove(state, champion, walkTarget, recorder);
  }
  const along = pathAlongLane(lanePath, champion.position, walkTarget).filter((point) =>
    isWalkable(map, point),
  );
  if (along.length === 0) {
    return orderMove(state, champion, walkTarget, recorder);
  }
  if (along.some((point) => pointHitsAvoid(point, avoid))) {
    const detour = findPath(map, champion.position, walkTarget, avoid);
    return applyPath(state, champion, detour, walkTarget, recorder);
  }
  const join = findPath(map, champion.position, along[0], avoid);
  if (join.length === 0) {
    return orderMove(state, champion, walkTarget, recorder);
  }
  const path = [...join, ...along.slice(1)];
  const last = path[path.length - 1];
  if (dist(last, walkTarget) > map.cellSize) {
    const finish = findPath(map, last, walkTarget, avoid);
    if (finish.length > 0) {
      path.push(...finish.slice(1));
    }
  } else {
    path[path.length - 1] = { ...walkTarget };
  }
  return applyPath(state, champion, path, walkTarget, recorder);
}

export function separateChampions(state: GameState): void {
  const living = state.champions.filter(
    (champ) =>
      champ.alive &&
      champ.recallPhase !== 'at_base' &&
      champ.recallPhase !== 'moving_home',
  );
  for (let i = 0; i < living.length; i += 1) {
    for (let j = i + 1; j < living.length; j += 1) {
      const left = living[i];
      const right = living[j];
      const gap = dist(left.position, right.position);
      const minSep = left.side === right.side ? 140 : 120;
      if (gap >= minSep || gap < 0.05) {
        continue;
      }
      const push = (minSep - gap) * 0.5;
      const nx = (left.position.x - right.position.x) / gap;
      const ny = (left.position.y - right.position.y) / gap;
      left.position = {
        x: left.position.x + nx * push * 0.5,
        y: left.position.y + ny * push * 0.5,
      };
      right.position = {
        x: right.position.x - nx * push * 0.5,
        y: right.position.y - ny * push * 0.5,
      };
    }
  }
}

export function tickMovement(state: GameState, dt: number, recorder?: ReplayRecorder): void {
  const map = state.lockedPack.map;
  for (const champion of state.champions) {
    if (
      !champion.alive ||
      !champion.moving ||
      champion.path.length === 0 ||
      champion.recallPhase === 'moving_home'
    ) {
      continue;
    }
    const before = { ...champion.position };
    const advanced = advanceAlongWalkablePath(
      map,
      champion.position,
      champion.path,
      champion.moveSpeed,
      dt,
    );
    champion.position = advanced.position;
    champion.path = advanced.path;
    if (advanced.arrived) {
      champion.moving = false;
      if (champion.currentAction === 'move') {
        champion.currentAction = 'idle';
      }
    }
    if (before.x !== champion.position.x || before.y !== champion.position.y) {
      recorder?.record(state, {
        type: 'position',
        actorId: champion.id,
        x: champion.position.x,
        y: champion.position.y,
      });
    }
  }
  separateChampions(state);
}

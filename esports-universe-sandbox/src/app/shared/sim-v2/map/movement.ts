import type { ChampionEntity } from '../state/entities';
import type { GameState } from '../state/game-state';
import type { LaneId } from '../types/ids';
import type { Vec2 } from '../version/version-pack';
import { advanceAlongPath, dist, findPath, isWalkable } from './pathfinding';
import type { ReplayRecorder } from '../replay/recorder';

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
  champion.currentAction = 'move';
  recorder?.record(state, {
    type: 'move_order',
    actorId: champion.id,
    x: target.x,
    y: target.y,
  });
  return true;
}

export function orderMove(
  state: GameState,
  champion: ChampionEntity,
  target: Vec2,
  recorder?: ReplayRecorder,
): boolean {
  if (!champion.alive) {
    return false;
  }
  const map = state.lockedPack.map;
  if (!isWalkable(map, target)) {
    return false;
  }
  if (champion.moving && champion.path.length > 0) {
    const currentEnd = champion.path[champion.path.length - 1];
    if (dist(currentEnd, target) < 280) {
      champion.path[champion.path.length - 1] = { ...target };
      return true;
    }
  }
  const path = findPath(map, champion.position, target);
  return applyPath(state, champion, path, target, recorder);
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
  if (!isWalkable(map, target)) {
    return false;
  }
  if (champion.moving && champion.path.length > 0) {
    const currentEnd = champion.path[champion.path.length - 1];
    if (dist(currentEnd, target) < 280) {
      champion.path[champion.path.length - 1] = { ...target };
      return true;
    }
  }
  const lanePath = map.lanePaths[lane];
  if (!lanePath || lanePath.length === 0) {
    return orderMove(state, champion, target, recorder);
  }
  const along = pathAlongLane(lanePath, champion.position, target);
  if (along.length === 0) {
    return orderMove(state, champion, target, recorder);
  }
  const joinDist = dist(champion.position, along[0]);
  if (joinDist > 700) {
    const join = findPath(map, champion.position, along[0]);
    const merged = join.length > 0 ? [...join, ...along.slice(1)] : along;
    return applyPath(state, champion, merged, target, recorder);
  }
  return applyPath(state, champion, along, target, recorder);
}

export function tickMovement(state: GameState, dt: number, recorder?: ReplayRecorder): void {
  for (const champion of state.champions) {
    if (!champion.alive || !champion.moving || champion.path.length === 0) {
      continue;
    }
    const before = { ...champion.position };
    const advanced = advanceAlongPath(champion.position, champion.path, champion.moveSpeed, dt);
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
}

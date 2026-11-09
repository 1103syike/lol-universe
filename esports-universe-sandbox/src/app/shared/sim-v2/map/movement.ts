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
} from './pathfinding';
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
  if (!champion.alive || champion.recallPhase === 'moving_home') {
    return false;
  }
  const map = state.lockedPack.map;
  const walkTarget = isWalkable(map, target) ? target : nearestWalkable(map, target);
  if (!walkTarget) {
    return false;
  }
  if (champion.moving && champion.path.length > 0) {
    const currentEnd = champion.path[champion.path.length - 1];
    if (dist(currentEnd, walkTarget) < 280) {
      const trimmed = findPath(map, champion.position, walkTarget);
      if (trimmed.length > 0) {
        champion.path = trimmed;
        return true;
      }
    }
  }
  const path = findPath(map, champion.position, walkTarget);
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
  const walkTarget = isWalkable(map, target) ? target : nearestWalkable(map, target);
  if (!walkTarget) {
    return false;
  }
  if (champion.moving && champion.path.length > 0) {
    const currentEnd = champion.path[champion.path.length - 1];
    if (dist(currentEnd, walkTarget) < 280) {
      const trimmed = findPath(map, champion.position, walkTarget);
      if (trimmed.length > 0) {
        champion.path = trimmed;
        return true;
      }
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
  const join = findPath(map, champion.position, along[0]);
  if (join.length === 0) {
    return orderMove(state, champion, walkTarget, recorder);
  }
  const path = [...join, ...along.slice(1)];
  const last = path[path.length - 1];
  if (dist(last, walkTarget) > map.cellSize) {
    const finish = findPath(map, last, walkTarget);
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
      const minSep = left.side === right.side ? 190 : 160;
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

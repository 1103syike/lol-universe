import type { ChampionEntity } from '../state/entities';
import type { GameState } from '../state/game-state';
import type { LaneId } from '../types/ids';
import type { Vec2 } from '../version/version-pack';
import { dist } from './pathfinding';

function nearestIndex(path: readonly Vec2[], point: Vec2): number {
  let best = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < path.length; i += 1) {
    const gap = dist(path[i], point);
    if (gap < bestDist) {
      bestDist = gap;
      best = i;
    }
  }
  return best;
}

function tangentAt(path: readonly Vec2[], index: number): Vec2 {
  const prev = path[Math.max(0, index - 1)];
  const next = path[Math.min(path.length - 1, index + 1)];
  const dx = next.x - prev.x;
  const dy = next.y - prev.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}

export function offsetLaneStand(
  state: GameState,
  lane: LaneId,
  side: ChampionEntity['side'],
  along: Vec2,
  depth = 1,
): Vec2 {
  const path = state.lockedPack.map.lanePaths[lane];
  if (!path || path.length < 2) {
    return { ...along };
  }
  const index = nearestIndex(path, along);
  const tangent = tangentAt(path, index);
  let normal = { x: -tangent.y, y: tangent.x };
  const fountain =
    side === 'blue' ? state.lockedPack.map.blueFountain : state.lockedPack.map.redFountain;
  const towardOwn = { x: fountain.x - along.x, y: fountain.y - along.y };
  if (normal.x * towardOwn.x + normal.y * towardOwn.y < 0) {
    normal = { x: -normal.x, y: -normal.y };
  }
  const distance = 70 + depth * 35;
  return {
    x: along.x + normal.x * distance,
    y: along.y + normal.y * distance,
  };
}

export function faceOffLanePoint(
  state: GameState,
  champion: ChampionEntity,
  lane: LaneId,
  along: Vec2,
): Vec2 {
  const depth =
    champion.positionLabel === 'SUPPORT'
      ? 1.35
      : champion.positionLabel === 'BOT'
        ? 0.35
        : champion.positionLabel === 'TOP'
          ? 0.4
          : 0.55;
  return offsetLaneStand(state, lane, champion.side, along, depth);
}

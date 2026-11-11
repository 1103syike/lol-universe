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

function laneFrame(
  state: GameState,
  lane: LaneId,
  along: Vec2,
): { tangent: Vec2; normal: Vec2 } | null {
  const path = state.lockedPack.map.lanePaths[lane];
  if (!path || path.length < 2) {
    return null;
  }
  const index = nearestIndex(path, along);
  const tangent = tangentAt(path, index);
  return { tangent, normal: { x: -tangent.y, y: tangent.x } };
}

function ownSideNormal(
  state: GameState,
  side: ChampionEntity['side'],
  along: Vec2,
  normal: Vec2,
): Vec2 {
  const fountain =
    side === 'blue' ? state.lockedPack.map.blueFountain : state.lockedPack.map.redFountain;
  const towardOwn = { x: fountain.x - along.x, y: fountain.y - along.y };
  if (normal.x * towardOwn.x + normal.y * towardOwn.y < 0) {
    return { x: -normal.x, y: -normal.y };
  }
  return normal;
}

function roleDepth(champion: ChampionEntity, timeSec = 9999): number {
  if (champion.positionLabel === 'SUPPORT') {
    return timeSec < 480 ? 0.85 : 0.7;
  }
  if (champion.positionLabel === 'BOT') {
    return timeSec < 300 ? 0.18 : 0.12;
  }
  if (champion.positionLabel === 'TOP') {
    return 0.18;
  }
  if (champion.positionLabel === 'MID') {
    return 0.2;
  }
  return 0.25;
}

function roleAlongShift(champion: ChampionEntity): number {
  if (champion.positionLabel === 'SUPPORT') {
    return -70;
  }
  if (champion.positionLabel === 'BOT') {
    return 25;
  }
  if (champion.positionLabel === 'TOP') {
    return 10;
  }
  if (champion.positionLabel === 'MID') {
    return 8;
  }
  return 0;
}

function idPhase(championId: string): number {
  let hash = 0;
  for (let i = 0; i < championId.length; i += 1) {
    hash = (hash * 31 + championId.charCodeAt(i)) | 0;
  }
  return (hash % 1000) / 1000;
}

export function offsetLaneStand(
  state: GameState,
  lane: LaneId,
  side: ChampionEntity['side'],
  along: Vec2,
  depth = 1,
): Vec2 {
  const frame = laneFrame(state, lane, along);
  if (!frame) {
    return { ...along };
  }
  const normal = ownSideNormal(state, side, along, frame.normal);
  const distance = 48 + depth * 28;
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
  const depth = roleDepth(champion, state.scheduler.time);
  let point = offsetLaneStand(state, lane, champion.side, along, depth);
  const frame = laneFrame(state, lane, along);
  if (!frame) {
    return point;
  }
  const towardOwn = champion.side === 'blue' ? -1 : 1;
  const shift = roleAlongShift(champion) * towardOwn;
  point = {
    x: point.x + frame.tangent.x * shift,
    y: point.y + frame.tangent.y * shift,
  };
  return point;
}

export function humanizeLaneStand(
  state: GameState,
  champion: ChampionEntity,
  lane: LaneId,
  base: Vec2,
): Vec2 {
  let point = { ...base };
  const frame = laneFrame(state, lane, base) ?? {
    tangent: { x: 1, y: 0 },
    normal: { x: 0, y: 1 },
  };
  const normal = ownSideNormal(state, champion.side, base, frame.normal);

  for (const ally of state.champions) {
    if (!ally.alive || ally.id === champion.id || ally.side !== champion.side) {
      continue;
    }
    if (dist(ally.position, base) > 700) {
      continue;
    }
    const gap = dist(point, ally.position);
    const minGap =
      champion.positionLabel === 'SUPPORT' || ally.positionLabel === 'SUPPORT' ? 160 : 130;
    if (gap >= minGap) {
      continue;
    }
    const safeGap = Math.max(gap, 8);
    const push = (minGap - gap) * 0.55;
    const away = {
      x: (point.x - ally.position.x) / safeGap,
      y: (point.y - ally.position.y) / safeGap,
    };
    point = {
      x: point.x + (away.x * 0.5 + normal.x * 0.5) * push,
      y: point.y + (away.y * 0.5 + normal.y * 0.5) * push,
    };
  }

  const foe = state.champions.find(
    (enemy) =>
      enemy.alive &&
      enemy.side !== champion.side &&
      dist(enemy.position, point) < Math.max(420, enemy.attackRange + 80),
  );
  if (foe) {
    const gap = dist(point, foe.position);
    const threat = foe.attackRange > 300 ? foe.attackRange + 30 : Math.max(175, foe.attackRange + 40);
    if (gap > 1 && gap < threat * 0.82) {
      const push = (threat * 0.82 - gap) * 0.28;
      point = {
        x: point.x + normal.x * push,
        y: point.y + normal.y * push,
      };
    }
  }

  const phase = idPhase(champion.id) * Math.PI * 2;
  const alongHold = Math.sin(phase) * 18;
  const sideHold = Math.cos(phase * 1.3) * 14;
  point = {
    x: point.x + frame.tangent.x * alongHold + normal.x * sideHold,
    y: point.y + frame.tangent.y * alongHold + normal.y * sideHold,
  };

  return point;
}

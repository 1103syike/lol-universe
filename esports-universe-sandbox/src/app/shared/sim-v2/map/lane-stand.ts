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
    return timeSec < 480 ? 2.8 : 2.15;
  }
  if (champion.positionLabel === 'BOT') {
    return timeSec < 300 ? 0.55 : 0.25;
  }
  if (champion.positionLabel === 'TOP') {
    return 0.55;
  }
  if (champion.positionLabel === 'MID') {
    return 0.7;
  }
  return 1;
}

function roleAlongShift(champion: ChampionEntity): number {
  if (champion.positionLabel === 'SUPPORT') {
    return -170;
  }
  if (champion.positionLabel === 'BOT') {
    return 55;
  }
  if (champion.positionLabel === 'TOP') {
    return 25;
  }
  if (champion.positionLabel === 'MID') {
    return 15;
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
  const distance = 85 + depth * 55;
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
  const towardOwn =
    champion.side === 'blue' ? -1 : 1;
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
    if (dist(ally.position, base) > 900) {
      continue;
    }
    const gap = dist(point, ally.position);
    const minGap =
      champion.positionLabel === 'SUPPORT' || ally.positionLabel === 'SUPPORT' ? 300 : 230;
    if (gap >= minGap) {
      continue;
    }
    const safeGap = Math.max(gap, 8);
    const push = (minGap - gap) * 0.85;
    const away = {
      x: (point.x - ally.position.x) / safeGap,
      y: (point.y - ally.position.y) / safeGap,
    };
    const sideBias = ally.positionLabel === 'BOT' && champion.positionLabel === 'SUPPORT' ? 1.15 : 1;
    point = {
      x: point.x + (away.x * 0.55 + normal.x * 0.45) * push * sideBias,
      y: point.y + (away.y * 0.55 + normal.y * 0.45) * push * sideBias,
    };
  }

  const foe = state.champions.find(
    (enemy) =>
      enemy.alive &&
      enemy.side !== champion.side &&
      dist(enemy.position, point) < 320,
  );
  if (foe) {
    const gap = dist(point, foe.position);
    if (gap > 1 && gap < 280) {
      const comfort =
        champion.attackRange > 300 ? champion.attackRange * 0.92 : 250;
      if (gap < comfort) {
        const push = (comfort - gap) * 0.35;
        point = {
          x: point.x + normal.x * push,
          y: point.y + normal.y * push,
        };
      }
    }
  }

  const phase = state.scheduler.time * 1.85 + idPhase(champion.id) * 6.3;
  const alongAmp =
    champion.positionLabel === 'SUPPORT' ? 48 : champion.positionLabel === 'MID' ? 70 : 62;
  const sideAmp =
    champion.positionLabel === 'SUPPORT' ? 36 : champion.positionLabel === 'TOP' ? 52 : 44;
  const alongJitter = Math.sin(phase) * alongAmp + Math.sin(phase * 0.37 + 1.1) * (alongAmp * 0.35);
  const sideJitter = Math.cos(phase * 0.91) * sideAmp + Math.cos(phase * 0.29) * (sideAmp * 0.3);
  point = {
    x: point.x + frame.tangent.x * alongJitter + normal.x * sideJitter,
    y: point.y + frame.tangent.y * alongJitter + normal.y * sideJitter,
  };

  return point;
}

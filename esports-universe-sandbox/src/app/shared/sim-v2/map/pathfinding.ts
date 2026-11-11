import type { MapDefinition, Vec2 } from '../version/version-pack';

export function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function dashToward(from: Vec2, to: Vec2, maxRange = 650): Vec2 {
  const gap = dist(from, to);
  if (gap <= maxRange || gap < 1e-6) {
    return { ...to };
  }
  const ratio = maxRange / gap;
  return {
    x: from.x + (to.x - from.x) * ratio,
    y: from.y + (to.y - from.y) * ratio,
  };
}

export function clampToMap(map: MapDefinition, point: Vec2): Vec2 {
  const maxX = map.width * map.cellSize - 1;
  const maxY = map.height * map.cellSize - 1;
  return {
    x: Math.min(maxX, Math.max(0, point.x)),
    y: Math.min(maxY, Math.max(0, point.y)),
  };
}

export function worldToCell(map: MapDefinition, point: Vec2): { cx: number; cy: number } {
  return {
    cx: Math.min(map.width - 1, Math.max(0, Math.floor(point.x / map.cellSize))),
    cy: Math.min(map.height - 1, Math.max(0, Math.floor(point.y / map.cellSize))),
  };
}

export function cellToWorld(map: MapDefinition, cx: number, cy: number): Vec2 {
  return {
    x: (cx + 0.5) * map.cellSize,
    y: (cy + 0.5) * map.cellSize,
  };
}

export function isWalkable(map: MapDefinition, point: Vec2): boolean {
  const { cx, cy } = worldToCell(map, point);
  return map.walkable[cy]?.[cx] === 1;
}

export function nearestWalkable(
  map: MapDefinition,
  point: Vec2,
  maxRadiusCells = 12,
): Vec2 | null {
  const clamped = clampToMap(map, point);
  if (isWalkable(map, clamped)) {
    return clamped;
  }
  const origin = worldToCell(map, clamped);
  for (let radius = 1; radius <= maxRadiusCells; radius += 1) {
    let best: Vec2 | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) {
          continue;
        }
        const cx = origin.cx + dx;
        const cy = origin.cy + dy;
        if (cx < 0 || cy < 0 || cx >= map.width || cy >= map.height) {
          continue;
        }
        if (map.walkable[cy][cx] !== 1) {
          continue;
        }
        const candidate = cellToWorld(map, cx, cy);
        const gap = dist(clamped, candidate);
        if (gap < bestDist) {
          bestDist = gap;
          best = candidate;
        }
      }
    }
    if (best) {
      return best;
    }
  }
  return null;
}

export interface PathAvoidZone {
  x: number;
  y: number;
  radius: number;
  penalty: number;
}

function pointInAvoidZones(point: Vec2, avoid?: readonly PathAvoidZone[]): boolean {
  if (!avoid || avoid.length === 0) {
    return false;
  }
  for (const zone of avoid) {
    if (dist(point, zone) <= zone.radius) {
      return true;
    }
  }
  return false;
}

function cellAvoidPenalty(
  map: MapDefinition,
  cx: number,
  cy: number,
  avoid?: readonly PathAvoidZone[],
): number {
  if (!avoid || avoid.length === 0) {
    return 0;
  }
  const world = cellToWorld(map, cx, cy);
  let extra = 0;
  for (const zone of avoid) {
    if (dist(world, zone) <= zone.radius) {
      extra += zone.penalty;
    }
  }
  return extra;
}

export function hasLineOfSight(
  map: MapDefinition,
  from: Vec2,
  to: Vec2,
  avoid?: readonly PathAvoidZone[],
): boolean {
  const gap = dist(from, to);
  if (gap < 1e-6) {
    return isWalkable(map, from) && !pointInAvoidZones(from, avoid);
  }
  const steps = Math.max(2, Math.ceil(gap / (map.cellSize * 0.35)));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const sample = {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
    };
    if (!isWalkable(map, sample)) {
      return false;
    }
    if (pointInAvoidZones(sample, avoid)) {
      return false;
    }
  }
  return true;
}

export function smoothPath(
  map: MapDefinition,
  path: readonly Vec2[],
  avoid?: readonly PathAvoidZone[],
): Vec2[] {
  if (path.length <= 2) {
    return path.map((point) => ({ ...point }));
  }
  const out: Vec2[] = [{ ...path[0] }];
  let anchor = 0;
  while (anchor < path.length - 1) {
    let farthest = anchor + 1;
    for (let i = path.length - 1; i > anchor + 1; i -= 1) {
      if (hasLineOfSight(map, path[anchor], path[i], avoid)) {
        farthest = i;
        break;
      }
    }
    out.push({ ...path[farthest] });
    anchor = farthest;
  }
  return out;
}

export function dashTowardWalkable(
  map: MapDefinition,
  from: Vec2,
  to: Vec2,
  maxRange = 650,
): Vec2 {
  const raw = dashToward(from, to, maxRange);
  const steps = Math.max(1, Math.ceil(dist(from, raw) / (map.cellSize * 0.5)));
  let lastWalkable = isWalkable(map, from) ? { ...from } : nearestWalkable(map, from);
  if (!lastWalkable) {
    return { ...from };
  }
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const sample = {
      x: from.x + (raw.x - from.x) * t,
      y: from.y + (raw.y - from.y) * t,
    };
    if (isWalkable(map, sample)) {
      lastWalkable = sample;
      continue;
    }
    break;
  }
  return lastWalkable;
}

interface Node {
  cx: number;
  cy: number;
  g: number;
  f: number;
  parent: Node | null;
}

const NEIGHBORS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

export function findPath(
  map: MapDefinition,
  from: Vec2,
  to: Vec2,
  avoid?: readonly PathAvoidZone[],
): Vec2[] {
  const startPoint = isWalkable(map, from) ? clampToMap(map, from) : nearestWalkable(map, from);
  const goalPoint = clampToMap(map, to);
  if (!startPoint || !isWalkable(map, goalPoint)) {
    return [];
  }
  const start = worldToCell(map, startPoint);
  const goal = worldToCell(map, goalPoint);
  if (map.walkable[start.cy][start.cx] !== 1 || map.walkable[goal.cy][goal.cx] !== 1) {
    return [];
  }
  if (start.cx === goal.cx && start.cy === goal.cy) {
    return [goalPoint];
  }

  const open: Node[] = [
    {
      cx: start.cx,
      cy: start.cy,
      g: 0,
      f: Math.hypot(goal.cx - start.cx, goal.cy - start.cy),
      parent: null,
    },
  ];
  const closed = new Set<string>();
  const bestG = new Map<string, number>();
  const key = (cx: number, cy: number) => `${cx}:${cy}`;
  bestG.set(key(start.cx, start.cy), 0);

  while (open.length > 0) {
    let bestIndex = 0;
    for (let i = 1; i < open.length; i += 1) {
      if (open[i].f < open[bestIndex].f) {
        bestIndex = i;
      }
    }
    const current = open.splice(bestIndex, 1)[0];
    const currentKey = key(current.cx, current.cy);
    if (closed.has(currentKey)) {
      continue;
    }
    closed.add(currentKey);
    if (current.cx === goal.cx && current.cy === goal.cy) {
      const cells: Vec2[] = [];
      let node: Node | null = current;
      while (node) {
        cells.push(cellToWorld(map, node.cx, node.cy));
        node = node.parent;
      }
      cells.reverse();
      cells[0] = startPoint;
      cells[cells.length - 1] = goalPoint;
      return smoothPath(map, cells, avoid);
    }

    for (const [dx, dy] of NEIGHBORS) {
      const nx = current.cx + dx;
      const ny = current.cy + dy;
      if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) {
        continue;
      }
      if (map.walkable[ny][nx] !== 1) {
        continue;
      }
      if (dx !== 0 && dy !== 0) {
        if (map.walkable[current.cy][nx] !== 1 || map.walkable[ny][current.cx] !== 1) {
          continue;
        }
      }
      const nKey = key(nx, ny);
      if (closed.has(nKey)) {
        continue;
      }
      const step =
        (dx !== 0 && dy !== 0 ? 1.414 : 1) + cellAvoidPenalty(map, nx, ny, avoid);
      const g = current.g + step;
      const known = bestG.get(nKey);
      if (known !== undefined && known <= g) {
        continue;
      }
      bestG.set(nKey, g);
      const h = Math.hypot(goal.cx - nx, goal.cy - ny);
      open.push({ cx: nx, cy: ny, g, f: g + h, parent: current });
    }
  }
  return [];
}

export function stitchPath(map: MapDefinition, guides: readonly Vec2[]): Vec2[] {
  const snapped: Vec2[] = [];
  for (const guide of guides) {
    const point = nearestWalkable(map, guide);
    if (!point) {
      continue;
    }
    const prev = snapped[snapped.length - 1];
    if (
      prev &&
      worldToCell(map, prev).cx === worldToCell(map, point).cx &&
      worldToCell(map, prev).cy === worldToCell(map, point).cy
    ) {
      continue;
    }
    snapped.push(point);
  }
  if (snapped.length === 0) {
    return [];
  }
  if (snapped.length === 1) {
    return snapped;
  }
  const out: Vec2[] = [];
  for (let i = 0; i < snapped.length - 1; i += 1) {
    const segment = findPath(map, snapped[i], snapped[i + 1]);
    if (segment.length === 0) {
      continue;
    }
    if (out.length === 0) {
      out.push(...segment);
    } else {
      out.push(...segment.slice(1));
    }
  }
  return out;
}

export function advanceAlongPath(
  position: Vec2,
  path: Vec2[],
  moveSpeed: number,
  dt: number,
): { position: Vec2; path: Vec2[]; arrived: boolean } {
  if (path.length === 0) {
    return { position, path, arrived: true };
  }
  let remaining = moveSpeed * dt;
  let current = { ...position };
  const nextPath = path.slice();
  while (remaining > 0 && nextPath.length > 0) {
    const target = nextPath[0];
    const gap = dist(current, target);
    if (gap <= remaining) {
      current = { ...target };
      nextPath.shift();
      remaining -= gap;
    } else {
      const ratio = remaining / gap;
      current = {
        x: current.x + (target.x - current.x) * ratio,
        y: current.y + (target.y - current.y) * ratio,
      };
      remaining = 0;
    }
  }
  return { position: current, path: nextPath, arrived: nextPath.length === 0 };
}

export function advanceAlongWalkablePath(
  map: MapDefinition,
  position: Vec2,
  path: Vec2[],
  moveSpeed: number,
  dt: number,
): { position: Vec2; path: Vec2[]; arrived: boolean } {
  const advanced = advanceAlongPath(position, path, moveSpeed, dt);
  if (isWalkable(map, advanced.position)) {
    return advanced;
  }
  const snapped = nearestWalkable(map, advanced.position) ?? position;
  return { ...advanced, position: snapped };
}

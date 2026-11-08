import type { MapDefinition, Vec2 } from '../version/version-pack';

export function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
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

interface Node {
  cx: number;
  cy: number;
  g: number;
  f: number;
  parent: Node | null;
}

export function findPath(map: MapDefinition, from: Vec2, to: Vec2): Vec2[] {
  const start = worldToCell(map, clampToMap(map, from));
  const goal = worldToCell(map, clampToMap(map, to));
  if (map.walkable[start.cy][start.cx] !== 1 || map.walkable[goal.cy][goal.cx] !== 1) {
    return [];
  }
  if (start.cx === goal.cx && start.cy === goal.cy) {
    return [clampToMap(map, to)];
  }
  const manhattan = Math.abs(goal.cx - start.cx) + Math.abs(goal.cy - start.cy);
  if (manhattan <= 2) {
    return [clampToMap(map, to)];
  }
  if (manhattan > 8) {
    const waypoints: Vec2[] = [];
    const steps = Math.min(8, Math.ceil(manhattan / 4));
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      const point = clampToMap(map, {
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
      });
      if (isWalkable(map, point)) {
        waypoints.push(point);
      }
    }
    if (waypoints.length > 0) {
      return waypoints;
    }
  }

  const open: Node[] = [
    {
      cx: start.cx,
      cy: start.cy,
      g: 0,
      f: Math.abs(goal.cx - start.cx) + Math.abs(goal.cy - start.cy),
      parent: null,
    },
  ];
  const closed = new Set<string>();
  const key = (cx: number, cy: number) => `${cx}:${cy}`;

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
      cells[cells.length - 1] = clampToMap(map, to);
      return cells;
    }

    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ] as const) {
      const nx = current.cx + dx;
      const ny = current.cy + dy;
      if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) {
        continue;
      }
      if (map.walkable[ny][nx] !== 1) {
        continue;
      }
      const nKey = key(nx, ny);
      if (closed.has(nKey)) {
        continue;
      }
      const step = dx !== 0 && dy !== 0 ? 1.414 : 1;
      const g = current.g + step;
      const h = Math.abs(goal.cx - nx) + Math.abs(goal.cy - ny);
      open.push({ cx: nx, cy: ny, g, f: g + h, parent: current });
    }
  }
  return [];
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

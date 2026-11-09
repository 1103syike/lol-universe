import type { MapPoint } from './map-layout';

export type MapWallPoint = MapPoint & {
  handleIn?: MapPoint | null;
  handleOut?: MapPoint | null;
};

export type MapWallKind = 'stroke' | 'fill';

export type MapWall = {
  id: string;
  label: string;
  kind: MapWallKind;
  width: number;
  points: MapWallPoint[];
};

export const FOUNTAIN_ATTACK_RANGE = 1050;
export const DEFAULT_BRUSH_WIDTH = 320;

export function normalizeWalls(walls: MapWall[] | undefined): MapWall[] {
  if (!Array.isArray(walls)) {
    return [];
  }
  const normalized: MapWall[] = [];
  walls.forEach((wall, index) => {
    const kind: MapWallKind = wall.kind === 'stroke' ? 'stroke' : 'fill';
    const minPoints = kind === 'stroke' ? 2 : 3;
    if (!wall || !Array.isArray(wall.points) || wall.points.length < minPoints) {
      return;
    }
    normalized.push({
      id: wall.id || `wall_${index + 1}`,
      label: wall.label || `牆 ${index + 1}`,
      kind,
      width: Math.max(80, Math.round(wall.width || DEFAULT_BRUSH_WIDTH)),
      points: wall.points.map((point) => ({
        x: point.x,
        y: point.y,
        handleIn: point.handleIn ? { x: point.handleIn.x, y: point.handleIn.y } : null,
        handleOut: point.handleOut ? { x: point.handleOut.x, y: point.handleOut.y } : null,
      })),
    });
  });
  return normalized;
}

export function createWallId(existing: readonly MapWall[]): string {
  let n = existing.length + 1;
  const used = new Set(existing.map((wall) => wall.id));
  while (used.has(`wall_${n}`)) {
    n += 1;
  }
  return `wall_${n}`;
}

export function createRoadId(existing: readonly MapWall[]): string {
  let n = existing.length + 1;
  const used = new Set(existing.map((road) => road.id));
  while (used.has(`road_${n}`)) {
    n += 1;
  }
  return `road_${n}`;
}

export function normalizeRoads(roads: MapWall[] | undefined): MapWall[] {
  return normalizeWalls(roads)
    .map((road) => ({
      ...road,
      kind: 'stroke' as const,
      id: road.id.startsWith('road_') ? road.id : road.id.replace(/^wall_/, 'road_'),
      label: road.label.replace(/^牆/, '路'),
    }))
    .filter((road) => road.points.length >= 2);
}

export function rectWall(
  id: string,
  label: string,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): MapWall {
  const left = Math.min(x0, x1);
  const right = Math.max(x0, x1);
  const bottom = Math.min(y0, y1);
  const top = Math.max(y0, y1);
  return {
    id,
    label,
    kind: 'fill',
    width: DEFAULT_BRUSH_WIDTH,
    points: [
      { x: left, y: bottom, handleIn: null, handleOut: null },
      { x: right, y: bottom, handleIn: null, handleOut: null },
      { x: right, y: top, handleIn: null, handleOut: null },
      { x: left, y: top, handleIn: null, handleOut: null },
    ],
  };
}

function distToSegment(point: MapPoint, a: MapPoint, b: MapPoint): number {
  return distPointToSegment(point, a, b).dist;
}

function ramerDouglasPeucker(points: readonly MapPoint[], epsilon: number): MapPoint[] {
  if (points.length <= 2) {
    return points.map((point) => ({ x: point.x, y: point.y }));
  }
  let maxDist = 0;
  let index = 0;
  const first = points[0];
  const last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i += 1) {
    const d = distToSegment(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }
  if (maxDist <= epsilon) {
    return [
      { x: first.x, y: first.y },
      { x: last.x, y: last.y },
    ];
  }
  const left = ramerDouglasPeucker(points.slice(0, index + 1), epsilon);
  const right = ramerDouglasPeucker(points.slice(index), epsilon);
  return [...left.slice(0, -1), ...right];
}

export function simplifyPolyline(
  points: readonly MapPoint[],
  epsilon = 110,
): MapPoint[] {
  if (points.length <= 2) {
    return points.map((point) => ({ x: point.x, y: point.y }));
  }
  const deduped: MapPoint[] = [{ ...points[0] }];
  for (let i = 1; i < points.length; i += 1) {
    const prev = deduped[deduped.length - 1];
    const curr = points[i];
    if (Math.hypot(curr.x - prev.x, curr.y - prev.y) >= 25) {
      deduped.push({ x: curr.x, y: curr.y });
    }
  }
  if (deduped.length <= 2) {
    return deduped;
  }
  return ramerDouglasPeucker(deduped, epsilon);
}

function cubicPoint(
  p0: MapPoint,
  p1: MapPoint,
  p2: MapPoint,
  p3: MapPoint,
  t: number,
): MapPoint {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

export function sampleOpenPath(
  points: readonly MapWallPoint[],
  samplesPerCurve = 10,
): MapPoint[] {
  if (points.length === 0) {
    return [];
  }
  if (points.length === 1) {
    return [{ x: points[0].x, y: points[0].y }];
  }
  const out: MapPoint[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    out.push({ x: a.x, y: a.y });
    const c1 = a.handleOut ?? a;
    const c2 = b.handleIn ?? b;
    const curved =
      Math.hypot(c1.x - a.x, c1.y - a.y) > 1 || Math.hypot(c2.x - b.x, c2.y - b.y) > 1;
    if (!curved) {
      continue;
    }
    for (let s = 1; s < samplesPerCurve; s += 1) {
      out.push(cubicPoint(a, c1, c2, b, s / samplesPerCurve));
    }
  }
  const last = points[points.length - 1];
  out.push({ x: last.x, y: last.y });
  return out;
}

export function sampleClosedPath(
  points: readonly MapWallPoint[],
  samplesPerCurve = 10,
): MapPoint[] {
  if (points.length < 2) {
    return points.map((point) => ({ x: point.x, y: point.y }));
  }
  const out: MapPoint[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    out.push({ x: a.x, y: a.y });
    const c1 = a.handleOut ?? a;
    const c2 = b.handleIn ?? b;
    const curved =
      Math.hypot(c1.x - a.x, c1.y - a.y) > 1 || Math.hypot(c2.x - b.x, c2.y - b.y) > 1;
    if (!curved) {
      continue;
    }
    for (let s = 1; s < samplesPerCurve; s += 1) {
      out.push(cubicPoint(a, c1, c2, b, s / samplesPerCurve));
    }
  }
  return out;
}

export function sampleWallCenterline(
  wall: MapWall,
  samplesPerCurve = 10,
): MapPoint[] {
  return wall.kind === 'stroke'
    ? sampleOpenPath(wall.points, samplesPerCurve)
    : sampleClosedPath(wall.points, samplesPerCurve);
}

export function distPointToPolyline(
  point: MapPoint,
  polyline: readonly MapPoint[],
): number {
  if (polyline.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  if (polyline.length === 1) {
    return Math.hypot(point.x - polyline[0].x, point.y - polyline[0].y);
  }
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < polyline.length - 1; i += 1) {
    best = Math.min(best, distPointToSegment(point, polyline[i], polyline[i + 1]).dist);
  }
  return best;
}

export function pointInPolygon(point: MapPoint, polygon: readonly MapPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}

export function isInsideWall(point: MapPoint, wall: MapWall): boolean {
  if (wall.kind === 'stroke') {
    const centerline = sampleWallCenterline(wall, 12);
    return distPointToPolyline(point, centerline) <= wall.width / 2;
  }
  const outline = sampleClosedPath(wall.points, 12);
  return outline.length >= 3 && pointInPolygon(point, outline);
}

export function isInsideAnyWall(
  point: MapPoint,
  walls: readonly MapWall[],
): boolean {
  return walls.some((wall) => isInsideWall(point, wall));
}

export function rasterizeWalkableFromWalls(
  width: number,
  height: number,
  cellSize: number,
  walls: readonly MapWall[],
): Array<Array<0 | 1>> {
  const grid: Array<Array<0 | 1>> = [];
  const prepared = walls.map((wall) => ({
    wall,
    samples: sampleWallCenterline(wall, 12),
  }));
  for (let cy = 0; cy < height; cy += 1) {
    const row: Array<0 | 1> = [];
    for (let cx = 0; cx < width; cx += 1) {
      const edge = cx < 1 || cy < 1 || cx >= width - 1 || cy >= height - 1;
      if (edge) {
        row.push(0);
        continue;
      }
      const point = {
        x: (cx + 0.5) * cellSize,
        y: (cy + 0.5) * cellSize,
      };
      let blocked = false;
      for (const item of prepared) {
        if (item.wall.kind === 'stroke') {
          if (distPointToPolyline(point, item.samples) <= item.wall.width / 2) {
            blocked = true;
            break;
          }
        } else if (item.samples.length >= 3 && pointInPolygon(point, item.samples)) {
          blocked = true;
          break;
        }
      }
      row.push(blocked ? 0 : 1);
    }
    grid.push(row);
  }
  return grid;
}

export function rasterizeWalkableFromRoads(
  width: number,
  height: number,
  cellSize: number,
  roads: readonly MapWall[],
  pads: readonly { point: MapPoint; radius: number }[] = [],
): Array<Array<0 | 1>> {
  const prepared = roads.map((road) => ({
    road,
    samples: sampleOpenPath(road.points, 12),
  }));
  const hasRoads = prepared.length > 0;
  const grid: Array<Array<0 | 1>> = [];
  for (let cy = 0; cy < height; cy += 1) {
    const row: Array<0 | 1> = [];
    for (let cx = 0; cx < width; cx += 1) {
      const edge = cx < 1 || cy < 1 || cx >= width - 1 || cy >= height - 1;
      if (edge) {
        row.push(0);
        continue;
      }
      if (!hasRoads) {
        row.push(1);
        continue;
      }
      const point = {
        x: (cx + 0.5) * cellSize,
        y: (cy + 0.5) * cellSize,
      };
      let walkable = false;
      for (const item of prepared) {
        if (distPointToPolyline(point, item.samples) <= item.road.width / 2) {
          walkable = true;
          break;
        }
      }
      if (!walkable) {
        for (const pad of pads) {
          if (Math.hypot(point.x - pad.point.x, point.y - pad.point.y) <= pad.radius) {
            walkable = true;
            break;
          }
        }
      }
      row.push(walkable ? 1 : 0);
    }
    grid.push(row);
  }
  return grid;
}

export function strokeWallFromPolyline(
  id: string,
  label: string,
  rawPoints: readonly MapPoint[],
  width = DEFAULT_BRUSH_WIDTH,
): MapWall | null {
  const simplified = simplifyPolyline(rawPoints, Math.max(90, width * 0.28));
  if (simplified.length === 0) {
    return null;
  }
  if (simplified.length === 1) {
    const p = simplified[0];
    return {
      id,
      label,
      kind: 'stroke',
      width,
      points: [
        { x: p.x - width * 0.35, y: p.y, handleIn: null, handleOut: null },
        { x: p.x + width * 0.35, y: p.y, handleIn: null, handleOut: null },
      ],
    };
  }
  const base: MapWall = {
    id,
    label,
    kind: 'stroke',
    width,
    points: simplified.map((point) => ({
      x: point.x,
      y: point.y,
      handleIn: null,
      handleOut: null,
    })),
  };
  return makeSmoothHandles(base, 0.34);
}

export function svgWorldY(y: number, max = 15000): number {
  return max - y;
}

export function wallToSvgPath(wall: MapWall, max = 15000): string {
  const pts = wall.points;
  if (pts.length === 0) {
    return '';
  }
  const parts: string[] = [`M ${pts[0].x} ${svgWorldY(pts[0].y, max)}`];
  const lastIndex = wall.kind === 'stroke' ? pts.length - 1 : pts.length;
  for (let i = 0; i < lastIndex; i += 1) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    if (wall.kind === 'stroke' && i === pts.length - 1) {
      break;
    }
    const c1 = a.handleOut;
    const c2 = b.handleIn;
    const curved =
      (c1 && Math.hypot(c1.x - a.x, c1.y - a.y) > 1) ||
      (c2 && Math.hypot(c2.x - b.x, c2.y - b.y) > 1);
    if (curved) {
      const h1 = c1 ?? a;
      const h2 = c2 ?? b;
      parts.push(
        `C ${h1.x} ${svgWorldY(h1.y, max)} ${h2.x} ${svgWorldY(h2.y, max)} ${b.x} ${svgWorldY(b.y, max)}`,
      );
    } else {
      parts.push(`L ${b.x} ${svgWorldY(b.y, max)}`);
    }
  }
  if (wall.kind === 'fill') {
    parts.push('Z');
  }
  return parts.join(' ');
}

export function distPointToSegment(
  point: MapPoint,
  a: MapPoint,
  b: MapPoint,
): { dist: number; t: number; closest: MapPoint } {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lengthSq = abx * abx + aby * aby;
  if (lengthSq <= 1e-6) {
    return {
      dist: Math.hypot(point.x - a.x, point.y - a.y),
      t: 0,
      closest: { ...a },
    };
  }
  const t = Math.max(
    0,
    Math.min(1, ((point.x - a.x) * abx + (point.y - a.y) * aby) / lengthSq),
  );
  const closest = { x: a.x + abx * t, y: a.y + aby * t };
  return {
    dist: Math.hypot(point.x - closest.x, point.y - closest.y),
    t,
    closest,
  };
}

export function nearestWallEdge(
  wall: MapWall,
  point: MapPoint,
): { index: number; dist: number; closest: MapPoint } | null {
  if (wall.points.length < 2) {
    return null;
  }
  const last = wall.kind === 'stroke' ? wall.points.length - 1 : wall.points.length;
  let bestIndex = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  let bestClosest = wall.points[0];
  for (let i = 0; i < last; i += 1) {
    const a = wall.points[i];
    const b = wall.points[(i + 1) % wall.points.length];
    const hit = distPointToSegment(point, a, b);
    if (hit.dist < bestDist) {
      bestDist = hit.dist;
      bestIndex = i;
      bestClosest = hit.closest;
    }
  }
  return { index: bestIndex, dist: bestDist, closest: bestClosest };
}

export function makeSmoothHandles(wall: MapWall, amount = 0.3): MapWall {
  const pts = wall.points;
  if (pts.length < 2) {
    return wall;
  }
  const closed = wall.kind === 'fill';
  const nextPoints = pts.map((point, index) => {
    const prev = closed
      ? pts[(index - 1 + pts.length) % pts.length]
      : pts[Math.max(0, index - 1)];
    const curr = pts[index];
    const next = closed
      ? pts[(index + 1) % pts.length]
      : pts[Math.min(pts.length - 1, index + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const neighborGap = Math.hypot(next.x - curr.x, next.y - curr.y);
    const scale = amount * Math.max(neighborGap, Math.hypot(curr.x - prev.x, curr.y - prev.y));
    const ux = (dx / len) * scale;
    const uy = (dy / len) * scale;
    if (!closed && index === 0) {
      return {
        x: curr.x,
        y: curr.y,
        handleIn: null,
        handleOut: { x: curr.x + ux, y: curr.y + uy },
      };
    }
    if (!closed && index === pts.length - 1) {
      return {
        x: curr.x,
        y: curr.y,
        handleIn: { x: curr.x - ux, y: curr.y - uy },
        handleOut: null,
      };
    }
    return {
      x: curr.x,
      y: curr.y,
      handleIn: { x: curr.x - ux, y: curr.y - uy },
      handleOut: { x: curr.x + ux, y: curr.y + uy },
    };
  });
  return { ...wall, points: nextPoints };
}

export function clearHandles(wall: MapWall): MapWall {
  return {
    ...wall,
    points: wall.points.map((point) => ({
      x: point.x,
      y: point.y,
      handleIn: null,
      handleOut: null,
    })),
  };
}

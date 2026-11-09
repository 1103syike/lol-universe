import type { MapLayout, MapPoint } from './map-layout';

export type MapRoadId = 'top' | 'mid' | 'bot';

export type MapRoad = {
  id: MapRoadId;
  label: string;
  width: number;
  points: MapPoint[];
};

export type MapRoads = Record<MapRoadId, MapRoad>;

export const MAP_ROAD_IDS: readonly MapRoadId[] = ['top', 'mid', 'bot'];

export const DEFAULT_ROAD_WIDTH: Record<MapRoadId, number> = {
  top: 620,
  mid: 540,
  bot: 620,
};

function pt(x: number, y: number): MapPoint {
  return { x, y };
}

export function densifyRoadPoints(points: readonly MapPoint[], step = 320): MapPoint[] {
  if (points.length === 0) {
    return [];
  }
  const out: MapPoint[] = [{ ...points[0] }];
  for (let i = 1; i < points.length; i += 1) {
    const from = points[i - 1];
    const to = points[i];
    const gap = Math.hypot(to.x - from.x, to.y - from.y);
    const segments = Math.max(1, Math.ceil(gap / step));
    for (let s = 1; s <= segments; s += 1) {
      const t = s / segments;
      out.push({
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
      });
    }
  }
  return out;
}

export function buildDefaultRoads(layout: MapLayout): MapRoads {
  const blue = { ...layout.fountains.blue };
  const red = { ...layout.fountains.red };

  return {
    top: {
      id: 'top',
      label: '上路',
      width: DEFAULT_ROAD_WIDTH.top,
      points: [
        blue,
        pt(1150, 3200),
        pt(1200, 6050),
        pt(1200, 9500),
        pt(1800, 12800),
        pt(4200, 14100),
        pt(7650, 14150),
        pt(11200, 14150),
        pt(13200, 14000),
        red,
      ],
    },
    mid: {
      id: 'mid',
      label: '中路',
      width: DEFAULT_ROAD_WIDTH.mid,
      points: [
        blue,
        pt(3200, 3000),
        pt(5200, 5000),
        pt(7500, 7500),
        pt(9800, 10000),
        pt(11800, 12000),
        red,
      ],
    },
    bot: {
      id: 'bot',
      label: '下路',
      width: DEFAULT_ROAD_WIDTH.bot,
      points: [
        blue,
        pt(2800, 1100),
        pt(5700, 1400),
        pt(9400, 1400),
        pt(12800, 1800),
        pt(14100, 4200),
        pt(14150, 7750),
        pt(14150, 11200),
        pt(14000, 13200),
        red,
      ],
    },
  };
}

export function normalizeRoads(
  roads: Partial<MapRoads> | undefined,
  layout: MapLayout,
): MapRoads {
  const defaults = buildDefaultRoads(layout);
  const next = {} as MapRoads;
  for (const id of MAP_ROAD_IDS) {
    const incoming = roads?.[id];
    const fallback = defaults[id];
    const points =
      Array.isArray(incoming?.points) && incoming.points.length >= 2
        ? incoming.points.map((point) => ({ x: point.x, y: point.y }))
        : fallback.points.map((point) => ({ ...point }));
    next[id] = {
      id,
      label: incoming?.label ?? fallback.label,
      width: Math.max(120, Math.round(incoming?.width ?? fallback.width)),
      points,
    };
  }
  return next;
}

export function roadPolygonPoints(
  points: readonly MapPoint[],
  width: number,
): MapPoint[] {
  if (points.length < 2) {
    return [];
  }
  const half = width / 2;
  const left: MapPoint[] = [];
  const right: MapPoint[] = [];

  for (let i = 0; i < points.length; i += 1) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = (-dy / length) * half;
    const ny = (dx / length) * half;
    left.push({ x: points[i].x + nx, y: points[i].y + ny });
    right.push({ x: points[i].x - nx, y: points[i].y - ny });
  }

  return [...left, ...right.reverse()];
}

export function svgWorldY(y: number, max = 15000): number {
  return max - y;
}

export function pointsToSvgPolygon(
  points: readonly MapPoint[],
  max = 15000,
): string {
  return points.map((point) => `${point.x},${svgWorldY(point.y, max)}`).join(' ');
}

export function pointsToSvgPolyline(
  points: readonly MapPoint[],
  max = 15000,
): string {
  return points.map((point) => `${point.x},${svgWorldY(point.y, max)}`).join(' ');
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

export function nearestRoadSegment(
  road: MapRoad,
  point: MapPoint,
): { index: number; dist: number; closest: MapPoint } | null {
  if (road.points.length < 2) {
    return null;
  }
  let bestIndex = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  let bestClosest = road.points[0];
  for (let i = 0; i < road.points.length - 1; i += 1) {
    const hit = distPointToSegment(point, road.points[i], road.points[i + 1]);
    if (hit.dist < bestDist) {
      bestDist = hit.dist;
      bestIndex = i;
      bestClosest = hit.closest;
    }
  }
  return { index: bestIndex, dist: bestDist, closest: bestClosest };
}

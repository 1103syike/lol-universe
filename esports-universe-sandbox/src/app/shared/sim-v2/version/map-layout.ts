import mapLayoutJson from './map-layout.json';
import {
  normalizePaintMask,
  normalizePaintShapes,
  type MapPaintMask,
  type MapPaintShape,
} from './map-paint';
import { normalizeRoads, type MapRoads } from './map-roads';

export type MapPoint = { x: number; y: number };

export const DEFAULT_TOWER_ATTACK_RANGE = 825;
export const DEFAULT_FOUNTAIN_ATTACK_RANGE = 1050;

export type MapAttackRanges = {
  tower: number;
  fountain: number;
};

export type MapLayout = {
  structures: Record<string, MapPoint>;
  objectives: {
    dragon: MapPoint;
    baron: MapPoint;
    herald: MapPoint;
  };
  camps: Record<string, MapPoint>;
  fountains: {
    blue: MapPoint;
    red: MapPoint;
  };
  attackRanges: MapAttackRanges;
  paintShapes: MapPaintShape[];
  paintMask: MapPaintMask | null;
  laneRoads: MapRoads;
};

function normalizeAttackRanges(ranges: Partial<MapAttackRanges> | undefined): MapAttackRanges {
  const tower = Number(ranges?.tower);
  const fountain = Number(ranges?.fountain);
  return {
    tower:
      Number.isFinite(tower) && tower > 0
        ? Math.round(tower)
        : DEFAULT_TOWER_ATTACK_RANGE,
    fountain:
      Number.isFinite(fountain) && fountain > 0
        ? Math.round(fountain)
        : DEFAULT_FOUNTAIN_ATTACK_RANGE,
  };
}

export const MAP_LAYOUT_SNAP = 50;
export const MAP_LAYOUT_MAX = 15000;

export function ensureMapLayout(layout: MapLayout): MapLayout {
  const next = structuredClone(layout) as MapLayout & {
    walls?: MapPaintShape[];
    roads?: MapPaintShape[];
    paintDots?: unknown;
    paintErases?: unknown;
    paintShapes?: MapPaintShape[];
    paintMask?: MapPaintMask | null;
    laneRoads?: Partial<MapRoads>;
    attackRanges?: Partial<MapAttackRanges>;
  };
  const incomingShapes =
    Array.isArray(next.paintShapes) && next.paintShapes.length > 0
      ? next.paintShapes
      : Array.isArray(next.roads) && next.roads.length > 0
        ? next.roads
        : Array.isArray(next.walls) && next.walls.length > 0
          ? next.walls
          : next.paintShapes;
  next.paintShapes = normalizePaintShapes(incomingShapes);
  next.paintMask = normalizePaintMask(next.paintMask ?? undefined);
  next.attackRanges = normalizeAttackRanges(next.attackRanges);
  const shell = next as MapLayout;
  next.laneRoads = normalizeRoads(next.laneRoads, shell);
  delete next.walls;
  delete next.roads;
  delete next.paintDots;
  delete next.paintErases;
  return next;
}

export const DEFAULT_MAP_LAYOUT = ensureMapLayout(
  mapLayoutJson as unknown as MapLayout,
);

export function snapMapCoord(value: number, snap = MAP_LAYOUT_SNAP): number {
  return Math.round(value / snap) * snap;
}

export function clampMapCoord(value: number, max = MAP_LAYOUT_MAX): number {
  return Math.max(0, Math.min(max, value));
}

export function applyMapPoint(
  points: Record<string, MapPoint> | undefined,
  id: string,
  fallback: MapPoint,
): MapPoint {
  const point = points?.[id];
  if (!point) {
    return fallback;
  }
  return {
    x: point.x,
    y: point.y,
  };
}

export function cloneMapLayout(layout: MapLayout = DEFAULT_MAP_LAYOUT): MapLayout {
  return ensureMapLayout(structuredClone(layout) as MapLayout);
}

export function serializeMapLayout(layout: MapLayout): string {
  return `${JSON.stringify(ensureMapLayout(layout), null, 2)}\n`;
}

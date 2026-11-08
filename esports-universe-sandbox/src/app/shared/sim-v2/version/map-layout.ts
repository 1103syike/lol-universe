import mapLayoutJson from './map-layout.json';

export type MapPoint = { x: number; y: number };

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
};

export const MAP_LAYOUT_SNAP = 50;
export const MAP_LAYOUT_MAX = 15000;

export const DEFAULT_MAP_LAYOUT = mapLayoutJson as MapLayout;

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
  return structuredClone(layout);
}

export function serializeMapLayout(layout: MapLayout): string {
  return `${JSON.stringify(layout, null, 2)}\n`;
}

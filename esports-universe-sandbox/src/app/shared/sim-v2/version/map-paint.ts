import type { MapPoint } from './map-layout';
import {
  DEFAULT_BRUSH_WIDTH,
  distPointToPolyline,
  makeSmoothHandles,
  normalizeWalls,
  pointInPolygon,
  sampleClosedPath,
  sampleOpenPath,
  type MapWall,
  type MapWallPoint,
} from './map-walls';

export type MapPaintShape = MapWall;
export type MapPaintPoint = MapWallPoint;
export type MapPaintMask = Array<Array<0 | 1>>;

export const DEFAULT_STROKE_WIDTH = DEFAULT_BRUSH_WIDTH;
export const MIN_STROKE_WIDTH = 80;
export const MAX_STROKE_WIDTH = 900;
export const PAINT_MASK_WIDTH = 75;
export const PAINT_MASK_HEIGHT = 75;
export const PAINT_MASK_CELL = 200;

export function normalizePaintShapes(shapes: MapWall[] | undefined): MapPaintShape[] {
  return normalizeWalls(shapes)
    .map((shape, index) => ({
      ...shape,
      id: shape.id.startsWith('shape_') ? shape.id : `shape_${index + 1}`,
      label: shape.label.replace(/^牆/, '線').replace(/^路/, '線').replace(/^形狀/, '線'),
      kind: 'stroke' as const,
      width: Math.max(MIN_STROKE_WIDTH, Math.round(shape.width || DEFAULT_STROKE_WIDTH)),
    }))
    .filter((shape) => shape.points.length >= 2);
}

export function normalizePaintMask(mask: MapPaintMask | undefined): MapPaintMask | null {
  if (!Array.isArray(mask) || mask.length === 0) {
    return null;
  }
  const height = mask.length;
  const width = mask[0]?.length ?? 0;
  if (width === 0) {
    return null;
  }
  return mask.map((row) =>
    Array.from({ length: width }, (_, cx) => (row?.[cx] === 1 ? 1 : 0)),
  );
}

export function createPaintShapeId(existing: readonly MapPaintShape[]): string {
  let n = existing.length + 1;
  const used = new Set(existing.map((shape) => shape.id));
  while (used.has(`shape_${n}`)) {
    n += 1;
  }
  return `shape_${n}`;
}

export function strokeFromDrag(
  id: string,
  label: string,
  from: MapPoint,
  to: MapPoint,
  width = DEFAULT_STROKE_WIDTH,
): MapPaintShape | null {
  if (Math.hypot(to.x - from.x, to.y - from.y) < 40) {
    return null;
  }
  const base: MapPaintShape = {
    id,
    label,
    kind: 'stroke',
    width: Math.max(MIN_STROKE_WIDTH, Math.round(width)),
    points: [
      { x: from.x, y: from.y, handleIn: null, handleOut: null },
      { x: to.x, y: to.y, handleIn: null, handleOut: null },
    ],
  };
  return makeSmoothHandles(base, 0.28);
}

export function bakePaintMask(
  shapes: readonly MapPaintShape[],
  pads: readonly { point: MapPoint; radius: number }[] = [],
  width = PAINT_MASK_WIDTH,
  height = PAINT_MASK_HEIGHT,
  cellSize = PAINT_MASK_CELL,
): MapPaintMask {
  return rasterizeWalkableFromPaint(width, height, cellSize, shapes, pads, null);
}

export function rasterizeWalkableFromPaint(
  width: number,
  height: number,
  cellSize: number,
  shapes: readonly MapPaintShape[],
  pads: readonly { point: MapPoint; radius: number }[] = [],
  mask: MapPaintMask | null = null,
): MapPaintMask {
  if (mask && mask.length === height && mask[0]?.length === width) {
    return mask.map((row) => row.map((cell) => (cell === 1 ? 1 : 0)));
  }

  const prepared = shapes.map((shape) => ({
    shape,
    samples: sampleOpenPath(shape.points, 12),
  }));
  const hasPaint = prepared.length > 0;
  const grid: MapPaintMask = [];
  for (let cy = 0; cy < height; cy += 1) {
    const row: Array<0 | 1> = [];
    for (let cx = 0; cx < width; cx += 1) {
      const edge = cx < 1 || cy < 1 || cx >= width - 1 || cy >= height - 1;
      if (edge) {
        row.push(0);
        continue;
      }
      if (!hasPaint) {
        row.push(1);
        continue;
      }
      const point = {
        x: (cx + 0.5) * cellSize,
        y: (cy + 0.5) * cellSize,
      };
      let walkable = false;
      for (const item of prepared) {
        if (distPointToPolyline(point, item.samples) <= item.shape.width / 2) {
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

export function worldToMaskCell(
  point: MapPoint,
  cellSize = PAINT_MASK_CELL,
): { cx: number; cy: number } {
  return {
    cx: Math.floor(point.x / cellSize),
    cy: Math.floor(point.y / cellSize),
  };
}

export function stampMaskBrush(
  mask: MapPaintMask,
  point: MapPoint,
  brushSize: number,
  value: 0 | 1,
  cellSize = PAINT_MASK_CELL,
): MapPaintMask {
  const height = mask.length;
  const width = mask[0]?.length ?? 0;
  if (width === 0 || height === 0) {
    return mask;
  }
  const radius = Math.max(cellSize * 0.5, brushSize / 2);
  const next = mask.map((row) => row.slice()) as MapPaintMask;
  const minCx = Math.max(0, Math.floor((point.x - radius) / cellSize));
  const maxCx = Math.min(width - 1, Math.floor((point.x + radius) / cellSize));
  const minCy = Math.max(0, Math.floor((point.y - radius) / cellSize));
  const maxCy = Math.min(height - 1, Math.floor((point.y + radius) / cellSize));
  for (let cy = minCy; cy <= maxCy; cy += 1) {
    for (let cx = minCx; cx <= maxCx; cx += 1) {
      const center = {
        x: (cx + 0.5) * cellSize,
        y: (cy + 0.5) * cellSize,
      };
      if (Math.hypot(center.x - point.x, center.y - point.y) > radius) {
        continue;
      }
      if (cx < 1 || cy < 1 || cx >= width - 1 || cy >= height - 1) {
        next[cy][cx] = 0;
        continue;
      }
      next[cy][cx] = value;
    }
  }
  return next;
}

export function countWalkableCells(mask: MapPaintMask): number {
  let count = 0;
  for (const row of mask) {
    for (const cell of row) {
      if (cell === 1) {
        count += 1;
      }
    }
  }
  return count;
}

export function walkableToPngDataUrl(
  walkable: ReadonlyArray<ReadonlyArray<0 | 1>>,
  scale = 4,
): string {
  const height = walkable.length;
  const width = walkable[0]?.length ?? 0;
  if (width === 0 || height === 0) {
    return '';
  }
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return '';
  }
  ctx.fillStyle = '#1a1520';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#7dffb0';
  for (let cy = 0; cy < height; cy += 1) {
    for (let cx = 0; cx < width; cx += 1) {
      if (walkable[cy][cx] !== 1) {
        continue;
      }
      ctx.fillRect(cx * scale, (height - 1 - cy) * scale, scale, scale);
    }
  }
  return canvas.toDataURL('image/png');
}

export function isPointOnShape(point: MapPoint, shape: MapPaintShape): boolean {
  if (shape.kind === 'fill') {
    const outline = sampleClosedPath(shape.points, 12);
    return outline.length >= 3 && pointInPolygon(point, outline);
  }
  const samples = sampleOpenPath(shape.points, 12);
  return distPointToPolyline(point, samples) <= shape.width / 2;
}

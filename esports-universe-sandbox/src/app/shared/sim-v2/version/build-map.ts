import { stitchPath } from '../map/pathfinding';
import { DEFAULT_MAP_LAYOUT, type MapPoint } from './map-layout';
import {
  normalizePaintShapes,
  rasterizeWalkableFromPaint,
} from './map-paint';

import { densifyRoadPoints, normalizeRoads } from './map-roads';
import { FOUNTAIN_ATTACK_RANGE } from './map-walls';
import type { MapDefinition, Vec2 } from './version-pack';

function struct(id: string): Vec2 {
  const point = DEFAULT_MAP_LAYOUT.structures[id];
  if (!point) {
    throw new Error(`Missing structure in map layout: ${id}`);
  }
  return { x: point.x, y: point.y };
}

function camp(id: string): Vec2 {
  const point = DEFAULT_MAP_LAYOUT.camps[id];
  if (!point) {
    throw new Error(`Missing camp in map layout: ${id}`);
  }
  return { x: point.x, y: point.y };
}

function lerp(a: MapPoint, b: MapPoint, t: number): Vec2 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

export function buildLaneApproaches(): Record<string, { blue: Vec2; red: Vec2 }> {
  return {
    TOP: {
      blue: lerp(struct('blue_top_outer'), struct('blue_top_inner'), 0.22),
      red: lerp(struct('red_top_outer'), struct('red_top_inner'), 0.22),
    },
    JUNGLE: {
      blue: camp('wolves'),
      red: camp('red_wolves'),
    },
    MID: {
      blue: lerp(struct('blue_mid_outer'), struct('blue_mid_inner'), 0.18),
      red: lerp(struct('red_mid_outer'), struct('red_mid_inner'), 0.18),
    },
    BOT: {
      blue: lerp(struct('blue_bot_outer'), struct('blue_bot_inner'), 0.22),
      red: lerp(struct('red_bot_outer'), struct('red_bot_inner'), 0.22),
    },
    SUPPORT: {
      blue: lerp(struct('blue_bot_outer'), struct('blue_bot_inner'), 0.32),
      red: lerp(struct('red_bot_outer'), struct('red_bot_inner'), 0.32),
    },
  };
}

export function buildCanonicalMap(): MapDefinition {
  const width = 75;
  const height = 75;
  const cellSize = 200;
  const blueFountain = { ...DEFAULT_MAP_LAYOUT.fountains.blue };
  const redFountain = { ...DEFAULT_MAP_LAYOUT.fountains.red };
  const paintShapes = normalizePaintShapes(DEFAULT_MAP_LAYOUT.paintShapes);
  const laneGuides = normalizeRoads(DEFAULT_MAP_LAYOUT.laneRoads, DEFAULT_MAP_LAYOUT);
  const walkable = rasterizeWalkableFromPaint(
    width,
    height,
    cellSize,
    paintShapes,
    [
      { point: blueFountain, radius: FOUNTAIN_ATTACK_RANGE * 0.55 },
      { point: redFountain, radius: FOUNTAIN_ATTACK_RANGE * 0.55 },
    ],
    DEFAULT_MAP_LAYOUT.paintMask,
  );
  const mapBase: MapDefinition = {
    width,
    height,
    cellSize,
    walkable,
    bushes: [
      { x: 3500, y: 7500 },
      { x: 11500, y: 7500 },
      { x: 7500, y: 3500 },
      { x: 7500, y: 11500 },
      { x: 5200, y: 9800 },
      { x: 9800, y: 5200 },
    ],
    blueFountain,
    redFountain,
    lanePaths: {
      top: [],
      mid: [],
      bot: [],
    },
  };

  return {
    ...mapBase,
    lanePaths: {
      top: densifyRoadPoints(stitchPath(mapBase, laneGuides.top.points), 260),
      mid: densifyRoadPoints(stitchPath(mapBase, laneGuides.mid.points), 260),
      bot: densifyRoadPoints(stitchPath(mapBase, laneGuides.bot.points), 260),
    },
  };
}

import { describe, expect, it } from 'vitest';
import { isWalkable, stitchPath } from '../map/pathfinding';
import { buildCanonicalMap } from './build-map';
import { cloneMapLayout, DEFAULT_MAP_LAYOUT } from './map-layout';
import { densifyRoadPoints, normalizeRoads } from './map-roads';
import { buildStructures } from './shared-content';

function nearestDist(path: { x: number; y: number }[], point: { x: number; y: number }): number {
  let best = Number.POSITIVE_INFINITY;
  for (const step of path) {
    const gap = Math.hypot(step.x - point.x, step.y - point.y);
    if (gap < best) {
      best = gap;
    }
  }
  return best;
}

describe('buildCanonicalMap lane alignment', () => {
  it('starts and ends near fountains', () => {
    const map = buildCanonicalMap();
    for (const lane of ['top', 'mid', 'bot'] as const) {
      const path = map.lanePaths[lane];
      expect(nearestDist(path, map.blueFountain)).toBeLessThan(200);
      expect(nearestDist(path, map.redFountain)).toBeLessThan(200);
    }
  });

  it('keeps every lane path point walkable', () => {
    const map = buildCanonicalMap();
    for (const lane of ['top', 'mid', 'bot'] as const) {
      const path = map.lanePaths[lane];
      expect(path.length).toBeGreaterThan(12);
      for (const point of path) {
        expect(isWalkable(map, point), `${lane} left walkable`).toBe(true);
      }
    }
  });

  it('does not require lane paths to hug tower centers', () => {
    const map = buildCanonicalMap();
    const outerTowers = buildStructures().filter(
      (item) => item.lane && item.kind === 'outer_tower',
    );
    let farCount = 0;
    for (const structure of outerTowers) {
      const path = map.lanePaths[structure.lane!];
      if (nearestDist(path, structure.position) > 480) {
        farCount += 1;
      }
    }
    expect(farCount).toBeGreaterThan(0);
  });

  it('uses custom laneRoads from layout when present', () => {
    const layout = cloneMapLayout(DEFAULT_MAP_LAYOUT);
    layout.laneRoads.mid.points = [
      { ...layout.fountains.blue },
      { x: 6000, y: 6000 },
      { x: 9000, y: 9000 },
      { ...layout.fountains.red },
    ];
    const guides = normalizeRoads(layout.laneRoads, layout);
    const mapBase = buildCanonicalMap();
    const custom = densifyRoadPoints(stitchPath(mapBase, guides.mid.points), 260);
    expect(custom.length).toBeGreaterThan(4);
    expect(nearestDist(custom, { x: 6000, y: 6000 })).toBeLessThan(400);
  });
});

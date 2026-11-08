import { describe, expect, it } from 'vitest';
import { buildStructures } from './shared-content';
import { buildCanonicalMap } from './build-map';

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
  it('keeps lane structures close to their lane path', () => {
    const map = buildCanonicalMap();
    const structures = buildStructures().filter((item) => item.lane);
    for (const structure of structures) {
      const path = map.lanePaths[structure.lane!];
      const gap = nearestDist(path, structure.position);
      expect(gap, `${structure.id} far from ${structure.lane}`).toBeLessThan(280);
    }
  });

  it('starts and ends near fountains', () => {
    const map = buildCanonicalMap();
    for (const lane of ['top', 'mid', 'bot'] as const) {
      const path = map.lanePaths[lane];
      expect(nearestDist(path, map.blueFountain)).toBeLessThan(80);
      expect(nearestDist(path, map.redFountain)).toBeLessThan(80);
    }
  });
});

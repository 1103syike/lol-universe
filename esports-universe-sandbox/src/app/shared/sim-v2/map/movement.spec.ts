import { describe, expect, it } from 'vitest';
import { buildCanonicalMap } from '../version/build-map';
import { pathAlongLane } from './movement';
import { isWalkable } from './pathfinding';

describe('pathAlongLane', () => {
  const map = buildCanonicalMap();

  it('stays on walkable cells for top lane', () => {
    const from = map.lanePaths.top[2];
    const to = map.lanePaths.top[map.lanePaths.top.length - 3];
    const path = pathAlongLane(map.lanePaths.top, from, to);
    expect(path.length).toBeGreaterThan(8);
    for (const point of path) {
      expect(isWalkable(map, point)).toBe(true);
    }
  });

  it('stays on walkable cells for bot lane', () => {
    const from = map.lanePaths.bot[2];
    const to = map.lanePaths.bot[map.lanePaths.bot.length - 3];
    const path = pathAlongLane(map.lanePaths.bot, from, to);
    expect(path.length).toBeGreaterThan(8);
    for (const point of path) {
      expect(isWalkable(map, point)).toBe(true);
    }
  });
});

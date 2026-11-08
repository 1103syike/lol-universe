import { describe, expect, it } from 'vitest';
import { buildCanonicalMap } from '../version/build-map';
import { pathAlongLane } from './movement';

describe('pathAlongLane', () => {
  const map = buildCanonicalMap();

  it('keeps top lane L-shaped instead of cutting diagonally', () => {
    const from = map.lanePaths.top[2];
    const to = map.lanePaths.top[map.lanePaths.top.length - 3];
    const path = pathAlongLane(map.lanePaths.top, from, to);
    expect(path.length).toBeGreaterThan(8);
    for (const point of path) {
      const onVertical = point.x < 4500;
      const onHorizontal = point.y > 11000;
      expect(onVertical || onHorizontal).toBe(true);
    }
  });

  it('follows bot lane around the corner', () => {
    const from = map.lanePaths.bot[2];
    const to = map.lanePaths.bot[map.lanePaths.bot.length - 3];
    const path = pathAlongLane(map.lanePaths.bot, from, to);
    expect(path.length).toBeGreaterThan(8);
    for (const point of path) {
      const onHorizontal = point.y < 4500;
      const onVertical = point.x > 11000;
      expect(onHorizontal || onVertical).toBe(true);
    }
  });
});


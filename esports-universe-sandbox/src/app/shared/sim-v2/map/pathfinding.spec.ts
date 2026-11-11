import { describe, expect, it } from 'vitest';
import { buildCanonicalMap } from '../version/build-map';
import { findPath, hasLineOfSight, isWalkable } from './pathfinding';

describe('pathfinding', () => {
  const map = buildCanonicalMap();

  it('finds a walkable path between fountains', () => {
    const path = findPath(map, map.blueFountain, map.redFountain);
    expect(path.length).toBeGreaterThan(1);
    expect(isWalkable(map, path[0])).toBe(true);
    expect(isWalkable(map, path[path.length - 1])).toBe(true);
  });

  it('keeps every step on walkable cells with clear sight', () => {
    const path = findPath(map, map.blueFountain, map.lanePaths.top[Math.floor(map.lanePaths.top.length / 2)]);
    expect(path.length).toBeGreaterThan(1);
    for (const point of path) {
      expect(isWalkable(map, point)).toBe(true);
    }
    for (let i = 1; i < path.length; i += 1) {
      expect(hasLineOfSight(map, path[i - 1], path[i])).toBe(true);
    }
  });

  it('rejects blocked destinations', () => {
    const blocked = { x: 50, y: 50 };
    expect(isWalkable(map, blocked)).toBe(false);
    expect(findPath(map, map.blueFountain, blocked)).toEqual([]);
  });

  it('applies avoid-zone penalty without failing to find a path', () => {
    const mid = map.lanePaths.mid[Math.floor(map.lanePaths.mid.length * 0.55)];
    const direct = findPath(map, map.blueFountain, mid);
    expect(direct.length).toBeGreaterThan(1);
    const hazard = direct[Math.min(direct.length - 1, Math.floor(direct.length * 0.5))];
    const avoided = findPath(map, map.blueFountain, mid, [
      { x: hazard.x, y: hazard.y, radius: 600, penalty: 28 },
    ]);
    expect(avoided.length).toBeGreaterThan(1);
    expect(isWalkable(map, avoided[avoided.length - 1])).toBe(true);
  });
});

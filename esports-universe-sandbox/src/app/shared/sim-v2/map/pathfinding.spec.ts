import { describe, expect, it } from 'vitest';
import { buildCanonicalMap } from '../version/build-map';
import { findPath, isWalkable } from './pathfinding';

describe('pathfinding', () => {
  const map = buildCanonicalMap();

  it('finds a path between fountains', () => {
    const path = findPath(map, map.blueFountain, map.redFountain);
    expect(path.length).toBeGreaterThan(2);
    expect(isWalkable(map, path[0])).toBe(true);
  });

  it('rejects blocked destinations', () => {
    const blocked = { x: 50, y: 50 };
    expect(isWalkable(map, blocked)).toBe(false);
    expect(findPath(map, map.blueFountain, blocked)).toEqual([]);
  });
});

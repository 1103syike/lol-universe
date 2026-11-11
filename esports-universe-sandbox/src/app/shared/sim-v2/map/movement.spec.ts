import { describe, expect, it } from 'vitest';
import { createMatch } from '../engine';
import { buildCanonicalMap } from '../version/build-map';
import { dist } from './pathfinding';
import { orderMove, pathAlongLane } from './movement';
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

describe('orderMove empty-tower destination', () => {
  it('relocates a move target outside an empty enemy tower and keeps gank action', () => {
    const { state, recorder } = createMatch({
      versionId: 'demo-a',
      seed: 77,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position, index) => ({
        playerId: `blue_${position}`,
        gamertag: `blue_${position}`,
        position,
        championId: ['Aatrox', 'Graves', 'Ahri', 'Jinx', 'Thresh'][index],
        laning: 70,
        mechanics: 70,
        teamfighting: 70,
        gameSense: 70,
        consistency: 70,
        adaptability: 70,
      })),
      red: (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position, index) => ({
        playerId: `red_${position}`,
        gamertag: `red_${position}`,
        position,
        championId: ['Garen', 'Viego', 'Syndra', 'Ashe', 'Leona'][index],
        laning: 70,
        mechanics: 70,
        teamfighting: 70,
        gameSense: 70,
        consistency: 70,
        adaptability: 70,
      })),
    });
    const jungler = state.champions.find(
      (champ) => champ.side === 'blue' && champ.positionLabel === 'JUNGLE',
    )!;
    const tower = state.structures.find(
      (item) =>
        item.side === 'red' && item.structureKind === 'outer_tower' && item.lane === 'top',
    )!;
    jungler.position = {
      x: tower.position.x - tower.range - 220,
      y: tower.position.y - tower.range - 220,
    };
    jungler.currentAction = 'gank';
    state.minions = state.minions.filter((minion) => minion.side !== 'blue');

    const insideTower = { ...tower.position };
    const moved = orderMove(state, jungler, insideTower, recorder);
    const end = jungler.path[jungler.path.length - 1] ?? jungler.position;
    expect(moved).toBe(true);
    expect(dist(end, tower.position)).toBeGreaterThan(tower.range);
    expect(jungler.currentAction).toBe('gank');
  });
});

import { rectWall, rasterizeWalkableFromWalls } from './map-walls';

describe('map walls', () => {
  it('blocks cells inside rectangular walls', () => {
    const wall = rectWall('wall_1', 'test', 7000, 7000, 8000, 8000);
    const grid = rasterizeWalkableFromWalls(75, 75, 200, [wall]);
    expect(grid[37][37]).toBe(0);
    expect(grid[10][10]).toBe(1);
  });
});

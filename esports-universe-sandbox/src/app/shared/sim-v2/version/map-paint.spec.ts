import {
  bakePaintMask,
  countWalkableCells,
  normalizePaintShapes,
  stampMaskBrush,
  strokeFromDrag,
} from './map-paint';

describe('map paint mask', () => {
  it('bakes strokes into a walkable mask', () => {
    const shapes = normalizePaintShapes([
      strokeFromDrag('shape_1', '線 1', { x: 2000, y: 7500 }, { x: 12000, y: 7500 }, 400)!,
    ]);
    const mask = bakePaintMask(shapes);
    expect(mask[37][37]).toBe(1);
    expect(mask[10][10]).toBe(0);
    expect(countWalkableCells(mask)).toBeGreaterThan(20);
  });

  it('eraser punches holes in the mask', () => {
    const shapes = normalizePaintShapes([
      strokeFromDrag('shape_1', '線 1', { x: 2000, y: 7500 }, { x: 12000, y: 7500 }, 800)!,
    ]);
    const baked = bakePaintMask(shapes);
    const erased = stampMaskBrush(baked, { x: 7500, y: 7500 }, 600, 0);
    expect(erased[37][37]).toBe(0);
  });
});

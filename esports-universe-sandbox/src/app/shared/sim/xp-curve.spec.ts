import { describe, expect, it } from 'vitest';
import { xpNeededForLevel, xpProgressInLevel } from './xp-curve';

describe('xpProgressInLevel', () => {
  it('starts empty at level 1 with 0 exp', () => {
    expect(xpProgressInLevel(1, 0)).toBe(0);
  });

  it('fills then resets across a level threshold', () => {
    expect(xpProgressInLevel(1, 140)).toBeCloseTo(0.5, 5);
    expect(xpProgressInLevel(1, 279)).toBeGreaterThan(0.99);
    expect(xpProgressInLevel(2, 280)).toBe(0);
    expect(xpNeededForLevel(2)).toBe(380);
  });

  it('stays full at max level', () => {
    expect(xpProgressInLevel(18, 20000)).toBe(1);
    expect(xpNeededForLevel(18)).toBe(0);
  });
});

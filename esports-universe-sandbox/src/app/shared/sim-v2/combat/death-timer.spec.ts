import { describe, expect, it } from 'vitest';
import { deathTimerSec } from './damage';

describe('deathTimerSec wiki curve', () => {
  it('uses base respawn wait before 15 minutes', () => {
    expect(deathTimerSec(1, 0)).toBe(10);
    expect(deathTimerSec(6, 14 * 60)).toBe(16);
    expect(deathTimerSec(11, 14 * 60 + 59)).toBe(35);
    expect(deathTimerSec(18, 14 * 60)).toBe(52.5);
  });

  it('applies time increase factor after 15 minutes', () => {
    const mid = deathTimerSec(11, 20 * 60);
    expect(mid).toBeGreaterThan(35);
    expect(mid).toBeLessThan(45);
  });

  it('caps near late-game maximum for level 18', () => {
    const late = deathTimerSec(18, 55 * 60);
    expect(late).toBeCloseTo(78.75, 5);
  });
});

import { describe, expect, it } from 'vitest';
import {
  assessFirstOuterTowerRhythm,
  FIRST_OUTER_TOWER_RHYTHM_BANDS,
  runV2DiagMatch,
} from './pro-feel-audit';

describe('first outer tower soft rhythm', () => {
  it('classifies typical, watch, and outlier without hard-locking a single second', () => {
    expect(assessFirstOuterTowerRhythm('even', 800)).toBe('in_band');
    expect(assessFirstOuterTowerRhythm('even', 600)).toBe('watch');
    expect(assessFirstOuterTowerRhythm('even', 500)).toBe('outlier');
    expect(assessFirstOuterTowerRhythm('even', null)).toBe('missing');
    expect(FIRST_OUTER_TOWER_RHYTHM_BANDS.even.typicalLo).toBe(720);
    expect(FIRST_OUTER_TOWER_RHYTHM_BANDS.even.typicalHi).toBe(960);
  });

  it('keeps even-match median first outer in the soft 12-16 min band', () => {
    const band = FIRST_OUTER_TOWER_RHYTHM_BANDS.even;
    const times: number[] = [];
    for (const seed of [1000, 1001, 1002, 1003]) {
      const diag = runV2DiagMatch('even', seed);
      expect(diag.firstOuterTowerSec).not.toBeNull();
      times.push(diag.firstOuterTowerSec!);
      // eslint-disable-next-line no-console
      console.log(
        JSON.stringify({
          seed,
          firstOuterTowerSec: diag.firstOuterTowerSec,
          towers: diag.towers,
        }),
      );
    }
    const sorted = [...times].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    expect(median).toBeGreaterThanOrEqual(band.typicalLo);
    expect(median).toBeLessThanOrEqual(band.typicalHi);
  }, 300_000);
});

import { describe, expect, it } from 'vitest';

import { hasLanePriority, shouldSlowPush, type LaneWaveState } from './wave-state';

function wave(partial: Partial<LaneWaveState>): LaneWaveState {
  return {
    lane: 'top',
    allyCount: 3,
    enemyCount: 3,
    allyHp: 900,
    enemyHp: 900,
    clashProgress: 0.4,
    ownOuterProgress: 0.35,
    enemyOuterProgress: 0.65,
    zone: 'river',
    isCrashingOuter: false,
    canPush: true,
    allyAdvantage: 0,
    ...partial,
  };
}

describe('wave-state laning rules', () => {
  it('marks crash and cleared enemy wave as lane priority', () => {
    expect(hasLanePriority(wave({ isCrashingOuter: true }))).toBe(true);
    expect(
      hasLanePriority(
        wave({ zone: 'enemy', enemyCount: 0, allyCount: 4, isCrashingOuter: false }),
      ),
    ).toBe(true);
    expect(
      hasLanePriority(
        wave({ zone: 'own', enemyCount: 4, allyCount: 2, isCrashingOuter: false }),
      ),
    ).toBe(false);
  });

  it('detects slow-push window before crash', () => {
    expect(shouldSlowPush(wave({ allyAdvantage: 0.8, zone: 'own' }))).toBe(true);
    expect(shouldSlowPush(wave({ isCrashingOuter: true }))).toBe(false);
    expect(shouldSlowPush(wave({ zone: 'enemy', allyAdvantage: 1 }))).toBe(false);
  });
});

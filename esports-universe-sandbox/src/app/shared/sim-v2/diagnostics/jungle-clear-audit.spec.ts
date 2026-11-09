import { describe, expect, it } from 'vitest';

import { auditJungleClearTimes, formatJungleClearAudit } from './jungle-clear-audit';

describe('jungle clear audit', () => {
  it('measures LeeSin clear pace after AS/smite remodel', () => {
    const audit = auditJungleClearTimes('LeeSin');
    // eslint-disable-next-line no-console
    console.log(formatJungleClearAudit(audit));
    expect(audit.rows.length).toBeGreaterThanOrEqual(6);
    const blue = audit.rows.find((row) => row.campId === 'blue_buff');
    const krugs = audit.rows.find((row) => row.campId === 'krugs');
    const scuttle = audit.rows.find((row) => row.campId === 'scuttle_top');
    expect(blue?.clearSec).toBeGreaterThanOrEqual(10);
    expect(blue?.clearSec).toBeLessThanOrEqual(22);
    expect(krugs?.clearSec).toBeGreaterThanOrEqual(18);
    if (scuttle) {
      expect(scuttle.clearSec).toBeGreaterThanOrEqual(4);
      expect(scuttle.clearSec).toBeLessThanOrEqual(14);
    }
    expect(audit.estimatedClockSec).toBeGreaterThanOrEqual(140);
    expect(audit.estimatedClockSec).toBeLessThanOrEqual(220);
  });
});

import { describe, expect, it } from 'vitest';

import { auditJungleClearTimes, formatJungleClearAudit } from './jungle-clear-audit';

describe('jungle clear audit', () => {
  it('measures LeeSin clear with real kit damage', () => {
    const audit = auditJungleClearTimes('LeeSin');
    // eslint-disable-next-line no-console
    console.log(formatJungleClearAudit(audit));
    expect(audit.rows.length).toBeGreaterThanOrEqual(6);
    const blue = audit.rows.find((row) => row.campId === 'blue_buff');
    const krugs = audit.rows.find((row) => row.campId === 'krugs');
    const scuttle = audit.rows.find((row) => row.campId === 'scuttle_top');
    expect(blue?.clearSec).toBeGreaterThanOrEqual(6);
    expect(blue?.clearSec).toBeLessThanOrEqual(24);
    expect(krugs?.clearSec).toBeGreaterThanOrEqual(10);
    if (scuttle) {
      expect(scuttle.clearSec).toBeGreaterThanOrEqual(4);
      expect(scuttle.clearSec).toBeLessThanOrEqual(18);
    }
    expect(audit.fullClearCombatSec).toBeGreaterThan(50);
    expect(audit.fullClearCombatSec).toBeLessThan(170);
  });

  it('kit differences create clear speed gaps between junglers', () => {
    const lee = auditJungleClearTimes('LeeSin');
    const graves = auditJungleClearTimes('Graves');
    const viego = auditJungleClearTimes('Viego');
    // eslint-disable-next-line no-console
    console.log(
      [
        formatJungleClearAudit(lee),
        formatJungleClearAudit(graves),
        formatJungleClearAudit(viego),
      ].join('\n\n'),
    );
    const times = [lee, graves, viego].map((audit) => audit.fullClearCombatSec);
    const fastest = Math.min(...times);
    const slowest = Math.max(...times);
    expect(slowest - fastest).toBeGreaterThanOrEqual(4);
    for (const audit of [lee, graves, viego]) {
      expect(audit.rows.length).toBeGreaterThanOrEqual(5);
      expect(audit.fullClearCombatSec).toBeGreaterThan(40);
    }
  });
});

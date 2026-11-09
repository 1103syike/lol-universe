import { describe, expect, it } from 'vitest';
import { auditKillPace, formatKillPace } from './kill-pace-audit';

describe('kill pace audit', () => {
  it(
    'reports kill overpace after removing fake damage valves',
    () => {
      const rows = auditKillPace([91001, 42, 1000]);
      // eslint-disable-next-line no-console
      console.log(formatKillPace(rows));
      expect(rows.length).toBe(3);
      const avgOver =
        rows.reduce((sum, row) => sum + row.overpace, 0) / Math.max(1, rows.length);
      expect(avgOver).toBeLessThan(1.8);
    },
    20000,
  );
});

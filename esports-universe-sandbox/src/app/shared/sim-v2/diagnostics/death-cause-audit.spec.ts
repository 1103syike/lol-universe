import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runDeathCauseAudit } from './death-cause-audit';

describe('death cause audit', () => {
  it('runs five matches and writes a death report', () => {
    try {
      const { reports, markdown } = runDeathCauseAudit();
      const out = resolve(
        process.cwd(),
        'src/app/shared/sim-v2/diagnostics/death-cause-audit-report.md',
      );
      writeFileSync(out, markdown, 'utf8');
      console.log(`wrote ${out}`);
      console.log(markdown.slice(0, 4000));
      expect(reports.length).toBeGreaterThanOrEqual(5);
      expect(reports.every((report) => report.totalDeaths >= 0)).toBe(true);
    } catch (error) {
      console.error('DEATH_AUDIT_ERROR', error);
      throw error;
    }
  }, 300_000);
});

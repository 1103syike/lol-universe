import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runProFeelAudit } from './pro-feel-audit';

describe('V2 pro-feel diagnostic', () => {
  it('collects multi-bucket metrics for the realism report', () => {
    const audit = runProFeelAudit(4);
    const outPath = resolve(process.cwd(), 'docs/v2-pro-feel-audit-data.json');
    writeFileSync(outPath, JSON.stringify(audit, null, 2), 'utf8');
    // eslint-disable-next-line no-console
    console.log('wrote', outPath);
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ v2: audit.v2, v1: audit.v1 }, null, 2));
    expect(audit.samples.length).toBe(12);
    expect(audit.v2.even.n).toBe(4);
    expect(audit.v2.advantage.n).toBe(4);
    expect(audit.v2.stomp.n).toBe(4);
  }, 600_000);
});

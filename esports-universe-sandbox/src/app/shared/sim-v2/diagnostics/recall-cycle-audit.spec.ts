import { describe, expect, it } from 'vitest';
import {
  auditRecallCycleScenarios,
  formatRecallAudit,
} from './recall-cycle-audit';

describe('recall cycle audit', () => {
  it('reports scenario matrix without claiming pro-level recall AI', () => {
    const rows = auditRecallCycleScenarios();
    // eslint-disable-next-line no-console
    console.log(formatRecallAudit(rows));

    const byId = Object.fromEntries(rows.map((row) => [row.id, row]));

    expect(byId['low-hp-enemy-near']?.status).toBe('pass');
    expect(byId['low-hp-no-enemy']?.status).toBe('pass');
    expect(byId['channel-interrupted']?.status).toBe('pass');
    expect(byId['recall-complete-shop-return']?.status).toBe('pass');

    expect(byId['retreat-path-blocked']?.status).toBe('gap');
    expect(byId['dragon-imminent']?.status).toBe('gap');
    expect(byId['dynamic-safe-pos']?.status).toBe('gap');
    expect(byId['wave-ready-definition']?.status).toBe('gap');

    expect(rows.some((row) => row.status === 'fail')).toBe(false);
  });
});

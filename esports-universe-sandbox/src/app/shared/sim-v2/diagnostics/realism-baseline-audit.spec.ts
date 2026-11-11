import { describe, expect, it } from 'vitest';
import { runRealismBaseline, runRealismScenario } from './realism-baseline-audit';

describe('realism baseline audit', () => {
  it('produces S1 top laning metrics without crashing', { timeout: 120_000 }, () => {
    const result = runRealismScenario(
      'S1',
      42,
      360,
      ['Ornn', 'LeeSin', 'Ahri', 'Jinx', 'Thresh'],
      ['Aatrox', 'Viego', 'Syndra', 'Ashe', 'Leona'],
    );
    expect(result.id).toBe('S1');
    expect(result.metrics.farmShare).toBeTypeOf('number');
    expect(result.metrics.fightShare).toBeTypeOf('number');
  });

  it('runs a compact baseline suite', { timeout: 180_000 }, () => {
    const rows = runRealismBaseline([42]);
    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(rows.some((row) => row.id === 'S1')).toBe(true);
  });
});

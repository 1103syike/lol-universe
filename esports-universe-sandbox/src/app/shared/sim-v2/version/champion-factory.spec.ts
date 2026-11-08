import { describe, expect, it } from 'vitest';
import { buildChampionTable } from './champion-factory';

describe('buildChampionTable damage typing', () => {
  const table = buildChampionTable(['Ezreal', 'Kaisa', 'Gwen', 'Ahri']);

  it('keeps AD marksmen physical even with Mage tag', () => {
    expect(table['Ezreal']?.primaryDamage).toBe('physical');
    expect(table['Kaisa']?.primaryDamage).toBe('physical');
  });

  it('keeps AP fighters magic without Mage tag', () => {
    expect(table['Gwen']?.primaryDamage).toBe('magic');
  });

  it('keeps classic mages magic', () => {
    expect(table['Ahri']?.primaryDamage).toBe('magic');
  });
});

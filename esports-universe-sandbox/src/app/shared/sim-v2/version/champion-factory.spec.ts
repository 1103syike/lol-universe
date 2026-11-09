import { describe, expect, it } from 'vitest';
import { buildChampionTable } from './champion-factory';

describe('buildChampionTable damage typing', () => {
  const table = buildChampionTable(['Ezreal', 'Kaisa', 'Gwen', 'Ahri', 'Jayce']);

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

  it('loads Jayce combat stats and ability ranks from imported data', () => {
    const jayce = table['Jayce'];
    expect(jayce?.baseHp).toBe(590);
    expect(jayce?.baseAd).toBe(59);
    expect(jayce?.attackRange).toBe(500);
    const q = jayce?.abilities.find((ability) => ability.slot === 'Q');
    expect(q?.name).toContain('浩瀚無垠');
    expect(q?.damageByRank?.[0]).toBe(60);
    expect(q?.cooldownByRank?.[0]).toBe(16);
    expect(q?.bonusAdRatio).toBeCloseTo(1.35, 5);
  });
});

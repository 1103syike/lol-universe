import { describe, expect, it } from 'vitest';
import { hasChampionMetaEntry, resolvePatchMeta, resolvePatchVersion } from '../../sim/resolve-patch';
import { mergeVersionPatchMeta } from './from-legacy-input';

describe('mergeVersionPatchMeta', () => {
  it('synthesizes soft baseline for pack champions missing from LCK meta', () => {
    const patch = resolvePatchVersion('2021-02-15');
    const base = resolvePatchMeta(patch);
    const merged = mergeVersionPatchMeta(base, 'demo-a');
    expect(hasChampionMetaEntry(base, 'Zed')).toBe(false);
    expect(hasChampionMetaEntry(merged, 'Zed')).toBe(true);
    expect(merged.Zed.presence).toBe(0.06);
    expect(merged.Zed.pickRate).toBe(0.03);
    expect(hasChampionMetaEntry(merged, 'Taric')).toBe(false);
    expect(hasChampionMetaEntry(merged, 'Gnar')).toBe(true);
  });
});

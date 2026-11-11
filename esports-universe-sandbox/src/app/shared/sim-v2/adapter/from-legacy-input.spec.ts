import { describe, expect, it } from 'vitest';
import { PATCH_META_2021_SPRING } from '../../../core/data/patch-meta-2021';
import { hasChampionMetaEntry, resolvePatchMeta, resolvePatchVersion } from '../../sim/resolve-patch';
import { getVersionPack } from '../version/registry';
import { mergeVersionPatchMeta, resolveV2VersionId } from './from-legacy-input';

describe('mergeVersionPatchMeta', () => {
  it('synthesizes soft baseline for pack champions missing from LCK meta', () => {
    const patch = resolvePatchVersion('2021-02-15');
    const base = resolvePatchMeta(patch);
    const merged = mergeVersionPatchMeta(base, 'demo-a');
    expect(hasChampionMetaEntry(base, 'Zed')).toBe(false);
    expect(hasChampionMetaEntry(merged, 'Zed')).toBe(true);
    expect(merged.Zed.presence).toBe(0.01);
    expect(merged.Zed.pickRate).toBe(0.005);
    expect(hasChampionMetaEntry(merged, 'Taric')).toBe(false);
    expect(hasChampionMetaEntry(merged, 'Gnar')).toBe(true);
  });

  it('keeps real LCK presence for 2021-spring pack champs without synthing Zed', () => {
    const patch = resolvePatchVersion('2021-02-15');
    const base = resolvePatchMeta(patch);
    const merged = mergeVersionPatchMeta(base, '2021-spring');
    expect(merged.Gnar.presence).toBe(PATCH_META_2021_SPRING.Gnar.presence);
    expect(merged.Kaisa.presence).toBe(PATCH_META_2021_SPRING.Kaisa.presence);
    expect(hasChampionMetaEntry(merged, 'Zed')).toBe(false);
    expect(getVersionPack('2021-spring').champions.Zed).toBeUndefined();
  });
});

describe('resolveV2VersionId', () => {
  it('routes 2021 dates to 2021-spring pack', () => {
    expect(resolveV2VersionId('2021-02-15')).toBe('2021-spring');
    expect(resolveV2VersionId('2021-05-20')).toBe('2021-spring');
  });

  it('routes 2024+ dates to demo-b', () => {
    expect(resolveV2VersionId('2024-06-01')).toBe('demo-b');
  });
});

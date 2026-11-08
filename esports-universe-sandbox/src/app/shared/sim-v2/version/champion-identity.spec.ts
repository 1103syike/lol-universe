import { describe, expect, it } from 'vitest';
import { buildChampionIdentity, identityPhasePower } from './champion-identity';
import { PATCH_STRENGTH_DEMO_A, PATCH_STRENGTH_DEMO_B, patchMultiplier } from './patch-strength';

describe('champion identity + patch strength', () => {
  it('makes Belveth a stronger closer than Kaisa', () => {
    const belveth = buildChampionIdentity('Belveth');
    const kaisa = buildChampionIdentity('Kaisa');
    expect(belveth.closeout).toBeGreaterThan(kaisa.closeout + 20);
    expect(identityPhasePower(belveth, 1500)).toBeGreaterThan(identityPhasePower(kaisa, 1500));
  });

  it('shifts meta between demo-a and demo-b', () => {
    expect(PATCH_STRENGTH_DEMO_B.Belveth.power).toBeGreaterThan(PATCH_STRENGTH_DEMO_A.Belveth.power);
    expect(PATCH_STRENGTH_DEMO_B.Kaisa.power).toBeLessThan(PATCH_STRENGTH_DEMO_A.Kaisa.power);
    expect(PATCH_STRENGTH_DEMO_B.Smolder.power).toBeGreaterThan(PATCH_STRENGTH_DEMO_A.Smolder.power);
    expect(patchMultiplier(80)).toBeGreaterThan(patchMultiplier(50));
  });
});

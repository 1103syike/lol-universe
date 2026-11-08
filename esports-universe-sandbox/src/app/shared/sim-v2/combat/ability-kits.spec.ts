import { describe, expect, it } from 'vitest';
import { CHAMPION_KITS } from '../../../core/data/champion-kits';
import { resolveArchetypeExecutor } from './ability-archetypes';
import { catalogSize, resolveCatalogExecutor } from './catalog-executor';
import { CHAMPION_ABILITY_CATALOG } from './champion-ability-catalog';
import { resolveAbilityExecutor } from './executors';
import { SIGNATURE_ABILITIES } from './signature-abilities';

describe('champion ability coverage', () => {
  it('gives every kit champion QWER via signature, catalog, or archetype', () => {
    const slots = ['Q', 'W', 'E', 'R'] as const;
    for (const championId of Object.keys(CHAMPION_KITS)) {
      expect(CHAMPION_ABILITY_CATALOG[championId]).toBeTruthy();
      for (const slot of slots) {
        expect(resolveAbilityExecutor(championId, slot)).toBeTypeOf('function');
        expect(resolveCatalogExecutor(championId, slot)).toBeTypeOf('function');
        expect(resolveArchetypeExecutor(championId, slot)).toBeTypeOf('function');
      }
    }
    expect(catalogSize()).toBe(Object.keys(CHAMPION_KITS).length);
  });

  it('keeps handcrafted signatures above catalog', () => {
    expect(SIGNATURE_ABILITIES['Aatrox:Q']).toBeTruthy();
    expect(resolveAbilityExecutor('Aatrox', 'Q')).toBe(SIGNATURE_ABILITIES['Aatrox:Q']);
    expect(SIGNATURE_ABILITIES['Yasuo:R']).toBeTruthy();
    expect(resolveAbilityExecutor('Yasuo', 'R')).toBe(SIGNATURE_ABILITIES['Yasuo:R']);
    expect(Object.keys(SIGNATURE_ABILITIES).length).toBeGreaterThan(120);
  });
});

import { describe, expect, it } from 'vitest';
import { CHAMPION_KITS } from '../../../core/data/champion-kits';
import { resolveArchetypeExecutor } from './ability-archetypes';
import { catalogSize, resolveCatalogExecutor } from './catalog-executor';
import { CHAMPION_ABILITY_CATALOG } from './champion-ability-catalog';
import { COMBO_CHAMPION_ABILITIES } from './combo-champions';
import { handcraftedAbilityKeys, isHandcraftedAbility, resolveAbilityExecutor } from './executors';
import { SIGNATURE_ABILITIES } from './signature-abilities';
import { SIGNATURE_MECHANICS_FILL } from './signature-mechanics-fill';
import { SIGNATURE_PARTIAL_SIX } from './signature-partial-six';

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

  it('requires handcrafted QWER for every kit champion', () => {
    const slots = ['Q', 'W', 'E', 'R'] as const;
    const missing: string[] = [];
    for (const championId of Object.keys(CHAMPION_KITS)) {
      for (const slot of slots) {
        if (!isHandcraftedAbility(championId, slot)) {
          missing.push(`${championId}:${slot}`);
        }
      }
    }
    expect(missing, missing.join(', ')).toEqual([]);
    expect(handcraftedAbilityKeys().size).toBeGreaterThanOrEqual(Object.keys(CHAMPION_KITS).length * 4);
  });

  it('keeps mechanics fill, partial six, and combo overrides registered', () => {
    expect(Object.keys(SIGNATURE_MECHANICS_FILL).length).toBeGreaterThan(600);
    expect(SIGNATURE_PARTIAL_SIX['Jinx:E']).toBeTruthy();
    expect(SIGNATURE_PARTIAL_SIX['Thresh:R']).toBeTruthy();
    expect(SIGNATURE_PARTIAL_SIX['Viego:E']).toBeTruthy();
    expect(COMBO_CHAMPION_ABILITIES['Aatrox:Q']).toBeTruthy();
    expect(COMBO_CHAMPION_ABILITIES['Aatrox:W']).toBeTruthy();
    expect(COMBO_CHAMPION_ABILITIES['Aatrox:R']).toBeTruthy();
    expect(COMBO_CHAMPION_ABILITIES['Ahri:Q']).toBeTruthy();
    expect(COMBO_CHAMPION_ABILITIES['Ahri:R']).toBeTruthy();
    expect(COMBO_CHAMPION_ABILITIES['Ezreal:Q']).toBeTruthy();
    expect(COMBO_CHAMPION_ABILITIES['Ezreal:W']).toBeTruthy();
    expect(SIGNATURE_ABILITIES['Yasuo:R']).toBeTruthy();
    expect(SIGNATURE_ABILITIES['Malphite:R']).toBeTruthy();
    expect(resolveAbilityExecutor('Aatrox', 'Q')).toBeTypeOf('function');
    expect(resolveAbilityExecutor('Brand', 'Q')).toBeTypeOf('function');
    expect(resolveAbilityExecutor('Yasuo', 'R')).toBeTypeOf('function');
    expect(resolveAbilityExecutor('Malphite', 'R')).toBeTypeOf('function');
    expect(Object.keys(SIGNATURE_ABILITIES).length).toBeGreaterThan(120);
  });
});

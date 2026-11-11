import { describe, expect, it } from 'vitest';
import { COMBO_CHAMPION_ABILITIES } from './combo-champions';
import { SIGNATURE_ABILITIES } from './signature-abilities';
import { resolveShopPrefer } from '../economy/shop-builds';
import { resolveSkillMaxOrder } from '../champion/skill-order';

const BATCH = [
  'Aatrox',
  'Ahri',
  'Akali',
  'Akshan',
  'Alistar',
  'Ambessa',
  'Amumu',
  'Anivia',
  'Annie',
  'Aphelios',
] as const;

describe('batch A champion coverage', () => {
  it('has signature or combo coverage for key slots', () => {
    expect(COMBO_CHAMPION_ABILITIES['Ahri:Q']).toBeTruthy();
    expect(COMBO_CHAMPION_ABILITIES['Ahri:W']).toBeTruthy();
    expect(COMBO_CHAMPION_ABILITIES['Ahri:E']).toBeTruthy();
    expect(COMBO_CHAMPION_ABILITIES['Ahri:R']).toBeTruthy();
    expect(SIGNATURE_ABILITIES['Akali:E']).toBeTruthy();
    expect(SIGNATURE_ABILITIES['Akali:R']).toBeTruthy();
    expect(SIGNATURE_ABILITIES['Akshan:Q']).toBeTruthy();
    expect(SIGNATURE_ABILITIES['Alistar:W']).toBeTruthy();
    expect(SIGNATURE_ABILITIES['Ambessa:Q']).toBeTruthy();
    expect(SIGNATURE_ABILITIES['Amumu:Q']).toBeTruthy();
    expect(SIGNATURE_ABILITIES['Anivia:E']).toBeTruthy();
    expect(SIGNATURE_ABILITIES['Aphelios:R']).toBeTruthy();
  });

  it('keeps op.gg skill max orders for the batch', () => {
    expect(resolveSkillMaxOrder('Aatrox', 'TOP')).toEqual(['Q', 'E', 'W']);
    expect(resolveSkillMaxOrder('Ahri', 'MID')).toEqual(['Q', 'W', 'E']);
    expect(resolveSkillMaxOrder('Akali', 'MID')).toEqual(['Q', 'E', 'W']);
    expect(resolveSkillMaxOrder('Alistar', 'SUPPORT')).toEqual(['Q', 'W', 'E']);
    expect(resolveSkillMaxOrder('Amumu', 'SUPPORT')).toEqual(['E', 'Q', 'W']);
    expect(resolveSkillMaxOrder('Anivia', 'MID')).toEqual(['E', 'Q', 'W']);
    expect(resolveSkillMaxOrder('Annie', 'MID')).toEqual(['Q', 'W', 'E']);
    expect(resolveSkillMaxOrder('Aphelios', 'BOT')).toEqual(['Q', 'E', 'W']);
  });

  it('keeps op.gg cores and no jungle pets on lane roles', () => {
    const amumuTop = resolveShopPrefer({ championId: 'Amumu', position: 'TOP', ownedItems: [] });
    expect(amumuTop.some((item) => item.includes('Pup') || item.includes('Seedling') || item.includes('Hatchling'))).toBe(
      false,
    );
    expect(amumuTop).toContain('LiandrysTorment');
    const akali = resolveShopPrefer({ championId: 'Akali', position: 'MID', ownedItems: [] });
    expect(akali).toContain('Stormsurge');
    const alistar = resolveShopPrefer({ championId: 'Alistar', position: 'SUPPORT', ownedItems: [] });
    expect(alistar).toContain('LocketoftheIronSolari');
    for (const championId of BATCH) {
      const prefer = resolveShopPrefer({
        championId,
        position:
          championId === 'Alistar' || championId === 'Amumu'
            ? 'SUPPORT'
            : championId === 'Aphelios' || championId === 'Akshan'
              ? 'BOT'
              : championId === 'Aatrox' || championId === 'Ambessa'
                ? 'TOP'
                : 'MID',
        ownedItems: [],
      });
      expect(prefer.length, championId).toBeGreaterThan(3);
    }
  });
});

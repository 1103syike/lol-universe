import { describe, expect, it } from 'vitest';
import { createMatch } from '../engine';
import { buyAffordableItems, hasMeaningfulShopBuy, nextPendingPurchase } from './economy';

function roster(side: 'b' | 'r', bots: string[]) {
  return (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position, index) => ({
    playerId: `${side}_${position}`,
    gamertag: `${side}_${position}`,
    position,
    championId: bots[index],
    laning: 70,
    mechanics: 70,
    teamfighting: 70,
    gameSense: 70,
    consistency: 70,
    adaptability: 70,
  }));
}

function botChamp() {
  const state = createMatch({
    versionId: 'demo-a',
    seed: 9,
    blueTeamId: 'blue',
    redTeamId: 'red',
    blue: roster('b', ['Aatrox', 'LeeSin', 'Ahri', 'Jinx', 'Thresh']),
    red: roster('r', ['Garen', 'Viego', 'Syndra', 'Ashe', 'Leona']),
  }).state;
  const champ = state.champions.find((row) => row.side === 'blue' && row.positionLabel === 'BOT')!;
  return { state, champ };
}

const CRIT_PREFER = [
  'DoransBlade',
  'Boots',
  'BFSword',
  'CloakofAgility',
  'Pickaxe',
  'InfinityEdge',
  'BerserkersGreaves',
  'Zeal',
  'PhantomDancer',
  'LastWhisper',
  'LordDominiksRegards',
] as const;

describe('shop recall pulse', () => {
  it('reports a small deficit when almost able to buy the next component', () => {
    const { state, champ } = botChamp();
    champ.items = ['DoransBlade', 'Boots'];
    champ.gold = 500;
    const pending = nextPendingPurchase(state, champ, [...CRIT_PREFER]);
    expect(pending).not.toBeNull();
    expect(pending!.itemId).toBe('CloakofAgility');
    expect(pending!.deficit).toBeGreaterThan(0);
    expect(pending!.deficit).toBeLessThanOrEqual(220);
  });

  it('marks near legendary combine as the pending goal over cheap leftovers', () => {
    const { state, champ } = botChamp();
    champ.items = ['BFSword', 'Pickaxe', 'CloakofAgility', 'Boots'];
    champ.gold = 700;
    const pending = nextPendingPurchase(state, champ, [...CRIT_PREFER]);
    expect(pending?.itemId).toBe('InfinityEdge');
    expect(pending?.deficit).toBe(125);
    expect(hasMeaningfulShopBuy(state, champ, [...CRIT_PREFER])).toBe(true);
  });

  it('marks legendary combine as meaningful when parts and gold are ready', () => {
    const { state, champ } = botChamp();
    champ.items = ['BFSword', 'Pickaxe', 'CloakofAgility', 'Boots'];
    champ.gold = 825;
    expect(hasMeaningfulShopBuy(state, champ, [...CRIT_PREFER])).toBe(true);
    const pending = nextPendingPurchase(state, champ, [...CRIT_PREFER]);
    expect(pending?.itemId).toBe('InfinityEdge');
    expect(pending?.deficit).toBe(0);
  });

  it('can finish Heartsteel when one GiantsBelt is already owned', () => {
    const { state } = botChamp();
    const top = state.champions.find((row) => row.side === 'blue' && row.positionLabel === 'TOP')!;
    top.position = { ...state.lockedPack.map.blueFountain };
    top.items = ['GiantsBelt', 'CrystallineBracer', 'PlatedSteelcaps'];
    top.gold = 5000;
    const prefer = [
      'DoransShield',
      'Boots',
      'GiantsBelt',
      'GiantsBelt',
      'CrystallineBracer',
      'Heartsteel',
      'PlatedSteelcaps',
      'SunfireAegis',
    ];
    buyAffordableItems(state, top, prefer);
    expect(top.items).toContain('Heartsteel');
  });

  it('sells leftover parts and finishes Trinity Force from a full inventory', () => {
    const { state } = botChamp();
    const top = state.champions.find((row) => row.side === 'blue' && row.positionLabel === 'TOP')!;
    top.position = { ...state.lockedPack.map.blueFountain };
    top.items = ['Sheen', 'Phage', 'RubyCrystal', 'GlowingMote', 'PlatedSteelcaps', 'LongSword'];
    top.gold = 5000;
    const prefer = [
      'DoransShield',
      'Boots',
      'Sheen',
      'Phage',
      'HearthboundAxe',
      'TrinityForce',
      'PlatedSteelcaps',
      'SteraksGage',
    ];
    buyAffordableItems(state, top, prefer);
    expect(top.items).toContain('TrinityForce');
  });

  it('does not treat sitting on low leftover gold with no buy as meaningful', () => {
    const { state, champ } = botChamp();
    champ.items = [
      'InfinityEdge',
      'BerserkersGreaves',
      'PhantomDancer',
      'LordDominiksRegards',
      'Bloodthirster',
      'GuardianAngel',
    ];
    champ.gold = 1600;
    expect(nextPendingPurchase(state, champ, [...CRIT_PREFER])).toBeNull();
    expect(hasMeaningfulShopBuy(state, champ, [...CRIT_PREFER])).toBe(false);
  });
});

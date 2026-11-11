import { describe, expect, it } from 'vitest';
import { createMatch } from '../engine';
import {
  buyAffordableItems,
  canBuyAnyPreferred,
  focusShopPrefer,
  hasMeaningfulShopBuy,
} from './economy';
import { resolveShopPreferForChampion } from './shop-builds';

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

describe('support shop after quest upgrade', () => {
  it('buys locket components after finishing Celestial Opposition', () => {
    const state = createMatch({
      versionId: 'demo-a',
      seed: 1,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('b', ['Aatrox', 'LeeSin', 'Ahri', 'Jinx', 'Thresh']),
      red: roster('r', ['Garen', 'Viego', 'Syndra', 'Ashe', 'Leona']),
    }).state;
    const thresh = state.champions.find((champ) => champ.championId === 'Thresh')!;
    thresh.position = { ...state.lockedPack.map.blueFountain };
    thresh.items = ['CelestialOpposition', 'PlatedSteelcaps'];
    thresh.gold = 5000;
    const prefer = resolveShopPreferForChampion(state, thresh);
    const focus = focusShopPrefer(state, thresh, prefer);
    expect(focus).not.toContain('WorldAtlas');
    expect(hasMeaningfulShopBuy(state, thresh, prefer)).toBe(true);
    expect(canBuyAnyPreferred(state, thresh, prefer)).toBe(true);
    buyAffordableItems(state, thresh, prefer);
    expect(
      thresh.items.some(
        (id) =>
          id === 'LocketoftheIronSolari' ||
          id === 'Kindlegem' ||
          id === 'RubyCrystal' ||
          id === 'KnightsVow',
      ),
    ).toBe(true);
  });
});

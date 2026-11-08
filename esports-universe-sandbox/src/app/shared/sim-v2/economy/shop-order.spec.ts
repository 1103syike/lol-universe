import { describe, expect, it } from 'vitest';
import { createMatch } from '../engine';
import { buyAffordableItems } from './economy';

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

function makeState(seed: number) {
  return createMatch({
    versionId: 'demo-a',
    seed,
    blueTeamId: 'blue',
    redTeamId: 'red',
    blue: roster('b', ['Aatrox', 'LeeSin', 'Ahri', 'Jinx', 'Thresh']),
    red: roster('r', ['Garen', 'Viego', 'Syndra', 'Ashe', 'Lulu']),
  }).state;
}

function blueBot(state: ReturnType<typeof makeState>) {
  return state.champions.find((champ) => champ.side === 'blue' && champ.positionLabel === 'BOT')!;
}

describe('shop purchase soft order', () => {
  it('buys base boots before expensive components when both are affordable', () => {
    const state = makeState(11);
    const champ = blueBot(state);
    champ.items = ['DoransBlade'];
    champ.gold = 1200;
    const prefer = [
      'DoransBlade',
      'Boots',
      'BFSword',
      'CloakofAgility',
      'Pickaxe',
      'InfinityEdge',
      'BerserkersGreaves',
      'Noonquiver',
      'Zeal',
      'PhantomDancer',
      'LastWhisper',
      'LordDominiksRegards',
    ];
    buyAffordableItems(state, champ, prefer);
    expect(champ.items).toContain('Boots');
    const bootIndex = champ.items.indexOf('Boots');
    for (const expensive of ['Pickaxe', 'BFSword'] as const) {
      const index = champ.items.indexOf(expensive);
      if (index >= 0) {
        expect(bootIndex).toBeLessThan(index);
      }
    }
  });

  it('upgrades boots around the first legendary without waiting for pen items', () => {
    const state = makeState(22);
    const champ = blueBot(state);
    champ.items = ['InfinityEdge', 'Boots'];
    champ.gold = 1100;
    const prefer = [
      'DoransBlade',
      'Boots',
      'InfinityEdge',
      'BerserkersGreaves',
      'PhantomDancer',
      'LordDominiksRegards',
      'Bloodthirster',
    ];
    buyAffordableItems(state, champ, prefer);
    expect(champ.items).toContain('BerserkersGreaves');
    expect(champ.items).not.toContain('LordDominiksRegards');
  });
});

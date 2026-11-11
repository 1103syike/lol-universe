import { describe, expect, it } from 'vitest';
import { investAbilityPoints, resolveSkillMaxOrder } from './skill-order';
import type { ChampionEntity } from '../state/entities';

function fakeChampion(
  championId: string,
  role: ChampionEntity['positionLabel'],
  level: number,
): ChampionEntity {
  return {
    id: `${championId}-test`,
    kind: 'champion',
    side: 'blue',
    championId,
    positionLabel: role,
    level,
    abilities: [
      { slot: 'P', level: 1 },
      { slot: 'Q', level: 0 },
      { slot: 'W', level: 0 },
      { slot: 'E', level: 0 },
      { slot: 'R', level: 0 },
    ],
  } as ChampionEntity;
}

function ranks(champion: ChampionEntity): string {
  return (['Q', 'W', 'E', 'R'] as const)
    .map((slot) => `${slot}${champion.abilities.find((ability) => ability.slot === slot)?.level ?? 0}`)
    .join(' ');
}

describe('op.gg skill order', () => {
  it('loads popular max orders from scraped op.gg data', () => {
    expect(resolveSkillMaxOrder('Aatrox', 'TOP')).toEqual(['Q', 'E', 'W']);
    expect(resolveSkillMaxOrder('Garen', 'TOP')).toEqual(['E', 'Q', 'W']);
    expect(resolveSkillMaxOrder('Ashe', 'BOT')).toEqual(['W', 'Q', 'E']);
    expect(resolveSkillMaxOrder('Lux', 'MID')).toEqual(['E', 'Q', 'W']);
    expect(resolveSkillMaxOrder('Leona', 'SUPPORT')).toEqual(['W', 'E', 'Q']);
    expect(resolveSkillMaxOrder('LeeSin', 'JUNGLE')).toEqual(['Q', 'W', 'E']);
  });

  it('follows Aatrox op.gg path through early levels', () => {
    const champ = fakeChampion('Aatrox', 'TOP', 9);
    investAbilityPoints(champ);
    expect(ranks(champ)).toBe('Q5 W1 E2 R1');
  });

  it('maxes Garen E before Q', () => {
    const champ = fakeChampion('Garen', 'TOP', 9);
    investAbilityPoints(champ);
    expect(ranks(champ)).toBe('Q2 W1 E5 R1');
  });

  it('maxes Ashe W first', () => {
    const champ = fakeChampion('Ashe', 'BOT', 9);
    investAbilityPoints(champ);
    expect(ranks(champ)).toBe('Q2 W5 E1 R1');
  });
});

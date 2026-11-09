import { describe, expect, it } from 'vitest';
import { assignSummonerSlots, pickSummonerPair } from './summoner-spells';

describe('summoner loadouts', () => {
  it('gives mid/top teleport flash by default with flash on F', () => {
    expect(pickSummonerPair('MID', 'Orianna')).toEqual(['Teleport', 'Flash']);
    expect(pickSummonerPair('TOP', 'Garen')).toEqual(['Teleport', 'Flash']);
    expect(assignSummonerSlots(['Teleport', 'Flash'])).toEqual([
      { id: 'Teleport', slot: 'D' },
      { id: 'Flash', slot: 'F' },
    ]);
  });

  it('keeps assassin mid on ignite and jungler smite on D', () => {
    expect(pickSummonerPair('MID', 'Zed')).toEqual(['Ignite', 'Flash']);
    expect(pickSummonerPair('JUNGLE', 'LeeSin')).toEqual(['Smite', 'Flash']);
    expect(assignSummonerSlots(['Smite', 'Flash'])[0]).toEqual({ id: 'Smite', slot: 'D' });
  });
});

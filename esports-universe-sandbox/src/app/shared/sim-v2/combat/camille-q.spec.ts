import { describe, expect, it } from 'vitest';
import { simulateV2Match, type SimulateV2Input } from '../engine';
import { castAbility } from './cast-ability';

function roster(side: 'blue' | 'red', topId: string) {
  return (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position) => ({
    playerId: `${side}_${position}`,
    gamertag: `${side}_${position}`,
    position,
    championId:
      position === 'TOP'
        ? topId
        : position === 'JUNGLE'
          ? 'LeeSin'
          : position === 'MID'
            ? 'Ahri'
            : position === 'BOT'
              ? 'Jinx'
              : 'Nautilus',
    laning: 70,
    mechanics: 70,
    teamfighting: 70,
    gameSense: 70,
    consistency: 70,
    adaptability: 70,
  }));
}

describe('Camille Q stages', () => {
  it('splits Q1 physical and Q2 true instead of both every cast', () => {
    const input: SimulateV2Input = {
      versionId: 'demo-a',
      seed: 7,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('blue', 'Camille'),
      red: roster('red', 'Garen'),
      maxDurationSec: 5,
    };
    const { state } = simulateV2Match(input);
    const camille = state.champions.find((champ) => champ.championId === 'Camille')!;
    const target = state.champions.find((champ) => champ.championId === 'Garen')!;
    camille.level = 6;
    for (const ability of camille.abilities) {
      if (ability.slot !== 'P') {
        ability.level = ability.slot === 'R' ? 1 : 3;
        ability.cooldownUntil = 0;
      }
    }
    target.position = { ...camille.position };
    target.hp = target.maxHp;
    const before = target.hp;
    castAbility(state, camille, 'Q', target);
    const afterQ1 = target.hp;
    expect(before - afterQ1).toBeGreaterThan(0);
    expect(camille.abilityBag.camille?.qEmpoweredUntil ?? 0).toBeGreaterThan(state.scheduler.time);
    camille.abilities.find((ability) => ability.slot === 'Q')!.cooldownUntil = 0;
    const mid = target.hp;
    castAbility(state, camille, 'Q', target);
    expect(mid - target.hp).toBeGreaterThan(0);
    expect(camille.abilityBag.camille?.qEmpoweredUntil ?? 0).toBe(0);
    const doubleTapWouldBe = (before - afterQ1) * 1.55;
    expect(before - afterQ1).toBeLessThan(doubleTapWouldBe * 0.85);
  });
});

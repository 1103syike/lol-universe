import { describe, expect, it } from 'vitest';
import { createMatch, type SimulateV2Input } from '../engine';
import { abilityEffectsOf, CHAMPION_ABILITY_EFFECTS } from './ability-effect-tags';
import { resolveAbilityExecutor } from './executors';

function roster(side: 'blue' | 'red') {
  return (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position) => ({
    playerId: `${side}_${position}`,
    gamertag: `${side}_${position}`,
    position,
    championId:
      position === 'TOP'
        ? side === 'blue'
          ? 'Camille'
          : 'Garen'
        : position === 'JUNGLE'
          ? 'LeeSin'
          : position === 'MID'
            ? 'Annie'
            : position === 'BOT'
              ? 'Ashe'
              : 'Thresh',
    laning: 70,
    mechanics: 70,
    teamfighting: 70,
    gameSense: 70,
    consistency: 70,
    adaptability: 65,
  }));
}

function input(seed: number): SimulateV2Input {
  return {
    versionId: 'demo-a',
    seed,
    blueTeamId: 'blue',
    redTeamId: 'red',
    blue: roster('blue'),
    red: roster('red'),
    maxDurationSec: 120,
  };
}

describe('parsed ability effects', () => {
  it('covers all champions with QWER effect tags', () => {
    const ids = Object.keys(CHAMPION_ABILITY_EFFECTS);
    expect(ids.length).toBeGreaterThanOrEqual(165);
    let dash = 0;
    let hard = 0;
    for (const id of ids) {
      for (const slot of ['Q', 'W', 'E', 'R'] as const) {
        const fx = abilityEffectsOf(id, slot);
        expect(fx).toBeTruthy();
        if (fx?.selfDash) dash += 1;
        if (fx?.hardCc) hard += 1;
      }
    }
    expect(dash).toBeGreaterThan(80);
    expect(hard).toBeGreaterThan(40);
  });

  it('tags Malphite R as crash engage with knockup', () => {
    const fx = abilityEffectsOf('Malphite', 'R');
    expect(fx?.selfDash).toBe(true);
    expect(fx?.knockup).toBe(true);
    expect(fx?.hardCc).toBe(true);
    expect(fx?.aoe).toBe(true);
  });

  it('makes Malphite R dash into target and apply hard cc', () => {
    const { state } = createMatch(input(3));
    const malph = state.champions.find(
      (champ) => champ.championId === 'Camille' && champ.side === 'blue',
    )!;
    malph.championId = 'Malphite';
    const victim = state.champions.find(
      (champ) => champ.championId === 'Garen' && champ.side === 'red',
    )!;
    malph.abilities.forEach((ability) => {
      if (ability.slot !== 'P') {
        ability.level = ability.slot === 'R' ? 3 : 5;
        ability.cooldownUntil = 0;
      }
    });
    malph.position = { x: 5000, y: 5000 };
    victim.position = { x: 5600, y: 5000 };
    const before = { ...malph.position };
    const ok = resolveAbilityExecutor('Malphite', 'R')({
      state,
      caster: malph,
      slot: 'R',
      target: victim,
      level: 3,
    });
    expect(ok).toBe(true);
    expect(Math.hypot(malph.position.x - before.x, malph.position.y - before.y)).toBeGreaterThan(80);
    expect(victim.statuses.some((status) => status.kind === 'stun')).toBe(true);
  });
});

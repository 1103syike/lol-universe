import { describe, expect, it } from 'vitest';
import { COMBO_COMPLEX_ABILITIES } from './combo-complex';
import { hasChampionCombo } from './combo-cast';
import { kassadinState, leblancState } from './ability-runtime-state';
import { createMatch, type SimulateV2Input } from '../engine';
import { castAbility } from './cast-ability';
import { isHandcraftedAbility } from './executors';
import { buildChampionTable } from '../version/champion-factory';
import type { ChampionEntity } from '../state/entities';
import type { GameState } from '../state/game-state';

function injectPackChampion(state: GameState, champ: ChampionEntity, championId: string): void {
  const table = buildChampionTable([championId as never]);
  const def = table[championId];
  if (!def) {
    throw new Error(`missing test champion ${championId}`);
  }
  state.lockedPack.champions[championId] = def;
  champ.championId = championId;
  champ.abilities = def.abilities.map((ability) => ({
    slot: ability.slot,
    level: ability.slot === 'P' ? 1 : 0,
    cooldownUntil: 0,
  }));
}

function roster(
  side: 'blue' | 'red',
  picks: { top: string; jg: string; mid: string; bot: string; sup: string },
) {
  return (
    [
      ['TOP', picks.top],
      ['JUNGLE', picks.jg],
      ['MID', picks.mid],
      ['BOT', picks.bot],
      ['SUPPORT', picks.sup],
    ] as const
  ).map(([position, championId]) => ({
    playerId: `${side}_${position}`,
    gamertag: `${side}_${position}`,
    position,
    championId,
    laning: 75,
    mechanics: 80,
    teamfighting: 75,
    gameSense: 75,
    consistency: 70,
    adaptability: 70,
  }));
}

describe('complex combo champions', () => {
  it('registers complex kits and combo casters', () => {
    expect(COMBO_COMPLEX_ABILITIES['Leblanc:Q']).toBeTruthy();
    expect(COMBO_COMPLEX_ABILITIES['Kassadin:R']).toBeTruthy();
    expect(COMBO_COMPLEX_ABILITIES['Ekko:R']).toBeTruthy();
    expect(COMBO_COMPLEX_ABILITIES['Pyke:R']).toBeTruthy();
    expect(isHandcraftedAbility('Leblanc', 'R')).toBe(true);
    expect(hasChampionCombo('Akali')).toBe(true);
    expect(hasChampionCombo('Leblanc')).toBe(true);
    expect(hasChampionCombo('Kassadin')).toBe(true);
    expect(hasChampionCombo('Ekko')).toBe(true);
    expect(hasChampionCombo('Pyke')).toBe(true);
  });

  it('Kassadin R stacks shorten follow-up cooldown', () => {
    const input: SimulateV2Input = {
      versionId: 'demo-a',
      seed: 3,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('blue', {
        top: 'Aatrox',
        jg: 'LeeSin',
        mid: 'Ahri',
        bot: 'Jinx',
        sup: 'Thresh',
      }),
      red: roster('red', {
        top: 'Garen',
        jg: 'Viego',
        mid: 'Syndra',
        bot: 'Ashe',
        sup: 'Leona',
      }),
      maxDurationSec: 30,
    };
    const { state } = createMatch(input);
    const ahri = state.champions.find((champ) => champ.championId === 'Ahri')!;
    injectPackChampion(state, ahri, 'Kassadin');
    ahri.ap = 250;
    ahri.level = 11;
    ahri.mana = ahri.maxMana;
    for (const ability of ahri.abilities) {
      if (ability.slot !== 'P') {
        ability.level = ability.slot === 'R' ? 2 : 5;
        ability.cooldownUntil = 0;
      }
    }
    const victim = state.champions.find((champ) => champ.championId === 'Syndra')!;
    ahri.position = { x: 6000, y: 6000 };
    victim.position = { x: 6300, y: 6000 };
    expect(castAbility(state, ahri, 'R', victim)).toBe(true);
    expect(kassadinState(ahri).rStacks).toBe(1);
    const r = ahri.abilities.find((ability) => ability.slot === 'R')!;
    expect(r.cooldownUntil).toBeGreaterThan(state.scheduler.time);
    expect(r.cooldownUntil - state.scheduler.time).toBeLessThan(7);
  });

  it('Leblanc Q marks then detonates', () => {
    const input: SimulateV2Input = {
      versionId: 'demo-a',
      seed: 4,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('blue', {
        top: 'Aatrox',
        jg: 'LeeSin',
        mid: 'Ahri',
        bot: 'Jinx',
        sup: 'Thresh',
      }),
      red: roster('red', {
        top: 'Garen',
        jg: 'Viego',
        mid: 'Syndra',
        bot: 'Ashe',
        sup: 'Leona',
      }),
      maxDurationSec: 30,
    };
    const { state } = createMatch(input);
    const mid = state.champions.find((champ) => champ.championId === 'Ahri')!;
    injectPackChampion(state, mid, 'Leblanc');
    mid.ap = 220;
    mid.level = 9;
    mid.mana = mid.maxMana;
    for (const ability of mid.abilities) {
      if (ability.slot !== 'P') {
        ability.level = 5;
        ability.cooldownUntil = 0;
      }
    }
    const victim = state.champions.find((champ) => champ.championId === 'Syndra')!;
    mid.position = { x: 6000, y: 6000 };
    victim.position = { x: 6400, y: 6000 };
    victim.hp = victim.maxHp;
    castAbility(state, mid, 'Q', victim);
    expect(leblancState(mid).markTargetId).toBe(victim.id);
    const midHp = victim.hp;
    mid.abilities.find((ability) => ability.slot === 'Q')!.cooldownUntil = 0;
    castAbility(state, mid, 'Q', victim);
    expect(victim.hp).toBeLessThan(midHp);
    expect(leblancState(mid).markTargetId).toBeNull();
  });
});

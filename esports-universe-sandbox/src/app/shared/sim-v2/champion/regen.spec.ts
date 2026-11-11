import { describe, expect, it } from 'vitest';
import { createMatch } from '../engine';
import {
  applyChampionRegen,
  baseHp5,
  baseMp5,
  championHpRegenPerSec,
  championManaRegenPerSec,
  FOUNTAIN_HP_REGEN_PCT_PER_SEC,
  FOUNTAIN_MANA_REGEN_PCT_PER_SEC,
} from './regen';

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

describe('champion regen', () => {
  it('uses LoL-like HP5/MP5 instead of percent max-stat field regen', () => {
    const { state } = createMatch({
      versionId: 'demo-a',
      seed: 11,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('b', ['Garen', 'LeeSin', 'Annie', 'Ashe', 'Thresh']),
      red: roster('r', ['Darius', 'Graves', 'Syndra', 'Jinx', 'Leona']),
    });
    const annie = state.champions.find((champ) => champ.championId === 'Annie')!;
    const ashe = state.champions.find((champ) => champ.championId === 'Ashe')!;
    const garen = state.champions.find((champ) => champ.championId === 'Garen')!;
    const annieDef = state.lockedPack.champions.Annie!;
    const asheDef = state.lockedPack.champions.Ashe!;
    const garenDef = state.lockedPack.champions.Garen!;

    expect(annieDef.baseHpRegen).toBeCloseTo(5.5, 5);
    expect(annieDef.hpRegenPerLevel).toBeCloseTo(0.55, 5);
    expect(annieDef.baseManaRegen).toBeCloseTo(8, 5);
    expect(annieDef.manaRegenPerLevel).toBeCloseTo(0.8, 5);
    expect(baseHp5(annieDef, 1)).toBeCloseTo(annieDef.baseHpRegen, 5);
    expect(baseHp5(asheDef, 1)).toBeCloseTo(asheDef.baseHpRegen, 5);
    expect(baseHp5(garenDef, 1)).toBeCloseTo(garenDef.baseHpRegen, 5);
    expect(baseMp5(annieDef, 1)).toBeCloseTo(annieDef.baseManaRegen, 5);

    const annieHpPerSec = championHpRegenPerSec(state, annie);
    const annieManaPerSec = championManaRegenPerSec(state, annie);
    expect(annieHpPerSec).toBeCloseTo(annieDef.baseHpRegen / 5, 5);
    expect(annieManaPerSec).toBeCloseTo(annieDef.baseManaRegen / 5, 5);

    annie.position = { x: 7200, y: 7200 };
    annie.hp = annie.maxHp * 0.4;
    annie.mana = annie.maxMana * 0.2;
    const hpBefore = annie.hp;
    const manaBefore = annie.mana;
    applyChampionRegen(state, 5);
    expect(annie.hp - hpBefore).toBeCloseTo(annieHpPerSec * 5, 4);
    expect(annie.mana - manaBefore).toBeCloseTo(annieManaPerSec * 5, 4);
    expect(annie.hp).toBeLessThan(annie.maxHp * 0.55);
  });

  it('restores fountain at about 8%/10% max per second', () => {
    const { state } = createMatch({
      versionId: 'demo-a',
      seed: 12,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('b', ['Garen', 'LeeSin', 'Annie', 'Ashe', 'Thresh']),
      red: roster('r', ['Darius', 'Graves', 'Syndra', 'Jinx', 'Leona']),
    });
    const annie = state.champions.find((champ) => champ.championId === 'Annie')!;
    annie.position = { ...state.lockedPack.map.blueFountain };
    annie.hp = annie.maxHp * 0.2;
    annie.mana = annie.maxMana * 0.1;
    applyChampionRegen(state, 1);
    expect(annie.hp / annie.maxHp).toBeCloseTo(0.2 + FOUNTAIN_HP_REGEN_PCT_PER_SEC, 4);
    expect(annie.mana / annie.maxMana).toBeCloseTo(0.1 + FOUNTAIN_MANA_REGEN_PCT_PER_SEC, 4);
  });
});

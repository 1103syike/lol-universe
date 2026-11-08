import { describe, expect, it } from 'vitest';
import { simulateV2Match } from '../engine';
import { combatProfile, teamCombatStyle } from './combat-profile';

function roster(side: string, picks: Record<string, string>) {
  return ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'].map((position) => ({
    playerId: `${side}_${position}`,
    gamertag: `${side}_${position}`,
    position: position as 'TOP' | 'JUNGLE' | 'MID' | 'BOT' | 'SUPPORT',
    championId: picks[position],
    laning: 72,
    mechanics: 70,
    teamfighting: 70,
    gameSense: 70,
    consistency: 68,
    adaptability: 65,
  }));
}

describe('combat profile', () => {
  it('gives poke fighters more damage presence than tanks', () => {
    const { state } = simulateV2Match({
      versionId: 'demo-a',
      seed: 42,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('blue', {
        TOP: 'Jayce',
        JUNGLE: 'LeeSin',
        MID: 'Annie',
        BOT: 'Ashe',
        SUPPORT: 'Thresh',
      }),
      red: roster('red', {
        TOP: 'Ornn',
        JUNGLE: 'Sejuani',
        MID: 'Orianna',
        BOT: 'Jinx',
        SUPPORT: 'Lulu',
      }),
      maxDurationSec: 5,
    });

    const jayce = state.champions.find((c) => c.championId === 'Jayce')!;
    const ornn = state.champions.find((c) => c.championId === 'Ornn')!;
    const ashe = state.champions.find((c) => c.championId === 'Ashe')!;
    const lulu = state.champions.find((c) => c.championId === 'Lulu')!;
    const jayceP = combatProfile(state, jayce);
    const ornnP = combatProfile(state, ornn);
    const asheP = combatProfile(state, ashe);
    const luluP = combatProfile(state, lulu);

    expect(jayceP.damageDealtMult).toBeGreaterThan(ornnP.damageDealtMult + 0.2);
    expect(jayceP.pokeAppetite).toBeGreaterThan(ornnP.pokeAppetite);
    expect(asheP.damageDealtMult).toBeGreaterThan(luluP.damageDealtMult);
    expect(asheP.autoMult).toBeGreaterThan(luluP.autoMult);
  });

  it(
    'shifts carry damage with frontline vs poke comps',
    () => {
    const dive = simulateV2Match({
      versionId: 'demo-a',
      seed: 7,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('blue', {
        TOP: 'Malphite',
        JUNGLE: 'JarvanIV',
        MID: 'Annie',
        BOT: 'Ashe',
        SUPPORT: 'Nautilus',
      }),
      red: roster('red', {
        TOP: 'Garen',
        JUNGLE: 'LeeSin',
        MID: 'Ahri',
        BOT: 'Ashe',
        SUPPORT: 'Thresh',
      }),
      maxDurationSec: 5,
    }).state;

    const poke = simulateV2Match({
      versionId: 'demo-a',
      seed: 7,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('blue', {
        TOP: 'Jayce',
        JUNGLE: 'Graves',
        MID: 'Ezreal',
        BOT: 'Ashe',
        SUPPORT: 'Karma',
      }),
      red: roster('red', {
        TOP: 'Garen',
        JUNGLE: 'LeeSin',
        MID: 'Ahri',
        BOT: 'Ashe',
        SUPPORT: 'Thresh',
      }),
      maxDurationSec: 5,
    }).state;

    const diveAshe = dive.champions.find((c) => c.side === 'blue' && c.championId === 'Ashe')!;
    const pokeAshe = poke.champions.find((c) => c.side === 'blue' && c.championId === 'Ashe')!;
    const diveStyle = teamCombatStyle(dive, 'blue');
    const pokeStyle = teamCombatStyle(poke, 'blue');

    expect(diveStyle.engage + diveStyle.frontline).toBeGreaterThan(pokeStyle.engage + pokeStyle.frontline);
    expect(combatProfile(dive, diveAshe).damageDealtMult).toBeGreaterThan(
      combatProfile(poke, pokeAshe).damageDealtMult - 0.02,
    );
    },
    30_000,
  );
});

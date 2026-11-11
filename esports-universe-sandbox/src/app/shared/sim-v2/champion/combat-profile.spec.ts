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
        TOP: 'Garen',
        JUNGLE: 'Viego',
        MID: 'Orianna',
        BOT: 'Jinx',
        SUPPORT: 'Nautilus',
      }),
      maxDurationSec: 5,
    });

    const jayce = state.champions.find((c) => c.championId === 'Jayce')!;
    const ashe = state.champions.find((c) => c.championId === 'Ashe')!;
    const nautilus = state.champions.find((c) => c.championId === 'Nautilus')!;
    const jayceP = combatProfile(state, jayce);
    const nautilusP = combatProfile(state, nautilus);
    const asheP = combatProfile(state, ashe);

    expect(jayceP.damageDealtMult).toBeGreaterThan(nautilusP.damageDealtMult + 0.2);
    expect(jayceP.pokeAppetite).toBeGreaterThan(nautilusP.pokeAppetite);
    expect(asheP.damageDealtMult).toBeGreaterThan(nautilusP.damageDealtMult);
    expect(asheP.autoMult).toBeGreaterThan(nautilusP.autoMult);
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
        TOP: 'Renekton',
        JUNGLE: 'LeeSin',
        MID: 'Annie',
        BOT: 'Ashe',
        SUPPORT: 'Nautilus',
      }),
      red: roster('red', {
        TOP: 'Garen',
        JUNGLE: 'Viego',
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
        SUPPORT: 'Lux',
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

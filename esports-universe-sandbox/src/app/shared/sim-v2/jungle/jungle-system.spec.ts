import { describe, expect, it } from 'vitest';

import { createMatch, type SimulateV2Input } from '../engine';
import { buildMonsters } from '../version/shared-content';
import { attackCamp, nearestFriendlyCamp } from './jungle-system';

function roster(side: 'blue' | 'red') {
  const prefix = side;
  return [
    {
      playerId: `${prefix}_top`,
      gamertag: `${prefix}_top`,
      position: 'TOP' as const,
      championId: 'Garen',
      laning: 70,
      mechanics: 65,
      teamfighting: 60,
      gameSense: 65,
      consistency: 70,
      adaptability: 60,
    },
    {
      playerId: `${prefix}_jg`,
      gamertag: `${prefix}_jg`,
      position: 'JUNGLE' as const,
      championId: 'LeeSin',
      laning: 55,
      mechanics: 80,
      teamfighting: 70,
      gameSense: 75,
      consistency: 60,
      adaptability: 70,
    },
    {
      playerId: `${prefix}_mid`,
      gamertag: `${prefix}_mid`,
      position: 'MID' as const,
      championId: 'Annie',
      laning: 70,
      mechanics: 70,
      teamfighting: 75,
      gameSense: 70,
      consistency: 65,
      adaptability: 65,
    },
    {
      playerId: `${prefix}_bot`,
      gamertag: `${prefix}_bot`,
      position: 'BOT' as const,
      championId: 'Ashe',
      laning: 70,
      mechanics: 72,
      teamfighting: 70,
      gameSense: 65,
      consistency: 65,
      adaptability: 60,
    },
    {
      playerId: `${prefix}_sup`,
      gamertag: `${prefix}_sup`,
      position: 'SUPPORT' as const,
      championId: 'Soraka',
      laning: 55,
      mechanics: 60,
      teamfighting: 70,
      gameSense: 75,
      consistency: 70,
      adaptability: 65,
    },
  ];
}

function input(seed: number): SimulateV2Input {
  return {
    versionId: 'demo-a',
    seed,
    blueTeamId: 'blue',
    redTeamId: 'red',
    blue: roster('blue'),
    red: roster('red'),
    maxDurationSec: 600,
  };
}

describe('jungle camp remodel', () => {
  it('defines multi-unit camps with real bounties and CS totaling 4', () => {
    const camps = buildMonsters();
    const wolves = camps.find((camp) => camp.id === 'wolves');
    const raptors = camps.find((camp) => camp.id === 'raptors');
    const krugs = camps.find((camp) => camp.id === 'krugs');
    const blue = camps.find((camp) => camp.id === 'blue_buff');
    const gromp = camps.find((camp) => camp.id === 'gromp');

    expect(wolves?.firstSpawnSec).toBe(55);
    expect(gromp?.firstSpawnSec).toBe(67);
    expect(blue?.units[0]?.gold).toBe(100);

    const wolfCount = wolves!.units.reduce((sum, unit) => sum + unit.count, 0);
    const raptorCount = raptors!.units.reduce((sum, unit) => sum + unit.count, 0);
    expect(wolfCount).toBe(3);
    expect(raptorCount).toBe(6);

    const wolfCs = wolves!.units.reduce((sum, unit) => sum + unit.cs * unit.count, 0);
    const raptorCs = raptors!.units.reduce((sum, unit) => sum + unit.cs * unit.count, 0);
    const krugCs =
      krugs!.units.reduce((sum, unit) => sum + unit.cs * unit.count, 0) +
      (krugs!.units[0]?.splitsInto?.cs ?? 0) * (krugs!.units[0]?.splitsInto?.count ?? 0) +
      (krugs!.units[1]?.splitsInto?.cs ?? 0) * (krugs!.units[1]?.splitsInto?.count ?? 0);
    expect(wolfCs).toBeCloseTo(4);
    expect(raptorCs).toBeCloseTo(4);
    expect(krugCs).toBeCloseTo(4);

    const krugGold =
      krugs!.units.reduce((sum, unit) => sum + unit.gold * unit.count, 0) +
      (krugs!.units[0]?.splitsInto?.gold ?? 0) * (krugs!.units[0]?.splitsInto?.count ?? 0) +
      (krugs!.units[1]?.splitsInto?.gold ?? 0) * (krugs!.units[1]?.splitsInto?.count ?? 0);
    expect(krugGold).toBe(132);
  });

  it('spawns camp composition and splits krugs on kill', () => {
    const { state, recorder } = createMatch(input(42));
    state.scheduler.runUntil(67);

    const wolfAlive = state.monsters.filter((monster) => monster.alive && monster.campId === 'wolves');
    expect(wolfAlive).toHaveLength(3);

    const krugs = state.monsters.filter((monster) => monster.alive && monster.campId === 'krugs');
    expect(krugs).toHaveLength(2);

    const jungler = state.champions.find(
      (champ) => champ.positionLabel === 'JUNGLE' && champ.side === 'blue',
    );
    expect(jungler).toBeTruthy();
    const ancient = krugs.find((monster) => monster.unitKind === 'ancient_krug');
    expect(ancient).toBeTruthy();
    jungler!.position = { ...ancient!.position };
    ancient!.hp = 1;
    attackCamp(state, jungler!, ancient!, recorder);

    const afterSplit = state.monsters.filter((monster) => monster.alive && monster.campId === 'krugs');
    const minis = afterSplit.filter((monster) => monster.unitKind === 'mini_krug');
    expect(minis).toHaveLength(4);
    expect(minis.every((monster) => monster.spawnProtectUntil > state.scheduler.time)).toBe(true);
    expect(afterSplit.some((monster) => monster.unitKind === 'krug')).toBe(true);
  });

  it('awards four CS for a finished single-monster camp', () => {
    const { state, recorder } = createMatch(input(7));
    state.scheduler.runUntil(55);
    const jungler = state.champions.find(
      (champ) => champ.positionLabel === 'JUNGLE' && champ.side === 'blue',
    );
    const blue = state.monsters.find(
      (monster) => monster.alive && monster.campId === 'blue_buff',
    );
    expect(jungler && blue).toBeTruthy();
    const beforeCs = jungler!.cs;
    const beforeCamps = jungler!.campKills;
    jungler!.position = { ...blue!.position };
    blue!.hp = 1;
    attackCamp(state, jungler!, blue!, recorder);
    expect(jungler!.cs).toBeCloseTo(beforeCs + 4);
    expect(jungler!.campKills).toBe(beforeCamps + 1);
    expect(nearestFriendlyCamp(state, jungler!)?.campId).not.toBe('blue_buff');
  });
});

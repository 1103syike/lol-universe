import { describe, expect, it } from 'vitest';

import { createMatch, type SimulateV2Input } from '../engine';
import { buildMonsters } from '../version/shared-content';
import { attackCamp, finalizeMonsterKill, nearestFriendlyCamp } from './jungle-system';

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
      championId: 'Leona',
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
  it('defines multi-unit camps with real bounties; CS is awarded on full clear', () => {
    const camps = buildMonsters();
    const wolves = camps.find((camp) => camp.id === 'wolves');
    const raptors = camps.find((camp) => camp.id === 'raptors');
    const krugs = camps.find((camp) => camp.id === 'krugs');
    const blue = camps.find((camp) => camp.id === 'blue_buff');
    const gromp = camps.find((camp) => camp.id === 'gromp');

    expect(wolves?.firstSpawnSec).toBe(55);
    expect(gromp?.firstSpawnSec).toBe(67);
    expect(blue?.units[0]?.gold).toBeGreaterThanOrEqual(100);
    expect(blue?.units.every((unit) => unit.cs === 0)).toBe(true);
    expect(wolves?.units.every((unit) => unit.cs === 0)).toBe(true);
    expect(raptors?.units.every((unit) => unit.cs === 0)).toBe(true);

    const wolfCount = wolves!.units.reduce((sum, unit) => sum + unit.count, 0);
    const raptorCount = raptors!.units.reduce((sum, unit) => sum + unit.count, 0);
    expect(wolfCount).toBe(3);
    expect(raptorCount).toBe(6);

    const krugGold =
      krugs!.units.reduce((sum, unit) => sum + unit.gold * unit.count, 0) +
      (krugs!.units[0]?.splitsInto?.gold ?? 0) * (krugs!.units[0]?.splitsInto?.count ?? 0) +
      (krugs!.units[1]?.splitsInto?.gold ?? 0) * (krugs!.units[1]?.splitsInto?.count ?? 0);
    expect(krugGold).toBeGreaterThanOrEqual(132);
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

  it('awards 4 CS when a single-monster camp is finished', () => {
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
    expect(jungler!.cs).toBe(beforeCs + 4);
    expect(jungler!.campKills).toBe(beforeCamps + 1);
    expect(nearestFriendlyCamp(state, jungler!)?.campId).not.toBe('blue_buff');
  });

  it('awards 4 CS only after the whole multi-monster camp is cleared', () => {
    const { state, recorder } = createMatch(input(11));
    state.scheduler.runUntil(55);
    const jungler = state.champions.find(
      (champ) => champ.positionLabel === 'JUNGLE' && champ.side === 'blue',
    )!;
    const wolves = state.monsters.filter(
      (monster) => monster.alive && monster.campId === 'wolves',
    );
    expect(wolves).toHaveLength(3);
    const beforeCs = jungler.cs;
    const beforeCamps = jungler.campKills;

    finalizeMonsterKill(state, jungler, wolves[0]!, recorder);
    expect(jungler.cs).toBe(beforeCs);
    expect(jungler.campKills).toBe(beforeCamps);

    finalizeMonsterKill(state, jungler, wolves[1]!, recorder);
    expect(jungler.cs).toBe(beforeCs);
    expect(jungler.campKills).toBe(beforeCamps);

    finalizeMonsterKill(state, jungler, wolves[2]!, recorder);
    expect(jungler.cs).toBe(beforeCs + 4);
    expect(jungler.campKills).toBe(beforeCamps + 1);
  });

  it('stops elemental dragons after soul and spawns elder 6 minutes later', () => {
    const { state, recorder } = createMatch(input(99));
    const jungler = state.champions.find(
      (champ) => champ.positionLabel === 'JUNGLE' && champ.side === 'blue',
    )!;
    const killDragon = () => {
      state.scheduler.runUntil(Math.max(state.scheduler.time, 300));
      let dragon = state.monsters.find((monster) => monster.alive && monster.campId === 'dragon');
      if (!dragon) {
        state.scheduler.runUntil(state.scheduler.time + 301);
        dragon = state.monsters.find((monster) => monster.alive && monster.campId === 'dragon');
      }
      expect(dragon).toBeTruthy();
      jungler.position = { ...dragon!.position };
      dragon!.hp = 1;
      attackCamp(state, jungler, dragon!, recorder);
    };
    killDragon();
    killDragon();
    killDragon();
    killDragon();
    expect(state.blue.hasSoul).toBe(true);
    expect(state.blue.dragonStacks).toBe(4);
    expect(state.monsters.some((monster) => monster.alive && monster.campId === 'dragon')).toBe(
      false,
    );
    state.scheduler.runUntil(state.scheduler.time + 359);
    expect(state.monsters.some((monster) => monster.alive && monster.campId === 'elder')).toBe(
      false,
    );
    expect(state.monsters.some((monster) => monster.alive && monster.campId === 'dragon')).toBe(
      false,
    );
    state.scheduler.runUntil(state.scheduler.time + 2);
    expect(state.monsters.some((monster) => monster.alive && monster.campId === 'elder')).toBe(
      true,
    );
    expect(state.monsters.some((monster) => monster.alive && monster.campId === 'dragon')).toBe(
      false,
    );
  });

  it('despawns herald before baron so pit never has both', () => {
    const { state } = createMatch({ ...input(21), maxDurationSec: 1300 });
    state.scheduler.runUntil(500);
    expect(state.monsters.some((monster) => monster.alive && monster.campId === 'herald')).toBe(
      true,
    );
    expect(state.monsters.some((monster) => monster.alive && monster.campId === 'baron')).toBe(
      false,
    );
    state.scheduler.runUntil(1195);
    expect(state.monsters.some((monster) => monster.alive && monster.campId === 'herald')).toBe(
      false,
    );
    state.scheduler.runUntil(1200);
    expect(state.monsters.some((monster) => monster.alive && monster.campId === 'herald')).toBe(
      false,
    );
    expect(state.monsters.some((monster) => monster.alive && monster.campId === 'baron')).toBe(
      true,
    );
    const aliveEpics = state.monsters.filter(
      (monster) =>
        monster.alive &&
        (monster.campId === 'dragon' ||
          monster.campId === 'elder' ||
          monster.campId === 'baron' ||
          monster.campId === 'herald'),
    );
    const pitCamps = new Set(aliveEpics.map((monster) => monster.campId));
    expect(pitCamps.has('herald')).toBe(false);
    expect(pitCamps.has('baron')).toBe(true);
    expect(pitCamps.size).toBeLessThanOrEqual(2);
  });
});

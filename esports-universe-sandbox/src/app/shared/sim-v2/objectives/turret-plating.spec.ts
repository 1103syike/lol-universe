import { describe, expect, it } from 'vitest';
import { createMatch } from '../engine';
import {
  TURRET_PLATE_COUNT,
  TURRET_PLATE_GOLD,
  attackStructure,
  syncTurretPlating,
} from './structures';

function roster(side: 'blue' | 'red', bots: string[]) {
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

describe('turret plating', () => {
  it('breaks plates and pays local gold before 14:00', () => {
    const { state } = createMatch({
      versionId: 'demo-a',
      seed: 9,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('blue', ['Aatrox', 'LeeSin', 'Ahri', 'Jinx', 'Thresh']),
      red: roster('red', ['Garen', 'Viego', 'Syndra', 'Ashe', 'Leona']),
    });
    const tower = state.structures.find(
      (item) => item.side === 'red' && item.structureKind === 'outer_tower' && item.lane === 'mid',
    )!;
    expect(tower.platesTotal).toBe(TURRET_PLATE_COUNT);
    expect(tower.platesBroken).toBe(0);

    const attacker = state.champions.find((champ) => champ.side === 'blue' && champ.positionLabel === 'MID')!;
    attacker.position = { ...tower.position };
    attacker.gold = 0;
    attacker.earnedGold = 0;
    state.minions = [
      {
        id: 'siege_wave',
        kind: 'minion',
        side: 'blue',
        lane: 'mid',
        role: 'cannon',
        position: { ...tower.position },
        pathIndex: 0,
        hp: 900,
        maxHp: 900,
        ad: 40,
        moveSpeed: 325,
        attackRange: 300,
        nextAttackAt: 0,
        alive: true,
        gold: 60,
        targetId: null,
        aggroUntil: 0,
        aggroAnchor: null,
      },
    ];

    tower.hp = tower.maxHp * 0.79;
    syncTurretPlating(state, tower, attacker);
    expect(tower.platesBroken).toBeGreaterThanOrEqual(1);
    expect(attacker.earnedGold).toBeGreaterThanOrEqual(TURRET_PLATE_GOLD);
    expect(tower.bulwarkStacks).toBeGreaterThanOrEqual(1);

    const goldBefore = attacker.earnedGold;
    attackStructure(state, attacker, tower);
    expect(tower.hp).toBeLessThan(tower.maxHp * 0.79);
    expect(attacker.earnedGold).toBeGreaterThanOrEqual(goldBefore);
  });
});

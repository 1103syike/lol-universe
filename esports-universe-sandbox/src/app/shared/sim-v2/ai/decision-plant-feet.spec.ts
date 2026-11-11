import { describe, expect, it } from 'vitest';
import { createMatch } from '../engine';
import { dist } from '../map/pathfinding';
import { decideForChampion, tickLaningMicro } from './decision';

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

function pathTip(champion: { position: { x: number; y: number }; path: { x: number; y: number }[] }) {
  return champion.path.length > 0 ? champion.path[champion.path.length - 1] : champion.position;
}

describe('plant feet while last-hitting', () => {
  it('does not thrash path endpoints while already in AA range of a farm target', () => {
    const { state, recorder } = createMatch({
      versionId: 'demo-a',
      seed: 19,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('blue', ['Aatrox', 'LeeSin', 'Ahri', 'Jinx', 'Thresh']),
      red: roster('red', ['Garen', 'Viego', 'Syndra', 'Ashe', 'Leona']),
    });
    state.scheduler.setTime(210);
    const ahri = state.champions.find(
      (champ) => champ.side === 'blue' && champ.positionLabel === 'MID',
    )!;
    const redFountain = state.structures.find((item) => item.structureId === 'red_nexus')!;
    for (const champ of state.champions) {
      if (champ.side === 'red') {
        champ.position = { ...redFountain.position };
        champ.path = [];
        champ.moving = false;
        champ.recallPhase = 'none';
      }
    }

    const midPath = state.lockedPack.map.lanePaths.mid;
    const river = midPath[Math.floor(midPath.length * 0.48)];
    const farmSpot = { x: river.x - 40, y: river.y - 40 };
    const enemyMinionPos = {
      x: farmSpot.x + ahri.attackRange * 0.55,
      y: farmSpot.y + ahri.attackRange * 0.15,
    };
    const allyFront = {
      x: enemyMinionPos.x + 60,
      y: enemyMinionPos.y + 40,
    };

    ahri.position = { ...farmSpot };
    ahri.hp = ahri.maxHp;
    ahri.mana = ahri.maxMana;
    ahri.recallPhase = 'none';
    ahri.currentAction = 'farm';
    ahri.path = [];
    ahri.moving = false;
    ahri.nextAttackAt = state.scheduler.time + 0.8;

    state.minions = [
      {
        id: 'red_mid_farm',
        kind: 'minion',
        side: 'red',
        lane: 'mid',
        role: 'melee',
        position: { ...enemyMinionPos },
        pathIndex: 0,
        hp: 420,
        maxHp: 420,
        ad: 12,
        moveSpeed: 325,
        attackRange: 110,
        nextAttackAt: 0,
        alive: true,
        gold: 20,
        targetId: null,
        aggroUntil: 0,
        aggroAnchor: null,
      },
      {
        id: 'blue_mid_front',
        kind: 'minion',
        side: 'blue',
        lane: 'mid',
        role: 'melee',
        position: { ...allyFront },
        pathIndex: 0,
        hp: 500,
        maxHp: 500,
        ad: 12,
        moveSpeed: 325,
        attackRange: 110,
        nextAttackAt: 0,
        alive: true,
        gold: 20,
        targetId: null,
        aggroUntil: 0,
        aggroAnchor: null,
      },
      {
        id: 'blue_mid_rear',
        kind: 'minion',
        side: 'blue',
        lane: 'mid',
        role: 'caster',
        position: { x: farmSpot.x - 80, y: farmSpot.y - 60 },
        pathIndex: 0,
        hp: 320,
        maxHp: 320,
        ad: 20,
        moveSpeed: 325,
        attackRange: 550,
        nextAttackAt: 0,
        alive: true,
        gold: 15,
        targetId: null,
        aggroUntil: 0,
        aggroAnchor: null,
      },
    ];

    expect(dist(ahri.position, enemyMinionPos)).toBeLessThanOrEqual(ahri.attackRange + 40);

    decideForChampion(state, ahri, recorder);
    expect(['farm', 'lane', 'wave_freeze', 'wave_shove', 'siege'].includes(ahri.currentAction)).toBe(
      true,
    );
    const tipAfterDecide = { ...pathTip(ahri) };

    tickLaningMicro(state, recorder);
    const tipAfterMicro = { ...pathTip(ahri) };
    expect(dist(tipAfterDecide, tipAfterMicro)).toBeLessThan(80);

    decideForChampion(state, ahri, recorder);
    tickLaningMicro(state, recorder);
    const tipAfterSecondPass = { ...pathTip(ahri) };
    expect(dist(tipAfterDecide, tipAfterSecondPass)).toBeLessThan(80);
  });
});

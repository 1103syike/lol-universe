import { describe, expect, it } from 'vitest';
import { createMatch } from '../engine';
import { dist } from '../map/pathfinding';
import { decideForChampion } from './decision';

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

describe('stand with wave', () => {
  it('walks toward the front allied minion when the wave is under the enemy outer', () => {
    const { state, recorder } = createMatch({
      versionId: 'demo-a',
      seed: 77,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('blue', ['Aatrox', 'LeeSin', 'Ahri', 'Jinx', 'Thresh']),
      red: roster('red', ['Garen', 'Viego', 'Syndra', 'Ashe', 'Leona']),
    });
    state.scheduler.setTime(360);
    const ahri = state.champions.find(
      (champ) => champ.side === 'blue' && champ.positionLabel === 'MID',
    )!;
    const redOuter = state.structures.find(
      (item) =>
        item.side === 'red' && item.structureKind === 'outer_tower' && item.lane === 'mid',
    )!;
    const fountain = state.structures.find((item) => item.structureId === 'blue_nexus')!;
    for (const champ of state.champions) {
      if (champ.side === 'red') {
        champ.position = { ...fountain.position };
        champ.path = [];
        champ.moving = false;
      }
    }
    const front = {
      x: redOuter.position.x - 280,
      y: redOuter.position.y - 280,
    };
    const rear = {
      x: redOuter.position.x - 900,
      y: redOuter.position.y - 900,
    };
    ahri.position = {
      x: redOuter.position.x - 1600,
      y: redOuter.position.y - 1600,
    };
    ahri.hp = ahri.maxHp;
    ahri.recallPhase = 'none';
    ahri.currentAction = 'idle';
    ahri.path = [];
    ahri.moving = false;
    state.minions = [
      {
        id: 'blue_front',
        kind: 'minion',
        side: 'blue',
        lane: 'mid',
        role: 'melee',
        position: { ...front },
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
        id: 'blue_front_2',
        kind: 'minion',
        side: 'blue',
        lane: 'mid',
        role: 'melee',
        position: { x: front.x + 40, y: front.y + 20 },
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
        id: 'blue_rear',
        kind: 'minion',
        side: 'blue',
        lane: 'mid',
        role: 'caster',
        position: { ...rear },
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

    const beforeFront = dist(ahri.position, front);
    decideForChampion(state, ahri, recorder);
    expect(['siege', 'farm', 'wave_shove', 'lane'].includes(ahri.currentAction)).toBe(true);
    const tip = ahri.path.length > 0 ? ahri.path[ahri.path.length - 1] : ahri.position;
    expect(dist(tip, front)).toBeLessThan(beforeFront);
  });

  it('walks toward a far enemy wave instead of camping the outer wait pocket', () => {
    const { state, recorder } = createMatch({
      versionId: 'demo-a',
      seed: 81,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('blue', ['Jayce', 'LeeSin', 'Ahri', 'Jinx', 'Thresh']),
      red: roster('red', ['Garen', 'Viego', 'Syndra', 'Ashe', 'Leona']),
    });
    state.scheduler.setTime(210);
    const jayce = state.champions.find(
      (champ) => champ.side === 'blue' && champ.positionLabel === 'TOP',
    )!;
    const blueOuter = state.structures.find(
      (item) =>
        item.side === 'blue' && item.structureKind === 'outer_tower' && item.lane === 'top',
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

    const waitPocket = {
      x: blueOuter.position.x + 400,
      y: blueOuter.position.y - 120,
    };
    const farEnemyWave = {
      x: blueOuter.position.x + 2200,
      y: blueOuter.position.y - 200,
    };
    jayce.position = { ...waitPocket };
    jayce.hp = jayce.maxHp;
    jayce.recallPhase = 'none';
    jayce.currentAction = 'idle';
    jayce.path = [];
    jayce.moving = false;
    state.minions = [
      {
        id: 'red_top_far',
        kind: 'minion',
        side: 'red',
        lane: 'top',
        role: 'melee',
        position: { ...farEnemyWave },
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
    ];

    expect(dist(jayce.position, farEnemyWave)).toBeGreaterThan(1400);
    const before = dist(jayce.position, farEnemyWave);
    decideForChampion(state, jayce, recorder);
    expect(['farm', 'lane', 'wave_shove', 'wave_freeze'].includes(jayce.currentAction)).toBe(true);
    const tip = jayce.path.length > 0 ? jayce.path[jayce.path.length - 1] : jayce.position;
    expect(dist(tip, farEnemyWave)).toBeLessThan(before);
  });
});

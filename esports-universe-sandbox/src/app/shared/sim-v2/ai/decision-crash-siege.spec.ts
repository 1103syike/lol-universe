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

function parkEnemiesAway(state: ReturnType<typeof createMatch>['state'], side: 'blue' | 'red'): void {
  const fountain = state.structures.find(
    (item) => item.structureId === (side === 'blue' ? 'red_nexus' : 'blue_nexus'),
  )!;
  for (const champ of state.champions) {
    if (champ.side === side || !champ.alive) {
      continue;
    }
    champ.position = { x: fountain.position.x, y: fountain.position.y };
    champ.path = [];
    champ.moving = false;
    champ.recallPhase = 'none';
  }
}

function crashingWaveAround(
  side: 'blue' | 'red',
  lane: 'mid' | 'bot',
  tower: { x: number; y: number },
) {
  const toward =
    side === 'blue'
      ? { x: tower.x - 120, y: tower.y - 120 }
      : { x: tower.x + 120, y: tower.y + 120 };
  return [0, 1, 2].map((index) => ({
    id: `${side}_${lane}_crash_${index}`,
    kind: 'minion' as const,
    side,
    lane,
    role: (index === 0 ? 'cannon' : 'melee') as 'cannon' | 'melee',
    position: {
      x: toward.x + index * 25,
      y: toward.y + index * 18,
    },
    pathIndex: 0,
    hp: index === 0 ? 980 : 520,
    maxHp: index === 0 ? 980 : 520,
    ad: 12,
    moveSpeed: 325,
    attackRange: 110,
    nextAttackAt: 0,
    alive: true,
    gold: 20,
    targetId: null,
    aggroUntil: 0,
    aggroAnchor: null,
  }));
}

describe('crash wave siege handoff', () => {
  it('mid laner sieges when the allied wave is pressuring the outer tower', () => {
    const { state, recorder } = createMatch({
      versionId: 'demo-a',
      seed: 61,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('blue', ['Aatrox', 'LeeSin', 'Ahri', 'Jinx', 'Thresh']),
      red: roster('red', ['Garen', 'Viego', 'Syndra', 'Ashe', 'Leona']),
    });
    state.scheduler.setTime(500);
    parkEnemiesAway(state, 'blue');
    const ahri = state.champions.find(
      (champ) => champ.side === 'blue' && champ.positionLabel === 'MID',
    )!;
    const redOuter = state.structures.find(
      (item) =>
        item.side === 'red' && item.structureKind === 'outer_tower' && item.lane === 'mid',
    )!;
    const tower = redOuter.position;
    ahri.position = { x: tower.x - 1100, y: tower.y - 1100 };
    ahri.hp = ahri.maxHp;
    ahri.recallPhase = 'none';
    ahri.currentAction = 'idle';
    ahri.path = [];
    ahri.moving = false;
    state.minions = crashingWaveAround('blue', 'mid', tower);

    decideForChampion(state, ahri, recorder);
    expect(ahri.currentAction).toBe('siege');
    const tip = ahri.path.length > 0 ? ahri.path[ahri.path.length - 1] : ahri.position;
    expect(dist(tip, tower)).toBeLessThan(dist(ahri.position, tower) + 1);
  });

  it('bot laner sieges when the allied wave is pressuring the outer tower', () => {
    const { state, recorder } = createMatch({
      versionId: 'demo-a',
      seed: 62,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('blue', ['Aatrox', 'LeeSin', 'Ahri', 'Jinx', 'Thresh']),
      red: roster('red', ['Garen', 'Viego', 'Syndra', 'Ashe', 'Leona']),
    });
    state.scheduler.setTime(500);
    parkEnemiesAway(state, 'blue');
    const jinx = state.champions.find(
      (champ) => champ.side === 'blue' && champ.positionLabel === 'BOT',
    )!;
    const redOuter = state.structures.find(
      (item) =>
        item.side === 'red' && item.structureKind === 'outer_tower' && item.lane === 'bot',
    )!;
    const tower = redOuter.position;
    jinx.position = { x: tower.x - 1000, y: tower.y + 200 };
    jinx.hp = jinx.maxHp;
    jinx.recallPhase = 'none';
    jinx.currentAction = 'idle';
    jinx.path = [];
    jinx.moving = false;
    state.minions = crashingWaveAround('blue', 'bot', tower);

    const before = dist(jinx.position, tower);
    decideForChampion(state, jinx, recorder);
    expect(jinx.currentAction).toBe('siege');
    const tip = jinx.path.length > 0 ? jinx.path[jinx.path.length - 1] : jinx.position;
    expect(dist(tip, tower)).toBeLessThan(before);
  });
});

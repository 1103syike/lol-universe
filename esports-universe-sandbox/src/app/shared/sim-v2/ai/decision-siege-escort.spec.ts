import { describe, expect, it } from 'vitest';
import { createMatch } from '../engine';
import { dist } from '../map/pathfinding';
import { decideForChampion } from './decision';
import { getMatchAiRuntime } from './runtime';
import { MISSION_INTENT_POLICY } from './types';

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

describe('siege escort', () => {
  it('follows the allied wave toward an unpressured outer tower', () => {
    const { state, recorder } = createMatch({
      versionId: 'demo-a',
      seed: 44,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('blue', ['Aatrox', 'LeeSin', 'Ahri', 'Jinx', 'Thresh']),
      red: roster('red', ['Garen', 'Viego', 'Syndra', 'Ashe', 'Leona']),
    });
    state.scheduler.setTime(600);
    const ahri = state.champions.find(
      (champ) => champ.side === 'blue' && champ.positionLabel === 'MID',
    )!;
    const redOuter = state.structures.find(
      (item) =>
        item.side === 'red' && item.structureKind === 'outer_tower' && item.lane === 'mid',
    )!;
    const tower = redOuter.position;
    const wavePos = { x: tower.x - 1100, y: tower.y - 1100 };
    const champPos = { x: tower.x - 1800, y: tower.y - 1800 };
    ahri.position = { ...champPos };
    ahri.hp = ahri.maxHp;
    ahri.recallPhase = 'none';
    ahri.currentAction = 'idle';
    ahri.path = [];
    ahri.moving = false;
    state.minions = [
      {
        id: 'blue_mid_melee',
        kind: 'minion',
        side: 'blue',
        lane: 'mid',
        role: 'melee',
        position: { ...wavePos },
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
        id: 'blue_mid_cannon',
        kind: 'minion',
        side: 'blue',
        lane: 'mid',
        role: 'cannon',
        position: { x: wavePos.x + 40, y: wavePos.y + 40 },
        pathIndex: 0,
        hp: 900,
        maxHp: 900,
        ad: 20,
        moveSpeed: 325,
        attackRange: 110,
        nextAttackAt: 0,
        alive: true,
        gold: 60,
        targetId: null,
        aggroUntil: 0,
        aggroAnchor: null,
      },
    ];
    const policy = MISSION_INTENT_POLICY.siege;
    getMatchAiRuntime(state).assignments.set(ahri.id, {
      championId: ahri.id,
      mission: 'siege',
      play: 'siege-lane',
      targetId: redOuter.id,
      targetCampId: null,
      lane: 'mid',
      formation: 'front',
      expiresAt: state.scheduler.time + 30,
      preferredIntents: policy.preferred,
      allowedIntents: policy.allowed,
    });

    const before = dist(ahri.position, tower);
    decideForChampion(state, ahri, recorder);
    expect(ahri.currentAction).toBe('siege');
    const afterHint =
      ahri.path.length > 0 ? ahri.path[ahri.path.length - 1] : ahri.position;
    expect(dist(afterHint, tower)).toBeLessThan(before);
  });

  it('does not walk into an empty enemy tower to hit it', () => {
    const { state, recorder } = createMatch({
      versionId: 'demo-a',
      seed: 45,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('blue', ['Aatrox', 'LeeSin', 'Ahri', 'Jinx', 'Thresh']),
      red: roster('red', ['Garen', 'Viego', 'Syndra', 'Ashe', 'Leona']),
    });
    state.scheduler.setTime(600);
    const ahri = state.champions.find(
      (champ) => champ.side === 'blue' && champ.positionLabel === 'MID',
    )!;
    const redOuter = state.structures.find(
      (item) =>
        item.side === 'red' && item.structureKind === 'outer_tower' && item.lane === 'mid',
    )!;
    const tower = redOuter.position;
    ahri.position = {
      x: tower.x - redOuter.range - 80,
      y: tower.y - redOuter.range - 80,
    };
    ahri.hp = ahri.maxHp;
    ahri.recallPhase = 'none';
    ahri.currentAction = 'idle';
    ahri.path = [];
    ahri.moving = false;
    state.minions = [];
    const towerHpBefore = redOuter.hp;
    const policy = MISSION_INTENT_POLICY.siege;
    getMatchAiRuntime(state).assignments.set(ahri.id, {
      championId: ahri.id,
      mission: 'siege',
      play: 'siege-lane',
      targetId: redOuter.id,
      targetCampId: null,
      lane: 'mid',
      formation: 'front',
      expiresAt: state.scheduler.time + 30,
      preferredIntents: policy.preferred,
      allowedIntents: policy.allowed,
    });

    decideForChampion(state, ahri, recorder);
    expect(redOuter.hp).toBe(towerHpBefore);
    const destination =
      ahri.path.length > 0 ? ahri.path[ahri.path.length - 1] : ahri.position;
    expect(dist(destination, tower)).toBeGreaterThan(redOuter.range);
  });
});

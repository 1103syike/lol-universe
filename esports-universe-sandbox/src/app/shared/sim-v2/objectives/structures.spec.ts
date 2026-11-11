import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { createEmptyGameState } from '../state/game-state';
import { lockVersion } from '../version/registry';
import type { MinionEntity } from '../state/entities';
import { createMatch } from '../engine';
import {
  applyTowerDamageToMinion,
  attackStructure,
  bootstrapStructures,
  canSiege,
  INHIBITOR_RESPAWN_SEC,
  laneInhibitorDownForSupers,
  pickTowerMinionTarget,
  resolveStructureKill,
  siegeEligibility,
  tickStructures,
  towerDamageRatioVsMinion,
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

function makeMinion(
  role: MinionEntity['role'],
  maxHp: number,
  position: { x: number; y: number },
  id = `minion_${role}`,
): MinionEntity {
  return {
    id,
    kind: 'minion',
    side: 'red',
    lane: 'mid',
    role,
    position: { ...position },
    pathIndex: 0,
    hp: maxHp,
    maxHp,
    ad: 12,
    moveSpeed: 325,
    attackRange: 110,
    nextAttackAt: 0,
    alive: true,
    gold: 20,
    targetId: null,
    aggroUntil: 0,
    aggroAnchor: null,
  };
}

function shotsToKill(
  structureId: string,
  role: MinionEntity['role'],
  maxHp: number,
): number {
  const pack = lockVersion('demo-a');
  const state = createEmptyGameState('m', pack, 1, createRng(1), 'blue', 'red');
  bootstrapStructures(state);
  const tower = state.structures.find((item) => item.structureId === structureId)!;
  const minion = makeMinion(role, maxHp, tower.position);
  state.minions = [minion];
  let shots = 0;
  while (minion.alive && shots < 40) {
    applyTowerDamageToMinion(state, tower, minion);
    shots += 1;
  }
  return shots;
}

describe('passive structures', () => {
  it('keeps nexus and inhibitor from attacking', () => {
    const pack = lockVersion('demo-a');
    const state = createEmptyGameState('m', pack, 1, createRng(1), 'blue', 'red');
    bootstrapStructures(state);

    const nexus = state.structures.find((item) => item.structureId === 'blue_nexus')!;
    const inhib = state.structures.find((item) => item.structureId === 'blue_inhib_mid')!;
    expect(nexus.ad).toBe(0);
    expect(nexus.range).toBe(0);
    expect(inhib.ad).toBe(0);
    expect(inhib.range).toBe(0);

    for (const structure of state.structures) {
      structure.ad = 0;
      structure.range = 0;
    }
    nexus.ad = 999;
    nexus.range = 2000;
    inhib.ad = 999;
    inhib.range = 2000;
    state.minions.push({
      id: 'm1',
      kind: 'minion',
      side: 'red',
      lane: 'mid',
      role: 'melee',
      position: { ...nexus.position },
      pathIndex: 0,
      hp: 500,
      maxHp: 500,
      ad: 10,
      moveSpeed: 300,
      attackRange: 100,
      nextAttackAt: 0,
      alive: true,
      gold: 20,
      targetId: null,
      aggroUntil: 0,
      aggroAnchor: null,
    });
    tickStructures(state);
    expect(state.minions[0].hp).toBe(500);
  });
});

describe('inhibitor respawn', () => {
  it('respawns after five minutes and stops supers shortly before', () => {
    const pack = lockVersion('demo-a');
    const state = createEmptyGameState('m', pack, 1, createRng(1), 'blue', 'red');
    bootstrapStructures(state);
    const inhib = state.structures.find((item) => item.structureId === 'red_inhib_mid')!;
    inhib.alive = false;
    inhib.hp = 0;
    resolveStructureKill(state, inhib, null);
    expect(inhib.respawnAt).toBe(state.scheduler.time + INHIBITOR_RESPAWN_SEC);
    expect(laneInhibitorDownForSupers(state, 'blue', 'mid')).toBe(true);

    state.scheduler.setTime(inhib.respawnAt - 30);
    expect(laneInhibitorDownForSupers(state, 'blue', 'mid')).toBe(false);

    state.scheduler.setTime(inhib.respawnAt);
    tickStructures(state);
    expect(inhib.alive).toBe(true);
    expect(inhib.hp).toBe(inhib.maxHp);
    expect(inhib.respawnAt).toBe(0);
    expect(laneInhibitorDownForSupers(state, 'blue', 'mid')).toBe(false);
  });
});

describe('canSiege order', () => {
  it('keeps nexus locked until both nexus towers are down', () => {
    const pack = lockVersion('demo-a');
    const state = createEmptyGameState('m', pack, 1, createRng(1), 'blue', 'red');
    bootstrapStructures(state);

    const redOuter = state.structures.find(
      (item) => item.structureId === 'red_mid_outer',
    )!;
    const redInner = state.structures.find(
      (item) => item.structureId === 'red_mid_inner',
    )!;
    const redInhibTower = state.structures.find(
      (item) => item.structureId === 'red_mid_inhib_tower',
    )!;
    const redInhib = state.structures.find((item) => item.structureId === 'red_inhib_mid')!;
    const redNexusT1 = state.structures.find((item) => item.structureId === 'red_nexus_t1')!;
    const redNexusT2 = state.structures.find((item) => item.structureId === 'red_nexus_t2')!;
    const redNexus = state.structures.find((item) => item.structureId === 'red_nexus')!;

    expect(canSiege(state, redNexus)).toBe(false);
    expect(canSiege(state, redNexusT1)).toBe(false);

    redOuter.alive = false;
    expect(canSiege(state, redInner)).toBe(true);
    expect(canSiege(state, redInhibTower)).toBe(false);

    redInner.alive = false;
    expect(canSiege(state, redInhibTower)).toBe(true);
    expect(canSiege(state, redInhib)).toBe(false);

    redInhibTower.alive = false;
    expect(canSiege(state, redInhib)).toBe(true);
    expect(canSiege(state, redNexusT1)).toBe(false);

    redInhib.alive = false;
    expect(canSiege(state, redNexusT1)).toBe(true);
    expect(canSiege(state, redNexus)).toBe(false);

    redNexusT1.alive = false;
    expect(canSiege(state, redNexus)).toBe(false);
    redNexusT2.alive = false;
    expect(canSiege(state, redNexus)).toBe(true);
  });
});

describe('outer tower early siege gate', () => {
  it('lets a champion hit an outer tower with one covering minion', () => {
    const { state } = createMatch({
      versionId: 'demo-a',
      seed: 11,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('blue', ['Aatrox', 'LeeSin', 'Ahri', 'Jinx', 'Thresh']),
      red: roster('red', ['Garen', 'Viego', 'Syndra', 'Ashe', 'Leona']),
    });
    state.scheduler.setTime(420);
    const tower = state.structures.find(
      (item) => item.side === 'red' && item.structureKind === 'outer_tower' && item.lane === 'mid',
    )!;
    const attacker = state.champions.find(
      (champ) => champ.side === 'blue' && champ.positionLabel === 'MID',
    )!;
    attacker.position = { ...tower.position };
    attacker.nextAttackAt = 0;
    attacker.recallPhase = 'none';
    state.minions = [
      {
        id: 'cover_melee',
        kind: 'minion',
        side: 'blue',
        lane: 'mid',
        role: 'melee',
        position: { x: tower.position.x - 80, y: tower.position.y - 40 },
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
    const hpBefore = tower.hp;
    expect(siegeEligibility(state, 'blue', tower).championsMayAttack).toBe(true);
    attackStructure(state, attacker, tower);
    expect(tower.hp).toBeLessThan(hpBefore);
  });

  it('blocks empty outer tower hits without allied minions', () => {
    const { state } = createMatch({
      versionId: 'demo-a',
      seed: 12,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('blue', ['Aatrox', 'LeeSin', 'Ahri', 'Jinx', 'Thresh']),
      red: roster('red', ['Garen', 'Viego', 'Syndra', 'Ashe', 'Leona']),
    });
    state.scheduler.setTime(420);
    const tower = state.structures.find(
      (item) => item.side === 'red' && item.structureKind === 'outer_tower' && item.lane === 'mid',
    )!;
    const attacker = state.champions.find(
      (champ) => champ.side === 'blue' && champ.positionLabel === 'MID',
    )!;
    attacker.position = { ...tower.position };
    attacker.nextAttackAt = 0;
    attacker.recallPhase = 'none';
    state.minions = [];
    const hpBefore = tower.hp;
    expect(siegeEligibility(state, 'blue', tower).championsMayAttack).toBe(false);
    attackStructure(state, attacker, tower);
    expect(tower.hp).toBe(hpBefore);
  });
});

describe('tower percent damage vs minions', () => {
  it('uses wiki ratios by turret tier and minion role', () => {
    expect(
      towerDamageRatioVsMinion({ structureKind: 'outer_tower' } as never, {
        role: 'melee',
      }),
    ).toBe(0.45);
    expect(
      towerDamageRatioVsMinion({ structureKind: 'outer_tower' } as never, {
        role: 'caster',
      }),
    ).toBe(0.7);
    expect(
      towerDamageRatioVsMinion({ structureKind: 'outer_tower' } as never, {
        role: 'cannon',
      }),
    ).toBe(0.14);
    expect(
      towerDamageRatioVsMinion({ structureKind: 'inner_tower' } as never, {
        role: 'cannon',
      }),
    ).toBe(0.11);
    expect(
      towerDamageRatioVsMinion({ structureKind: 'inhib_tower' } as never, {
        role: 'cannon',
      }),
    ).toBe(0.08);
    expect(
      towerDamageRatioVsMinion({ structureKind: 'outer_tower' } as never, {
        role: 'super',
      }),
    ).toBe(0.07);
  });

  it('takes 3 / 2 / 8 outer shots to kill full melee / caster / cannon', () => {
    expect(shotsToKill('blue_mid_outer', 'melee', 520)).toBe(3);
    expect(shotsToKill('blue_mid_outer', 'caster', 320)).toBe(2);
    expect(shotsToKill('blue_mid_outer', 'cannon', 980)).toBe(8);
  });

  it('takes 10 inner shots to kill a full cannon', () => {
    expect(shotsToKill('blue_mid_inner', 'cannon', 1176)).toBe(10);
  });

  it('still damages champions with tower ad instead of percent hp', () => {
    const pack = lockVersion('demo-a');
    const state = createEmptyGameState('m', pack, 1, createRng(1), 'blue', 'red');
    bootstrapStructures(state);
    const tower = state.structures.find((item) => item.structureId === 'blue_mid_outer')!;
    tower.nextAttackAt = 0;
    tower.aggroTargetId = 'enemy_mid';
    tower.aggroUntil = 10;
    const enemy = {
      id: 'enemy_mid',
      kind: 'champion' as const,
      side: 'red' as const,
      position: { ...tower.position },
      hp: 1000,
      maxHp: 1000,
      armor: 0,
      mr: 0,
      alive: true,
      recallPhase: 'none' as const,
      recallChannelUntil: 0,
      statuses: [] as Array<{ kind: string; magnitude: number; id: string }>,
      damageTaken: 0,
      damageTakenFromChampions: 0,
      skills: {
        laning: 70,
        mechanics: 70,
        teamfighting: 70,
        gameSense: 70,
        consistency: 70,
        adaptability: 70,
      },
    };
    state.champions.push(enemy as never);
    const hpBefore = enemy.hp;
    tickStructures(state);
    const lost = hpBefore - enemy.hp;
    expect(lost).toBeGreaterThan(50);
    expect(lost).toBeLessThan(tower.ad);
    expect(lost).not.toBe(Math.round(enemy.maxHp * 0.45));
  });
});

describe('tower minion target priority', () => {
  it('prefers cannon over melee and caster', () => {
    const pack = lockVersion('demo-a');
    const state = createEmptyGameState('m', pack, 1, createRng(1), 'blue', 'red');
    bootstrapStructures(state);
    const tower = state.structures.find((item) => item.structureId === 'blue_mid_outer')!;
    const origin = tower.position;
    state.minions = [
      makeMinion('caster', 320, { x: origin.x + 40, y: origin.y }),
      makeMinion('melee', 520, { x: origin.x + 50, y: origin.y }),
      makeMinion('cannon', 980, { x: origin.x + 120, y: origin.y }),
    ];
    expect(pickTowerMinionTarget(state, tower)?.id).toBe('minion_cannon');
  });

  it('prefers melee over caster when no siege minion', () => {
    const pack = lockVersion('demo-a');
    const state = createEmptyGameState('m', pack, 1, createRng(1), 'blue', 'red');
    bootstrapStructures(state);
    const tower = state.structures.find((item) => item.structureId === 'blue_mid_outer')!;
    const origin = tower.position;
    state.minions = [
      makeMinion('caster', 320, { x: origin.x + 30, y: origin.y }),
      makeMinion('melee', 520, { x: origin.x + 90, y: origin.y }),
    ];
    expect(pickTowerMinionTarget(state, tower)?.id).toBe('minion_melee');
  });

  it('picks the closer minion when roles match', () => {
    const pack = lockVersion('demo-a');
    const state = createEmptyGameState('m', pack, 1, createRng(1), 'blue', 'red');
    bootstrapStructures(state);
    const tower = state.structures.find((item) => item.structureId === 'blue_mid_outer')!;
    const origin = tower.position;
    state.minions = [
      makeMinion('melee', 520, { x: origin.x + 180, y: origin.y }, 'melee_far'),
      makeMinion('melee', 520, { x: origin.x + 40, y: origin.y }, 'melee_near'),
    ];
    expect(pickTowerMinionTarget(state, tower)?.id).toBe('melee_near');
  });
});

import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { createEmptyGameState } from '../state/game-state';
import { lockVersion } from '../version/registry';
import { bootstrapStructures, canSiege, tickStructures } from './structures';

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
    });
    tickStructures(state);
    expect(state.minions[0].hp).toBe(500);
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

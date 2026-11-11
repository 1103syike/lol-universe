import { describe, expect, it } from 'vitest';

import { createMatch, type SimulateV2Input } from '../engine';
import { creditMinionKill } from './damage';

function roster(
  side: 'blue' | 'red',
  picks: { top: string; jg: string; mid: string; bot: string; sup: string },
) {
  return (
    [
      ['TOP', picks.top],
      ['JUNGLE', picks.jg],
      ['MID', picks.mid],
      ['BOT', picks.bot],
      ['SUPPORT', picks.sup],
    ] as const
  ).map(([position, championId]) => ({
    playerId: `${side}_${position}`,
    gamertag: `${side}_${position}`,
    position,
    championId,
    laning: 75,
    mechanics: 75,
    teamfighting: 70,
    gameSense: 70,
    consistency: 70,
    adaptability: 70,
  }));
}

function matchInput(): SimulateV2Input {
  return {
    versionId: 'demo-a',
    seed: 42,
    blueTeamId: 'blue',
    redTeamId: 'red',
    blue: roster('blue', {
      top: 'Aatrox',
      jg: 'LeeSin',
      mid: 'Annie',
      bot: 'Jinx',
      sup: 'Thresh',
    }),
    red: roster('red', {
      top: 'Garen',
      jg: 'Viego',
      mid: 'Syndra',
      bot: 'Ashe',
      sup: 'Nautilus',
    }),
  };
}

describe('soft CS realism', () => {
  it('does not credit lane CS when champion is far from the dying minion', () => {
    const { state } = createMatch(matchInput());
    const aatrox = state.champions.find((champ) => champ.championId === 'Aatrox')!;
    aatrox.currentAction = 'farm';
    aatrox.position = { x: 2000, y: 12500 };
    const before = aatrox.cs;

    const target = {
      id: 'test-red-top-far',
      kind: 'minion' as const,
      side: 'red' as const,
      lane: 'top' as const,
      role: 'melee' as const,
      alive: true,
      hp: 1,
      maxHp: 450,
      ad: 12,
      moveSpeed: 325,
      attackRange: 110,
      nextAttackAt: 0,
      gold: 21,
      position: { x: 7000, y: 9000 },
      pathIndex: 0,
      targetId: null,
      aggroUntil: 0,
      aggroAnchor: null,
    };
    state.minions.push(target);
    creditMinionKill(state, null, target, undefined, 'minion');
    expect(aatrox.cs).toBe(before);
  });

  it('can soft-credit when champion is within attack range slack', () => {
    const { state } = createMatch(matchInput());
    const aatrox = state.champions.find((champ) => champ.championId === 'Aatrox')!;
    aatrox.currentAction = 'farm';
    aatrox.position = { x: 6000, y: 6000 };
    const before = aatrox.cs;
    const hits: boolean[] = [];
    for (let i = 0; i < 24; i += 1) {
      const minion = {
        id: `near-minion-${i}`,
        kind: 'minion' as const,
        side: 'red' as const,
        lane: 'top' as const,
        role: 'melee' as const,
        alive: true,
        hp: 1,
        maxHp: 450,
        ad: 12,
        moveSpeed: 325,
        attackRange: 110,
        nextAttackAt: 0,
        gold: 21,
        position: {
          x: aatrox.position.x + 40,
          y: aatrox.position.y,
        },
        pathIndex: 0,
        targetId: null,
        aggroUntil: 0,
        aggroAnchor: null,
      };
      state.minions.push(minion);
      const csBefore = aatrox.cs;
      creditMinionKill(state, null, minion, undefined, 'tower');
      hits.push(aatrox.cs > csBefore);
    }
    expect(hits.some(Boolean)).toBe(true);
    expect(aatrox.cs).toBeGreaterThan(before);
  });
});

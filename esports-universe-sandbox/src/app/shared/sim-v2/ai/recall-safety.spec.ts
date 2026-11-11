import { describe, expect, it } from 'vitest';
import { createMatch } from '../engine';
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

describe('recall safety', () => {
  it('does not channel recall while standing inside an enemy minion wave', () => {
    const { state, recorder } = createMatch({
      versionId: 'demo-a',
      seed: 21,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('blue', ['Aatrox', 'LeeSin', 'Ahri', 'Jinx', 'Thresh']),
      red: roster('red', ['Garen', 'Viego', 'Syndra', 'Ashe', 'Leona']),
    });
    const aatrox = state.champions.find(
      (champ) => champ.side === 'blue' && champ.positionLabel === 'TOP',
    )!;
    const midOuter = state.structures.find(
      (item) => item.side === 'red' && item.structureKind === 'outer_tower' && item.lane === 'mid',
    )!;
    aatrox.position = {
      x: midOuter.position.x - 1400,
      y: midOuter.position.y - 1400,
    };
    aatrox.hp = aatrox.maxHp * 0.28;
    aatrox.recallPhase = 'none';
    aatrox.currentAction = 'idle';
    state.minions = Array.from({ length: 6 }, (_, index) => ({
      id: `red_wave_${index}`,
      kind: 'minion' as const,
      side: 'red' as const,
      lane: 'mid' as const,
      role: index < 3 ? ('melee' as const) : ('caster' as const),
      position: {
        x: aatrox.position.x + 40,
        y: aatrox.position.y + 40,
      },
      pathIndex: 0,
      hp: 400,
      maxHp: 400,
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

    decideForChampion(state, aatrox, recorder);
    expect(aatrox.recallPhase).not.toBe('moving_home');
    expect(aatrox.currentAction === 'retreat' || aatrox.moving || aatrox.path.length > 0).toBe(
      true,
    );
  });
});

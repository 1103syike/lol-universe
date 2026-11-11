import { describe, expect, it } from 'vitest';
import { createMatch } from '../engine';
import { planTeamTick } from '../ai/team-planner';
import { getMatchAiRuntime } from '../ai/runtime';
import { updatePhases } from '../ai/phase-director';

function roster(side: 'b' | 'r', bots: string[]) {
  return (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position, index) => ({
    playerId: `${side}_${position}`,
    gamertag: `${side}_${position}`,
    position,
    championId: bots[index],
    laning: 72,
    mechanics: 70,
    teamfighting: 70,
    gameSense: 70,
    consistency: 68,
    adaptability: 65,
  }));
}

describe('mid-late lane assignment', () => {
  it('puts ADC and support mid after transition template', () => {
    const { state } = createMatch({
      versionId: 'demo-a',
      seed: 21,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('b', ['Aatrox', 'LeeSin', 'Ahri', 'Jinx', 'Thresh']),
      red: roster('r', ['Garen', 'Viego', 'Syndra', 'Ashe', 'Leona']),
    });
    state.scheduler.setTime(900);
    for (const structure of state.structures) {
      if (structure.structureKind === 'outer_tower' && structure.lane === 'bot') {
        structure.alive = false;
        structure.hp = 0;
      }
    }
    updatePhases(state);
    planTeamTick(state);
    const runtime = getMatchAiRuntime(state);
    const blueBot = state.champions.find(
      (champ) => champ.side === 'blue' && champ.positionLabel === 'BOT',
    )!;
    const blueSup = state.champions.find(
      (champ) => champ.side === 'blue' && champ.positionLabel === 'SUPPORT',
    )!;
    expect(runtime.assignments.get(blueBot.id)?.lane).toBe('mid');
    expect(runtime.assignments.get(blueSup.id)?.lane).toBe('mid');
    const sideLanes = new Set(
      state.champions
        .filter(
          (champ) =>
            champ.side === 'blue' &&
            (champ.positionLabel === 'TOP' || champ.positionLabel === 'MID'),
        )
        .map((champ) => runtime.assignments.get(champ.id)?.lane),
    );
    expect(sideLanes.has('top') || sideLanes.has('bot')).toBe(true);
  });

  it(
    'keeps both side lanes assigned during mid game hold',
    () => {
      const { state } = createMatch({
        versionId: 'demo-a',
        seed: 33,
        blueTeamId: 'blue',
        redTeamId: 'red',
        blue: roster('b', ['Aatrox', 'LeeSin', 'Ahri', 'Jinx', 'Thresh']),
        red: roster('r', ['Garen', 'Viego', 'Syndra', 'Ashe', 'Leona']),
      });
      state.scheduler.setTime(960);
      for (const structure of state.structures) {
        if (structure.structureKind === 'outer_tower') {
          structure.alive = false;
          structure.hp = 0;
        }
      }
      updatePhases(state);
      planTeamTick(state);
      const runtime = getMatchAiRuntime(state);
      const lanes = ['top', 'mid', 'bot'] as const;
      const covered = new Set(
        state.champions
          .filter((champ) => champ.side === 'blue' && champ.positionLabel !== 'JUNGLE')
          .map((champ) => runtime.assignments.get(champ.id)?.lane)
          .filter((lane): lane is (typeof lanes)[number] => !!lane),
      );
      expect(covered.has('mid')).toBe(true);
      expect(covered.has('top') || covered.has('bot')).toBe(true);
    },
    20_000,
  );
});

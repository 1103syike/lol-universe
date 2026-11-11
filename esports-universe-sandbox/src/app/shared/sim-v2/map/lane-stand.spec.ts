import { describe, expect, it } from 'vitest';

import { createMatch, type SimulateV2Input } from '../engine';
import { dist } from './pathfinding';
import { faceOffLanePoint, humanizeLaneStand } from './lane-stand';

function roster(side: 'blue' | 'red') {
  return (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position) => ({
    playerId: `${side}_${position}`,
    gamertag: `${side}_${position}`,
    position,
    championId:
      position === 'TOP'
        ? 'Aatrox'
        : position === 'JUNGLE'
          ? 'LeeSin'
          : position === 'MID'
            ? 'Ahri'
            : position === 'BOT'
              ? 'Jinx'
              : 'Nautilus',
    laning: 70,
    mechanics: 70,
    teamfighting: 70,
    gameSense: 70,
    consistency: 70,
    adaptability: 70,
  }));
}

function input(): SimulateV2Input {
  return {
    versionId: 'demo-a',
    seed: 11,
    blueTeamId: 'blue',
    redTeamId: 'red',
    blue: roster('blue'),
    red: roster('red'),
  };
}

describe('lane stand spacing', () => {
  it('keeps laning stand near the wave instead of max-range zoom out', () => {
    const { state } = createMatch(input());
    const aatrox = state.champions.find((champ) => champ.championId === 'Aatrox')!;
    const wave = { x: 4500, y: 11000 };
    aatrox.position = { x: 4200, y: 11200 };
    const stand = humanizeLaneStand(
      state,
      aatrox,
      'top',
      faceOffLanePoint(state, aatrox, 'top', wave),
    );
    expect(dist(stand, wave)).toBeLessThan(260);
  });

  it('does not thrash stand position across nearby ticks', () => {
    const { state } = createMatch(input());
    const jinx = state.champions.find((champ) => champ.championId === 'Jinx')!;
    const wave = { x: 8000, y: 3500 };
    const samples: number[] = [];
    for (let i = 0; i < 8; i += 1) {
      state.scheduler.runUntil(state.scheduler.time + 0.2);
      const stand = humanizeLaneStand(
        state,
        jinx,
        'bot',
        faceOffLanePoint(state, jinx, 'bot', wave),
      );
      samples.push(stand.x + stand.y * 0.001);
    }
    const spread = Math.max(...samples) - Math.min(...samples);
    expect(spread).toBeLessThan(1);
  });
});

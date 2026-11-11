import { describe, expect, it } from 'vitest';

import { simulateV2Match, type SimulateV2Input } from '../engine';
import { dist } from '../map/pathfinding';
import { assessChampionLaneWave } from '../minion/wave-state';

const ROLES = ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const;

function roster(side: 'blue' | 'red') {
  return ROLES.map((position) => ({
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
    laning: 72,
    mechanics: 70,
    teamfighting: 70,
    gameSense: 70,
    consistency: 68,
    adaptability: 65,
  }));
}

function input(maxDurationSec: number): SimulateV2Input {
  return {
    versionId: 'demo-a',
    seed: 77,
    blueTeamId: 'blue',
    redTeamId: 'red',
    blue: roster('blue'),
    red: roster('red'),
    maxDurationSec,
  };
}

describe('laning wave gap probe', () => {
  it('prints laner-wave geometry at 90s', { timeout: 30_000 }, () => {
    const { state, replay } = simulateV2Match(input(90));
    const lines: string[] = [];
    for (const champ of state.champions) {
      if (
        champ.positionLabel !== 'TOP' &&
        champ.positionLabel !== 'MID' &&
        champ.positionLabel !== 'BOT'
      ) {
        continue;
      }
      const lane =
        champ.positionLabel === 'TOP' ? 'top' : champ.positionLabel === 'MID' ? 'mid' : 'bot';
      const wave = assessChampionLaneWave(state, champ, lane);
      const enemies = state.minions.filter(
        (minion) => minion.alive && minion.side !== champ.side && minion.lane === lane,
      );
      const allies = state.minions.filter(
        (minion) => minion.alive && minion.side === champ.side && minion.lane === lane,
      );
      let nearest = Number.POSITIVE_INFINITY;
      for (const minion of enemies) {
        nearest = Math.min(nearest, dist(champ.position, minion.position));
      }
      const auto = replay.events.filter(
        (event) =>
          event.type === 'minion_death' &&
          event.actorId === champ.id &&
          event.payload?.['via'] === 'auto',
      ).length;
      const soft = replay.events.filter(
        (event) =>
          event.type === 'minion_death' &&
          event.actorId === champ.id &&
          (event.payload?.['via'] === 'soft_lasthit' || event.payload?.['via'] === 'lane_owner'),
      ).length;
      const moves = replay.events.filter(
        (event) => event.type === 'move_order' && event.actorId === champ.id,
      ).length;
      lines.push(
        [
          `${champ.side}:${champ.positionLabel}`,
          `cs=${champ.cs} auto=${auto} soft=${soft} moves=${moves}`,
          `alive=${champ.alive} action=${champ.currentAction}`,
          `pos=${Math.round(champ.position.x)},${Math.round(champ.position.y)}`,
          `nearest=${Number.isFinite(nearest) ? Math.round(nearest) : -1}`,
          `eMin=${enemies.length} aMin=${allies.length}`,
          `zone=${wave.zone} clash=${wave.clashProgress?.toFixed(2) ?? '-'}`,
        ].join(' '),
      );
    }
    // eslint-disable-next-line no-console
    console.log(lines.join('\n'));
    expect(lines.length).toBeGreaterThan(0);
  });
});

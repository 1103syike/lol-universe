import { describe, expect, it } from 'vitest';

import { simulateV2Match, type SimulateV2Input } from '../engine';
import { dist } from '../map/pathfinding';

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

function input(seed: number, maxDurationSec: number): SimulateV2Input {
  return {
    versionId: 'demo-a',
    seed,
    blueTeamId: 'blue',
    redTeamId: 'red',
    blue: roster('blue'),
    red: roster('red'),
    maxDurationSec,
  };
}

describe('laning behavior probe', () => {
  it('early laning is CS work with short clicks, not aimless wandering', { timeout: 60_000 }, () => {
    const { replay, state } = simulateV2Match(input(77, 210));
    const laners = state.champions.filter(
      (champ) =>
        champ.positionLabel === 'TOP' ||
        champ.positionLabel === 'MID' ||
        champ.positionLabel === 'BOT',
    );

    const moveOrders = replay.events.filter((event) => event.type === 'move_order' && event.t <= 210);
    const attacks = replay.events.filter((event) => event.type === 'attack' && event.t <= 210);
    const minionDeaths = replay.events.filter(
      (event) => event.type === 'minion_death' && event.t <= 210,
    );
    const aiDecisions = replay.events.filter(
      (event) => event.type === 'ai_decision' && event.t <= 210,
    );
    const farmish = aiDecisions.filter((event) => {
      const action = String(event.payload?.['action'] ?? '');
      return (
        action === 'farm' ||
        action === 'lane' ||
        action === 'wave_freeze' ||
        action === 'wave_shove'
      );
    });

    let shortClicks = 0;
    for (const event of moveOrders) {
      const actor = state.champions.find((champ) => champ.id === event.actorId);
      if (!actor || actor.positionLabel === 'JUNGLE') {
        continue;
      }
      if (event.x == null || event.y == null) {
        continue;
      }
    }
    for (let i = 1; i < moveOrders.length; i += 1) {
      const prev = moveOrders[i - 1]!;
      const cur = moveOrders[i]!;
      if (prev.actorId !== cur.actorId || prev.x == null || cur.x == null) {
        continue;
      }
      const step = Math.hypot(cur.x - (prev.x ?? 0), (cur.y ?? 0) - (prev.y ?? 0));
      if (step > 40 && step < 320) {
        shortClicks += 1;
      }
    }

    const rows: string[] = [];
    for (const laner of laners) {
      const lane =
        laner.positionLabel === 'TOP' ? 'top' : laner.positionLabel === 'MID' ? 'mid' : 'bot';
      const enemyMinions = state.minions.filter(
        (minion) => minion.alive && minion.side !== laner.side && minion.lane === lane,
      );
      let nearest = Number.POSITIVE_INFINITY;
      for (const minion of enemyMinions) {
        nearest = Math.min(nearest, dist(laner.position, minion.position));
      }
      rows.push(
        `${laner.side}:${laner.positionLabel} cs=${Math.round(laner.cs)} nearest=${
          Number.isFinite(nearest) ? Math.round(nearest) : -1
        } action=${laner.currentAction}`,
      );
    }

    const autoCs = minionDeaths.filter((event) => event.payload?.['via'] === 'auto').length;
    const softCs = minionDeaths.filter((event) => event.payload?.['via'] === 'soft_lasthit').length;
    // eslint-disable-next-line no-console
    console.log(
      [
        `t=${state.scheduler.time.toFixed(0)} moves=${moveOrders.length} shortishSteps=${shortClicks}`,
        `attacks=${attacks.length} farmishDecisions=${farmish.length}/${aiDecisions.length}`,
        `deaths=${minionDeaths.length} auto=${autoCs} soft=${softCs}`,
        ...rows,
      ].join('\n'),
    );

    const meanCs = laners.reduce((sum, laner) => sum + laner.cs, 0) / Math.max(1, laners.length);
    expect(moveOrders.length).toBeGreaterThan(100);
    expect(shortClicks).toBeGreaterThan(20);
    expect(attacks.length).toBeGreaterThan(20);
    expect(farmish.length).toBeGreaterThan(10);
    expect(meanCs).toBeGreaterThan(12);
    expect(autoCs).toBeGreaterThan(12);
    expect(farmish.length / Math.max(1, aiDecisions.length)).toBeGreaterThan(0.35);
  });
});

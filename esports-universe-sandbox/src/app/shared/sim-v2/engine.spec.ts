import { describe, expect, it } from 'vitest';
import { assertBoxScore } from '../sim/invariants';
import { toMatchReport } from './adapter/to-match-report';
import { simulateV2Match, type SimulateV2Input } from './engine';
import { createRng } from './rng';
import { getVersionPack, listVersionIds, lockVersion } from './version/registry';
import { createEmptyGameState } from './state/game-state';
import { findPath } from './map/pathfinding';
import { orderMove } from './map/movement';
import { spawnChampion } from './champion/spawn';
import { DiscreteScheduler } from './scheduler/discrete-scheduler';

function roster(side: 'blue' | 'red') {
  const prefix = side;
  return [
    {
      playerId: `${prefix}_top`,
      gamertag: `${prefix}_top`,
      position: 'TOP' as const,
      championId: 'Garen',
      laning: 70,
      mechanics: 65,
      teamfighting: 60,
      gameSense: 68,
      consistency: 70,
      adaptability: 60,
    },
    {
      playerId: `${prefix}_jg`,
      gamertag: `${prefix}_jg`,
      position: 'JUNGLE' as const,
      championId: 'LeeSin',
      laning: 55,
      mechanics: 80,
      teamfighting: 70,
      gameSense: 75,
      consistency: 60,
      adaptability: 70,
    },
    {
      playerId: `${prefix}_mid`,
      gamertag: `${prefix}_mid`,
      position: 'MID' as const,
      championId: 'Annie',
      laning: 72,
      mechanics: 70,
      teamfighting: 75,
      gameSense: 70,
      consistency: 65,
      adaptability: 65,
    },
    {
      playerId: `${prefix}_bot`,
      gamertag: `${prefix}_bot`,
      position: 'BOT' as const,
      championId: 'Ashe',
      laning: 68,
      mechanics: 72,
      teamfighting: 70,
      gameSense: 66,
      consistency: 68,
      adaptability: 60,
    },
    {
      playerId: `${prefix}_sup`,
      gamertag: `${prefix}_sup`,
      position: 'SUPPORT' as const,
      championId: 'Thresh',
      laning: 60,
      mechanics: 70,
      teamfighting: 72,
      gameSense: 78,
      consistency: 70,
      adaptability: 65,
    },
  ];
}

function baseInput(seed: string | number, versionId = 'demo-a'): SimulateV2Input {
  return {
    versionId,
    seed,
    blueTeamId: 'blue',
    redTeamId: 'red',
    blue: roster('blue'),
    red: roster('red'),
    maxDurationSec: 900,
  };
}

describe('sim-v2 phase coverage', () => {
  it('phase1: loads two packs and isolates game states', () => {
    expect(listVersionIds()).toEqual(expect.arrayContaining(['demo-a', 'demo-b']));
    const a = lockVersion('demo-a');
    const b = lockVersion('demo-b');
    expect(a.manifest.id).not.toBe(b.manifest.id);
    expect(a.champions.Garen.baseHp).not.toBe(b.champions.Garen.baseHp);
    const stateA = createEmptyGameState('m1', a, 1, createRng(1), 'blue', 'red');
    const stateB = createEmptyGameState('m2', b, 2, createRng(2), 'blue', 'red');
    stateA.waveIndex = 9;
    expect(stateB.waveIndex).toBe(0);
    expect(stateA.versionId).toBe('demo-a');
    expect(stateB.versionId).toBe('demo-b');
  });

  it('phase1: scheduler empty run is reproducible', () => {
    const run = () => {
      const scheduler = new DiscreteScheduler();
      let ticks = 0;
      scheduler.schedule(1, 'x', () => {
        ticks += 1;
      });
      scheduler.runUntil(1);
      return ticks;
    };
    expect(run()).toBe(run());
  });

  it('phase2: ten champions can path and gather', () => {
    const pack = lockVersion('demo-a');
    const state = createEmptyGameState('m', pack, 3, createRng(3), 'blue', 'red');
    for (const player of roster('blue')) {
      spawnChampion(state, 'blue', 'blue', player);
    }
    for (const player of roster('red')) {
      spawnChampion(state, 'red', 'red', player);
    }
    expect(state.champions).toHaveLength(10);
    const mid = { x: 7500, y: 7500 };
    for (const champ of state.champions) {
      expect(orderMove(state, champ, mid)).toBe(true);
      expect(champ.path.length).toBeGreaterThan(0);
    }
    const sample = findPath(pack.map, state.champions[0].position, mid);
    expect(sample.length).toBeGreaterThan(1);
  });

  it(
    'phase3-9: full match ends with nexus winner, replay, and report',
    () => {
      const first = simulateV2Match(baseInput(42));
      const second = simulateV2Match(baseInput(42));
      expect(first.state.winnerTeamId).toBeTruthy();
      expect(['nexus', 'timeout']).toContain(first.state.endReason);
      expect(first.state.winnerTeamId).toBe(second.state.winnerTeamId);
      expect(first.replay.events.length).toBeGreaterThan(10);
      expect(first.replay.snapshots.length).toBeGreaterThan(0);
      expect(first.state.waveIndex).toBeGreaterThan(0);
      expect(first.state.monsters.length).toBeGreaterThan(0);
      expect(first.state.structures.some((structure) => structure.structureKind === 'nexus')).toBe(true);

      const report = toMatchReport(first);
      expect(report.winnerTeamId).toBe(first.state.winnerTeamId);
      expect(report.boxScore.players).toHaveLength(10);
      expect(report.draft.home.picks.length).toBeGreaterThan(0);
      const totalKills = report.boxScore.home.kills + report.boxScore.away.kills;
      const totalChampDamage = report.boxScore.players.reduce(
        (sum, player) => sum + player.damageToChamps,
        0,
      );
      const totalDeaths = report.boxScore.home.deaths + report.boxScore.away.deaths;
      expect(totalKills).toBeLessThanOrEqual(totalDeaths);
      expect(totalDeaths - totalKills).toBeLessThanOrEqual(8);
      expect(totalChampDamage).toBeGreaterThan(0);
      for (const player of report.boxScore.players) {
        expect(player.damageToChamps).toBeGreaterThanOrEqual(0);
        if (player.kills > 0) {
          expect(player.damageToChamps).toBeGreaterThan(0);
        }
      }
      assertBoxScore(report.boxScore);
    },
    60_000,
  );

  it(
    'phase1 isolation: same seed different versions stay locked',
    () => {
      const a = simulateV2Match(baseInput(7, 'demo-a'));
      const b = simulateV2Match(baseInput(7, 'demo-b'));
      expect(a.state.versionId).toBe('demo-a');
      expect(b.state.versionId).toBe('demo-b');
      expect(getVersionPack('demo-a').manifest.checksum).not.toBe(
        getVersionPack('demo-b').manifest.checksum,
      );
    },
    60_000,
  );

  it(
    'forceWinnerTeamId overrides result',
    () => {
      const result = simulateV2Match({ ...baseInput(99), forceWinnerTeamId: 'red' });
      expect(toMatchReport(result).winnerTeamId).toBe('red');
    },
    60_000,
  );
});

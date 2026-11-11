import { describe, expect, it } from 'vitest';
import { simulateV2Match, type SimulateV2Input } from '../engine';
import {
  BASE_SIEGE_PRESENCE_RANGE,
  canSiege,
  hasAlliedSiegePresence,
  wavePressuringStructure,
} from '../objectives/structures';
import type { GameState } from '../state/game-state';

function roster(side: 'blue' | 'red') {
  const prefix = side;
  return (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position) => ({
    playerId: `${prefix}_${position}`,
    gamertag: `${prefix}_${position}`,
    position,
    championId:
      position === 'TOP'
        ? 'Garen'
        : position === 'JUNGLE'
          ? 'LeeSin'
          : position === 'MID'
            ? 'Annie'
            : position === 'BOT'
              ? 'Ashe'
              : 'Thresh',
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

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function timeoutCloseoutDiagnostics(state: GameState): string {
  const lines: string[] = [];
  for (const side of ['blue', 'red'] as const) {
    const targets = state.structures.filter(
      (structure) =>
        structure.alive &&
        structure.side !== side &&
        (structure.structureKind === 'nexus' ||
          structure.structureKind === 'nexus_tower' ||
          structure.structureKind === 'inhibitor' ||
          structure.structureKind === 'inhib_tower'),
    );
    for (const structure of targets) {
      const siegeOk = canSiege(state, structure);
      const waveOk = wavePressuringStructure(state, side, structure);
      const presenceOk = hasAlliedSiegePresence(state, side, structure);
      lines.push(
        `${side}->${structure.structureKind}/${structure.lane ?? 'base'} canSiege=${siegeOk} waveOrPresence=${waveOk} presence=${presenceOk} hp=${Math.round(structure.hp)}`,
      );
    }
  }
  return lines.join(' | ');
}

describe('honest closeout', () => {
  it(
    'timeout ends without destroying either nexus',
    () => {
      const { state, replay } = simulateV2Match(input(91001, 900));
      expect(state.endReason).toBe('timeout');
      expect(state.winnerTeamId).toBeTruthy();
      const nexuses = state.structures.filter((structure) => structure.structureKind === 'nexus');
      expect(nexuses).toHaveLength(2);
      expect(nexuses.every((structure) => structure.alive)).toBe(true);
      const end = replay.events.find((event) => event.type === 'match_end');
      expect(end?.payload?.['reason']).toBe('timeout');
      expect(
        replay.events.some(
          (event) =>
            event.type === 'structure_kill' && event.payload?.['kind'] === 'nexus',
        ),
      ).toBe(false);
    },
    60_000,
  );

  it(
    'nexus kill only appears when a nexus structure actually dies',
    () => {
      const { state, replay } = simulateV2Match(input(42, 2700));
      const nexusKill = replay.events.find(
        (event) =>
          event.type === 'structure_kill' && event.payload?.['kind'] === 'nexus',
      );
      if (state.endReason === 'nexus') {
        expect(nexusKill).toBeTruthy();
        const deadNexus = state.structures.find(
          (structure) => structure.structureKind === 'nexus' && !structure.alive,
        );
        expect(deadNexus).toBeTruthy();
        expect(nexusKill?.payload?.['overtime']).toBeUndefined();
      } else {
        expect(state.endReason).toBe('timeout');
        expect(nexusKill).toBeUndefined();
        // eslint-disable-next-line no-console
        console.log('timeout diagnostics seed=42', timeoutCloseoutDiagnostics(state));
      }
    },
    180_000,
  );

  it(
    'most matches end by nexus with attackers present in base',
    () => {
      const seeds = [42, 1000, 91001, 77, 333, 555, 888, 2024, 11, 99];
      let nexusEnds = 0;
      const timeoutNotes: string[] = [];
      for (const seed of seeds) {
        const { state, replay } = simulateV2Match(input(seed, 2700));
        if (state.endReason !== 'nexus') {
          expect(state.endReason).toBe('timeout');
          timeoutNotes.push(`seed=${seed} ${timeoutCloseoutDiagnostics(state)}`);
          continue;
        }
        nexusEnds += 1;
        const deadNexus = state.structures.find(
          (structure) => structure.structureKind === 'nexus' && !structure.alive,
        );
        expect(deadNexus).toBeTruthy();
        const attackers = state.champions.filter(
          (champ) =>
            champ.alive &&
            champ.side !== deadNexus!.side &&
            champ.recallPhase === 'none' &&
            dist(champ.position, deadNexus!.position) < BASE_SIEGE_PRESENCE_RANGE,
        );
        expect(attackers.length).toBeGreaterThanOrEqual(1);
        const lastSnap = replay.snapshots[replay.snapshots.length - 1];
        const snapPresent = lastSnap.champions.filter(
          (champ) =>
            champ.alive &&
            champ.side !== deadNexus!.side &&
            dist({ x: champ.x, y: champ.y }, deadNexus!.position) <
              BASE_SIEGE_PRESENCE_RANGE,
        );
        expect(snapPresent.length).toBeGreaterThanOrEqual(1);
        const nexusKill = replay.events.find(
          (event) =>
            event.type === 'structure_kill' && event.payload?.['kind'] === 'nexus',
        );
        expect(nexusKill).toBeTruthy();
        if (nexusKill?.actorId) {
          const actor = state.champions.find((champ) => champ.id === nexusKill.actorId);
          expect(actor).toBeTruthy();
          expect(dist(actor!.position, deadNexus!.position)).toBeLessThan(
            BASE_SIEGE_PRESENCE_RANGE,
          );
        }
      }
      if (timeoutNotes.length > 0) {
        // eslint-disable-next-line no-console
        console.log('timeout leftovers\n' + timeoutNotes.join('\n'));
      }
      expect(nexusEnds / seeds.length).toBeGreaterThanOrEqual(0.7);
    },
    300_000,
  );

  it(
    'lethal damage produces real deaths instead of escape recalls',
    () => {
      const { replay } = simulateV2Match(input(91001, 1200));
      const deaths = replay.events.filter((event) => event.type === 'death');
      const earlyDeaths = deaths.filter((event) => (event.t ?? 0) < 180);
      expect(deaths.length).toBeGreaterThan(0);
      expect(earlyDeaths.length).toBeLessThanOrEqual(8);
      const firstBlood = earlyDeaths[0] ?? deaths[0];
      if (firstBlood) {
        const assists = Array.isArray(firstBlood.payload?.['assistPlayerIds'])
          ? (firstBlood.payload?.['assistPlayerIds'] as unknown[]).length
          : 0;
        expect(assists).toBeLessThanOrEqual(4);
      }
    },
    90_000,
  );
});

import { dist } from '../map/pathfinding';
import type { GameState } from '../state/game-state';
import type { TeamSide } from '../types/ids';
import { objectiveWindowBoost } from '../jungle/jungle-system';
import { getMatchAiRuntime } from './runtime';
import type { MatchPhase } from './types';

function livingCount(state: GameState, side: TeamSide): number {
  return state.champions.filter((champ) => champ.alive && champ.side === side).length;
}

function outerTowersDown(state: GameState, side: TeamSide): number {
  return state.structures.filter(
    (structure) =>
      structure.side === side &&
      structure.structureKind === 'outer_tower' &&
      !structure.alive,
  ).length;
}

function baseThreatLevel(state: GameState, side: TeamSide): number {
  let best = 0;
  for (const structure of state.structures) {
    if (!structure.alive || structure.side !== side) {
      continue;
    }
    if (
      structure.structureKind !== 'nexus' &&
      structure.structureKind !== 'nexus_tower' &&
      structure.structureKind !== 'inhibitor' &&
      structure.structureKind !== 'inhib_tower'
    ) {
      continue;
    }
    const enemies = state.champions.filter(
      (enemy) =>
        enemy.alive &&
        enemy.side !== side &&
        dist(enemy.position, structure.position) < 1800,
    ).length;
    const minions = state.minions.filter(
      (minion) =>
        minion.alive &&
        minion.side !== side &&
        dist(minion.position, structure.position) < 1000,
    ).length;
    best = Math.max(best, enemies * 30 + minions * 8);
  }
  return best;
}

function bestObjectiveBoost(state: GameState): number {
  let best = 0;
  for (const campId of ['dragon', 'baron', 'herald'] as const) {
    const alive = state.monsters.some((monster) => monster.alive && monster.campId === campId);
    if (!alive) {
      continue;
    }
    best = Math.max(best, objectiveWindowBoost(state, campId));
  }
  return best;
}

export function decidePhase(state: GameState, side: TeamSide): MatchPhase {
  const t = state.scheduler.time;
  if (t < 90) {
    return 'opening';
  }

  const threat = baseThreatLevel(state, side);
  if (threat >= 60) {
    return 'defend';
  }

  const objBoost = bestObjectiveBoost(state);
  if (objBoost > 0.55 && t >= 300) {
    return 'objective-setup';
  }

  if (t >= 1500 || (t >= 1200 && livingCount(state, side) >= livingCount(state, side === 'blue' ? 'red' : 'blue'))) {
    const pressured = state.structures.some(
      (structure) =>
        structure.alive &&
        structure.side !== side &&
        state.minions.some(
          (minion) =>
            minion.alive &&
            minion.side === side &&
            dist(minion.position, structure.position) < 900,
        ),
    );
    if (pressured || t >= 1680) {
      return 'closeout';
    }
  }

  if (t >= 900 && outerTowersDown(state, side === 'blue' ? 'red' : 'blue') >= 1) {
    const siegeReady = state.structures.some(
      (structure) =>
        structure.alive &&
        structure.side !== side &&
        state.minions.some(
          (minion) =>
            minion.alive &&
            minion.side === side &&
            dist(minion.position, structure.position) < 1100,
        ),
    );
    if (siegeReady) {
      return 'siege';
    }
    return 'transition';
  }

  if (t < 540) {
    return 'laning';
  }
  return 'transition';
}

export function updatePhases(state: GameState): void {
  const runtime = getMatchAiRuntime(state);
  runtime.phases.blue = decidePhase(state, 'blue');
  runtime.phases.red = decidePhase(state, 'red');
}

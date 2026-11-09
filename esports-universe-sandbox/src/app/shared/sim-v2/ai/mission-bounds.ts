import { dist } from '../map/pathfinding';
import type { ChampionEntity } from '../state/entities';
import type { GameState } from '../state/game-state';
import type { MissionIntentKind, UnitAssignment } from './types';

export interface BoundableIntent {
  kind: string;
  score: number;
  enemy?: { position: { x: number; y: number } } | null;
  structure?: { id: string; position: { x: number; y: number } } | null;
  camp?: { id: string; campId: string; position: { x: number; y: number } } | null;
}

function intentMatchesTarget(
  state: GameState,
  intent: BoundableIntent,
  assignment: UnitAssignment,
): boolean {
  if (assignment.targetId) {
    if (intent.structure && intent.structure.id === assignment.targetId) {
      return true;
    }
    if (intent.camp && intent.camp.id === assignment.targetId) {
      return true;
    }
  }
  if (assignment.targetCampId && intent.camp?.campId === assignment.targetCampId) {
    return true;
  }
  if (
    (intent.kind === 'skirmish' || intent.kind === 'gank') &&
    intent.enemy &&
    assignment.targetId
  ) {
    const structure = state.structures.find((item) => item.id === assignment.targetId);
    if (structure && dist(intent.enemy.position, structure.position) < 1600) {
      return true;
    }
    const camp = state.monsters.find((item) => item.id === assignment.targetId);
    if (camp && dist(intent.enemy.position, camp.position) < 1600) {
      return true;
    }
  }
  return false;
}

export function applyMissionBounds<T extends BoundableIntent>(
  state: GameState,
  champion: ChampionEntity,
  intents: T[],
  assignment: UnitAssignment | null,
): T[] {
  if (!assignment) {
    return intents;
  }

  const allowed = new Set<MissionIntentKind>(assignment.allowedIntents);
  const preferred = new Set<MissionIntentKind>(assignment.preferredIntents);
  const bounded: T[] = [];

  for (const intent of intents) {
    const kind = intent.kind as MissionIntentKind;
    if (!allowed.has(kind)) {
      continue;
    }

    let score = intent.score;
    if (preferred.has(kind)) {
      score *= 1.28;
    } else {
      score *= 1.02;
    }

    if (
      (kind === 'objective' || kind === 'siege' || kind === 'defend') &&
      intentMatchesTarget(state, intent, assignment)
    ) {
      score *= 1.22;
    }

    if (
      (assignment.mission === 'cover-side' || assignment.mission === 'hold-lane') &&
      (kind === 'skirmish' || kind === 'gank') &&
      intent.enemy &&
      dist(champion.position, intent.enemy.position) > 2800
    ) {
      continue;
    }

    if (
      assignment.mission === 'take-objective' ||
      assignment.mission === 'setup-objective'
    ) {
      if (kind === 'farm' || kind === 'lane') {
        score *= 0.15;
      }
      if (kind === 'wave_freeze') {
        score *= 0.15;
      }
      const objectiveCamp = assignment.targetCampId
        ? state.monsters.find(
            (monster) => monster.alive && monster.campId === assignment.targetCampId,
          )
        : null;
      const nearObjective =
        !!objectiveCamp && dist(champion.position, objectiveCamp.position) < 2200;
      if (kind === 'wave_shove') {
        const farSetup =
          !nearObjective && assignment.mission === 'setup-objective';
        if (
          farSetup &&
          assignment.targetCampId === 'dragon' &&
          champion.positionLabel === 'TOP'
        ) {
          score *= 0.4;
        } else {
          score *= nearObjective ? 0.35 : farSetup ? 1.25 : 0.9;
        }
      }
      if (kind === 'objective') {
        score *= nearObjective ? 2.1 : 1.6;
        if (intentMatchesTarget(state, intent, assignment)) {
          score *= 1.25;
        }
        if (
          !nearObjective &&
          assignment.targetCampId === 'dragon' &&
          champion.positionLabel === 'TOP'
        ) {
          score *= 1.35;
        }
      }
      if (kind === 'skirmish' && intentMatchesTarget(state, intent, assignment)) {
        score *= 1.25;
      }
    }

    if (assignment.mission === 'reset' && kind === 'wave_shove') {
      score *= 1.35;
    }

    if (assignment.mission === 'siege') {
      if (kind === 'siege' && intentMatchesTarget(state, intent, assignment)) {
        score *= 1.3;
        const target = state.structures.find((item) => item.id === assignment.targetId);
        if (target?.structureKind === 'nexus') {
          score *= 1.35;
        }
      }
      if (kind === 'farm' || kind === 'lane') {
        const target = state.structures.find((item) => item.id === assignment.targetId);
        score *= target?.structureKind === 'nexus' ? 0.2 : 0.55;
      }
      if (kind === 'skirmish' && !intentMatchesTarget(state, intent, assignment)) {
        score *= 0.5;
      }
      if (kind === 'objective') {
        const target = state.structures.find((item) => item.id === assignment.targetId);
        if (target?.structureKind === 'nexus') {
          score *= 0.25;
        }
      }
    }

    if (assignment.mission === 'anchor-defense') {
      if (kind === 'defend') {
        score *= 1.25;
      }
      if (kind === 'siege') {
        score *= 0.35;
      }
    }

    bounded.push({ ...intent, score });
  }

  if (bounded.length === 0) {
    return intents.filter((intent) => allowed.has(intent.kind as MissionIntentKind));
  }
  return bounded;
}

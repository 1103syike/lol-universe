import {
  canSiege,
  wavePressuringStructure,
} from '../objectives/structures';
import type { StructureEntity } from '../state/entities';
import type { GameState } from '../state/game-state';
import type { LaneId, TeamSide } from '../types/ids';
import { getMatchAiRuntime } from './runtime';

export type CloseoutStage = 'idle' | 'shove_lane' | 'siege_nexus_towers' | 'crack_nexus';

export interface CloseoutPlan {
  side: TeamSide;
  stage: CloseoutStage;
  structureId: string | null;
  shoveLanes: LaneId[];
  updatedAt: number;
  expiresAt: number;
}

const CLOSEOUT_HOLD_SEC = 48;
const CLOSEOUT_START_SEC = 1080;

function teamGold(state: GameState, side: TeamSide): number {
  return state.champions
    .filter((champ) => champ.side === side)
    .reduce((sum, champ) => sum + champ.earnedGold, 0);
}

function livingStructures(state: GameState, side: TeamSide): number {
  return state.structures.filter((structure) => structure.alive && structure.side === side)
    .length;
}

function isLeading(state: GameState, side: TeamSide): boolean {
  const foe: TeamSide = side === 'blue' ? 'red' : 'blue';
  const goldLead = teamGold(state, side) - teamGold(state, foe);
  const structLead = livingStructures(state, foe) - livingStructures(state, side);
  return goldLead >= 600 || structLead >= 1 || state.scheduler.time >= 1320;
}

function kindPriority(structure: StructureEntity): number {
  switch (structure.structureKind) {
    case 'nexus':
      return 100;
    case 'nexus_tower':
      return 80;
    case 'inhibitor':
      return 60;
    case 'inhib_tower':
      return 40;
    case 'inner_tower':
      return 20;
    default:
      return 0;
  }
}

function openCloseoutTarget(state: GameState, side: TeamSide): StructureEntity | null {
  const foe: TeamSide = side === 'blue' ? 'red' : 'blue';
  let best: StructureEntity | null = null;
  let bestScore = -1;
  for (const structure of state.structures) {
    if (!structure.alive || structure.side !== foe || !canSiege(state, structure)) {
      continue;
    }
    const priority = kindPriority(structure);
    if (priority <= 0) {
      continue;
    }
    const pressured = wavePressuringStructure(state, side, structure) ? 25 : 0;
    const laneBias =
      structure.lane === 'mid' ? 6 : structure.lane === 'top' || structure.lane === 'bot' ? 3 : 0;
    const score = priority + pressured + laneBias;
    if (score > bestScore) {
      best = structure;
      bestScore = score;
    }
  }
  return best;
}

function pickShoveLanes(state: GameState, side: TeamSide, target: StructureEntity): LaneId[] {
  if (target.lane === 'top' || target.lane === 'mid' || target.lane === 'bot') {
    return target.lane === 'mid' ? ['mid', 'top'] : [target.lane, 'mid'];
  }
  const lanes: LaneId[] = ['top', 'mid', 'bot'];
  const scored = lanes.map((lane) => {
    const wave = state.minions.filter(
      (minion) => minion.alive && minion.side === side && minion.lane === lane,
    ).length;
    return { lane, wave };
  });
  scored.sort((a, b) => b.wave - a.wave);
  return [scored[0].lane, scored[1]?.lane ?? 'mid'];
}

function stageFor(
  state: GameState,
  side: TeamSide,
  target: StructureEntity,
): CloseoutStage {
  const pressured = wavePressuringStructure(state, side, target);
  if (target.structureKind === 'nexus') {
    return pressured ? 'crack_nexus' : 'shove_lane';
  }
  if (target.structureKind === 'nexus_tower') {
    return pressured ? 'siege_nexus_towers' : 'shove_lane';
  }
  if (
    target.structureKind === 'inhibitor' ||
    target.structureKind === 'inhib_tower' ||
    target.structureKind === 'inner_tower'
  ) {
    return pressured ? 'siege_nexus_towers' : 'shove_lane';
  }
  return 'shove_lane';
}

export function updateCloseoutPlans(state: GameState): void {
  const runtime = getMatchAiRuntime(state);
  const now = state.scheduler.time;
  for (const side of ['blue', 'red'] as const) {
    const target = openCloseoutTarget(state, side);
    if (!target || !isLeading(state, side) || now < CLOSEOUT_START_SEC) {
      runtime.closeoutPlans[side] = null;
      continue;
    }
    const prev = runtime.closeoutPlans[side];
    const stage = stageFor(state, side, target);
    if (prev && prev.expiresAt > now && prev.structureId === target.id) {
      runtime.closeoutPlans[side] = {
        ...prev,
        stage,
        shoveLanes: pickShoveLanes(state, side, target),
        updatedAt: now,
      };
      continue;
    }
    runtime.closeoutPlans[side] = {
      side,
      stage,
      structureId: target.id,
      shoveLanes: pickShoveLanes(state, side, target),
      updatedAt: now,
      expiresAt: now + CLOSEOUT_HOLD_SEC,
    };
  }
}

export function getCloseoutPlan(state: GameState, side: TeamSide): CloseoutPlan | null {
  return getMatchAiRuntime(state).closeoutPlans[side] ?? null;
}

export function isCloseoutActive(state: GameState, side: TeamSide): boolean {
  const plan = getCloseoutPlan(state, side);
  return !!plan && plan.stage !== 'idle' && plan.expiresAt > state.scheduler.time;
}

export function closeoutTargetStructure(
  state: GameState,
  side: TeamSide,
): StructureEntity | null {
  const plan = getCloseoutPlan(state, side);
  if (!plan?.structureId) {
    return null;
  }
  return state.structures.find((item) => item.id === plan.structureId && item.alive) ?? null;
}

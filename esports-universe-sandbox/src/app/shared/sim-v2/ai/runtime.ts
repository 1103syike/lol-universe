import type { LaneId, TeamSide } from '../types/ids';
import type { GameState } from '../state/game-state';
import type { MatchPhase, TeamPlan, UnitAssignment } from './types';

export interface ResetMemory {
  arrivedAt: number;
  mustLeaveAt: number;
  purchaseAttempts: number;
  lastInventorySig: string;
  stalledTicks: number;
}

export interface LaneLease {
  lane: LaneId;
  until: number;
}

export interface IntentStick {
  kind: string;
  until: number;
}

export interface MatchAiRuntime {
  resets: Map<string, ResetMemory>;
  recallLockUntil: Map<string, number>;
  shoveUntil: Map<string, number>;
  laneLeases: Map<string, LaneLease>;
  laneRoamCooldownUntil: Map<string, number>;
  intentStick: Map<string, IntentStick>;
  phases: Record<TeamSide, MatchPhase>;
  teamPlans: Record<TeamSide, TeamPlan | null>;
  assignments: Map<string, UnitAssignment>;
}

export const SHOVE_BEFORE_RECALL_SEC = 14;
export const INTENT_STICK_SEC = 2;
export const LANE_ROAM_COOLDOWN_SEC = 45;
export const LANE_LOCK_UNTIL_SEC = 780;

const runtimes = new WeakMap<GameState, MatchAiRuntime>();

export function getMatchAiRuntime(state: GameState): MatchAiRuntime {
  let runtime = runtimes.get(state);
  if (!runtime) {
    runtime = {
      resets: new Map(),
      recallLockUntil: new Map(),
      shoveUntil: new Map(),
      laneLeases: new Map(),
      laneRoamCooldownUntil: new Map(),
      intentStick: new Map(),
      phases: { blue: 'opening', red: 'opening' },
      teamPlans: { blue: null, red: null },
      assignments: new Map(),
    };
    runtimes.set(state, runtime);
  }
  return runtime;
}

export function inventorySignature(champion: {
  gold: number;
  items: readonly string[];
}): string {
  return `${champion.items.join(',')}|${Math.floor(champion.gold)}`;
}

export function getUnitAssignment(
  state: GameState,
  championId: string,
): UnitAssignment | null {
  return getMatchAiRuntime(state).assignments.get(championId) ?? null;
}

export const DEFEND_ASSIGNEE_CAP = 3;
export const OBJECTIVE_CORE_CAP = 4;
export const BARON_CORE_CAP = 5;
export const SIEGE_CORE_CAP = 3;
export const CLOSEOUT_SIEGE_CORE_CAP = 4;
export const RESET_MAX_BASE_SEC = 12;
export const RESET_STALL_TICKS = 2;
export const RECALL_LOCK_AFTER_LEAVE_SEC = 28;
export const LANE_LEASE_SEC = 24;
export const PLAN_HOLD_SEC = 12;
export const PLAN_OBJECTIVE_SEC = 18;
export const PLAN_SIEGE_SEC = 16;
export const PLAN_CLOSEOUT_SIEGE_SEC = 24;
export const PLAN_DEFEND_SEC = 10;

import type { ReplayRecorder } from '../replay/recorder';
import type { GameState } from '../state/game-state';
import { updateLaneAssignments } from './decision';
import { updatePhases } from './phase-director';
import { planTeamTick } from './team-planner';
import { executeUnitTick } from './unit-executor';

export interface MatchAi {
  runAiTick(state: GameState, recorder?: ReplayRecorder): void;
}

class MatchAiModule implements MatchAi {
  runAiTick(state: GameState, recorder?: ReplayRecorder): void {
    updatePhases(state);
    planTeamTick(state);
    updateLaneAssignments(state);
    const blueFirst = state.rng() < 0.5;
    const order = blueFirst ? [...state.champions] : [...state.champions].reverse();
    for (const champion of order) {
      executeUnitTick(state, champion, recorder);
    }
  }
}

let sharedAi: MatchAi | null = null;

export function createMatchAi(): MatchAi {
  return new MatchAiModule();
}

export function runAiTick(state: GameState, recorder?: ReplayRecorder): void {
  if (!sharedAi) {
    sharedAi = createMatchAi();
  }
  sharedAi.runAiTick(state, recorder);
}

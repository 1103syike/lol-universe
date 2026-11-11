import { beginWaveAssessFrame, endWaveAssessFrame } from '../minion/wave-state';
import { beginChampionProximityFrame } from '../perf/champion-proximity';
import type { ReplayRecorder } from '../replay/recorder';
import type { GameState } from '../state/game-state';
import { updateCloseoutPlans } from './closeout-director';
import { updateLaneAssignments } from './decision';
import { updatePhases } from './phase-director';
import { planTeamTick } from './team-planner';
import { executeUnitTick } from './unit-executor';

export interface MatchAi {
  runAiTick(state: GameState, recorder?: ReplayRecorder): void;
}

class MatchAiModule implements MatchAi {
  runAiTick(state: GameState, recorder?: ReplayRecorder): void {
    beginWaveAssessFrame();
    beginChampionProximityFrame(state);
    try {
      updatePhases(state);
      updateCloseoutPlans(state);
      planTeamTick(state);
      updateLaneAssignments(state);
      const blueFirst = state.rng() < 0.5;
      const champs = state.champions;
      const last = champs.length - 1;
      for (let i = 0; i < champs.length; i += 1) {
        const champion = blueFirst ? champs[i] : champs[last - i];
        executeUnitTick(state, champion, recorder);
      }
    } finally {
      endWaveAssessFrame();
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

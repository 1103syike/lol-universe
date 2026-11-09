import type { ReplayRecorder } from '../replay/recorder';
import type { ChampionEntity } from '../state/entities';
import type { GameState } from '../state/game-state';
import { decideForChampion } from './decision';
import { getUnitAssignment } from './runtime';

export function executeUnitTick(
  state: GameState,
  champion: ChampionEntity,
  recorder?: ReplayRecorder,
): void {
  decideForChampion(state, champion, recorder, getUnitAssignment(state, champion.id));
}

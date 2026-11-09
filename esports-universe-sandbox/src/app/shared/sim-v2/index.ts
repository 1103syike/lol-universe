export { createRng, hashSeed, mulberry32 } from './rng';
export { DiscreteScheduler } from './scheduler/discrete-scheduler';
export { listVersionIds, getVersionPack, lockVersion, registerVersionPack } from './version/registry';
export type {
  VersionPack,
  VersionManifest,
  ChampionIdentity,
  PatchStrengthTable,
} from './version/version-pack';
export { buildChampionIdentity, identityPhasePower } from './version/champion-identity';
export { getPatchStrength, patchMultiplier } from './version/patch-strength';
export { createEmptyGameState } from './state/game-state';
export type { GameState } from './state/game-state';
export {
  findPath,
  dist,
  isWalkable,
  nearestWalkable,
  stitchPath,
  smoothPath,
  hasLineOfSight,
  dashTowardWalkable,
} from './map/pathfinding';
export { orderMove, orderMoveOnLane, pathAlongLane, tickMovement } from './map/movement';
export { createMatch, simulateV2Match } from './engine';
export type { SimulateV2Input, SimulateV2Result } from './engine';
export { toMatchReport } from './adapter/to-match-report';
export { buildV2Input, resolveV2VersionId, toMatchDraftReport } from './adapter/from-legacy-input';
export { ReplayRecorder } from './replay/recorder';
export type { ReplayDocument } from './replay/recorder';
export { runV2MatchAsync } from './worker/sim-worker-client';

export type SimEngineMode = 'v1' | 'v2';

let engineMode: SimEngineMode = 'v2';

export function getSimEngineMode(): SimEngineMode {
  return engineMode;
}

export function setSimEngineMode(mode: SimEngineMode): void {
  engineMode = mode;
}

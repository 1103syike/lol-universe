export { SIM_BALANCE } from './balance';
export { calculateChemistry } from './chemistry';
export {
  explainReason,
  pickBubbleWinnerByProfile,
  simulateGame,
  simulateGameAsync,
  simulateSeries,
} from './match-engine';
export type { MatchSideInput, SimulateGameInput, SimulateSeriesInput, SimulateSeriesResult } from './match-engine';
export { getSimEngineMode, setSimEngineMode } from '../sim-v2';
export type { SimEngineMode } from '../sim-v2';
export { resolveMatchupSwings } from './matchup';
export {
  MATCH_PHASES,
  PHASE_LABELS,
  REASON_LABELS,
  STYLE_AXIS_KEYS,
  STYLE_AXIS_LABELS,
} from './report';
export type {
  MatchDraftReport,
  MatchDraftSideReport,
  MatchEvent,
  MatchEventKind,
  MatchKeyPlayer,
  MatchPhaseId,
  MatchPhaseReport,
  MatchReport,
  MatchTurningPoint,
  PlayerArchetype,
  StyleAxisKey,
  TeamStyleAxes,
  TeamStylePresentation,
} from './report';
export { runClassicDraft, resolveCompIntent } from './draft';
export type { DraftBanEntry, DraftPickEntry, DraftResult } from './draft';
export {
  listPatchVersions,
  resolvePatchMeta,
  resolvePatchVersion,
} from './resolve-patch';
export type {
  FightLane,
  GoldSample,
  GoldSeries,
  KillContext,
  MatchBoxScore,
  MatchMapChampionFrame,
  MatchMapFrame,
  MatchMapMinionFrame,
  MatchMapMonsterFrame,
  MatchMapStructureFrame,
  MatchSimResult,
  PlayerMatchStats,
  TeamMatchStats,
  TimelineEvent,
  TimelineEventType,
  TimelineMarker,
} from './match-stats';
export { buildBoxScore } from './reduce-stats';
export { buildMatchDigest, buildMatchReplayLog, pickMvpVerdict } from './derive-from-box';
export type { MatchReplayLogEntry } from './derive-from-box';
export { assertBoxScore, validateBoxScore } from './invariants';
export { simulateLiveMatch } from './live-match';
export { applyTimelineEvent, applyTimelineEvents } from './apply-event';
export { buildMatchState, modifiersFromMatchups } from './match-state';
export type { MatchLiveModifiers, MatchState } from './match-state';
export { resolveFightDamage } from './damage';
export type { CombatIntensity } from './damage';
export { buildTeamProfile, deriveArchetype, topStyleLabels } from './team-profile';
export type { SimPlayerView, TeamProfile } from './team-profile';
export {
  canOpenNexus,
  createFullSiegeStructures,
  createFullTowerGrid,
  createLaningPresence,
  deriveMapModes,
  maybeApplyRotations,
  gatherForObjective,
  inhibitorsDestroyedCount,
  localesCompatible,
  localeGroup,
  nexusTowersStanding,
} from './map-presence';
export type {
  MapLocale,
  MapModeFlags,
  MapModeId,
  MapTask,
  PlayerPresence,
  SideSiegeStructures,
  SideTowerGrid,
  TowerLaneId,
  RotationDecision,
  RotationPatternId,
} from './map-presence';
export { pickSkirmishParticipantsByPresence } from './damage';
export { plateGoldAt } from './plates';
export { createObjectiveProgress, forceSiegeBreakthrough, maybeEndMatch } from './objectives';
export type { MatchEndProbe, ObjectiveProgress } from './objectives';
export {
  ARCHETYPE_THRESHOLDS,
  MATCH_ARCHETYPE_IDS,
  MATCH_ARCHETYPE_LABELS,
  buildMatchArchetypeMetrics,
  classifyMatchArchetypes,
} from './match-archetype';
export type {
  MatchArchetypeId,
  MatchArchetypeInput,
  MatchArchetypeMetrics,
  MatchArchetypeResult,
  MatchArchetypeTag,
} from './match-archetype';
export {
  aliveViews,
  countAlive,
  isPlayerAlive,
  markPlayerDead,
  respawnDurationAt,
} from './death-state';
export {
  decideObjective,
  methodLabel,
  objectiveKindLabel,
  pickObjectiveMethod,
} from './objective-decision';
export type {
  ContestableObjective,
  ObjectiveDecision,
  ObjectiveDecisionOutcome,
  ObjectiveIntent as DecisionObjectiveIntent,
  SideObjectiveChoice,
} from './objective-decision';
export type { ObjectiveIntent, ObjectiveMethod } from './match-stats';

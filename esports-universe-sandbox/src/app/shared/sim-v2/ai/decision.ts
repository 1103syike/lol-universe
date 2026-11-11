import { combatProfile } from '../champion/combat-profile';
import { CHAMPION_KITS } from '../../../core/data/champion-kits';
import { axis01, championIdentity } from '../champion/identity-runtime';
import { castChampionCombo, hasChampionCombo } from '../combat/combo-cast';
import { basicAttack, castAbility } from '../combat/combat';
import { investAbilityPoints } from '../champion/skill-order';
import {
  castBarrier,
  castCleanse,
  castExhaust,
  castFlash,
  castGhost,
  castHeal,
  castIgnite,
  castTeleport,
  clearTeleportChannel,
  finishTeleportIfReady,
  hasSummoner,
  summonerReady,
} from '../combat/summoner-spells';
import { killOverpace } from '../combat/kill-pace';
import {
  buyAffordableItems,
  canBuyAnyPreferred,
  canFinishPreferredLegendary,
  hasMeaningfulShopBuy,
  nextFocusPurchaseCost,
  nextPendingPurchase,
} from '../economy/economy';
import { resolveShopPreferForChampion } from '../economy/shop-builds';
import {
  jungleFarmAheadAmount,
  jungleFarmBehindAmount,
  jungleFarmPace,
  jungleFarmSlack,
} from '../jungle/jungle-clear-profile';
import {
  nearestFriendlyCamp,
  runJungleClearStep,
  nearestObjectiveCamp,
  isObjectiveSetupWindow,
  objectiveWindowBoost,
} from '../jungle/jungle-system';
import { faceOffLanePoint, humanizeLaneStand } from '../map/lane-stand';
import { orderMove, orderMoveOnLane, orderShortMove } from '../map/movement';
import { dist } from '../map/pathfinding';
import {
  alliedWaveAnchor,
  enemyWaveAnchor,
  minionRawDamageToChampion,
  nearestEnemyMinionOnLane,
  tryLastHit,
  type LastHitMode,
} from '../minion/lane-system';
import {
  assessChampionLaneWave,
  beginWaveAssessFrame,
  endWaveAssessFrame,
  freezeHoldProgress,
  hasLanePriority,
  shouldSlowPush,
  waveNearFreezeSpot,
  waveNeedsShoveForRecall,
  type LaneWaveState,
} from '../minion/wave-state';
import {
  attackStructure,
  BASE_SIEGE_PRESENCE_RANGE,
  canSiege,
  nearestAttackableStructure,
  wavePressuringStructure,
} from '../objectives/structures';
import { getChampionProximity } from '../perf/champion-proximity';
import type { ReplayRecorder } from '../replay/recorder';
import type { ChampionEntity, MonsterEntity, StructureEntity } from '../state/entities';
import type { GameState } from '../state/game-state';
import type { LaneId } from '../types/ids';
import {
  findJungleInvadeThreat,
  invadeVisionRisk,
  knownEnemies,
  maybeActOnVision,
  maybeBuyControlWard,
  recentlySeenEnemyNear,
  teamHasVisionOfPoint,
  teamSeesChampion,
  teamVisionPressure,
  visionCoverScore,
} from '../vision/vision';
import {
  closeoutTargetStructure,
  getCloseoutPlan,
  isCloseoutActive,
} from './closeout-director';
import {
  allySaveUrgency,
  championGankDangerIndex,
  disengageHpBoost,
  hardContactCommitFactor,
  laneDistress,
  laneMatchupRead,
  sameMapHalf,
  shoveCommitFactor,
  standProgressBias,
  tradeCommitFactor,
} from './lane-read';
import {
  enterCommitAllIn,
  enterHoldWave,
  enterLastHit,
  enterResetAggro,
  enterTowerFarm,
  enterTradeWindow,
  getLaningPhase,
  isFarmingLaningPhase,
  isResetAggroPhase,
  refreshLaningPhaseClock,
} from './laning-phase';
import { applyMissionBounds } from './mission-bounds';
import {
  getMatchAiRuntime,
  getUnitAssignment,
  INTENT_STICK_SEC,
  inventorySignature,
  LANE_LEASE_SEC,
  LANE_LOCK_UNTIL_SEC,
  LANE_ROAM_COOLDOWN_SEC,
  RECALL_LOCK_AFTER_LEAVE_SEC,
  RESET_MAX_BASE_SEC,
  RESET_STALL_TICKS,
  SHOVE_BEFORE_RECALL_SEC,
} from './runtime';
import { canChampionDefend } from './team-planner';
import type { UnitAssignment } from './types';

type IntentKind =
  | 'farm'
  | 'trade'
  | 'gank'
  | 'skirmish'
  | 'siege'
  | 'defend'
  | 'objective'
  | 'clear'
  | 'lane'
  | 'swap'
  | 'wave_freeze'
  | 'wave_shove';

const RECALL_CHANNEL_SEC = 8;
const EMPOWERED_RECALL_CHANNEL_SEC = 4;
const RECALL_INTERRUPT_GRACE_SEC = 0.1;

function recallChannelDuration(state: GameState, champion: ChampionEntity): number {
  const team = champion.side === 'blue' ? state.blue : state.red;
  return team.hasBaron ? EMPOWERED_RECALL_CHANNEL_SEC : RECALL_CHANNEL_SEC;
}

function recallInterruptible(state: GameState, champion: ChampionEntity): boolean {
  if (champion.recallPhase !== 'moving_home') {
    return false;
  }
  return champion.recallChannelUntil - state.scheduler.time > RECALL_INTERRUPT_GRACE_SEC;
}

interface ScoredIntent {
  kind: IntentKind;
  score: number;
  enemy?: ChampionEntity;
  minionLane?: 'top' | 'mid' | 'bot';
  camp?: MonsterEntity;
  structure?: StructureEntity;
  coverPoint?: { x: number; y: number };
}

function fountainOf(state: GameState, champion: ChampionEntity) {
  return champion.side === 'blue' ? state.lockedPack.map.blueFountain : state.lockedPack.map.redFountain;
}

function nearestOwnCampAnchor(
  state: GameState,
  champion: ChampionEntity,
): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const camp of state.lockedPack.monsters) {
    if (camp.side !== champion.side) {
      continue;
    }
    if (
      camp.id === 'dragon' ||
      camp.id === 'baron' ||
      camp.id === 'herald' ||
      camp.id.includes('scuttle')
    ) {
      continue;
    }
    const gap = dist(champion.position, camp.position);
    if (gap < bestDist) {
      bestDist = gap;
      best = { ...camp.position };
    }
  }
  return best;
}

function laneIdOf(champion: ChampionEntity): LaneId {
  if (champion.assignedLane) {
    return champion.assignedLane;
  }
  if (champion.positionLabel === 'TOP') {
    return 'top';
  }
  if (champion.positionLabel === 'BOT' || champion.positionLabel === 'SUPPORT') {
    return 'bot';
  }
  return 'mid';
}

function laneProgress(state: GameState, lane: LaneId, point: { x: number; y: number }): number {
  const path = state.lockedPack.map.lanePaths[lane];
  if (!path || path.length === 0) {
    return 0.5;
  }
  let best = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < path.length; i += 1) {
    const gap = dist(path[i], point);
    if (gap < bestDist) {
      bestDist = gap;
      best = i;
    }
  }
  return best / Math.max(1, path.length - 1);
}

function enemiesNearPoint(
  state: GameState,
  side: ChampionEntity['side'],
  point: { x: number; y: number },
  range: number,
): number {
  const prox = getChampionProximity(state);
  return prox.countNearPoint(side, point, range, false);
}

function alliesNearPoint(
  state: GameState,
  side: ChampionEntity['side'],
  point: { x: number; y: number },
  range: number,
): number {
  const prox = getChampionProximity(state);
  return prox.countNearPoint(side, point, range, true);
}

function outerTowerAlive(state: GameState, side: ChampionEntity['side'], lane: LaneId): boolean {
  return state.structures.some(
    (structure) =>
      structure.alive &&
      structure.side === side &&
      structure.lane === lane &&
      structure.structureKind === 'outer_tower',
  );
}

function commitLaneLease(
  state: GameState,
  champion: ChampionEntity,
  lane: LaneId,
  durationSec = LANE_LEASE_SEC,
): void {
  const runtime = getMatchAiRuntime(state);
  const until = state.scheduler.time + durationSec;
  runtime.laneLeases.set(champion.id, { lane, until });
  champion.assignedLane = lane;
}

function maybeUpdateLaneAssignment(state: GameState, champion: ChampionEntity): void {
  if (champion.positionLabel === 'JUNGLE') {
    return;
  }
  if (champion.positionLabel === 'SUPPORT') {
    const partner = state.champions.find(
      (ally) =>
        ally.alive &&
        ally.side === champion.side &&
        ally.positionLabel === 'BOT',
    );
    champion.assignedLane = partner?.assignedLane ?? 'bot';
    return;
  }

  const t = state.scheduler.time;
  const runtime = getMatchAiRuntime(state);
  const identity = championIdentity(state, champion);
  const homeLane: LaneId =
    champion.positionLabel === 'TOP'
      ? 'top'
      : champion.positionLabel === 'BOT'
        ? 'bot'
        : 'mid';
  const crossLane: LaneId =
    homeLane === 'mid' ? 'bot' : homeLane === 'top' ? 'bot' : 'top';
  const assignment = getUnitAssignment(state, champion.id);
  if (assignment?.lane && assignment.expiresAt > t) {
    const onObjectiveOrCloseout =
      assignment.play === 'contest-objective' ||
      assignment.play === 'siege-lane' ||
      assignment.mission === 'setup-objective' ||
      assignment.mission === 'take-objective' ||
      assignment.mission === 'siege' ||
      isCloseoutActive(state, champion.side);
    const earlyHoldHome =
      assignment.play === 'hold-lanes' &&
      t < LANE_LOCK_UNTIL_SEC &&
      assignment.lane !== homeLane &&
      !onObjectiveOrCloseout;
    const coverCrossEarly =
      assignment.mission === 'cover-side' &&
      assignment.lane !== homeLane &&
      t < LANE_LOCK_UNTIL_SEC &&
      (champion.positionLabel === 'BOT' || champion.positionLabel === 'TOP') &&
      !onObjectiveOrCloseout;
    if (earlyHoldHome || coverCrossEarly) {
      commitLaneLease(state, champion, homeLane, LANE_LOCK_UNTIL_SEC - t);
      return;
    }
    commitLaneLease(state, champion, assignment.lane, Math.max(4, assignment.expiresAt - t));
    return;
  }
  const dragon = state.monsters.find(
    (monster) =>
      (monster.campId === 'dragon' || monster.campId === 'elder') && monster.alive,
  );
  const dragonBoost = dragon
    ? objectiveWindowBoost(state, dragon.campId === 'elder' ? 'elder' : 'dragon')
    : 0;
  const roamUseful = (lane: LaneId): boolean => {
    const enemyOnLane = state.champions.some(
      (enemy) =>
        enemy.alive &&
        enemy.side !== champion.side &&
        (enemy.assignedLane ??
          (enemy.positionLabel === 'TOP'
            ? 'top'
            : enemy.positionLabel === 'BOT' || enemy.positionLabel === 'SUPPORT'
              ? 'bot'
              : 'mid')) === lane,
    );
    if (enemyOnLane) {
      return true;
    }
    if (lane === 'bot' && dragonBoost > 0.5) {
      return true;
    }
    return state.minions.some(
      (minion) =>
        minion.alive &&
        minion.side !== champion.side &&
        minion.lane === lane &&
        dist(champion.position, minion.position) < 1600,
    );
  };

  const lease = runtime.laneLeases.get(champion.id);
  if (lease && lease.until > t) {
    if (lease.lane !== homeLane) {
      const age = LANE_LEASE_SEC - (lease.until - t);
      if (age > 8 && !roamUseful(lease.lane)) {
        runtime.laneLeases.delete(champion.id);
        runtime.laneRoamCooldownUntil.set(champion.id, t + LANE_ROAM_COOLDOWN_SEC);
        commitLaneLease(state, champion, homeLane, 36);
        return;
      }
    }
    champion.assignedLane = lease.lane;
    return;
  }

  if (lease && lease.lane !== homeLane && lease.until <= t) {
    runtime.laneRoamCooldownUntil.set(champion.id, t + LANE_ROAM_COOLDOWN_SEC);
  }

  if (t < LANE_LOCK_UNTIL_SEC) {
    commitLaneLease(state, champion, homeLane, LANE_LOCK_UNTIL_SEC - t);
    return;
  }

  const roamCd = runtime.laneRoamCooldownUntil.get(champion.id) ?? 0;
  if (t < roamCd) {
    commitLaneLease(state, champion, homeLane, Math.max(12, roamCd - t));
    return;
  }

  const enemySide = champion.side === 'blue' ? 'red' : 'blue';
  const enemyHomeOuter = outerTowerAlive(state, enemySide, homeLane === 'mid' ? 'mid' : homeLane);
  const enemyCrossOuter = outerTowerAlive(state, enemySide, crossLane);
  const splitPrefer = axis01(identity, 'splitPush') > 0.7 && axis01(identity, 'teamfight') < 0.65;
  const baron = state.monsters.find((monster) => monster.campId === 'baron' && monster.alive);
  const baronBoost = baron ? objectiveWindowBoost(state, 'baron') : 0;
  const team = champion.side === 'blue' ? state.blue : state.red;

  if (t >= 1200 && (team.hasBaron || baronBoost > 0.55)) {
    const siegeLane = (['mid', homeLane, crossLane] as LaneId[]).find((lane) =>
      state.structures.some(
        (structure) =>
          structure.alive &&
          structure.side === enemySide &&
          structure.lane === lane &&
          (structure.structureKind === 'outer_tower' ||
            structure.structureKind === 'inner_tower' ||
            structure.structureKind === 'inhib_tower'),
      ),
    );
    commitLaneLease(state, champion, siegeLane ?? 'mid');
    return;
  }

  if (dragon && dragonBoost > 0.7 && !splitPrefer) {
    if (
      champion.positionLabel === 'BOT' &&
      assignment?.mission !== 'setup-objective' &&
      assignment?.mission !== 'take-objective'
    ) {
      commitLaneLease(state, champion, 'mid');
      return;
    }
    if (
      (champion.positionLabel === 'MID' || champion.positionLabel === 'TOP') &&
      dragonBoost > 0.85 &&
      (assignment?.mission === 'setup-objective' ||
        assignment?.mission === 'take-objective')
    ) {
      commitLaneLease(state, champion, 'bot', 18);
      return;
    }
  }

  if (champion.positionLabel === 'BOT' && t >= 660) {
    commitLaneLease(state, champion, 'mid');
    return;
  }

  if (champion.positionLabel === 'MID') {
    if (t >= 480) {
      const topDistress = laneDistress(state, champion.side, 'top');
      const botDistress = laneDistress(state, champion.side, 'bot');
      const homeWave = assessChampionLaneWave(state, champion, 'mid');
      const homeSafeEnough =
        homeWave.zone !== 'enemy' ||
        homeWave.isCrashingOuter ||
        homeWave.allyAdvantage > 0.45;
      const helpTop =
        homeSafeEnough &&
        topDistress >= 0.36 &&
        topDistress >= botDistress + 0.06 &&
        roamUseful('top');
      const helpBot =
        homeSafeEnough &&
        botDistress >= 0.36 &&
        botDistress >= topDistress + 0.06 &&
        roamUseful('bot');
      if (helpTop || helpBot) {
        const helpLane: LaneId = helpTop ? 'top' : 'bot';
        const distress = helpTop ? topDistress : botDistress;
        commitLaneLease(state, champion, helpLane, 12 + Math.round(distress * 14));
        return;
      }
    }
    if (t > 1500) {
      const pressured = (['mid', 'top', 'bot'] as LaneId[]).find((lane) =>
        state.structures.some(
          (structure) =>
            structure.alive &&
            structure.side === enemySide &&
            structure.lane === lane &&
            state.minions.some(
              (minion) =>
                minion.alive &&
                minion.side === champion.side &&
                minion.lane === lane &&
                dist(minion.position, structure.position) < 900,
            ),
        ),
      );
      commitLaneLease(state, champion, pressured ?? 'mid');
      return;
    }
    commitLaneLease(state, champion, 'mid');
    return;
  }

  if (t >= LANE_LOCK_UNTIL_SEC && t <= 1500) {
    const homeDistress = laneDistress(state, champion.side, homeLane);
    const crossDistress = laneDistress(state, champion.side, crossLane);
    const homeWave = assessChampionLaneWave(state, champion, homeLane);
    const canLeaveHome =
      homeWave.zone !== 'enemy' ||
      homeWave.allyAdvantage > 0.8 ||
      homeDistress <= 0.28;
    if (
      canLeaveHome &&
      crossDistress >= 0.42 &&
      crossDistress >= homeDistress + 0.12 &&
      roamUseful(crossLane)
    ) {
      commitLaneLease(state, champion, crossLane, 12 + Math.round(crossDistress * 12));
      return;
    }
  }

  if (t >= 900 && t <= 1500 && !enemyCrossOuter && enemyHomeOuter && roamUseful(crossLane)) {
    commitLaneLease(state, champion, crossLane, 20);
    return;
  }

  if (
    t >= 960 &&
    t <= 1500 &&
    !splitPrefer &&
    axis01(identity, 'teamfight') > 0.75 &&
    roamUseful(crossLane)
  ) {
    if (!enemyCrossOuter || (dragonBoost > 0.7 && homeLane === 'top')) {
      commitLaneLease(state, champion, crossLane, 18);
      return;
    }
  }

  if (splitPrefer && enemyHomeOuter) {
    commitLaneLease(state, champion, homeLane);
    return;
  }

  if (t > 1500) {
    const pressured = (['mid', homeLane, crossLane] as LaneId[]).find((lane) =>
      state.structures.some(
        (structure) =>
          structure.alive &&
          structure.side === enemySide &&
          structure.lane === lane &&
          state.minions.some(
            (minion) =>
              minion.alive &&
              minion.side === champion.side &&
              minion.lane === lane &&
              dist(minion.position, structure.position) < 900,
          ),
      ),
    );
    commitLaneLease(state, champion, pressured ?? homeLane);
    return;
  }

  commitLaneLease(state, champion, homeLane);
}

export function updateLaneAssignments(state: GameState): void {
  for (const champion of state.champions) {
    if (champion.alive && champion.positionLabel !== 'SUPPORT') {
      maybeUpdateLaneAssignment(state, champion);
    }
  }
  for (const champion of state.champions) {
    if (champion.alive && champion.positionLabel === 'SUPPORT') {
      maybeUpdateLaneAssignment(state, champion);
    }
  }
}

const LANE_MOVE_DEADZONE = 150;
const LANE_MOVE_MICRO = 120;
const LANE_STAND_HOLD_SEC = 1.4;
const LANE_STAND_STICKY_RANGE = 320;
const LANE_STAND_RECENTER = 280;
const LANE_CLICK_STEP = 210;
const LANE_CLICK_STEP_CS = 240;

function stickyLaneStand(
  state: GameState,
  champion: ChampionEntity,
  raw: { x: number; y: number },
): { x: number; y: number } {
  const runtime = getMatchAiRuntime(state);
  const hold = runtime.laneStandHold.get(champion.id);
  const now = state.scheduler.time;
  if (hold && now < hold.until && dist(hold, raw) < LANE_STAND_STICKY_RANGE) {
    return { x: hold.x, y: hold.y };
  }
  const next = { x: raw.x, y: raw.y, until: now + LANE_STAND_HOLD_SEC };
  runtime.laneStandHold.set(champion.id, next);
  return { x: next.x, y: next.y };
}

function moveAlongLane(
  state: GameState,
  champion: ChampionEntity,
  lane: LaneId,
  target: { x: number; y: number },
  recorder?: ReplayRecorder,
): void {
  const safeTarget = clampAwayFromEmptyEnemyTower(state, champion, target);
  const gap = dist(champion.position, safeTarget);
  if (gap < LANE_MOVE_MICRO) {
    return;
  }
  if (gap > 900) {
    if (champion.moving && champion.path.length > 0) {
      const currentEnd = champion.path[champion.path.length - 1];
      if (dist(currentEnd, safeTarget) < LANE_MOVE_DEADZONE) {
        return;
      }
    }
    orderMoveOnLane(state, champion, lane, safeTarget, recorder);
    return;
  }
  orderShortMove(state, champion, safeTarget, LANE_CLICK_STEP, recorder);
}

function clickToward(
  state: GameState,
  champion: ChampionEntity,
  goal: { x: number; y: number },
  recorder?: ReplayRecorder,
  step = LANE_CLICK_STEP,
): void {
  const safe = clampAwayFromEmptyEnemyTower(state, champion, goal);
  orderShortMove(state, champion, safe, step, recorder);
}

function ownOuterProgress(state: GameState, champion: ChampionEntity, lane: LaneId): number {
  const outer = state.structures.find(
    (structure) =>
      structure.alive &&
      structure.side === champion.side &&
      structure.lane === lane &&
      structure.structureKind === 'outer_tower',
  );
  if (!outer) {
    return champion.side === 'blue' ? 0.4 : 0.6;
  }
  return laneProgress(state, lane, outer.position);
}

function laneHoldProgress(state: GameState, champion: ChampionEntity, lane: LaneId): number {
  const outerProgress = ownOuterProgress(state, champion, lane);
  if (champion.side === 'blue') {
    return Math.max(0.22, Math.min(0.5, outerProgress - 0.03));
  }
  return Math.min(0.78, Math.max(0.5, outerProgress + 0.03));
}

function outerWaitProgress(state: GameState, champion: ChampionEntity, lane: LaneId): number {
  const outerProgress = ownOuterProgress(state, champion, lane);
  if (champion.side === 'blue') {
    return Math.min(0.46, Math.max(0.34, outerProgress + 0.04));
  }
  return Math.max(0.54, Math.min(0.66, outerProgress - 0.04));
}

function enemyInnerProgress(state: GameState, champion: ChampionEntity, lane: LaneId): number {
  const enemySide = champion.side === 'blue' ? 'red' : 'blue';
  const inner = state.structures.find(
    (structure) =>
      structure.alive &&
      structure.side === enemySide &&
      structure.lane === lane &&
      structure.structureKind === 'inner_tower',
  );
  if (!inner) {
    return champion.side === 'blue' ? 0.78 : 0.22;
  }
  return laneProgress(state, lane, inner.position);
}

function enemyOuterProgress(state: GameState, champion: ChampionEntity, lane: LaneId): number {
  const enemySide = champion.side === 'blue' ? 'red' : 'blue';
  const outer = state.structures.find(
    (structure) =>
      structure.alive &&
      structure.side === enemySide &&
      structure.lane === lane &&
      structure.structureKind === 'outer_tower',
  );
  if (!outer) {
    return enemyInnerProgress(state, champion, lane);
  }
  return laneProgress(state, lane, outer.position);
}

function laningDeepCap(state: GameState, champion: ChampionEntity, lane: LaneId): number {
  const outer = enemyOuterProgress(state, champion, lane);
  if (state.scheduler.time < 900) {
    if (champion.side === 'blue') {
      return outer - 0.03;
    }
    return outer + 0.03;
  }
  return enemyInnerProgress(state, champion, lane);
}

function standDeepCap(
  state: GameState,
  champion: ChampionEntity,
  lane: LaneId,
  allyProgress: number | null,
): number {
  const base = laningDeepCap(state, champion, lane);
  if (allyProgress === null) {
    return base;
  }
  if (champion.side === 'blue') {
    return Math.max(base, allyProgress + 0.02);
  }
  return Math.min(base, allyProgress - 0.02);
}

function laningWaveAnchor(
  state: GameState,
  champion: ChampionEntity,
  lane: LaneId,
): { x: number; y: number } | null {
  const front = alliedWaveAnchor(state, champion, lane);
  const allies = state.minions.filter(
    (minion) => minion.alive && minion.side === champion.side && minion.lane === lane,
  );
  if (allies.length === 0) {
    return front;
  }
  const enemies = state.minions.filter(
    (minion) => minion.alive && minion.side !== champion.side && minion.lane === lane,
  );
  if (enemies.length === 0) {
    return front;
  }
  let bestAlly = allies[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const ally of allies) {
    for (const enemy of enemies) {
      const gap = dist(ally.position, enemy.position);
      if (gap < bestDist) {
        bestDist = gap;
        bestAlly = ally;
      }
    }
  }
  const clash = { x: bestAlly.position.x, y: bestAlly.position.y };
  if (!front) {
    return clash;
  }
  const frontProgress = laneProgress(state, lane, front);
  const clashProgress = laneProgress(state, lane, clash);
  const frontIsDeeper =
    champion.side === 'blue' ? frontProgress > clashProgress + 0.02 : frontProgress < clashProgress - 0.02;
  return frontIsDeeper ? front : clash;
}

function pointOnLaneProgress(
  state: GameState,
  lane: LaneId,
  progress: number,
): { x: number; y: number } | null {
  const path = state.lockedPack.map.lanePaths[lane];
  if (!path || path.length === 0) {
    return null;
  }
  const clamped = Math.max(0, Math.min(1, progress));
  const index = Math.min(path.length - 1, Math.max(0, Math.round(clamped * (path.length - 1))));
  return path[index] ?? path[0];
}

function clampStandToWave(
  state: GameState,
  champion: ChampionEntity,
  lane: LaneId,
  wavePoint: { x: number; y: number },
  ally: { x: number; y: number } | null,
  hasEnemyWave: boolean,
): { x: number; y: number } {
  const path = state.lockedPack.map.lanePaths[lane];
  if (!path || path.length === 0) {
    return wavePoint;
  }
  let progress = laneProgress(state, lane, wavePoint);
  const allyProgress = ally ? laneProgress(state, lane, ally) : null;
  const wait = outerWaitProgress(state, champion, lane);
  const deepCap = standDeepCap(state, champion, lane, allyProgress);
  const followEnemyOnly = !ally && hasEnemyWave;

  if (!ally && !hasEnemyWave) {
    progress = wait;
  } else if (allyProgress !== null) {
    if (champion.side === 'blue') {
      if (allyProgress < wait) {
        progress = wait;
      } else {
        progress = Math.min(progress, allyProgress + 0.06);
        progress = Math.max(progress, allyProgress - 0.03);
      }
    } else if (allyProgress > wait) {
      progress = wait;
    } else {
      progress = Math.max(progress, allyProgress - 0.06);
      progress = Math.min(progress, allyProgress + 0.03);
    }
  } else if (followEnemyOnly) {
    if (champion.side === 'blue') {
      progress = Math.max(wait, Math.min(deepCap, progress));
    } else {
      progress = Math.min(wait, Math.max(deepCap, progress));
    }
  }

  const bias = standProgressBias(laneMatchupRead(state, champion, lane));
  if (followEnemyOnly) {
    if (champion.side === 'blue') {
      progress = Math.max(wait, Math.min(deepCap, progress + bias));
    } else {
      progress = Math.min(wait, Math.max(deepCap, progress - bias));
    }
  } else if (champion.side === 'blue') {
    progress = Math.max(wait - 0.02, Math.min(deepCap, progress + bias));
  } else {
    progress = Math.min(wait + 0.02, Math.max(deepCap, progress - bias));
  }

  return pointOnLaneProgress(state, lane, progress) ?? wavePoint;
}

function laningStand(
  state: GameState,
  champion: ChampionEntity,
  lane: LaneId,
): { x: number; y: number } {
  const enemy = enemyWaveAnchor(state, champion, lane);
  const ally = laningWaveAnchor(state, champion, lane);
  let wavePoint: { x: number; y: number } | null = null;
  if (ally && enemy) {
    const reach = Math.min(0.55, Math.max(0.28, champion.attackRange / 1100));
    wavePoint = {
      x: ally.x * (1 - reach) + enemy.x * reach,
      y: ally.y * (1 - reach) + enemy.y * reach,
    };
  } else if (ally) {
    wavePoint = { ...ally };
  } else if (enemy) {
    wavePoint = { ...enemy };
  } else {
    const wait = outerWaitProgress(state, champion, lane);
    wavePoint = pointOnLaneProgress(state, lane, wait);
    if (!wavePoint) {
      return fountainOf(state, champion);
    }
  }
  wavePoint = clampStandToWave(state, champion, lane, wavePoint, ally, !!enemy);
  const stand = faceOffLanePoint(state, champion, lane, wavePoint);
  return stickyLaneStand(state, champion, humanizeLaneStand(state, champion, lane, stand));
}

function laneTarget(state: GameState, champion: ChampionEntity) {
  return laningStand(state, champion, laneIdOf(champion));
}

function objectiveLaneAffinity(campId: string, lane: LaneId): number {
  if (campId === 'dragon') {
    return lane === 'bot' ? 1 : lane === 'mid' ? 0.55 : 0.2;
  }
  if (campId === 'herald') {
    return lane === 'top' ? 1 : lane === 'mid' ? 0.5 : 0.15;
  }
  if (campId === 'baron') {
    return lane === 'top' ? 0.9 : lane === 'mid' ? 0.7 : 0.35;
  }
  return 0.25;
}

function objectiveShoveBoost(state: GameState, lane: LaneId): number {
  let best = 0;
  for (const campId of ['dragon', 'herald', 'baron'] as const) {
    const window = objectiveWindowBoost(state, campId);
    if (window <= 0) {
      continue;
    }
    best = Math.max(best, window * objectiveLaneAffinity(campId, lane) * 42);
  }
  return best;
}

function freezeStand(
  state: GameState,
  champion: ChampionEntity,
  lane: LaneId,
  wave: LaneWaveState,
): { x: number; y: number } {
  const progress = freezeHoldProgress(wave, champion.side);
  const point = pointOnLaneProgress(state, lane, progress);
  if (!point) {
    return laningStand(state, champion, lane);
  }
  return stickyLaneStand(
    state,
    champion,
    humanizeLaneStand(
      state,
      champion,
      lane,
      faceOffLanePoint(state, champion, lane, point),
    ),
  );
}

function shoveStand(
  state: GameState,
  champion: ChampionEntity,
  lane: LaneId,
): { x: number; y: number } {
  const enemy = enemyWaveAnchor(state, champion, lane);
  const ally = laningWaveAnchor(state, champion, lane);
  let wavePoint: { x: number; y: number } | null = null;
  if (ally && enemy) {
    const reach = Math.min(0.82, Math.max(0.55, champion.attackRange / 900));
    wavePoint = {
      x: ally.x * (1 - reach) + enemy.x * reach,
      y: ally.y * (1 - reach) + enemy.y * reach,
    };
  } else if (enemy) {
    wavePoint = { ...enemy };
  } else if (ally) {
    wavePoint = { ...ally };
  }
  if (!wavePoint) {
    return laningStand(state, champion, lane);
  }
  wavePoint = clampStandToWave(state, champion, lane, wavePoint, ally, !!enemy);
  return stickyLaneStand(
    state,
    champion,
    humanizeLaneStand(
      state,
      champion,
      lane,
      faceOffLanePoint(state, champion, lane, wavePoint),
    ),
  );
}

function escortSiegeStand(
  state: GameState,
  champion: ChampionEntity,
  structure: StructureEntity,
): { x: number; y: number } {
  const siegeLane = structure.lane ?? laneIdOf(champion);
  const anchor = alliedWaveAnchor(state, champion, siegeLane);
  let point: { x: number; y: number };
  if (anchor) {
    const pull = structure.structureKind === 'outer_tower' ? 0.5 : 0.25;
    point = {
      x: anchor.x * (1 - pull) + structure.position.x * pull,
      y: anchor.y * (1 - pull) + structure.position.y * pull,
    };
  } else {
    point = shoveStand(state, champion, siegeLane);
  }
  return clampAwayFromEmptyEnemyTower(state, champion, point);
}

function isPastAlliedWave(
  state: GameState,
  champion: ChampionEntity,
  lane: LaneId,
  point: { x: number; y: number },
  slack = 0.05,
): boolean {
  if (state.scheduler.time >= 720) {
    return false;
  }
  const ally = laningWaveAnchor(state, champion, lane) ?? alliedWaveAnchor(state, champion, lane);
  const pointProgress = laneProgress(state, lane, point);
  const wait = outerWaitProgress(state, champion, lane);
  if (!ally) {
    const deepCap = laningDeepCap(state, champion, lane);
    if (champion.side === 'blue') {
      return pointProgress > deepCap - 0.06;
    }
    return pointProgress < deepCap + 0.06;
  }
  const allyProgress = laneProgress(state, lane, ally);
  if (champion.side === 'blue') {
    const gate = Math.max(allyProgress, wait);
    return pointProgress > gate + slack;
  }
  const gate = Math.min(allyProgress, wait);
  return pointProgress < gate - slack;
}

function nearestFarmMinion(
  state: GameState,
  champion: ChampionEntity,
  lane: LaneId,
  mode: LastHitMode = 'default',
) {
  const target = nearestEnemyMinionOnLane(state, champion, lane, mode);
  if (!target) {
    return null;
  }
  if (mode === 'shove') {
    return target;
  }
  const gap = dist(champion.position, target.position);
  if (gap <= champion.attackRange + 360) {
    return target;
  }
  if (isPastAlliedWave(state, champion, lane, target.position, 0.1)) {
    return null;
  }
  return target;
}

function shopPrefer(state: GameState, champion: ChampionEntity): string[] {
  const list = resolveShopPreferForChampion(state, champion);
  if (list.length > 0) {
    return list;
  }
  return [
    'DoransShield',
    'DoransBlade',
    'Boots',
    'LongSword',
    'RubyCrystal',
    'Pickaxe',
    'Tunneler',
    'SteraksGage',
    'ClothArmor',
    'PlatedSteelcaps',
  ];
}

function maybeLevel(champion: ChampionEntity): void {
  investAbilityPoints(champion);
}

function castKit(
  state: GameState,
  champion: ChampionEntity,
  enemy: ChampionEntity | MonsterEntity,
  recorder?: ReplayRecorder,
): void {
  if (hasChampionCombo(champion.championId)) {
    castChampionCombo(state, champion, enemy, recorder);
    return;
  }
  if (champion.positionLabel === 'SUPPORT') {
    const partner = state.champions.find(
      (ally) =>
        ally.alive &&
        ally.side === champion.side &&
        ally.positionLabel === 'BOT' &&
        dist(champion.position, ally.position) < 1200,
    );
    if (partner) {
      castAbility(state, champion, 'W', partner, recorder);
      castAbility(state, champion, 'E', partner, recorder);
      if (champion.level >= 6) {
        castAbility(state, champion, 'R', partner, recorder);
      }
    }
    castAbility(state, champion, 'Q', enemy, recorder);
    return;
  }
  castAbility(state, champion, 'Q', enemy, recorder);
  castAbility(state, champion, 'E', enemy, recorder);
  if (champion.positionLabel !== 'BOT' || enemy.kind === 'champion') {
    castAbility(state, champion, 'W', enemy, recorder);
  }
  if (champion.level >= 6) {
    castAbility(state, champion, 'R', enemy, recorder);
  }
}

function coveringEnemyTower(
  state: GameState,
  side: ChampionEntity['side'],
  point: { x: number; y: number },
  margin = 0,
): StructureEntity | null {
  let best: StructureEntity | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const structure of state.structures) {
    if (!structure.alive || structure.side === side || structure.ad <= 0 || structure.range <= 0) {
      continue;
    }
    const d = dist(point, structure.position);
    if (d <= structure.range + margin && d < bestDist) {
      best = structure;
      bestDist = d;
    }
  }
  return best;
}

function underEnemyTower(state: GameState, champion: ChampionEntity): boolean {
  return coveringEnemyTower(state, champion.side, champion.position, 60) != null;
}

function enemyTowerAggroOn(
  state: GameState,
  champion: ChampionEntity,
): StructureEntity | null {
  const now = state.scheduler.time;
  let best: StructureEntity | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const structure of state.structures) {
    if (
      !structure.alive ||
      structure.side === champion.side ||
      structure.ad <= 0 ||
      structure.range <= 0
    ) {
      continue;
    }
    if (structure.aggroTargetId !== champion.id || structure.aggroUntil <= now) {
      continue;
    }
    const d = dist(champion.position, structure.position);
    if (d <= structure.range + 120 && d < bestDist) {
      best = structure;
      bestDist = d;
    }
  }
  return best;
}

function alliedMinionsCoveringTower(
  state: GameState,
  side: ChampionEntity['side'],
  tower: StructureEntity,
  slack = 80,
): boolean {
  let count = 0;
  let hasSiege = false;
  for (const minion of state.minions) {
    if (!minion.alive || minion.side !== side) {
      continue;
    }
    if (dist(minion.position, tower.position) > tower.range + slack) {
      continue;
    }
    count += 1;
    if (minion.role === 'cannon' || minion.role === 'super') {
      hasSiege = true;
    }
  }
  return hasSiege || count >= 2;
}

function alliedMinionPresentUnderTower(
  state: GameState,
  side: ChampionEntity['side'],
  tower: StructureEntity,
  slack = 80,
): boolean {
  for (const minion of state.minions) {
    if (!minion.alive || minion.side !== side) {
      continue;
    }
    if (dist(minion.position, tower.position) <= tower.range + slack) {
      return true;
    }
  }
  return false;
}

const MINION_THREAT_RANGE = 520;
const MINION_CALL_ACQUIRE = 500;
const CAUTIOUS_XP_ANCHOR_RANGE = 1050;

function enemyMinionThreatAt(
  state: GameState,
  side: ChampionEntity['side'],
  point: { x: number; y: number },
  range = MINION_THREAT_RANGE,
): number {
  let count = 0;
  for (const minion of state.minions) {
    if (!minion.alive || minion.side === side) {
      continue;
    }
    if (dist(minion.position, point) <= range) {
      count += 1;
    }
  }
  return count;
}

function estimateTradeMinionRetaliation(
  state: GameState,
  champion: ChampionEntity,
  tradePoint: { x: number; y: number },
): { count: number; expectedDamage: number } {
  let count = 0;
  let raw = 0;
  for (const minion of state.minions) {
    if (!minion.alive || minion.side === champion.side) {
      continue;
    }
    if (dist(minion.position, tradePoint) > MINION_CALL_ACQUIRE) {
      continue;
    }
    count += 1;
    raw += minionRawDamageToChampion(minion);
  }
  const armorFactor = 100 / (100 + Math.max(0, champion.armor));
  const expectedDamage = raw * 0.88 * armorFactor * 2.2;
  return { count, expectedDamage };
}

const MINION_AGGRO_DROP_RANGE = MINION_CALL_ACQUIRE + 100;
const SHORT_TRADE_UNTIL_SEC = 720;

function enemyMinionsAggroingChampion(
  state: GameState,
  champion: ChampionEntity,
): Array<{ position: { x: number; y: number } }> {
  const locked: Array<{ position: { x: number; y: number } }> = [];
  for (const minion of state.minions) {
    if (!minion.alive || minion.side === champion.side) {
      continue;
    }
    if (minion.targetId === champion.id) {
      locked.push(minion);
    }
  }
  return locked;
}

function championHasMinionAggro(state: GameState, champion: ChampionEntity): boolean {
  return enemyMinionsAggroingChampion(state, champion).length > 0;
}

function pointClearsMinionAggro(
  point: { x: number; y: number },
  aggroMinions: Array<{ position: { x: number; y: number } }>,
): boolean {
  for (const minion of aggroMinions) {
    if (dist(point, minion.position) <= MINION_AGGRO_DROP_RANGE) {
      return false;
    }
  }
  return true;
}

function dropMinionAggroPoint(
  state: GameState,
  champion: ChampionEntity,
): { x: number; y: number } {
  const lane = laneIdOf(champion);
  const aggro = enemyMinionsAggroingChampion(state, champion);
  let progress = laneProgress(state, lane, champion.position);
  for (let step = 0; step < 14; step += 1) {
    progress =
      champion.side === 'blue'
        ? Math.max(0.02, progress - 0.03)
        : Math.min(0.98, progress + 0.03);
    const raw = pointOnLaneProgress(state, lane, progress);
    if (!raw) {
      continue;
    }
    const stand = humanizeLaneStand(
      state,
      champion,
      lane,
      faceOffLanePoint(state, champion, lane, raw),
    );
    if (aggro.length === 0 || pointClearsMinionAggro(stand, aggro)) {
      return clampAwayFromEmptyEnemyTower(state, champion, stand);
    }
  }
  return clampAwayFromEmptyEnemyTower(
    state,
    champion,
    softDisengagePos(state, champion, true),
  );
}

function tradePokeRange(champion: ChampionEntity): number {
  return Math.max(champion.attackRange + 80, 580);
}

function isEarlyLaneOpponent(
  state: GameState,
  champion: ChampionEntity,
  enemy: ChampionEntity,
): boolean {
  if (state.scheduler.time >= SHORT_TRADE_UNTIL_SEC) {
    return false;
  }
  if (champion.positionLabel === 'JUNGLE' || enemy.positionLabel === 'JUNGLE') {
    return false;
  }
  if (
    champion.positionLabel !== 'TOP' &&
    champion.positionLabel !== 'MID' &&
    champion.positionLabel !== 'BOT' &&
    champion.positionLabel !== 'SUPPORT'
  ) {
    return false;
  }
  return (
    !!champion.assignedLane &&
    !!enemy.assignedLane &&
    champion.assignedLane === enemy.assignedLane
  );
}

function shouldShortTrade(
  state: GameState,
  champion: ChampionEntity,
  enemy: ChampionEntity,
  canFinish: boolean,
): boolean {
  if (canFinish || isFinishableEnemy(champion, enemy)) {
    return false;
  }
  return isEarlyLaneOpponent(state, champion, enemy);
}

function tradeApproachPoint(
  state: GameState,
  champion: ChampionEntity,
  enemy: ChampionEntity,
): { x: number; y: number } {
  const fountain = fountainOf(state, champion);
  const dx = enemy.position.x - fountain.x;
  const dy = enemy.position.y - fountain.y;
  const len = Math.hypot(dx, dy) || 1;
  const fromOwn = { x: dx / len, y: dy / len };
  let reach = tradePokeRange(champion);
  let point = {
    x: enemy.position.x - fromOwn.x * reach,
    y: enemy.position.y - fromOwn.y * reach,
  };
  for (let guard = 0; guard < 6; guard += 1) {
    const retal = estimateTradeMinionRetaliation(state, champion, point);
    if (retal.count <= 2) {
      break;
    }
    reach += 70;
    point = {
      x: enemy.position.x - fromOwn.x * reach,
      y: enemy.position.y - fromOwn.y * reach,
    };
  }
  return clampAwayFromEmptyEnemyTower(state, champion, point, enemy);
}

function executeShortTrade(
  state: GameState,
  champion: ChampionEntity,
  enemy: ChampionEntity,
  recorder?: ReplayRecorder,
): void {
  if (
    (underEnemyTower(state, champion) || enemyTowerAggroOn(state, champion)) &&
    !canCommitDive(state, champion, enemy)
  ) {
    getMatchAiRuntime(state).intentStick.delete(champion.id);
    orderMove(
      state,
      champion,
      clampAwayFromEmptyEnemyTower(
        state,
        champion,
        softDisengagePos(state, champion, true),
      ),
      recorder,
    );
    noteDecision(state, champion, 'tower_bail', recorder);
    return;
  }

  if (championHasMinionAggro(state, champion) || isResetAggroPhase(getLaningPhase(state, champion.id))) {
    enterResetAggro(state, champion);
    orderMove(state, champion, dropMinionAggroPoint(state, champion), recorder);
    noteDecision(state, champion, 'lane', recorder);
    return;
  }

  const gap = dist(champion.position, enemy.position);
  const pokeRange = tradePokeRange(champion);
  if (gap > pokeRange) {
    enterTradeWindow(state, champion);
    orderMove(state, champion, tradeApproachPoint(state, champion, enemy), recorder);
    noteDecision(state, champion, 'trade', recorder);
    return;
  }

  enterTradeWindow(state, champion);
  castAbility(state, champion, 'Q', enemy, recorder);
  const retal = estimateTradeMinionRetaliation(state, champion, champion.position);
  if (retal.count <= 1 && gap <= champion.attackRange + 25) {
    basicAttack(state, champion, enemy, recorder);
  }
  enterResetAggro(state, champion);
  orderMove(state, champion, dropMinionAggroPoint(state, champion), recorder);
  noteDecision(state, champion, 'trade', recorder);
}

function maybeResetLaneMinionAggro(
  state: GameState,
  champion: ChampionEntity,
  hpRatio: number,
  canFinish: boolean,
  recorder?: ReplayRecorder,
): boolean {
  if (canFinish || !championHasMinionAggro(state, champion)) {
    return false;
  }
  if (champion.positionLabel === 'JUNGLE') {
    return false;
  }
  const laneEnemy = nearestLaneEnemy(state, champion);
  if (
    laneEnemy &&
    isFinishableEnemy(champion, laneEnemy) &&
    canSafelyCommit(state, champion, laneEnemy, hpRatio)
  ) {
    return false;
  }
  const drop = dropMinionAggroPoint(state, champion);
  if (dist(champion.position, drop) < 55) {
    enterHoldWave(state, champion);
    return false;
  }
  getMatchAiRuntime(state).intentStick.delete(champion.id);
  enterResetAggro(state, champion);
  orderMove(state, champion, drop, recorder);
  noteDecision(state, champion, 'lane', recorder);
  return true;
}

function canStayUnderEnemyTower(
  state: GameState,
  champion: ChampionEntity,
  diveEnemy: ChampionEntity | null = null,
): boolean {
  if (enemyTowerAggroOn(state, champion)) {
    return false;
  }
  const tower = coveringEnemyTower(state, champion.side, champion.position, 60);
  if (!tower) {
    return true;
  }
  if (diveEnemy && canCommitDive(state, champion, diveEnemy)) {
    return true;
  }
  return alliedMinionsCoveringTower(state, champion.side, tower);
}

function clampAwayFromEmptyEnemyTower(
  state: GameState,
  champion: ChampionEntity,
  point: { x: number; y: number },
  diveEnemy: ChampionEntity | null = null,
): { x: number; y: number } {
  const aggroTower = enemyTowerAggroOn(state, champion);
  if (aggroTower && dist(point, aggroTower.position) <= aggroTower.range + 40) {
    return holdOutsideTower(aggroTower, point);
  }
  const tower = coveringEnemyTower(state, champion.side, point, 40);
  if (!tower) {
    return point;
  }
  if (diveEnemy && canCommitDive(state, champion, diveEnemy)) {
    return point;
  }
  if (!aggroTower && alliedMinionPresentUnderTower(state, champion.side, tower)) {
    return point;
  }
  return holdOutsideTower(tower, point);
}

function canCommitDive(
  state: GameState,
  champion: ChampionEntity,
  enemy: ChampionEntity,
): boolean {
  const enemyHp = enemy.hp / Math.max(1, enemy.maxHp);
  const allies = alliesNearPoint(state, champion.side, enemy.position, 950);
  const enemies = enemiesNearPoint(state, champion.side, enemy.position, 1050);
  const hpRatio = champion.hp / Math.max(1, champion.maxHp);
  if (hpRatio < 0.62) {
    return false;
  }
  if (enemies >= allies) {
    return false;
  }
  const tower = coveringEnemyTower(state, champion.side, enemy.position, 40);
  if (tower && !alliedMinionsCoveringTower(state, champion.side, tower)) {
    return false;
  }
  const enemyLane =
    enemy.assignedLane ??
    (enemy.positionLabel === 'TOP'
      ? 'top'
      : enemy.positionLabel === 'BOT' || enemy.positionLabel === 'SUPPORT'
        ? 'bot'
        : 'mid');
  const wave = assessChampionLaneWave(state, champion, enemyLane);
  if (allies >= 2 && enemyHp < 0.35 && wave.isCrashingOuter) {
    return true;
  }
  if (allies >= 2 && enemyHp < 0.22) {
    return true;
  }
  return false;
}

function holdOutsideTower(
  structure: StructureEntity,
  toward: { x: number; y: number },
): { x: number; y: number } {
  const dx = toward.x - structure.position.x;
  const dy = toward.y - structure.position.y;
  const len = Math.hypot(dx, dy) || 1;
  const stand = structure.range + 150;
  return {
    x: structure.position.x + (dx / len) * stand,
    y: structure.position.y + (dy / len) * stand,
  };
}

function invadeRisk(
  state: GameState,
  champion: ChampionEntity,
  point: { x: number; y: number },
): number {
  const t = state.scheduler.time;
  let risk = invadeVisionRisk(state, champion, point);
  for (const camp of state.lockedPack.monsters) {
    if (camp.id === 'dragon' || camp.id === 'baron' || camp.id === 'herald') {
      continue;
    }
    if (camp.side === champion.side || camp.side === 'neutral') {
      continue;
    }
    if (dist(point, camp.position) > 1100) {
      continue;
    }
    risk += t < 480 ? 1.2 : 0.7;
  }
  const allies = alliesNearPoint(state, champion.side, point, 1400);
  if (risk > 0 && allies <= 1) {
    risk += 0.8;
  }
  if (risk > 0 && !recentlySeenEnemyNear(state, champion, point) && t < 720) {
    risk += 1.1;
  }
  if (!teamHasVisionOfPoint(state, champion.side, point) && t < 900) {
    risk += 0.65;
  }
  return risk;
}

function threatenedOwnStructure(state: GameState, champion: ChampionEntity): StructureEntity | null {
  let best: StructureEntity | null = null;
  let bestScore = 0;
  const t = state.scheduler.time;
  const homeLane = laneIdOf(champion);
  for (const structure of state.structures) {
    if (!structure.alive || structure.side !== champion.side) {
      continue;
    }
    const enemyMinions = state.minions.filter(
      (minion) =>
        minion.alive &&
        minion.side !== champion.side &&
        dist(minion.position, structure.position) < (structure.range || 750) + 450,
    ).length;
    const enemyChamps = state.champions.filter(
      (enemy) =>
        enemy.alive &&
        enemy.side !== champion.side &&
        dist(enemy.position, structure.position) < 1600,
    ).length;
    if (enemyMinions + enemyChamps <= 0) {
      continue;
    }
    const kindWeight =
      structure.structureKind === 'nexus'
        ? 110
        : structure.structureKind === 'nexus_tower'
          ? 80
          : structure.structureKind === 'inhibitor'
            ? 65
            : structure.structureKind === 'inhib_tower'
              ? 50
              : structure.structureKind === 'inner_tower'
                ? 34
                : structure.structureKind === 'outer_tower'
                  ? 18
                  : 0;
    if (kindWeight <= 0) {
      continue;
    }
    const sameLane = structure.lane && structure.lane === homeLane;
    if (t < 840 && champion.positionLabel !== 'JUNGLE' && structure.lane && !sameLane) {
      if (structure.structureKind === 'outer_tower' && enemyChamps === 0) {
        continue;
      }
      if (structure.structureKind === 'outer_tower' && enemyChamps < 2) {
        continue;
      }
    }
    const laneBonus = sameLane ? 28 : structure.lane === 'mid' ? 8 : -18;
    const score =
      kindWeight +
      enemyMinions * (sameLane || t >= 1200 ? 8 : 3) +
      enemyChamps * 22 +
      laneBonus;
    if (score > bestScore) {
      best = structure;
      bestScore = score;
    }
  }
  return best;
}

function nearestLaneEnemy(state: GameState, champion: ChampionEntity): ChampionEntity | null {
  const lane = laneIdOf(champion);
  let best: ChampionEntity | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const enemy of state.champions) {
    if (!enemy.alive || enemy.side === champion.side) {
      continue;
    }
    if (champion.positionLabel !== 'JUNGLE' && laneIdOf(enemy) !== lane) {
      continue;
    }
    const d = dist(champion.position, enemy.position);
    if (d < bestDist) {
      best = enemy;
      bestDist = d;
    }
  }
  return bestDist <= 2100 ? best : null;
}

const CONTACT_HARD_RANGE = 640;
const CONTACT_SOFT_RANGE = 820;

function nearestVisibleEnemy(
  state: GameState,
  champion: ChampionEntity,
  radius: number,
): { enemy: ChampionEntity; dist: number } | null {
  let best: ChampionEntity | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const enemy of state.champions) {
    if (!enemy.alive || enemy.side === champion.side || enemy.recallPhase === 'at_base') {
      continue;
    }
    const d = dist(champion.position, enemy.position);
    if (d <= radius && d < bestDist) {
      best = enemy;
      bestDist = d;
    }
  }
  return best ? { enemy: best, dist: bestDist } : null;
}

function isFinishableEnemy(champion: ChampionEntity, enemy: ChampionEntity): boolean {
  const enemyHp = enemy.hp / Math.max(1, enemy.maxHp);
  if (enemyHp < 0.22 || enemy.hp < champion.ad * 1.4) {
    return true;
  }
  return enemy.recallPhase === 'moving_home' && enemyHp < 0.48;
}

function nearbyFinishOpportunity(
  state: GameState,
  champion: ChampionEntity,
  radius = CONTACT_SOFT_RANGE,
): { enemy: ChampionEntity; dist: number } | null {
  let best: ChampionEntity | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const enemy of state.champions) {
    if (!enemy.alive || enemy.side === champion.side || enemy.recallPhase === 'at_base') {
      continue;
    }
    if (!isFinishableEnemy(champion, enemy)) {
      continue;
    }
    const d = dist(champion.position, enemy.position);
    if (d <= radius && d < bestDist) {
      best = enemy;
      bestDist = d;
    }
  }
  return best ? { enemy: best, dist: bestDist } : null;
}

function localFightCount(
  state: GameState,
  champion: ChampionEntity,
  radius = 1050,
): { allies: number; enemies: number } {
  return {
    allies: nearbyAllies(state, champion, radius),
    enemies: nearbyEnemies(state, champion, radius),
  };
}

function isLethalDanger(
  state: GameState,
  champion: ChampionEntity,
  hpRatio: number,
): boolean {
  const { allies, enemies } = localFightCount(state, champion);
  if (enemies <= 0) {
    return false;
  }
  const outnumbered = enemies > allies + 1;
  const evenOrWorse = enemies >= allies + 1;
  if (hpRatio < 0.22) {
    return true;
  }
  if (hpRatio < 0.3 && enemies >= 1) {
    return true;
  }
  if (hpRatio < 0.38 && evenOrWorse) {
    return true;
  }
  if (hpRatio < 0.48 && outnumbered) {
    return true;
  }
  if (hpRatio < 0.42 && enemies >= 2 && allies === 0) {
    return true;
  }
  return false;
}

function canSafelyCommit(
  state: GameState,
  champion: ChampionEntity,
  enemy: ChampionEntity,
  hpRatio: number,
): boolean {
  const { allies, enemies } = localFightCount(state, champion);
  const enemyHp = enemy.hp / Math.max(1, enemy.maxHp);
  const finishable = isFinishableEnemy(champion, enemy);
  if (hpRatio >= 0.58) {
    return true;
  }
  if (enemies > allies + 1 && !(finishable && enemyHp < 0.14 && hpRatio > 0.34)) {
    return false;
  }
  if (hpRatio < 0.28) {
    return finishable && enemyHp < 0.12 && allies >= enemies;
  }
  if (hpRatio < 0.4) {
    return finishable && (enemyHp + 0.08 < hpRatio || allies > enemies);
  }
  if (isLethalDanger(state, champion, hpRatio)) {
    return finishable && allies >= enemies && enemyHp < hpRatio;
  }
  return true;
}

function nearbyAllies(state: GameState, champion: ChampionEntity, radius: number): number {
  return getChampionProximity(state).countAllies(champion, radius);
}

function duoPartner(state: GameState, champion: ChampionEntity): ChampionEntity | null {
  if (champion.positionLabel === 'SUPPORT') {
    return (
      state.champions.find(
        (ally) => ally.alive && ally.side === champion.side && ally.positionLabel === 'BOT',
      ) ?? null
    );
  }
  if (champion.positionLabel === 'BOT') {
    return (
      state.champions.find(
        (ally) => ally.alive && ally.side === champion.side && ally.positionLabel === 'SUPPORT',
      ) ?? null
    );
  }
  return null;
}

function nearbyEnemies(state: GameState, champion: ChampionEntity, radius: number): number {
  return getChampionProximity(state).countEnemies(champion, radius);
}

function noteDecision(
  state: GameState,
  champion: ChampionEntity,
  action: string,
  recorder?: ReplayRecorder,
): void {
  champion.currentAction = action;
  recorder?.record(state, {
    type: 'ai_decision',
    actorId: champion.id,
    payload: { action, recallPhase: champion.recallPhase },
  });
}

function fightApproachPoint(
  state: GameState,
  champion: ChampionEntity,
  enemy: ChampionEntity,
): { x: number; y: number } {
  const fountain = fountainOf(state, champion);
  const dx = enemy.position.x - fountain.x;
  const dy = enemy.position.y - fountain.y;
  const len = Math.hypot(dx, dy) || 1;
  const fromOwn = { x: dx / len, y: dy / len };
  const side = { x: -fromOwn.y, y: fromOwn.x };
  const slot =
    champion.positionLabel === 'SUPPORT'
      ? -0.55
      : champion.positionLabel === 'BOT'
        ? 0.25
        : champion.positionLabel === 'TOP'
          ? -0.2
          : 0.1;
  const range = Math.max(champion.attackRange * 0.88, 150);
  let point = {
    x: enemy.position.x - fromOwn.x * range + side.x * slot * 120,
    y: enemy.position.y - fromOwn.y * range + side.y * slot * 120,
  };
  for (const ally of state.champions) {
    if (!ally.alive || ally.id === champion.id || ally.side !== champion.side) {
      continue;
    }
    const gap = dist(point, ally.position);
    if (gap < 180 && gap > 0.1) {
      const push = (180 - gap) * 0.6;
      point = {
        x: point.x + ((point.x - ally.position.x) / gap) * push,
        y: point.y + ((point.y - ally.position.y) / gap) * push,
      };
    }
  }
  const dive = canCommitDive(state, champion, enemy);
  const towerOnPoint = coveringEnemyTower(state, champion.side, point, 40);
  const towerOnEnemy = coveringEnemyTower(state, champion.side, enemy.position, 40);
  const tower = towerOnPoint ?? towerOnEnemy;
  if (tower && !dive) {
    point = holdOutsideTower(tower, enemy.position);
  }
  return clampAwayFromEmptyEnemyTower(state, champion, point, enemy);
}

function fightTarget(
  state: GameState,
  champion: ChampionEntity,
  enemy: ChampionEntity,
  action: string,
  recorder?: ReplayRecorder,
): void {
  const dive = canCommitDive(state, champion, enemy);
  const towerLocked = !!enemyTowerAggroOn(state, champion);
  if ((underEnemyTower(state, champion) || towerLocked) && !dive) {
    getMatchAiRuntime(state).intentStick.delete(champion.id);
    orderMove(
      state,
      champion,
      clampAwayFromEmptyEnemyTower(
        state,
        champion,
        softDisengagePos(state, champion, true),
      ),
      recorder,
    );
    noteDecision(state, champion, 'tower_bail', recorder);
    return;
  }
  if (!canStayUnderEnemyTower(state, champion, enemy)) {
    getMatchAiRuntime(state).intentStick.delete(champion.id);
    orderMove(
      state,
      champion,
      clampAwayFromEmptyEnemyTower(
        state,
        champion,
        softDisengagePos(state, champion, true),
        enemy,
      ),
      recorder,
    );
    noteDecision(state, champion, 'tower_bail', recorder);
    return;
  }
  const enemyTower = coveringEnemyTower(state, champion.side, enemy.position, 40);
  const range = champion.attackRange + 40;
  const gap = dist(champion.position, enemy.position);
  if (enemyTower && !dive && gap > range) {
    const hold = holdOutsideTower(enemyTower, enemy.position);
    orderMove(state, champion, hold, recorder);
    const pokeRange = Math.max(champion.attackRange + 220, 820);
    if (gap <= pokeRange) {
      castKit(state, champion, enemy, recorder);
      if (gap <= champion.attackRange + 90) {
        basicAttack(state, champion, enemy, recorder);
      }
    }
    noteDecision(state, champion, 'fight', recorder);
    return;
  }
  if (gap > range) {
    orderMove(state, champion, fightApproachPoint(state, champion, enemy), recorder);
  } else {
    basicAttack(state, champion, enemy, recorder);
    castKit(state, champion, enemy, recorder);
  }
  noteDecision(state, champion, action, recorder);
}

function isClearingCamp(state: GameState, champion: ChampionEntity): boolean {
  return state.monsters.some(
    (monster) => monster.alive && monster.aggroTargetId === champion.id,
  );
}

function softDisengagePos(state: GameState, champion: ChampionEntity, deep = false) {
  const lane = laneIdOf(champion);
  const path = state.lockedPack.map.lanePaths[lane];
  if (!path || path.length === 0) {
    return fountainOf(state, champion);
  }
  const current = laneProgress(state, lane, champion.position);
  const wait = outerWaitProgress(state, champion, lane);
  const step = deep ? 0.12 : 0.06;
  let retreat =
    champion.side === 'blue'
      ? Math.max(0.02, Math.min(current, wait) - (deep ? 0.1 : 0.04) - step)
      : Math.min(0.98, Math.max(current, wait) + (deep ? 0.1 : 0.04) + step);
  for (let guard = 0; guard < 10; guard += 1) {
    const index = Math.min(path.length - 1, Math.max(0, Math.round(retreat * (path.length - 1))));
    const point = path[index];
    const tower = coveringEnemyTower(state, champion.side, point, 40);
    const minionThreat = enemyMinionThreatAt(state, champion.side, point);
    if (!tower && minionThreat === 0) {
      return humanizeLaneStand(
        state,
        champion,
        lane,
        faceOffLanePoint(state, champion, lane, point),
      );
    }
    retreat =
      champion.side === 'blue'
        ? Math.max(0.02, retreat - 0.04)
        : Math.min(0.98, retreat + 0.04);
  }
  return fountainOf(state, champion);
}

function cautiousXpStand(
  state: GameState,
  champion: ChampionEntity,
  lane: LaneId,
): { x: number; y: number } {
  const anchor =
    laningWaveAnchor(state, champion, lane) ?? alliedWaveAnchor(state, champion, lane);
  if (!anchor) {
    return softDisengagePos(state, champion, false);
  }
  const wait = outerWaitProgress(state, champion, lane);
  let progress = laneProgress(state, lane, anchor);
  progress =
    champion.side === 'blue'
      ? Math.max(wait - 0.02, progress - 0.045)
      : Math.min(wait + 0.02, progress + 0.045);
  let point = pointOnLaneProgress(state, lane, progress) ?? { ...anchor };
  const gap = dist(point, anchor);
  if (gap > CAUTIOUS_XP_ANCHOR_RANGE) {
    const ratio = CAUTIOUS_XP_ANCHOR_RANGE / gap;
    point = {
      x: anchor.x + (point.x - anchor.x) * ratio,
      y: anchor.y + (point.y - anchor.y) * ratio,
    };
  }
  return stickyLaneStand(
    state,
    champion,
    humanizeLaneStand(
      state,
      champion,
      lane,
      faceOffLanePoint(state, champion, lane, point),
    ),
  );
}

function tryDisengage(
  state: GameState,
  champion: ChampionEntity,
  hpRatio: number,
  canFinish: boolean,
  recorder?: ReplayRecorder,
): boolean {
  const contact = nearestVisibleEnemy(state, champion, CONTACT_SOFT_RANGE + 120);
  const laneEnemy = nearestLaneEnemy(state, champion);
  const enemy = contact?.enemy ?? laneEnemy;
  const safeFinish =
    !!enemy && canFinish && canSafelyCommit(state, champion, enemy, hpRatio);
  if (safeFinish && hpRatio > 0.38) {
    return false;
  }
  const enemyNear =
    (!!contact && contact.dist < 1100) ||
    (!!laneEnemy && dist(champion.position, laneEnemy.position) < 1100);
  const inFight =
    champion.currentAction === 'fight' ||
    champion.currentAction === 'trade' ||
    champion.currentAction === 'gank' ||
    champion.currentAction === 'skirmish';
  const { allies, enemies } = localFightCount(state, champion, 1200);
  const outnumbered = enemies > allies + 1;
  const towerThreat = !canStayUnderEnemyTower(state, champion, enemy);
  const profile = combatProfile(state, champion);
  const enemyHp = enemy ? enemy.hp / Math.max(1, enemy.maxHp) : 1;
  const winning = !!enemy && enemyHp < hpRatio - 0.12;
  const laneRead = laneMatchupRead(state, champion);
  const leaveHp =
    (winning
      ? profile.disengageHp - 0.04 * profile.allInAppetite
      : profile.disengageHp + 0.06) + disengageHpBoost(laneRead);
  const supportEarly =
    champion.positionLabel === 'SUPPORT' && state.scheduler.time < 360;
  const supportAlone =
    champion.positionLabel === 'SUPPORT' &&
    allies === 0 &&
    enemyNear;
  const softCrushed = laneRead.deficit >= 0.42;
  const softDoomed = laneRead.deficit >= 0.72;
  const lethal = isLethalDanger(state, champion, hpRatio);
  const lane = laneIdOf(champion);
  const minionThreat = enemyMinionThreatAt(state, champion.side, champion.position);
  const allyWaveCover = state.minions.some(
    (minion) =>
      minion.alive &&
      minion.side === champion.side &&
      minion.lane === lane &&
      dist(minion.position, champion.position) <= 520,
  );
  const overextendedIntoWave =
    isPastAlliedWave(state, champion, lane, champion.position, 0.02) && !allyWaveCover;
  const minionPressure =
    overextendedIntoWave &&
    (minionThreat >= 3 || (minionThreat >= 2 && hpRatio < 0.55) || (minionThreat >= 1 && hpRatio < 0.32));
  const shouldLeave =
    lethal ||
    towerThreat ||
    (minionPressure && hpRatio < leaveHp + 0.08) ||
    ((enemyNear || inFight || outnumbered || supportAlone || minionPressure) &&
      ((!safeFinish && hpRatio < leaveHp) ||
        (!safeFinish && outnumbered) ||
        (hpRatio < 0.42 && !winning) ||
        (hpRatio < 0.34 && !safeFinish) ||
        (supportEarly && hpRatio < 0.72 && enemyNear) ||
        (supportAlone && hpRatio < 0.85) ||
        (!safeFinish && softCrushed && enemyNear && hpRatio < 0.82 + laneRead.deficit * 0.08) ||
        (!safeFinish && softDoomed && enemyNear) ||
        (minionPressure && hpRatio < 0.55)));
  if (!shouldLeave) {
    return false;
  }
  const deep =
    lethal ||
    hpRatio < 0.34 ||
    outnumbered ||
    towerThreat ||
    underEnemyTower(state, champion) ||
    softDoomed ||
    (softCrushed && (hpRatio < 0.45 || minionPressure || laneRead.expose >= 0.7)) ||
    (laneRead.expose >= 0.62 && hpRatio < 0.5) ||
    minionPressure;
  const retreatPos = deep
    ? softDisengagePos(state, champion, true)
    : softCrushed || softDoomed
      ? cautiousXpStand(state, champion, lane)
      : softDisengagePos(state, champion, false);
  getMatchAiRuntime(state).intentStick.delete(champion.id);
  moveAlongLane(state, champion, lane, retreatPos, recorder);
  noteDecision(state, champion, 'retreat', recorder);
  return true;
}

function isNexusSiegeStructure(structure: StructureEntity): boolean {
  return structure.structureKind === 'nexus';
}

function committedNexusSiege(
  state: GameState,
  champion: ChampionEntity,
): StructureEntity | null {
  const assignment = getUnitAssignment(state, champion.id);
  if (assignment?.mission === 'siege' && assignment.targetId) {
    const assigned = state.structures.find((item) => item.id === assignment.targetId);
    if (
      assigned?.alive &&
      isNexusSiegeStructure(assigned) &&
      canSiege(state, assigned)
    ) {
      return assigned;
    }
  }
  let best: StructureEntity | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const structure of state.structures) {
    if (
      !structure.alive ||
      structure.side === champion.side ||
      !isNexusSiegeStructure(structure) ||
      !canSiege(state, structure)
    ) {
      continue;
    }
    if (!wavePressuringStructure(state, champion.side, structure)) {
      continue;
    }
    const d = dist(champion.position, structure.position);
    if (d < BASE_SIEGE_PRESENCE_RANGE + 350 && d < bestDist) {
      best = structure;
      bestDist = d;
    }
  }
  return best;
}

function recallSpotDangerous(
  state: GameState,
  champion: ChampionEntity,
  point: { x: number; y: number } = champion.position,
): boolean {
  if (coveringEnemyTower(state, champion.side, point, 60)) {
    return true;
  }
  if (enemyMinionThreatAt(state, champion.side, point) > 0) {
    return true;
  }
  const enemies = state.champions.filter(
    (enemy) =>
      enemy.alive &&
      enemy.side !== champion.side &&
      dist(enemy.position, point) < 850,
  ).length;
  const allies = state.champions.filter(
    (ally) =>
      ally.alive &&
      ally.side === champion.side &&
      ally.id !== champion.id &&
      dist(ally.position, point) < 750,
  ).length;
  if (enemies >= 2) {
    return true;
  }
  if (enemies >= 1 && allies === 0 && dist(point, champion.position) < 40) {
    return true;
  }
  const lane = laneIdOf(champion);
  const progress = laneProgress(state, lane, point);
  const wait = outerWaitProgress(state, champion, lane);
  if (champion.side === 'blue') {
    return progress > wait + 0.04;
  }
  return progress < wait - 0.04;
}

function safeRecallPos(state: GameState, champion: ChampionEntity) {
  const lane = laneIdOf(champion);
  const path = state.lockedPack.map.lanePaths[lane];
  if (!path || path.length === 0) {
    return fountainOf(state, champion);
  }
  const current = laneProgress(state, lane, champion.position);
  const wait = outerWaitProgress(state, champion, lane);
  let pocket =
    champion.side === 'blue'
      ? Math.min(current, Math.max(0.03, wait - 0.08))
      : Math.max(current, Math.min(0.97, wait + 0.08));
  for (let guard = 0; guard < 14; guard += 1) {
    const index = Math.min(path.length - 1, Math.max(0, Math.round(pocket * (path.length - 1))));
    const point = path[index];
    if (!recallSpotDangerous(state, champion, point)) {
      return humanizeLaneStand(
        state,
        champion,
        lane,
        faceOffLanePoint(state, champion, lane, point),
      );
    }
    pocket =
      champion.side === 'blue'
        ? Math.max(0.02, pocket - 0.045)
        : Math.min(0.98, pocket + 0.045);
  }
  return fountainOf(state, champion);
}

function beginRecallIfSafe(
  state: GameState,
  champion: ChampionEntity,
  recorder?: ReplayRecorder,
): boolean {
  if (recallSpotDangerous(state, champion)) {
    getMatchAiRuntime(state).intentStick.delete(champion.id);
    moveAlongLane(
      state,
      champion,
      laneIdOf(champion),
      safeRecallPos(state, champion),
      recorder,
    );
    noteDecision(state, champion, 'retreat', recorder);
    return true;
  }
  const safe = safeRecallPos(state, champion);
  if (dist(champion.position, safe) > 220) {
    getMatchAiRuntime(state).intentStick.delete(champion.id);
    moveAlongLane(state, champion, laneIdOf(champion), safe, recorder);
    noteDecision(state, champion, 'retreat', recorder);
    return true;
  }
  startRecall(state, champion, recorder);
  return true;
}

function wantsRecall(
  state: GameState,
  champion: ChampionEntity,
  hpRatio: number,
  canFinish: boolean,
  winningTrade: boolean,
): boolean {
  const runtime = getMatchAiRuntime(state);
  const lockUntil = runtime.recallLockUntil.get(champion.id) ?? 0;
  if (state.scheduler.time < lockUntil && hpRatio > 0.34) {
    return false;
  }
  if (dist(champion.position, fountainOf(state, champion)) <= 700) {
    return false;
  }
  if (champion.recallCount > 3 + Math.floor(state.scheduler.time / 210) && hpRatio > 0.28) {
    return false;
  }
  if (committedNexusSiege(state, champion) && hpRatio > 0.24) {
    return false;
  }
  if (isCloseoutActive(state, champion.side) && hpRatio > 0.28) {
    return false;
  }
  const objBoost = Math.max(
    objectiveWindowBoost(state, 'dragon'),
    objectiveWindowBoost(state, 'baron'),
    objectiveWindowBoost(state, 'herald'),
  );
  if (objBoost >= 0.9 && hpRatio > 0.42 && champion.positionLabel !== 'JUNGLE') {
    return false;
  }
  const enemyDead = state.champions.filter(
    (enemy) => enemy.side !== champion.side && !enemy.alive,
  ).length;
  const assignmentNow = getUnitAssignment(state, champion.id);
  if (
    enemyDead >= 2 &&
    hpRatio > 0.38 &&
    (assignmentNow?.mission === 'siege' ||
      assignmentNow?.mission === 'setup-objective' ||
      assignmentNow?.mission === 'take-objective' ||
      assignmentNow?.play === 'siege-lane' ||
      assignmentNow?.play === 'contest-objective')
  ) {
    return false;
  }
  if (canFinish && hpRatio > 0.34) {
    return false;
  }
  if (isClearingCamp(state, champion) && hpRatio > 0.22) {
    return false;
  }

  const dangerous = recallSpotDangerous(state, champion);
  const lane = laneIdOf(champion);
  const wave = assessChampionLaneWave(state, champion, lane);
  const waveOk = !waveNeedsShoveForRecall(wave);

  if (hpRatio < 0.34 && !winningTrade) {
    return true;
  }

  if (hpRatio < 0.4 && !winningTrade && !canFinish && !dangerous) {
    return true;
  }

  const laneEnemy = nearestLaneEnemy(state, champion);
  const opponentBase =
    !!laneEnemy &&
    (laneEnemy.recallPhase === 'moving_home' ||
      laneEnemy.recallPhase === 'at_base' ||
      !laneEnemy.alive);
  const waveCrashed = wave.isCrashingOuter || wave.zone === 'enemy';
  if (
    opponentBase &&
    waveOk &&
    !winningTrade &&
    !canFinish &&
    !dangerous &&
    hpRatio < 0.72 &&
    champion.positionLabel !== 'JUNGLE'
  ) {
    return true;
  }
  if (
    waveCrashed &&
    waveOk &&
    !winningTrade &&
    !canFinish &&
    !dangerous &&
    hpRatio < 0.52 &&
    champion.positionLabel !== 'JUNGLE' &&
    (!laneEnemy || dist(champion.position, laneEnemy.position) > 1100)
  ) {
    return true;
  }

  const prefer = shopPrefer(state, champion);
  const pending = nextPendingPurchase(state, champion, prefer);
  const shopSpend = nextFocusPurchaseCost(state, champion, prefer);
  const meaningful = hasMeaningfulShopBuy(state, champion, prefer);
  const urgentShop =
    meaningful &&
    (champion.gold >= 2800 ||
      shopSpend >= 1400 ||
      canFinishPreferredLegendary(state, champion, prefer));

  if (
    pending &&
    pending.deficit > 0 &&
    pending.deficit <= 220 &&
    hpRatio > 0.4 &&
    !winningTrade &&
    !urgentShop
  ) {
    return false;
  }

  if (!waveOk && hpRatio > 0.42 && !urgentShop && !(meaningful && shopSpend >= 1400)) {
    return false;
  }

  if (
    dangerous &&
    !urgentShop &&
    !(meaningful && champion.gold >= 2000)
  ) {
    return false;
  }

  if (champion.recallCount > 3 + Math.floor(state.scheduler.time / 210) && hpRatio > 0.32 && !urgentShop) {
    return false;
  }

  if (canFinishPreferredLegendary(state, champion, prefer) && !canFinish && (waveOk || urgentShop)) {
    return true;
  }
  if (shopSpend >= 1200 && meaningful && !winningTrade && !canFinish && (waveOk || hpRatio < 0.5 || urgentShop)) {
    return true;
  }
  if (meaningful && hpRatio < 0.42 && !winningTrade && champion.positionLabel !== 'JUNGLE') {
    return true;
  }
  if (champion.positionLabel === 'JUNGLE') {
    const campUp = nearestFriendlyCamp(state, champion);
    const clearingNow = isClearingCamp(state, champion) || (!!campUp && dist(champion.position, campUp.position) < 750);
    if (clearingNow && hpRatio > 0.34 && champion.gold < 2800 && !urgentShop) {
      return false;
    }
    if (!winningTrade && meaningful && champion.gold >= 1500 && hpRatio < 0.48) {
      return true;
    }
    if (meaningful && champion.gold >= 2000 && shopSpend >= 1300 && !clearingNow) {
      return true;
    }
    if (meaningful && champion.gold >= 2800) {
      return true;
    }
    return false;
  }
  if (champion.positionLabel === 'SUPPORT') {
    if (!winningTrade && meaningful && champion.gold >= 1100 && (hpRatio < 0.48 || urgentShop) && (waveOk || urgentShop)) {
      return true;
    }
    if (meaningful && champion.gold >= 1600 && (shopSpend >= 900 || urgentShop) && (waveOk || urgentShop)) {
      return true;
    }
    return false;
  }
  if (!winningTrade && meaningful && champion.gold >= 1500 && (hpRatio < 0.55 || urgentShop) && (waveOk || urgentShop)) {
    return true;
  }
  if (meaningful && champion.gold >= 2000 && (waveOk || urgentShop)) {
    return true;
  }
  return false;
}

function cancelRecall(champion: ChampionEntity): void {
  clearTeleportChannel(champion);
  champion.recallPhase = 'none';
  champion.recallChannelUntil = 0;
  champion.recallChannelDuration = 0;
  champion.recallHpSnapshot = 0;
  if (champion.currentAction === 'recall' || champion.currentAction === 'teleport') {
    champion.currentAction = 'idle';
  }
}

function bestTeleportDestination(
  state: GameState,
  champion: ChampionEntity,
): { x: number; y: number } | null {
  const assignment = getUnitAssignment(state, champion.id);
  const objectiveCamp =
    (assignment?.targetCampId
      ? state.monsters.find(
          (monster) =>
            monster.alive &&
            (monster.campId === assignment.targetCampId ||
              monster.id === assignment.targetId),
        )
      : null) ??
    state.monsters.find(
      (monster) =>
        monster.alive &&
        (monster.campId === 'dragon' ||
          monster.campId === 'elder' ||
          monster.campId === 'baron') &&
        isObjectiveSetupWindow(state, monster.campId),
    ) ??
    null;
  if (
    objectiveCamp &&
    (assignment?.mission === 'setup-objective' ||
      assignment?.mission === 'take-objective' ||
      assignment?.play === 'contest-objective' ||
      assignment?.play === 'defend-base')
  ) {
    const allyNearCamp = state.champions.find(
      (ally) =>
        ally.alive &&
        ally.side === champion.side &&
        ally.id !== champion.id &&
        dist(ally.position, objectiveCamp.position) < 2200,
    );
    if (allyNearCamp) {
      return { ...allyNearCamp.position };
    }
    const wardTower = state.structures.find(
      (structure) =>
        structure.alive &&
        structure.side === champion.side &&
        dist(structure.position, objectiveCamp.position) < 3200,
    );
    if (wardTower) {
      return { ...wardTower.position };
    }
    return { ...objectiveCamp.position };
  }
  if (assignment?.targetId) {
    const structure = state.structures.find((item) => item.id === assignment.targetId);
    if (structure?.alive) {
      return { ...structure.position };
    }
  }
  const lane = assignment?.lane ?? laneIdOf(champion);
  const allyOuter = state.structures.find(
    (structure) =>
      structure.alive &&
      structure.side === champion.side &&
      structure.lane === lane &&
      (structure.structureKind === 'outer_tower' ||
        structure.structureKind === 'inner_tower'),
  );
  if (allyOuter) {
    return { ...allyOuter.position };
  }
  const allyMinion = state.minions
    .filter((minion) => minion.alive && minion.side === champion.side && minion.lane === lane)
    .sort(
      (left, right) =>
        dist(champion.position, left.position) - dist(champion.position, right.position),
    )[0];
  return allyMinion ? { ...allyMinion.position } : null;
}

function maybeUseSummoners(
  state: GameState,
  champion: ChampionEntity,
  hpRatio: number,
  recorder?: ReplayRecorder,
): boolean {
  const enemy = nearestLaneEnemy(state, champion);
  const enemyCount = nearbyEnemies(state, champion, 900);
  const stunned = champion.statuses.some((status) => status.kind === 'stun');

  if (stunned && hasSummoner(champion, 'Cleanse') && summonerReady(state, champion, 'Cleanse')) {
    return castCleanse(state, champion, recorder);
  }

  if (
    hpRatio < 0.28 &&
    enemyCount >= 1 &&
    hasSummoner(champion, 'Barrier') &&
    summonerReady(state, champion, 'Barrier')
  ) {
    return castBarrier(state, champion, recorder);
  }

  if (
    hpRatio < 0.32 &&
    enemyCount >= 1 &&
    hasSummoner(champion, 'Heal') &&
    summonerReady(state, champion, 'Heal')
  ) {
    return castHeal(state, champion, recorder);
  }

  if (
    enemy &&
    enemy.hp / Math.max(1, enemy.maxHp) < 0.28 &&
    dist(champion.position, enemy.position) < 580 &&
    hasSummoner(champion, 'Ignite') &&
    summonerReady(state, champion, 'Ignite')
  ) {
    return castIgnite(state, champion, enemy, recorder);
  }

  if (
    enemy &&
    enemyCount >= 1 &&
    (champion.positionLabel === 'SUPPORT' || champion.positionLabel === 'MID') &&
    enemy.hp / Math.max(1, enemy.maxHp) < 0.55 &&
    hasSummoner(champion, 'Exhaust') &&
    summonerReady(state, champion, 'Exhaust')
  ) {
    return castExhaust(state, champion, enemy, recorder);
  }

  if (
    hasSummoner(champion, 'Flash') &&
    summonerReady(state, champion, 'Flash')
  ) {
    const fountain = fountainOf(state, champion);
    const lethal = isLethalDanger(state, champion, hpRatio);
    const escapeFlash =
      (hpRatio < 0.35 && enemyCount >= 2) ||
      (hpRatio < 0.28 && enemyCount >= 1) ||
      (lethal && enemyCount >= 1 && hpRatio < 0.42);
    if (escapeFlash) {
      return castFlash(state, champion, fountain, recorder);
    }
  }

  if (
    enemy &&
    !hasChampionCombo(champion.championId) &&
    enemy.hp / Math.max(1, enemy.maxHp) < 0.22 &&
    dist(champion.position, enemy.position) < 720 &&
    dist(champion.position, enemy.position) > champion.attackRange + 80 &&
    hasSummoner(champion, 'Flash') &&
    summonerReady(state, champion, 'Flash')
  ) {
    return castFlash(state, champion, enemy.position, recorder);
  }

  if (
    (enemyCount >= 2 || hpRatio < 0.4) &&
    hasSummoner(champion, 'Ghost') &&
    summonerReady(state, champion, 'Ghost')
  ) {
    return castGhost(state, champion, recorder);
  }

  if (
    (champion.positionLabel === 'TOP' || champion.positionLabel === 'MID') &&
    state.scheduler.time >= 480 &&
    hasSummoner(champion, 'Teleport') &&
    summonerReady(state, champion, 'Teleport')
  ) {
    const dest = bestTeleportDestination(state, champion);
    const assignment = getUnitAssignment(state, champion.id);
    const setupOpen = state.monsters.some(
      (monster) =>
        monster.alive &&
        (monster.campId === 'dragon' ||
          monster.campId === 'elder' ||
          monster.campId === 'baron') &&
        isObjectiveSetupWindow(state, monster.campId),
    );
    const wantRotate =
      assignment?.mission === 'setup-objective' ||
      assignment?.mission === 'take-objective' ||
      assignment?.play === 'defend-base' ||
      (assignment?.play === 'contest-objective' && setupOpen) ||
      (assignment?.mission === 'cover-side' && setupOpen);
    if (dest && wantRotate && dist(champion.position, dest) > 2800) {
      return castTeleport(state, champion, dest, recorder);
    }
  }

  return false;
}

function handleRecallFlow(
  state: GameState,
  champion: ChampionEntity,
  recorder?: ReplayRecorder,
): boolean {
  if (champion.currentAction === 'teleport' || champion.teleportDestination) {
    if (finishTeleportIfReady(state, champion, recorder)) {
      return true;
    }
  }

  const fountain = fountainOf(state, champion);
  const atFountain = dist(champion.position, fountain) < 520;

  if (champion.recallPhase === 'moving_home') {
    if (atFountain) {
      clearTeleportChannel(champion);
      champion.recallPhase = 'at_base';
      champion.moving = false;
      champion.path = [];
      champion.recallChannelUntil = 0;
      champion.recallChannelDuration = 0;
      noteDecision(state, champion, 'recall', recorder);
      return true;
    }
    if (recallSpotDangerous(state, champion)) {
      cancelRecall(champion);
      getMatchAiRuntime(state).intentStick.delete(champion.id);
      moveAlongLane(
        state,
        champion,
        laneIdOf(champion),
        safeRecallPos(state, champion),
        recorder,
      );
      noteDecision(state, champion, 'retreat', recorder);
      return true;
    }
    if (
      recallInterruptible(state, champion) &&
      champion.hp + 0.5 < champion.recallHpSnapshot
    ) {
      cancelRecall(champion);
      getMatchAiRuntime(state).intentStick.delete(champion.id);
      moveAlongLane(
        state,
        champion,
        laneIdOf(champion),
        safeRecallPos(state, champion),
        recorder,
      );
      noteDecision(state, champion, 'retreat', recorder);
      return true;
    }
    if (champion.moving || champion.path.length > 0) {
      champion.moving = false;
      champion.path = [];
    }
    if (state.scheduler.time >= champion.recallChannelUntil) {
      clearTeleportChannel(champion);
      champion.position = { ...fountain };
      champion.moving = false;
      champion.path = [];
      champion.recallPhase = 'at_base';
      champion.recallChannelUntil = 0;
      champion.recallChannelDuration = 0;
      champion.currentAction = 'recall';
      recorder?.record(state, {
        type: 'respawn',
        actorId: champion.id,
        x: fountain.x,
        y: fountain.y,
        payload: { reason: 'recall' },
      });
    }
    noteDecision(state, champion, 'recall', recorder);
    return true;
  }

  if (champion.recallPhase === 'at_base') {
    if (!atFountain) {
      champion.position = { ...fountain };
      champion.moving = false;
      champion.path = [];
    }
    champion.hp = Math.min(champion.maxHp, Math.max(champion.hp, champion.maxHp * 0.95));
    if (champion.maxMana > 1) {
      champion.mana = Math.min(champion.maxMana, Math.max(champion.mana, champion.maxMana * 0.95));
    }

    const runtime = getMatchAiRuntime(state);
    const now = state.scheduler.time;
    let reset = runtime.resets.get(champion.id);
    if (!reset) {
      reset = {
        arrivedAt: now,
        mustLeaveAt: now + RESET_MAX_BASE_SEC,
        purchaseAttempts: 0,
        lastInventorySig: inventorySignature(champion),
        stalledTicks: 0,
      };
      runtime.resets.set(champion.id, reset);
    }

    const prefer = shopPrefer(state, champion);
    const beforeSig = inventorySignature(champion);
    buyAffordableItems(state, champion, prefer, recorder);
    maybeBuyControlWard(state, champion, recorder);
    reset.purchaseAttempts += 1;
    const afterSig = inventorySignature(champion);
    if (afterSig === beforeSig) {
      reset.stalledTicks += 1;
    } else {
      reset.stalledTicks = 0;
      reset.lastInventorySig = afterSig;
    }

    const stillBuying = canBuyAnyPreferred(state, champion, shopPrefer(state, champion));
    const mustLeave =
      now >= reset.mustLeaveAt ||
      reset.stalledTicks >= RESET_STALL_TICKS ||
      reset.purchaseAttempts >= 10 ||
      !(stillBuying && champion.gold >= 300);

    if (!mustLeave) {
      noteDecision(state, champion, 'recall', recorder);
      return true;
    }

    runtime.resets.delete(champion.id);
    runtime.recallLockUntil.set(champion.id, now + RECALL_LOCK_AFTER_LEAVE_SEC);
    cancelRecall(champion);
    const homeLane: LaneId =
      champion.positionLabel === 'TOP'
        ? 'top'
        : champion.positionLabel === 'BOT' || champion.positionLabel === 'SUPPORT'
          ? 'bot'
          : champion.positionLabel === 'MID'
            ? 'mid'
            : laneIdOf(champion);
    if (champion.positionLabel !== 'JUNGLE') {
      commitLaneLease(state, champion, homeLane, 48);
    }
    return false;
  }

  return false;
}

function startRecall(
  state: GameState,
  champion: ChampionEntity,
  recorder?: ReplayRecorder,
): void {
  if (champion.recallPhase === 'none') {
    champion.recallCount += 1;
  }
  const duration = recallChannelDuration(state, champion);
  champion.moving = false;
  champion.path = [];
  champion.recallPhase = 'moving_home';
  champion.recallChannelDuration = duration;
  champion.recallChannelUntil = state.scheduler.time + duration;
  champion.recallHpSnapshot = champion.hp;
  champion.currentAction = 'recall';
  noteDecision(state, champion, 'recall', recorder);
}

function scoreIntents(
  state: GameState,
  champion: ChampionEntity,
  hpRatio: number,
): ScoredIntent[] {
  const intents: ScoredIntent[] = [];
  const identity = championIdentity(state, champion);
  const laning = champion.skills.laning / 100;
  const sense = champion.skills.gameSense / 100;
  const teamfight = champion.skills.teamfighting / 100;
  const idLaning = axis01(identity, 'laning');
  const idSkirmish = axis01(identity, 'skirmish');
  const idTeamfight = axis01(identity, 'teamfight');
  const idCloseout = axis01(identity, 'closeout');
  const idGank = axis01(identity, 'gankThreat');
  const idObjective = axis01(identity, 'objective');
  const idSplit = axis01(identity, 'splitPush');
  const t = state.scheduler.time;
  const laneEnemy = nearestLaneEnemy(state, champion);
  const allies = nearbyAllies(state, champion, 1100);
  const enemiesNear = nearbyEnemies(state, champion, 1100);
  const matchup = laneMatchupRead(state, champion);
  const tradeSoft = tradeCommitFactor(matchup);
  const shoveSoft = shoveCommitFactor(matchup);

  const early = t < 480;
  const midLate = t >= 720;
  const openEnemyNexus =
    state.structures.find(
      (structure) =>
        structure.alive &&
        structure.side !== champion.side &&
        structure.structureKind === 'nexus' &&
        canSiege(state, structure),
    ) ?? null;
  const openEnemyNexusTower =
    state.structures.find(
      (structure) =>
        structure.alive &&
        structure.side !== champion.side &&
        structure.structureKind === 'nexus_tower' &&
        canSiege(state, structure),
    ) ?? null;
  const openBaseTarget = openEnemyNexus ?? openEnemyNexusTower;
  const nexusWaveReady =
    !!openBaseTarget &&
    wavePressuringStructure(state, champion.side, openBaseTarget);
  const needsSiegeWave = !!openBaseTarget && !nexusWaveReady && t >= 1200;
  const closeoutFightScale = (enemyPos?: { x: number; y: number }): number => {
    if (t < 1200) {
      return 1;
    }
    if (!openBaseTarget) {
      return t >= 1500 ? 0.55 : 0.8;
    }
    if (!enemyPos) {
      return nexusWaveReady ? 0.85 : 0.7;
    }
    const nearBase =
      dist(enemyPos, openBaseTarget.position) < BASE_SIEGE_PRESENCE_RANGE + 400;
    if (nearBase) {
      return 1.05;
    }
    return nexusWaveReady ? 0.45 : 0.55;
  };

  if (champion.positionLabel !== 'JUNGLE' && champion.positionLabel !== 'SUPPORT') {
    const lane = laneIdOf(champion);
    const minion = nearestEnemyMinionOnLane(state, champion, lane);
    if (minion) {
      const execute = minion.hp <= champion.ad * 1.5 ? 28 : 8;
      const roleFarm =
        champion.positionLabel === 'BOT' ? 64 : champion.positionLabel === 'MID' ? 42 : 40;
      const phaseFarm =
        champion.positionLabel === 'BOT'
          ? early
            ? 56
            : midLate
              ? 40
              : 48
          : champion.positionLabel === 'MID'
            ? early
              ? 42
              : midLate
                ? 30
                : 36
            : early
              ? 44
              : midLate
                ? 30
                : 36;
      const farmWaveForCut = assessChampionLaneWave(state, champion, lane);
      const pressuredSiege = state.structures.some(
        (structure) =>
          structure.alive &&
          structure.side !== champion.side &&
          wavePressuringStructure(state, champion.side, structure) &&
          dist(champion.position, structure.position) < 1600,
      );
      const damagedOuterSiege = state.structures.some(
        (structure) =>
          structure.alive &&
          structure.side !== champion.side &&
          structure.structureKind === 'outer_tower' &&
          (structure.hp < structure.maxHp * 0.98 || structure.platesBroken > 0) &&
          dist(champion.position, structure.position) < 1800,
      );
      const crashSiegeHandOff =
        pressuredSiege || farmWaveForCut.isCrashingOuter || damagedOuterSiege;
      const lateFarmCut = crashSiegeHandOff
        ? midLate
          ? 110
          : 90
        : t > 1500
          ? 12
          : 0;
      const profile = combatProfile(state, champion);
      const enemyInTradeRange =
        !!laneEnemy &&
        dist(champion.position, laneEnemy.position) < champion.attackRange + 280 &&
        hpRatio > 0.55 &&
        laneEnemy.hp / Math.max(1, laneEnemy.maxHp) > 0.28;
      const tradeContestRaw = enemyInTradeRange
        ? execute
          ? profile.farmContest * 0.45
          : profile.farmContest
        : 0;
      const contactGap =
        laneEnemy != null ? dist(champion.position, laneEnemy.position) : 9999;
      const contactFarmCut =
        laneEnemy && contactGap < champion.attackRange + 260
          ? 55 + profile.allInAppetite * 18
          : laneEnemy && contactGap < 900
            ? 28 + profile.pokeAppetite * 10
            : 0;
      const tradeContest =
        champion.positionLabel === 'BOT'
          ? tradeContestRaw * 0.7
          : champion.positionLabel === 'TOP'
            ? tradeContestRaw * 0.85
            : champion.positionLabel === 'MID'
              ? tradeContestRaw * 1.25
              : tradeContestRaw;
      const farmWave = assessChampionLaneWave(state, champion, lane);
      const towerDiveFarm =
        underEnemyTower(state, champion) && !farmWave.isCrashingOuter ? 55 : 0;
      const waveFar =
        !!minion && dist(champion.position, minion.position) > champion.attackRange + 420;
      const mustWalkToWave = waveFar && farmWave.enemyCount > 0 ? 22 : 0;
      const safeFarmBias =
        matchup.deficit * 10 +
        matchup.expose * 8 -
        matchup.ahead * matchup.pressure * 6;
      const contactRespect =
        contactFarmCut * (0.55 + matchup.deficit * 0.7 + matchup.expose * 0.35);
      const enemyPressure =
        laneEnemy &&
        dist(champion.position, laneEnemy.position) <
          Math.max(700, laneEnemy.attackRange + 260)
          ? (() => {
              const foeHp = laneEnemy.hp / Math.max(1, laneEnemy.maxHp);
              if (hpRatio < 0.5) {
                return 22;
              }
              if (hpRatio < foeHp - 0.1) {
                return 14;
              }
              if (hpRatio > foeHp + 0.14) {
                return -8;
              }
              return 6;
            })()
          : 0;
      intents.push({
        kind: 'farm',
        score:
          68 +
          laning * 28 +
          idLaning * 18 +
          execute +
          roleFarm +
          phaseFarm +
          mustWalkToWave -
          lateFarmCut -
          tradeContest * (0.65 + matchup.deficit * 0.55) -
          contactRespect -
          towerDiveFarm -
          safeFarmBias -
          enemyPressure -
          (laneEnemy && !early && !execute ? 14 : 0) +
          (midLate && idSplit > 0.7 ? 6 : 0) +
          (needsSiegeWave ? 28 : 0) -
          (hasLanePriority(farmWave) ? 10 : 0),
        minionLane: lane,
      });
    } else {
      intents.push({
        kind: 'lane',
        score:
          38 +
          laning * 12 +
          idLaning * 12 +
          (early ? 14 : 0) +
          (champion.positionLabel === 'BOT' ? 12 : 0) +
          matchup.deficit * 10 +
          matchup.expose * 6,
        minionLane: lane,
      });
    }
  } else if (champion.positionLabel === 'SUPPORT') {
    const partner = duoPartner(state, champion);
    intents.push({ kind: 'lane', score: 34 + sense * 18, minionLane: laneIdOf(champion) });
    if (partner && dist(champion.position, partner.position) > 900) {
      intents.push({ kind: 'lane', score: 62 + sense * 20, minionLane: laneIdOf(champion) });
    }
    const lane = laneIdOf(champion);
    const minion = nearestEnemyMinionOnLane(state, champion, lane);
    const executeRatio = champion.attackRange > 300 ? 0.3 : 0.5;
    const nearPartner =
      !!partner && dist(champion.position, partner.position) <= 1050;
    const canSharedFarm =
      champion.supportSharedRichesCharges > 0 &&
      nearPartner &&
      !!minion &&
      (minion.hp / Math.max(1, minion.maxHp) <= executeRatio ||
        minion.hp <= champion.ad * 1.2 ||
        champion.supportSharedRichesCharges >= 3);
    if (canSharedFarm) {
      intents.push({
        kind: 'farm',
        score: 30 + sense * 8 + (champion.supportSharedRichesCharges >= 3 ? 14 : 4),
        minionLane: lane,
      });
    }
  } else if (champion.positionLabel === 'JUNGLE' && t > 360) {
    const pace = jungleFarmPace(champion, t);
    const lanes: LaneId[] = ['top', 'mid', 'bot'];
    let bestLane: LaneId | null = null;
    let bestMinion: ReturnType<typeof nearestEnemyMinionOnLane> = null;
    let bestGap = 780;
    for (const lane of lanes) {
      const minion = nearestEnemyMinionOnLane(state, champion, lane);
      if (!minion) {
        continue;
      }
      const gap = dist(champion.position, minion.position);
      if (gap < bestGap) {
        bestGap = gap;
        bestMinion = minion;
        bestLane = lane;
      }
    }
    if (bestMinion && bestLane) {
      intents.push({
        kind: 'farm',
        score:
          28 +
          (bestMinion.role === 'cannon' ? 16 : 0) +
          (midLate ? 14 : 0) +
          (pace >= 1 ? 22 : pace >= 0.85 ? 12 : 0),
        minionLane: bestLane,
      });
    }
  }

  const swapAssignment = getUnitAssignment(state, champion.id);
  const swapHomeLane: LaneId =
    champion.positionLabel === 'TOP'
      ? 'top'
      : champion.positionLabel === 'MID'
        ? 'mid'
        : 'bot';
  if (
    swapAssignment?.lane &&
    swapAssignment.expiresAt > t &&
    (champion.positionLabel === 'BOT' ||
      champion.positionLabel === 'TOP' ||
      champion.positionLabel === 'SUPPORT') &&
    t >= 660 &&
    swapAssignment.lane !== swapHomeLane
  ) {
    const onLease = (champion.assignedLane ?? laneIdOf(champion)) === swapAssignment.lane;
    intents.push({
      kind: 'swap',
      score: onLease ? 36 + sense * 10 : 58 + sense * 14,
      minionLane: swapAssignment.lane,
    });
  }

  if (
    (getMatchAiRuntime(state).phases[champion.side] === 'transition' ||
      (t >= 720 && t < 1200)) &&
    Math.max(
      objectiveWindowBoost(state, 'dragon'),
      objectiveWindowBoost(state, 'baron'),
      objectiveWindowBoost(state, 'herald'),
    ) < 0.55 &&
    hpRatio > 0.55
  ) {
    const halfAllies = state.champions.filter(
      (ally) =>
        ally.alive &&
        ally.side === champion.side &&
        ally.id !== champion.id &&
        sameMapHalf(champion.position, ally.position) &&
        dist(champion.position, ally.position) < 2200,
    ).length;
    const halfEnemies = state.champions.filter(
      (enemy) =>
        enemy.alive &&
        enemy.side !== champion.side &&
        sameMapHalf(champion.position, enemy.position) &&
        dist(champion.position, enemy.position) < 2400,
    );
    if (halfAllies >= 1 && halfEnemies.length >= 2) {
      const rally = {
        x:
          (state.lockedPack.map.blueFountain.x + state.lockedPack.map.redFountain.x) /
          2,
        y:
          (state.lockedPack.map.blueFountain.y + state.lockedPack.map.redFountain.y) /
          2,
      };
      intents.push({
        kind: 'skirmish',
        score: 42 + teamfight * 12 + idTeamfight * 10 + halfAllies * 6,
        enemy: halfEnemies[0],
        coverPoint: rally,
      });
    }
  }

  if (laneEnemy && hpRatio > 0.48 && t > 90) {
    const profile = combatProfile(state, champion);
    const enemyHp = laneEnemy.hp / Math.max(1, laneEnemy.maxHp);
    const d = dist(champion.position, laneEnemy.position);
    const canFinish = enemyHp < 0.18 || laneEnemy.hp < champion.ad * 1.25;
    const winning = enemyHp < hpRatio - 0.16;
    const inRange = d < champion.attackRange + 220;
    const contact = d < Math.max(820, champion.attackRange + 320);
    const tradeOverpace = killOverpace(state);
    const partner = champion.positionLabel === 'SUPPORT' ? duoPartner(state, champion) : null;
    const partnerNear =
      !!partner && dist(champion.position, partner.position) <= 950;
    const retal = estimateTradeMinionRetaliation(state, champion, champion.position);
    const rangeGap = champion.attackRange - laneEnemy.attackRange;
    const pokeOutsideEnemy =
      rangeGap > 70 && d > laneEnemy.attackRange + 35 && d <= champion.attackRange + 90;
    let tradeScore =
      22 +
      laning * 8 +
      idSkirmish * 8 +
      profile.pokeAppetite * 16 +
      profile.allInAppetite * 8 +
      (winning ? 10 + profile.allInAppetite * 6 : 0) +
      (canFinish ? 36 + idCloseout * 14 : 0) +
      (contact ? 38 + profile.allInAppetite * 12 : 0) +
      (inRange ? 28 : 0) +
      matchup.ahead * 10 -
      matchup.deficit * 18 -
      matchup.expose * 10 -
      retal.count * 7 -
      Math.min(36, retal.expectedDamage / 10);
    if (champion.positionLabel === 'BOT') {
      tradeScore += profile.pokeAppetite * 4;
      if (!canFinish && t < 720) {
        tradeScore *= 0.88;
      }
    } else if (champion.positionLabel === 'TOP') {
      tradeScore += 8 + profile.pokeAppetite * 6 + profile.allInAppetite * 4;
    } else if (champion.positionLabel === 'MID') {
      tradeScore *= 0.92;
    } else if (champion.positionLabel === 'SUPPORT') {
      tradeScore *= partnerNear ? 0.85 : 0.35;
      if (t < 240 && !canFinish && !contact) {
        tradeScore *= 0.45;
      }
      if (enemiesNear > allies + 1) {
        tradeScore *= 0.35;
      }
    }
    if (inRange && canFinish) {
      tradeScore += 18;
    }
    if (!canFinish && inRange) {
      tradeScore += (early ? 10 : 14) + profile.pokeAppetite * 6;
    }
    if (pokeOutsideEnemy && retal.count <= 2) {
      tradeScore += 14 + profile.pokeAppetite * 10 + Math.min(18, rangeGap / 20);
    }
    if (retal.count >= 3 && rangeGap < 40 && !canFinish) {
      tradeScore *= 0.52;
    }
    if (
      champion.attackRange <= 300 &&
      profile.allInAppetite >= 0.55 &&
      hpRatio > 0.55 &&
      (contact || inRange)
    ) {
      tradeScore += profile.allInAppetite * 16;
    }
    if (early && !canFinish && !contact) {
      tradeScore *= 0.72;
    }
    if (t < 300 && !canFinish && !contact) {
      tradeScore *= 0.7;
    }
    if (
      (underEnemyTower(state, champion) || enemyTowerAggroOn(state, champion)) &&
      !canCommitDive(state, champion, laneEnemy)
    ) {
      tradeScore = 0;
    }
    if (
      coveringEnemyTower(state, champion.side, laneEnemy.position, 40) &&
      !canCommitDive(state, champion, laneEnemy) &&
      !canFinish
    ) {
      tradeScore *= contact ? 0.35 : 0.18;
    }
    if (enemiesNear > allies + 1) {
      tradeScore -= 28 + sense * 10;
    }
    if (hpRatio < profile.disengageHp + 0.04 && !canFinish) {
      tradeScore *= 0.35;
    }
    if (!canFinish) {
      tradeScore *= Math.max(0.05, tradeSoft * (contact ? 0.85 : 0.7));
    }
    if (tradeOverpace >= 1.25 && !canFinish) {
      tradeScore *= tradeOverpace >= 1.4 ? 0.4 : 0.65;
    }
    if (tradeScore >= 16) {
      intents.push({ kind: 'trade', score: tradeScore, enemy: laneEnemy });
    }
  }

  const contactThreat = nearestVisibleEnemy(state, champion, CONTACT_SOFT_RANGE);
  if (contactThreat && hpRatio > 0.26 && t > 75) {
    const profile = combatProfile(state, champion);
    const enemyHp = contactThreat.enemy.hp / Math.max(1, contactThreat.enemy.maxHp);
    const hardContact = contactThreat.dist <= CONTACT_HARD_RANGE;
    const enemyRecalling = contactThreat.enemy.recallPhase === 'moving_home';
    const canFinishContact =
      isFinishableEnemy(champion, contactThreat.enemy) ||
      enemyHp < 0.18 ||
      contactThreat.enemy.hp < champion.ad * 1.25;
    let contactScore =
      (hardContact ? 150 : 100) +
      idSkirmish * 12 +
      profile.allInAppetite * 16 +
      (1 - enemyHp) * 28 +
      (enemyRecalling ? 36 : 0) +
      (canFinishContact ? 24 : 0) +
      (allies - enemiesNear >= 0 ? 16 : -8) -
      matchup.deficit * 36 -
      matchup.expose * 18;
    if (
      (underEnemyTower(state, champion) || enemyTowerAggroOn(state, champion)) &&
      !canCommitDive(state, champion, contactThreat.enemy)
    ) {
      contactScore = 0;
    }
    if (!canFinishContact) {
      contactScore *= Math.max(0.12, hardContactCommitFactor(matchup) * (hardContact ? 0.9 : 0.65));
      if (hpRatio < profile.disengageHp) {
        contactScore *= hardContact ? 0.85 : 0.7;
      }
      if (isEarlyLaneOpponent(state, champion, contactThreat.enemy)) {
        contactScore *= hardContact ? 0.32 : 0.22;
      }
    }
    if (contactScore >= 24) {
      intents.push({
        kind: 'skirmish',
        score: contactScore,
        enemy: contactThreat.enemy,
      });
    }
  }

  const passerby = state.champions.find(
    (enemy) =>
      enemy.alive &&
      enemy.side !== champion.side &&
      dist(champion.position, enemy.position) < 980 &&
      (champion.positionLabel === 'JUNGLE' ||
        enemy.positionLabel === 'JUNGLE' ||
        enemy.assignedLane !== champion.assignedLane),
  );
  if (passerby && hpRatio > 0.42 && t > 120) {
    const profile = combatProfile(state, champion);
    const enemyHp = passerby.hp / Math.max(1, passerby.maxHp);
    const numbers = allies - enemiesNear;
    const passerbyDist = dist(champion.position, passerby.position);
    const hardContact = passerbyDist <= CONTACT_HARD_RANGE;
    let passScore =
      48 +
      idSkirmish * 16 +
      profile.allInAppetite * 14 +
      (1 - enemyHp) * 24 +
      (numbers >= 0 ? 18 : -12) +
      (champion.positionLabel === 'JUNGLE' ? 10 : 0) +
      (hardContact ? 55 : passerbyDist < CONTACT_SOFT_RANGE ? 28 : 0);
    if (
      (underEnemyTower(state, champion) || enemyTowerAggroOn(state, champion)) &&
      !canCommitDive(state, champion, passerby)
    ) {
      passScore = 0;
    }
    if (hpRatio < profile.disengageHp) {
      passScore *= hardContact ? 0.7 : 0.4;
    }
    if (champion.positionLabel === 'JUNGLE' && !hardContact) {
      const behind = jungleFarmBehindAmount(jungleFarmPace(champion, t));
      passScore *= Math.max(0.35, 1 - behind * 0.55);
      if (isClearingCamp(state, champion) && behind > 0.15) {
        passScore *= 0.55;
      }
    }
    if (passScore >= 28) {
      intents.push({ kind: 'skirmish', score: passScore, enemy: passerby });
    }
  }

  const canRoamGank =
    champion.positionLabel === 'JUNGLE' ||
    (t >= LANE_LOCK_UNTIL_SEC && sense > 0.62) ||
    (t >= LANE_LOCK_UNTIL_SEC && idGank > 0.75);
  if (canRoamGank && t > 150) {
    const overpace = killOverpace(state);
    const homeWave = assessChampionLaneWave(state, champion, laneIdOf(champion));
    const homeSafeEnough =
      champion.positionLabel === 'JUNGLE' ||
      homeWave.zone !== 'enemy' ||
      homeWave.isCrashingOuter ||
      homeWave.allyAdvantage > 0.8;
    let bestGank: ChampionEntity | null = null;
    let bestGankScore = 0;
    for (const enemy of state.champions) {
      if (!enemy.alive || enemy.side === champion.side) {
        continue;
      }
      const enemyHp = enemy.hp / Math.max(1, enemy.maxHp);
      const d = dist(champion.position, enemy.position);
      const enemyLane =
        enemy.assignedLane ??
        (enemy.positionLabel === 'TOP'
          ? 'top'
          : enemy.positionLabel === 'BOT' || enemy.positionLabel === 'SUPPORT'
            ? 'bot'
            : 'mid');
      const allyDistress = laneDistress(state, champion.side, enemyLane);
      const danger = championGankDangerIndex(state, enemy, enemyLane);
      const sameHalf = sameMapHalf(champion.position, enemy.position);
      const gankRange =
        (champion.positionLabel === 'JUNGLE' ? (t < 360 ? 3200 : 2800) : 2200) +
        allyDistress * 420 +
        danger * 700 +
        (champion.positionLabel === 'JUNGLE' && sameHalf ? 500 : 0);
      if (d > gankRange) {
        continue;
      }
      const progress = laneProgress(state, enemyLane, enemy.position);
      const pushed =
        enemy.side === 'blue' ? progress > 0.48 : progress < 0.52;
      const overextended =
        pushed ||
        (enemy.side === 'blue' ? progress > 0.4 : progress < 0.6);
      const enemyRead = laneMatchupRead(state, enemy, enemyLane);
      const allyNear = alliesNearPoint(state, champion.side, enemy.position, 1400);
      const enemyNear = enemiesNearPoint(state, champion.side, enemy.position, 1500);
      const hpGate =
        champion.positionLabel === 'JUNGLE'
          ? danger >= 0.55
            ? 0.98
            : danger >= 0.4
              ? 0.92
              : overextended
                ? 0.9
                : allyNear >= 1
                  ? 0.78
                  : 0.62
          : 0.58;
      if (enemyHp > hpGate && danger < 0.42) {
        continue;
      }
      if (enemyNear >= allyNear + 2) {
        continue;
      }
      if (
        champion.positionLabel === 'JUNGLE' &&
        !overextended &&
        danger < 0.42 &&
        allyNear < 1
      ) {
        continue;
      }
      const underTower = coveringEnemyTower(state, champion.side, enemy.position, 40);
      const diveOk = underTower ? canCommitDive(state, champion, enemy) : true;
      const deepInTower =
        !!underTower &&
        dist(enemy.position, underTower.position) < underTower.range * 0.55;
      if (deepInTower && !diveOk) {
        continue;
      }
      if (underTower && !diveOk && !overextended) {
        continue;
      }
      const liveVision = teamSeesChampion(state, champion.side, enemy);
      const known = champion.knownEnemyPositions[enemy.id];
      const memoryFresh =
        !!known && state.scheduler.time - known.seenAt <= 12;
      const memoryNear = recentlySeenEnemyNear(
        state,
        champion,
        enemy.position,
        1800,
        12,
      );
      if (!liveVision && !memoryFresh && !memoryNear) {
        continue;
      }
      const risk = invadeRisk(state, champion, enemy.position);
      const laneVision = teamVisionPressure(state, champion.side, enemy.position, 1600);
      let score =
        24 +
        (pushed ? 42 : overextended ? 24 : -10) +
        (1 - enemyHp) * 22 +
        sense * 12 +
        idGank * 28 +
        idSkirmish * 10 +
        (d < 1600 ? 18 : d < 2200 ? 8 : 0) +
        allyNear * 14 -
        enemyNear * 12 +
        (champion.positionLabel === 'JUNGLE' ? 28 : 0) -
        risk * 8 +
        laneVision * 5 +
        allyDistress * 38 +
        enemyRead.expose * 26 +
        enemyRead.ahead * enemyRead.pressure * 12 +
        danger * 56;
      if (champion.positionLabel === 'JUNGLE' && sameHalf && danger >= 0.38) {
        score += 34 + danger * 42;
      }
      if (champion.positionLabel === 'JUNGLE' && overextended && enemyHp <= 0.92) {
        score += 22 + (pushed ? 14 : 0) + Math.max(0, 0.85 - enemyHp) * 20;
      }
      if (champion.positionLabel === 'JUNGLE' && danger >= 0.55) {
        score += 18;
      }
      if (!liveVision) {
        score *= 0.55;
      }
      if (underTower && !diveOk) {
        score *= 0.55;
      }
      if (laneVision < 0.4 && champion.positionLabel === 'JUNGLE' && t < 720) {
        score *= 0.7;
      }
      if (t < 300) {
        score *= champion.positionLabel === 'JUNGLE' ? 0.95 : 0.55;
      }
      if (champion.positionLabel === 'JUNGLE') {
        const pace = jungleFarmPace(champion, t);
        const behindFarm = jungleFarmBehindAmount(pace);
        const aheadFarm = jungleFarmAheadAmount(pace);
        const kdaBehind = champion.deaths >= champion.kills + 1;
        score *= Math.max(0.35, 1 - behindFarm * 0.55);
        if (t < 210) {
          score *= Math.max(0.45, 1 - behindFarm * 0.7);
        }
        if (!kdaBehind && enemyHp <= 0.5 && overextended) {
          score += 8 + aheadFarm * 10 + Math.max(0, pace - 0.8) * 12;
        } else if (!kdaBehind && enemyHp <= 0.45) {
          score += 4 + Math.max(0, pace - 0.75) * 10;
        }
        if (enemyHp <= 0.45 && behindFarm < 0.55 && overextended) {
          score += 18 + (1 - behindFarm) * 8;
        }
        if (allyNear >= 1 && overextended && behindFarm < 0.55 && !kdaBehind && enemyHp <= 0.55) {
          score += 14 + (1 - behindFarm) * 8;
        }
        if (overextended && pace >= 0.8 && !kdaBehind && enemyHp <= 0.5) {
          score += 6 + aheadFarm * 10 + Math.min(10, champion.campKills);
        }
        if (t >= 600) {
          score += 4 + Math.max(0, pace - 0.7) * 12;
        }
      }
      if (champion.positionLabel !== 'JUNGLE') {
        if (!homeSafeEnough || !pushed) {
          score *= 0.2;
        }
        if (t < 960) {
          score *= 0.35;
        }
        if (champion.positionLabel === 'BOT') {
          score *= 0.22;
        }
        if (champion.positionLabel === 'MID') {
          score *= 0.4;
        }
        if (champion.positionLabel === 'TOP') {
          score *= 0.35;
        }
      }
      if (enemyNear > allyNear) {
        score *= 0.45;
      }
      if (enemyHp > 0.55) {
        score *= 0.7;
      }
      if (overpace >= 1.2) {
        score *= overpace >= 1.4 ? 0.35 : 0.65;
      }
      if (score > bestGankScore) {
        bestGank = enemy;
        bestGankScore = score;
      }
    }
    if (champion.positionLabel === 'JUNGLE') {
      let saveLane: LaneId | null = null;
      let saveUrgency = 0;
      for (const lane of ['top', 'mid', 'bot'] as const) {
        const urgency = allySaveUrgency(state, champion, lane);
        if (urgency > saveUrgency) {
          saveUrgency = urgency;
          saveLane = lane;
        }
      }
      if (saveLane && saveUrgency >= 0.42) {
        const saveTarget =
          state.champions.find(
            (enemy) =>
              enemy.alive &&
              enemy.side !== champion.side &&
              enemy.positionLabel !== 'JUNGLE' &&
              (enemy.assignedLane ?? laneIdOf(enemy)) === saveLane,
          ) ?? bestGank;
        if (saveTarget) {
          bestGank = saveTarget;
          bestGankScore = Math.max(bestGankScore, 110 + saveUrgency * 80);
          getMatchAiRuntime(state).intentStick.delete(champion.id);
        }
      }
    }
    if (bestGank && hpRatio > (champion.positionLabel === 'JUNGLE' ? 0.5 : 0.58) && overpace < 1.45) {
      const pace = champion.positionLabel === 'JUNGLE' ? jungleFarmPace(champion, t) : 1;
      const jgGankMul =
        champion.positionLabel === 'JUNGLE'
          ? Math.max(0.82, Math.min(1.1, 0.82 + pace * 0.26))
          : 0.72;
      intents.push({
        kind: 'gank',
        score: bestGankScore * jgGankMul * closeoutFightScale(bestGank.position),
        enemy: bestGank,
      });
    }
  }

  const jungleThreat = findJungleInvadeThreat(state, champion);
  if (jungleThreat && t > 110) {
    const cover = visionCoverScore(state, champion, jungleThreat);
    const nearBuff =
      dist(champion.position, jungleThreat.point) <
      (champion.positionLabel === 'MID' ? 4200 : 3800);
    const respondScore =
      cover >= 12 || nearBuff
        ? Math.max(cover, 55 + (nearBuff ? 24 : 0))
        : 0;
    if (respondScore >= 18) {
      const runtime = getMatchAiRuntime(state);
      runtime.invadeRespond.set(champion.id, {
        point: { ...jungleThreat.point },
        until: t + 5.5,
      });
      runtime.intentStick.delete(champion.id);
      intents.push({
        kind: 'skirmish',
        score: respondScore + 40,
        enemy: jungleThreat.enemy,
        coverPoint: jungleThreat.point,
      });
    }
  }

  const laningLock = t < 360;
  const known = knownEnemies(champion, t);
  if (!laningLock && known.length > 0 && hpRatio > 0.55 && t > 210) {
    const enemy = state.champions.find((item) => item.id === known[0] && item.alive);
    if (enemy) {
      const d = dist(champion.position, enemy.position);
      const numbers = allies - enemiesNear;
      const overpace = killOverpace(state);
      if (d < 1500 && numbers >= -1) {
        let score =
          28 +
          teamfight * 14 +
          idTeamfight * 12 +
          idCloseout * 8 +
          numbers * 12 +
          (enemy.hp < 320 ? 18 + idCloseout * 12 : 0) +
          (d < 900 ? 22 : 0);
        if (early) {
          score *= 0.7;
        }
        if (numbers < 0) {
          score *= 0.55;
        }
        if (
          (champion.positionLabel === 'BOT' || champion.positionLabel === 'MID') &&
          t < 720
        ) {
          score *= 0.7;
        }
        if (hpRatio < 0.62) {
          score *= 0.6;
        }
        if (overpace >= 1.2) {
          score *= overpace >= 1.35 ? 0.35 : 0.6;
        }
        score *= closeoutFightScale(enemy.position);
        if (score >= 16) {
          intents.push({ kind: 'skirmish', score, enemy });
        }
      }
    }
  }
  if (!laningLock && enemiesNear >= 1 && allies >= 1 && hpRatio > 0.55 && t > 360) {
    const clusterEnemy = state.champions.find(
      (enemy) =>
        enemy.alive &&
        enemy.side !== champion.side &&
        dist(champion.position, enemy.position) < 1100,
    );
    if (clusterEnemy) {
      let clusterScore =
        30 +
        teamfight * 14 +
        idTeamfight * 12 +
        allies * 6 +
        (midLate ? 10 : 0) +
        (enemiesNear >= 2 && allies >= 2 ? 16 : 0);
      if (enemiesNear > allies + 1) {
        clusterScore *= 0.4;
      }
      if ((champion.positionLabel === 'BOT' || champion.positionLabel === 'MID') && t < 720) {
        clusterScore *= 0.75;
      }
      if (early) {
        clusterScore *= 0.65;
      }
      const clusterOverpace = killOverpace(state);
      if (clusterOverpace >= 1.25) {
        clusterScore *= clusterOverpace >= 1.4 ? 0.4 : 0.65;
      }
      clusterScore *= closeoutFightScale(clusterEnemy.position);
      if (clusterScore >= 16) {
        intents.push({
          kind: 'skirmish',
          score: clusterScore,
          enemy: clusterEnemy,
        });
      }
    }
  }

  const joinRange = laningLock
    ? champion.positionLabel === 'SUPPORT'
      ? 900
      : champion.positionLabel === 'JUNGLE'
        ? 1800
        : champion.positionLabel === 'MID'
          ? 2600
          : 700
    : champion.positionLabel === 'JUNGLE' || champion.positionLabel === 'SUPPORT'
      ? midLate
        ? 2600
        : 2000
      : champion.positionLabel === 'MID'
        ? midLate
          ? 2800
          : 2400
        : midLate
          ? 2000
          : early
            ? 1100
            : 1500;
  if (
    !laningLock ||
    champion.positionLabel === 'JUNGLE' ||
    champion.positionLabel === 'SUPPORT' ||
    champion.positionLabel === 'MID'
  ) {
    for (const ally of state.champions) {
      if (!ally.alive || ally.side !== champion.side || ally.id === champion.id) {
        continue;
      }
      const focus = state.champions.find(
        (enemy) =>
          enemy.alive &&
          enemy.side !== champion.side &&
          dist(ally.position, enemy.position) < 1000,
      );
      if (!focus) {
        continue;
      }
      const allyFighting =
        ally.currentAction === 'fight' ||
        ally.currentAction === 'trade' ||
        ally.currentAction === 'gank' ||
        ally.currentAction === 'skirmish' ||
        ally.currentAction === 'tower_hold' ||
        ally.currentAction === 'jungle' ||
        ally.currentAction === 'path_camp' ||
        ally.currentAction === 'clear_camp' ||
        focus.currentAction === 'fight' ||
        focus.currentAction === 'trade' ||
        focus.currentAction === 'skirmish' ||
        dist(ally.position, focus.position) < Math.max(ally.attackRange, focus.attackRange) + 160;
      const allyJunglerHot =
        ally.positionLabel === 'JUNGLE' &&
        (champion.positionLabel === 'MID' || champion.positionLabel === 'SUPPORT') &&
        dist(ally.position, focus.position) < 1300 &&
        invadeRisk(state, ally, ally.position) >= 1.2;
      if (!allyFighting && !allyJunglerHot) {
        continue;
      }
      if (dist(champion.position, ally.position) > joinRange) {
        continue;
      }
      if (hpRatio < 0.55) {
        continue;
      }
      if (
        laningLock &&
        champion.positionLabel !== 'JUNGLE' &&
        champion.positionLabel !== 'MID' &&
        laneIdOf(focus) !== laneIdOf(champion)
      ) {
        continue;
      }
      const focusTower = coveringEnemyTower(state, champion.side, focus.position, 40);
      if (
        focusTower &&
        !canCommitDive(state, champion, focus) &&
        dist(focus.position, focusTower.position) < focusTower.range * 0.55
      ) {
        continue;
      }
      const joinOverpace = killOverpace(state);
      if (joinOverpace >= 1.35) {
        continue;
      }
      const focusLane = laneIdOf(focus);
      const sideRotate =
        champion.positionLabel === 'MID' && focusLane !== 'mid';
      const helpDistress = laneDistress(state, champion.side, focusLane);
      let joinScore =
        26 +
        teamfight * 14 +
        sense * 10 +
        helpDistress * 34;
      if (champion.positionLabel === 'JUNGLE' || champion.positionLabel === 'SUPPORT') {
        joinScore += 12 + helpDistress * 10;
      }
      if (sideRotate) {
        joinScore += 55 + sense * 12 + helpDistress * 18;
      }
      if (allyJunglerHot && champion.positionLabel === 'MID') {
        joinScore += 48 + sense * 10;
      }
      if (champion.positionLabel === 'JUNGLE') {
        joinScore += 24 + helpDistress * 14;
      }
      if (midLate) {
        joinScore += 6;
      }
      if (laningLock && !sideRotate && !allyJunglerHot) {
        joinScore *= 0.45 + helpDistress * 0.35;
      }
      if (early && !sideRotate && !allyJunglerHot) {
        joinScore *=
          (champion.positionLabel === 'JUNGLE' ? 0.75 : 0.5) + helpDistress * 0.28;
      }
      if (allyJunglerHot && early) {
        joinScore *= 0.92;
      }
      if (joinOverpace >= 1.1) {
        joinScore *= joinOverpace >= 1.25 ? 0.3 : 0.55;
      }
      joinScore *= closeoutFightScale(focus.position);
      if (joinScore >= 14) {
        intents.push({
          kind: 'skirmish',
          score: joinScore,
          enemy: focus,
        });
      }
    }
  }

  if (champion.positionLabel === 'SUPPORT') {
    const partner = duoPartner(state, champion);
    if (partner) {
      const botThreat = state.champions.find(
        (enemy) =>
          enemy.alive &&
          enemy.side !== champion.side &&
          dist(partner.position, enemy.position) < 1200,
      );
      const partnerGap = dist(champion.position, partner.position);
      const partnerHp = partner.hp / Math.max(1, partner.maxHp);
      if (
        botThreat &&
        hpRatio > 0.7 &&
        partnerHp > 0.45 &&
        partnerGap <= 850 &&
        t >= 240 &&
        allies >= enemiesNear &&
        killOverpace(state) < 1.2
      ) {
        let supportFight =
          ((early ? 6 : 32) + teamfight * 10 + (botThreat.hp < botThreat.maxHp * 0.25 ? 14 : 0)) *
          0.45;
        if (t < 420) {
          supportFight *= 0.15;
        }
        if (enemiesNear > allies) {
          supportFight *= 0.1;
        }
        const threatTower = coveringEnemyTower(state, champion.side, botThreat.position, 40);
        if (
          !threatTower ||
          canCommitDive(state, champion, botThreat) ||
          dist(botThreat.position, threatTower.position) >= threatTower.range * 0.55
        ) {
          if (supportFight >= 16) {
            intents.push({
              kind: 'skirmish',
              score: supportFight,
              enemy: botThreat,
            });
          }
        }
      }
    }
  }

  const baseThreat = threatenedOwnStructure(state, champion);
  if (baseThreat && canChampionDefend(state, champion)) {
    const sameLane = !baseThreat.lane || baseThreat.lane === laneIdOf(champion);
    const baseScore =
      baseThreat.structureKind === 'nexus' || baseThreat.structureKind === 'nexus_tower'
        ? 118
        : baseThreat.structureKind === 'inhibitor' || baseThreat.structureKind === 'inhib_tower'
          ? 96
          : sameLane
            ? 78
            : t < 840
              ? 42
              : 62;
    intents.push({
      kind: 'defend',
      score: baseScore + sense * 14 + idObjective * 8,
      structure: baseThreat,
    });
  }

  const structure = nearestAttackableStructure(state, champion);
  if (structure && hpRatio > 0.4) {
    const pressured = wavePressuringStructure(state, champion.side, structure);
    const nexusFamily =
      structure.structureKind === 'nexus' || structure.structureKind === 'nexus_tower';
    const escortLane = structure.lane ?? laneIdOf(champion);
    const waveToEscort = !!alliedWaveAnchor(state, champion, escortLane);
    const d = dist(champion.position, structure.position);
    const team = champion.side === 'blue' ? state.blue : state.red;
    const homeWave = assessChampionLaneWave(state, champion, laneIdOf(champion));
    const supportCrashSiege =
      champion.positionLabel === 'SUPPORT' &&
      structure.lane === 'bot' &&
      homeWave.isCrashingOuter &&
      pressured &&
      d < 1800;
    const outerDamaged =
      structure.structureKind === 'outer_tower' &&
      (structure.hp < structure.maxHp * 0.98 || structure.platesBroken > 0);
    const outerHpMissing = outerDamaged
      ? 1 - structure.hp / Math.max(1, structure.maxHp)
      : 0;
    let siegeScore =
      (pressured ? 72 : nexusFamily ? 48 : 10) +
      (t > 480 ? 18 : 0) +
      (t > 900 ? 26 : 0) +
      (midLate ? 36 : 0) +
      idSplit * 18 +
      idCloseout * 16;
    if (d < 1400 && (pressured || nexusFamily || outerDamaged)) {
      siegeScore += 34;
    }
    if (pressured) {
      siegeScore += 80;
    }
    if (outerDamaged) {
      siegeScore += 55 + outerHpMissing * 90 + structure.platesBroken * 12;
    }
    if (t > 1500) {
      siegeScore += 48 + idCloseout * 24;
    }
    if (team.hasBaron && (pressured || nexusFamily)) {
      siegeScore += 55;
    }
    if (
      structure.structureKind === 'nexus_tower' ||
      structure.structureKind === 'inhibitor' ||
      structure.structureKind === 'nexus'
    ) {
      siegeScore += 30;
    }
    if (isNexusSiegeStructure(structure)) {
      siegeScore += pressured ? 90 : 70;
    }
    if (!pressured && !nexusFamily && !homeWave.isCrashingOuter && !outerDamaged) {
      siegeScore *= waveToEscort ? (early ? 0.7 : 0.9) : early ? 0.25 : 0.55;
    } else if ((homeWave.isCrashingOuter || outerDamaged) && !pressured) {
      siegeScore *= early ? 0.9 : 1.05;
    } else if (early) {
      siegeScore *= 0.9;
    } else {
      siegeScore *= 1.12;
    }
    if ((pressured || nexusFamily || outerDamaged) && champion.positionLabel !== 'SUPPORT') {
      siegeScore += 16 + idCloseout * 10;
    }
    if (homeWave.isCrashingOuter) {
      siegeScore += (pressured ? 50 : 45) + idCloseout * 8;
    }
    if (supportCrashSiege) {
      siegeScore += 70;
    }
    if (baseThreat && !nexusFamily) {
      siegeScore *= 0.2;
    } else if (baseThreat && nexusFamily) {
      siegeScore *= 0.65;
    }
    if (
      pressured ||
      nexusFamily ||
      team.hasBaron ||
      homeWave.isCrashingOuter ||
      outerDamaged ||
      (waveToEscort && t >= 480) ||
      supportCrashSiege
    ) {
      intents.push({ kind: 'siege', score: siegeScore, structure });
    }
  }

  const objective = nearestObjectiveCamp(state, champion);
  if (objective && hpRatio > 0.45) {
    const boost = objectiveWindowBoost(state, objective.campId);
    const d = dist(champion.position, objective.position);
    const allyNearObj = alliesNearPoint(state, champion.side, objective.position, 1800);
    const enemyNearObj = enemiesNearPoint(state, champion.side, objective.position, 1800);
    const numbers = allyNearObj - enemyNearObj;
    const objRisk = invadeRisk(state, champion, objective.position);
    const objVision = teamVisionPressure(state, champion.side, objective.position, 1800);
    let objScore =
      boost * 95 +
      idObjective * 28 +
      idTeamfight * 12 +
      (objective.campId === 'dragon' || objective.campId === 'elder' ? 40 : 0) +
      (objective.campId === 'herald' ? 38 : 0) +
      (objective.campId === 'baron' ? 55 : 0) +
      allyNearObj * 18 -
      enemyNearObj * 14 -
      d / 100 -
      objRisk * 8 +
      objVision * 10;
    if (objVision < 0.6 && enemyNearObj >= 2) {
      objScore *= 0.55;
    }
    if (allyNearObj >= 2) {
      objScore += 36 + idTeamfight * 10;
    }
    if (allyNearObj >= 1 && enemyNearObj <= allyNearObj) {
      objScore += 22;
    }
    if (
      midLate &&
      (objective.campId === 'dragon' ||
        objective.campId === 'elder' ||
        objective.campId === 'baron')
    ) {
      objScore += 48;
    }
    if (
      objective.campId === 'dragon' &&
      (champion.positionLabel === 'BOT' ||
        champion.positionLabel === 'SUPPORT' ||
        champion.positionLabel === 'MID')
    ) {
      objScore += 24;
    }
    if (objective.campId === 'herald' && champion.positionLabel === 'TOP') {
      objScore += 18;
    }
    if (enemyNearObj > 0 && numbers >= 0) {
      objScore += 24 + sense * 20;
    }
    if (numbers <= -2) {
      objScore *= 0.35;
    } else if (numbers < 0) {
      objScore *= 0.65;
    }
    if (champion.positionLabel === 'JUNGLE') {
      objScore += 48 + idGank * 10 + idObjective * 14;
    }
    if (champion.positionLabel === 'MID' || champion.positionLabel === 'SUPPORT') {
      objScore += 18;
    }
    if (champion.positionLabel === 'BOT' && objective.campId === 'dragon') {
      objScore += 28;
    }
    if (champion.positionLabel === 'TOP' && (objective.campId === 'herald' || objective.campId === 'baron')) {
      objScore += 28;
    }
    if (champion.positionLabel === 'TOP' && objective.campId === 'dragon') {
      const topAssignment = getUnitAssignment(state, champion.id);
      const topOnDragonMission =
        topAssignment?.mission === 'setup-objective' ||
        topAssignment?.mission === 'take-objective';
      const topWave = assessChampionLaneWave(state, champion, 'top');
      if (topOnDragonMission) {
        objScore += 82 + Math.min(70, d / 140);
        if (allyNearObj >= 1 || enemyNearObj >= 1) {
          objScore += 24;
        }
      } else if (t >= 600) {
        if (allyNearObj >= 2 || topWave.isCrashingOuter || topWave.allyAdvantage > 0.4) {
          objScore += 90;
        } else if (midLate) {
          objScore += 48;
        } else {
          objScore += 28;
        }
      } else if (allyNearObj >= 2 && enemyNearObj >= 1) {
        objScore += 40;
      }
    }
    if (champion.positionLabel === 'SUPPORT') {
      const partner = duoPartner(state, champion);
      if (partner && dist(partner.position, objective.position) < 1800) {
        objScore += 60;
      }
      if (objective.campId === 'dragon') {
        objScore += 26;
      }
    }
    if (idSplit > 0.85 && objective.campId === 'dragon' && champion.positionLabel === 'TOP' && t < 900) {
      objScore *= 0.75;
    }
    if (t < 300 && objective.campId !== 'herald') {
      objScore *= 0.45;
    }
    const objAssignment = getUnitAssignment(state, champion.id);
    const onObjMission =
      objAssignment?.mission === 'setup-objective' ||
      objAssignment?.mission === 'take-objective';
    if (
      !onObjMission &&
      enemyNearObj <= 0 &&
      !isObjectiveSetupWindow(state, objective.campId)
    ) {
      if (champion.positionLabel === 'JUNGLE') {
        const farmBehind = jungleFarmBehindAmount(jungleFarmPace(champion, t));
        const earlyObjGate = t < 480 ? Math.max(0.28, 0.55 - farmBehind * 0.35) : 0.45;
        objScore *= earlyObjGate;
      } else if (
        champion.positionLabel === 'BOT' ||
        champion.positionLabel === 'SUPPORT'
      ) {
        objScore *= 0.32;
      } else {
        objScore *= 0.18;
      }
    }
    intents.push({ kind: 'objective', score: Math.max(0, objScore), camp: objective });
  }

  if (champion.positionLabel === 'JUNGLE' && hpRatio > 0.22) {
    const camp = nearestFriendlyCamp(state, champion);
    const objUp = state.monsters.some(
      (monster) =>
        monster.alive &&
        (monster.campId === 'dragon' ||
          monster.campId === 'elder' ||
          monster.campId === 'herald' ||
          monster.campId === 'baron'),
    );
    const pace = jungleFarmPace(champion, t);
    const slack = jungleFarmSlack(champion, t);
    const farmBehind = jungleFarmBehindAmount(pace);
    const farmAhead = jungleFarmAheadAmount(pace);
    const behind = champion.deaths >= champion.kills + 1;
    if (camp) {
      const d = dist(champion.position, camp.position);
      const overpace = killOverpace(state);
      const risk = invadeRisk(state, champion, camp.position);
      const combatClass = CHAMPION_KITS[champion.championId]?.combatClass ?? 'fighter';
      let clearScore = 72 + sense * 6 - d / 200 + (early ? 30 : 0) - risk * 8;
      clearScore += Math.min(48, slack * 14 + farmBehind * 28) + (behind ? 32 : 0);
      const topSave = allySaveUrgency(state, champion, 'top');
      const midSave = allySaveUrgency(state, champion, 'mid');
      const botSave = allySaveUrgency(state, champion, 'bot');
      const saveUrgency = Math.max(topSave, midSave, botSave);
      if (saveUrgency >= 0.42) {
        clearScore *= Math.max(0.2, 0.7 - saveUrgency * 0.7);
        getMatchAiRuntime(state).intentStick.delete(champion.id);
      }
      if (t < 210) {
        clearScore += 32;
      }
      if (champion.level < 6 && t > 180) {
        clearScore += 36;
      }
      if (t >= 900) {
        clearScore += 12;
      }
      const pushedLaneOpen = state.champions.some((enemy) => {
        if (!enemy.alive || enemy.side === champion.side) {
          return false;
        }
        if (enemy.positionLabel === 'JUNGLE') {
          return false;
        }
        const lane =
          enemy.assignedLane ??
          (enemy.positionLabel === 'TOP'
            ? 'top'
            : enemy.positionLabel === 'BOT' || enemy.positionLabel === 'SUPPORT'
              ? 'bot'
              : 'mid');
        const progress = laneProgress(state, lane, enemy.position);
        const overextended =
          enemy.side === 'blue' ? progress > 0.4 : progress < 0.6;
        const enemyHp = enemy.hp / Math.max(1, enemy.maxHp);
        return (
          overextended &&
          (alliesNearPoint(state, champion.side, enemy.position, 1800) >= 1 ||
            enemyHp < 0.65)
        );
      });
      if (t > 140 && t < 420 && pushedLaneOpen && pace >= 0.7 && !behind) {
        clearScore *= Math.max(0.55, 0.82 - farmAhead * 0.2);
        const killLaneOpen = state.champions.some((enemy) => {
          if (!enemy.alive || enemy.side === champion.side || enemy.positionLabel === 'JUNGLE') {
            return false;
          }
          const enemyHp = enemy.hp / Math.max(1, enemy.maxHp);
          return (
            enemyHp < 0.55 &&
            (alliesNearPoint(state, champion.side, enemy.position, 1800) >= 1 ||
              dist(champion.position, enemy.position) < 2400)
          );
        });
        if (killLaneOpen) {
          clearScore *= Math.max(0.48, 0.78 - farmAhead * 0.22);
        }
      }
      if (champion.positionLabel === 'JUNGLE' && t > 150 && !behind) {
        let bestDanger = 0;
        for (const enemy of state.champions) {
          if (!enemy.alive || enemy.side === champion.side || enemy.positionLabel === 'JUNGLE') {
            continue;
          }
          if (!sameMapHalf(champion.position, enemy.position)) {
            continue;
          }
          const lane =
            enemy.assignedLane ??
            (enemy.positionLabel === 'TOP'
              ? 'top'
              : enemy.positionLabel === 'BOT' || enemy.positionLabel === 'SUPPORT'
                ? 'bot'
                : 'mid');
          const danger = championGankDangerIndex(state, enemy, lane);
          if (danger > bestDanger && dist(champion.position, enemy.position) < 3600) {
            bestDanger = danger;
          }
        }
        if (bestDanger >= 0.42) {
          clearScore *= Math.max(0.42, 0.88 - bestDanger * 0.55);
        }
      }
      if (t > 210 && t < 600) {
        clearScore *= 1.02 + farmBehind * 0.14 - farmAhead * 0.16;
      }
      if (t >= 600 && t < 900) {
        clearScore *= 0.94 + farmBehind * 0.14 - farmAhead * 0.2;
      }
      if (midLate) {
        clearScore *= 0.86 + farmBehind * 0.14 - farmAhead * 0.22;
      }
      if (farmAhead > 0.15 && t > 180) {
        clearScore *= Math.max(0.62, 1 - farmAhead * 0.28);
      }
      if (objUp && t > 300) {
        clearScore *= Math.max(0.7, 0.92 - Math.min(0.22, pace * 0.18));
      }
      if (overpace >= 1.15) {
        clearScore *= 1.05;
      }
      if (enemiesNear >= 1 && d > 700) {
        clearScore *= 0.55;
      }
      if (combatClass === 'tank' && t >= 210 && t < 900 && pace >= 0.85 && !behind) {
        clearScore *= 0.94;
      }
      const campTouched = state.monsters.some(
        (monster) =>
          monster.alive &&
          monster.campId === camp.campId &&
          (monster.aggroTargetId === champion.id ||
            monster.hp < monster.maxHp - 1 ||
            t - monster.lastCombatAt < 12),
      );
      if (campTouched && d < 1600) {
        clearScore += 56;
      }
      intents.push({
        kind: 'clear',
        score: Math.max(36, clearScore),
        camp,
      });
    } else {
      const waitCamp = nearestOwnCampAnchor(state, champion);
      if (waitCamp) {
        intents.push({
          kind: 'clear',
          score: 42 + slack * 7 + (behind ? 18 : 0),
          coverPoint: waitCamp,
        });
      }
    }
  }

  if (
    champion.positionLabel === 'TOP' ||
    champion.positionLabel === 'MID' ||
    champion.positionLabel === 'BOT' ||
    champion.positionLabel === 'SUPPORT'
  ) {
    const lane = laneIdOf(champion);
    const wave = assessChampionLaneWave(state, champion, lane);
    const assignment = getUnitAssignment(state, champion.id);
    const runtime = getMatchAiRuntime(state);
    const shoveForced = (runtime.shoveUntil.get(champion.id) ?? 0) > t;
    const objBoost = objectiveShoveBoost(state, lane);
    const setupBoost = assignment?.mission === 'setup-objective' ? 30 : 0;

    const prio = hasLanePriority(wave);
    if (wave.canPush && (wave.enemyCount > 0 || wave.zone !== 'enemy')) {
      let shoveScore =
        16 +
        laning * 8 +
        objBoost +
        setupBoost +
        (needsSiegeWave ? 26 : 0) +
        (wave.zone === 'own' ? 10 : wave.zone === 'river' ? 14 : 4) +
        (shoveForced ? 58 : 0) +
        (shouldSlowPush(wave) && (objBoost > 0 || setupBoost > 0 || shoveForced) ? 10 : 0) +
        matchup.ahead * matchup.pressure * 16 -
        matchup.deficit * 12 -
        matchup.expose * 14;
      if (champion.positionLabel === 'SUPPORT') {
        shoveScore *= 0.72;
      }
      if (early && objBoost < 12 && setupBoost === 0 && !shoveForced) {
        shoveScore *= 0.78;
      }
      if (hpRatio < 0.28) {
        shoveScore *= 0.18;
      }
      if (wave.isCrashingOuter && !shoveForced) {
        shoveScore *= 0.55;
      }
      const enemyOuter = state.structures.find(
        (structure) =>
          structure.alive &&
          structure.side !== champion.side &&
          structure.lane === lane &&
          structure.structureKind === 'outer_tower',
      );
      if (
        enemyOuter &&
        (enemyOuter.hp < enemyOuter.maxHp * 0.98 || enemyOuter.platesBroken > 0)
      ) {
        shoveScore += 48 + (1 - enemyOuter.hp / Math.max(1, enemyOuter.maxHp)) * 40;
      }
      if (prio && !shoveForced && objBoost < 8) {
        shoveScore *= 0.55;
      }
      if (!shoveForced) {
        shoveScore *= shoveSoft;
      }
      if (laneEnemy) {
        const foeHp = laneEnemy.hp / Math.max(1, laneEnemy.maxHp);
        const gap = dist(champion.position, laneEnemy.position);
        if (hpRatio < 0.52 && gap < 900) {
          shoveScore *= 0.35;
        } else if (hpRatio < foeHp - 0.12 && gap < 1000) {
          shoveScore *= 0.55;
        } else if (hpRatio > foeHp + 0.14 && gap < 1100) {
          shoveScore *= 1.18;
        }
      }
      if (t >= 900 && wave.zone === 'own' && wave.enemyCount >= 2) {
        shoveScore += 24 + wave.enemyCount * 5;
      }
      intents.push({ kind: 'wave_shove', score: shoveScore, minionLane: lane });
    }

    if (
      champion.positionLabel !== 'SUPPORT' &&
      t >= 90 &&
      (t < 960 || (wave.zone === 'own' && wave.enemyCount >= 2)) &&
      wave.canPush &&
      wave.enemyCount > 0 &&
      (wave.zone === 'own' || waveNearFreezeSpot(wave, champion.side)) &&
      objBoost < 18 &&
      setupBoost === 0 &&
      !shoveForced &&
      !needsSiegeWave &&
      !prio
    ) {
      let freezeScore =
        22 +
        laning * 16 +
        idLaning * 10 +
        (waveNearFreezeSpot(wave, champion.side) ? 24 : 8) +
        (wave.allyAdvantage > -0.8 && wave.allyAdvantage < 2.2 ? 14 : 0) +
        (hpRatio > 0.48 && laneEnemy ? 8 : 0) +
        (wave.enemyCount >= wave.allyCount ? 12 : 0) +
        (early ? 8 : 0) +
        matchup.deficit * 16 +
        matchup.expose * 10 -
        matchup.ahead * 8;
      if (laneEnemy) {
        const foeHp = laneEnemy.hp / Math.max(1, laneEnemy.maxHp);
        const gap = dist(champion.position, laneEnemy.position);
        if (hpRatio < 0.58 && gap < 950) {
          freezeScore += 18;
        }
        if (hpRatio < foeHp - 0.1) {
          freezeScore += 12;
        }
        if (wave.zone === 'own' && wave.enemyCount >= wave.allyCount) {
          freezeScore += 12;
        }
      }
      intents.push({ kind: 'wave_freeze', score: freezeScore, minionLane: lane });
    }
  }

  return intents;
}

function executeWaveOrFarm(
  state: GameState,
  champion: ChampionEntity,
  lane: LaneId,
  mode: 'default' | 'freeze' | 'shove',
  actionLabel: string,
  recorder?: ReplayRecorder,
): void {
  if (champion.positionLabel === 'SUPPORT') {
    const partner = duoPartner(state, champion);
    if (partner) {
      const pocket = stickyLaneStand(
        state,
        champion,
        humanizeLaneStand(
          state,
          champion,
          lane,
          faceOffLanePoint(state, champion, lane, partner.position),
        ),
      );
      const partnerGap = dist(champion.position, partner.position);
      if (partnerGap > 520 || dist(champion.position, pocket) > 160) {
        moveAlongLane(state, champion, lane, pocket, recorder);
        noteDecision(state, champion, 'lane', recorder);
        if (partnerGap > 420) {
          return;
        }
      }
    }
  }

  const wave = assessChampionLaneWave(state, champion, lane);
  const matchupWave = laneMatchupRead(state, champion, lane);
  const underOwnTowerFarm = state.structures.some(
    (structure) =>
      structure.alive &&
      structure.side === champion.side &&
      structure.ad > 0 &&
      dist(champion.position, structure.position) <= structure.range + 100,
  );
  const crashPush =
    wave.isCrashingOuter ||
    state.structures.some(
      (structure) =>
        structure.alive &&
        structure.side !== champion.side &&
        structure.lane === lane &&
        wavePressuringStructure(state, champion.side, structure) &&
        dist(champion.position, structure.position) < 1800,
    );
  const stand =
    mode === 'freeze'
      ? freezeStand(state, champion, lane, wave)
      : mode === 'shove' || (mode === 'default' && crashPush)
        ? shoveStand(state, champion, lane)
        : underOwnTowerFarm
          ? laningStand(state, champion, lane)
          : matchupWave.deficit >= 0.55 && wave.zone === 'enemy' && !crashPush
            ? cautiousXpStand(state, champion, lane)
            : laningStand(state, champion, lane);

  const hpRatioWave = champion.hp / Math.max(1, champion.maxHp);
  const minionThreat = enemyMinionThreatAt(state, champion.side, champion.position);
  if (
    hpRatioWave < 0.48 &&
    minionThreat >= 1 &&
    mode !== 'freeze' &&
    !underOwnTowerFarm &&
    !(mode === 'shove' && hpRatioWave >= 0.36 && minionThreat <= 2 && wave.zone !== 'enemy')
  ) {
    getMatchAiRuntime(state).intentStick.delete(champion.id);
    enterResetAggro(state, champion);
    const safeOwnWave = wave.zone === 'own' && hpRatioWave > 0.32;
    moveAlongLane(
      state,
      champion,
      lane,
      safeOwnWave
        ? dropMinionAggroPoint(state, champion)
        : softDisengagePos(state, champion, hpRatioWave < 0.34),
      recorder,
    );
    noteDecision(state, champion, safeOwnWave ? 'lane' : 'retreat', recorder);
    return;
  }
  if (underOwnTowerFarm) {
    enterTowerFarm(state, champion);
  } else if (mode === 'default' || mode === 'freeze') {
    enterLastHit(state, champion);
  }

  if (!canStayUnderEnemyTower(state, champion)) {
    getMatchAiRuntime(state).intentStick.delete(champion.id);
    moveAlongLane(state, champion, lane, softDisengagePos(state, champion, true), recorder);
    noteDecision(state, champion, 'tower_bail', recorder);
    return;
  }

  const pastSlack = mode === 'shove' || crashPush ? 0.08 : 0.04;
  if (
    mode !== 'shove' &&
    !crashPush &&
    isPastAlliedWave(state, champion, lane, champion.position, pastSlack) &&
    dist(champion.position, stand) > 120
  ) {
    moveAlongLane(state, champion, lane, stand, recorder);
    noteDecision(state, champion, actionLabel, recorder);
    return;
  }

  const hitMode: LastHitMode =
    mode === 'freeze' ? 'freeze' : mode === 'shove' || crashPush ? 'shove' : 'default';
  runLaningAttackMove(state, champion, lane, mode, hitMode, stand, actionLabel, recorder);
}

function runLaningAttackMove(
  state: GameState,
  champion: ChampionEntity,
  lane: LaneId,
  mode: 'default' | 'freeze' | 'shove',
  hitMode: LastHitMode,
  stand: { x: number; y: number },
  actionLabel: string,
  recorder?: ReplayRecorder,
  recordDecision = true,
  allowIdleReposition = true,
): void {
  const target = nearestFarmMinion(state, champion, lane, hitMode);
  const foe = nearestLaneEnemy(state, champion);
  const waveNow = assessChampionLaneWave(state, champion, lane);
  const expected = Math.max(40, champion.ad * (0.9 + champion.skills.laning / 250));
  const aaReady = state.scheduler.time >= champion.nextAttackAt;
  const selfHp = champion.hp / Math.max(1, champion.maxHp);
  const gapToTarget = target ? dist(champion.position, target.position) : Number.POSITIVE_INFINITY;
  const inAaRange = !!target && gapToTarget <= champion.attackRange + 40;
  const executeSoon =
    !!target && target.hp <= expected * (mode === 'freeze' ? 1.45 : mode === 'shove' ? 3.2 : 2.0);
  const foeGap = foe ? dist(champion.position, foe.position) : Number.POSITIVE_INFINITY;
  const ownSideSafeFarm =
    (waveNow.zone === 'own' || waveNow.zone === 'river') &&
    (!foe || foeGap > foe!.attackRange + 180);
  const hardScared =
    !!foe &&
    mode !== 'shove' &&
    selfHp < 0.38 &&
    foeGap < Math.max(420, foe.attackRange + 120);
  const softScared =
    !!foe &&
    mode !== 'shove' &&
    !executeSoon &&
    !ownSideSafeFarm &&
    foeGap < Math.max(460, foe.attackRange + 130) &&
    selfHp < foe.hp / Math.max(1, foe.maxHp) - 0.08;

  const finish = () => {
    if (recordDecision) {
      noteDecision(state, champion, actionLabel, recorder);
    } else {
      champion.currentAction = actionLabel;
    }
  };

  const crashTower = state.structures.find(
    (structure) =>
      structure.alive &&
      structure.side !== champion.side &&
      structure.lane === lane &&
      (structure.structureKind === 'outer_tower' ||
        structure.structureKind === 'inner_tower' ||
        structure.structureKind === 'inhib_tower') &&
      wavePressuringStructure(state, champion.side, structure) &&
      dist(champion.position, structure.position) <= champion.attackRange + 80,
  );
  if (
    crashTower &&
    aaReady &&
    (alliedMinionsCoveringTower(state, champion.side, crashTower) ||
      (crashTower.structureKind === 'outer_tower' &&
        alliedMinionPresentUnderTower(state, champion.side, crashTower))) &&
    !executeSoon
  ) {
    attackStructure(state, champion, crashTower, recorder);
    finish();
    return;
  }

  if (
    target &&
    !inAaRange &&
    (mode === 'shove' ||
      executeSoon ||
      gapToTarget <= champion.attackRange + 320 ||
      (ownSideSafeFarm && gapToTarget <= champion.attackRange + 420))
  ) {
    if (!hardScared && !(softScared && !executeSoon) && !underEnemyTower(state, champion)) {
      clickToward(state, champion, target.position, recorder, LANE_CLICK_STEP_CS);
      finish();
      return;
    }
  }

  if (!inAaRange && !hardScared && !underEnemyTower(state, champion)) {
    const waveGoal = enemyWaveAnchor(state, champion, lane);
    if (waveGoal) {
      const gapToWave = dist(champion.position, waveGoal);
      const softBlocksWalk =
        softScared &&
        !!foe &&
        foeGap < Math.max(500, foe.attackRange + 160);
      if (gapToWave > champion.attackRange + 120 && !softBlocksWalk) {
        clickToward(state, champion, waveGoal, recorder, LANE_CLICK_STEP_CS);
        finish();
        return;
      }
    }
  }

  if (target && inAaRange) {
    const didHit = aaReady ? tryLastHit(state, champion, target, recorder, hitMode) : false;
    const foeHp = foe ? foe.hp / Math.max(1, foe.maxHp) : 1;
    const scaredToTrade =
      !!foe &&
      dist(champion.position, foe.position) < Math.max(560, foe.attackRange + 180) &&
      (selfHp < 0.55 || selfHp < foeHp - 0.1);
    if (
      mode !== 'freeze' &&
      !didHit &&
      aaReady &&
      target.alive &&
      target.hp > champion.ad * (mode === 'shove' ? 1.05 : 1.35) &&
      !scaredToTrade &&
      state.rng() < (mode === 'shove' ? 0.72 : 0.34 + Math.min(0.3, state.scheduler.time / 2400))
    ) {
      castAbility(state, champion, 'Q', target, recorder);
      if (mode === 'shove' && state.rng() < 0.28) {
        castAbility(state, champion, 'W', target, recorder);
      }
    }
    const mayTradeUnderTower =
      !underEnemyTower(state, champion) && !enemyTowerAggroOn(state, champion)
        ? true
        : !!foe && canCommitDive(state, champion, foe);
    if (
      mode !== 'freeze' &&
      foe &&
      champion.positionLabel !== 'SUPPORT' &&
      dist(champion.position, foe.position) <= champion.attackRange + 80 &&
      !scaredToTrade &&
      mayTradeUnderTower &&
      aaReady &&
      !didHit
    ) {
      basicAttack(state, champion, foe, recorder);
      if (state.rng() < (mode === 'shove' ? 0.22 : 0.4)) {
        castAbility(state, champion, 'Q', foe, recorder);
      }
    }

    const foeThreat = foe
      ? foe.attackRange > 300
        ? foe.attackRange + 20
        : Math.max(170, foe.attackRange + 35)
      : 0;
    const inFoeThreat =
      !!foe && foeThreat > 0 && dist(champion.position, foe.position) < foeThreat * 0.78;
    const campingCs = inAaRange && target.alive && target.hp <= expected * 2.6;
    if (inFoeThreat && !executeSoon) {
      clickToward(state, champion, stand, recorder, LANE_CLICK_STEP);
    } else if (
      allowIdleReposition &&
      mode === 'shove' &&
      target.alive &&
      gapToTarget > champion.attackRange * 0.72
    ) {
      clickToward(state, champion, target.position, recorder, LANE_CLICK_STEP_CS);
    } else if (
      allowIdleReposition &&
      campingCs &&
      gapToTarget > champion.attackRange * 0.82
    ) {
      clickToward(state, champion, target.position, recorder, 120);
    } else if (allowIdleReposition && dist(champion.position, stand) > LANE_STAND_RECENTER) {
      clickToward(state, champion, stand, recorder, LANE_CLICK_STEP);
    }
    finish();
    return;
  }

  const canLaneTrade =
    !!foe &&
    (!underEnemyTower(state, champion) && !enemyTowerAggroOn(state, champion)
      ? true
      : canCommitDive(state, champion, foe));
  if (
    mode === 'default' &&
    foe &&
    champion.positionLabel !== 'SUPPORT' &&
    dist(champion.position, foe.position) <= champion.attackRange + 120 &&
    selfHp > 0.42 &&
    canLaneTrade &&
    aaReady &&
    recordDecision
  ) {
    fightTarget(state, champion, foe, 'trade', recorder);
    return;
  }

  if (allowIdleReposition && dist(champion.position, stand) > LANE_STAND_RECENTER) {
    clickToward(state, champion, stand, recorder, LANE_CLICK_STEP);
  }
  finish();
}

export function tickLaningMicro(state: GameState, recorder?: ReplayRecorder): void {
  beginWaveAssessFrame();
  try {
    for (const champion of state.champions) {
      if (!champion.alive || champion.recallPhase !== 'none') {
        continue;
      }
      if (champion.positionLabel === 'JUNGLE') {
        continue;
      }
      const action = champion.currentAction;
      if (
        action !== 'farm' &&
        action !== 'lane' &&
        action !== 'wave_freeze' &&
        action !== 'wave_shove' &&
        action !== 'siege'
      ) {
        continue;
      }
      const lane = laneIdOf(champion);
      const mode: 'default' | 'freeze' | 'shove' =
        action === 'wave_freeze' ? 'freeze' : action === 'wave_shove' || action === 'siege' ? 'shove' : 'default';
      const hitMode: LastHitMode = mode;
      const stand =
        mode === 'freeze'
          ? freezeStand(state, champion, lane, assessChampionLaneWave(state, champion, lane))
          : mode === 'shove'
            ? shoveStand(state, champion, lane)
            : laningStand(state, champion, lane);
      const farmTarget = nearestFarmMinion(state, champion, lane, hitMode);
      const inFarmRange =
        !!farmTarget &&
        dist(champion.position, farmTarget.position) <= champion.attackRange + 40;
      const foe = nearestLaneEnemy(state, champion);
      const foeThreat =
        foe && foe.attackRange > 300
          ? foe.attackRange + 20
          : foe
            ? Math.max(170, foe.attackRange + 35)
            : 0;
      const needKite =
        !!foe &&
        foeThreat > 0 &&
        dist(champion.position, foe.position) < foeThreat * 0.78;
      runLaningAttackMove(
        state,
        champion,
        lane,
        mode,
        hitMode,
        stand,
        action,
        recorder,
        false,
        !(inFarmRange && !needKite),
      );
    }
  } finally {
    endWaveAssessFrame();
  }
}

function tryShoveBeforeRecall(
  state: GameState,
  champion: ChampionEntity,
  hpRatio: number,
  recorder?: ReplayRecorder,
): boolean {
  if (champion.positionLabel === 'JUNGLE') {
    return false;
  }
  if (hpRatio < 0.26 || underEnemyTower(state, champion)) {
    getMatchAiRuntime(state).shoveUntil.delete(champion.id);
    return false;
  }
  const lane = laneIdOf(champion);
  const wave = assessChampionLaneWave(state, champion, lane);
  if (!waveNeedsShoveForRecall(wave)) {
    getMatchAiRuntime(state).shoveUntil.delete(champion.id);
    return false;
  }
  const runtime = getMatchAiRuntime(state);
  let until = runtime.shoveUntil.get(champion.id);
  if (until === undefined) {
    until = state.scheduler.time + SHOVE_BEFORE_RECALL_SEC;
    runtime.shoveUntil.set(champion.id, until);
  }
  if (state.scheduler.time >= until || wave.isCrashingOuter) {
    runtime.shoveUntil.delete(champion.id);
    return false;
  }
  executeWaveOrFarm(state, champion, lane, 'shove', 'wave_shove', recorder);
  return true;
}

function executeIntent(
  state: GameState,
  champion: ChampionEntity,
  intent: ScoredIntent,
  recorder?: ReplayRecorder,
): void {
  if (
    (intent.kind === 'farm' ||
      intent.kind === 'lane' ||
      intent.kind === 'wave_freeze' ||
      intent.kind === 'wave_shove' ||
      intent.kind === 'swap') &&
    intent.minionLane
  ) {
    if (intent.kind === 'swap') {
      commitLaneLease(state, champion, intent.minionLane, 24);
    }
    const mode =
      intent.kind === 'wave_freeze'
        ? 'freeze'
        : intent.kind === 'wave_shove' || intent.kind === 'swap'
          ? 'shove'
          : 'default';
    const label =
      intent.kind === 'wave_freeze'
        ? 'wave_freeze'
        : intent.kind === 'wave_shove'
          ? 'wave_shove'
          : intent.kind === 'swap'
            ? 'lane'
            : intent.kind === 'farm'
              ? 'farm'
              : 'lane';
    executeWaveOrFarm(state, champion, intent.minionLane, mode, label, recorder);
    return;
  }

  if (
    (intent.kind === 'trade' || intent.kind === 'gank' || intent.kind === 'skirmish') &&
    intent.enemy
  ) {
    if (
      intent.coverPoint &&
      dist(champion.position, intent.coverPoint) > 900 &&
      dist(champion.position, intent.enemy.position) > 1100
    ) {
      orderMove(
        state,
        champion,
        clampAwayFromEmptyEnemyTower(
          state,
          champion,
          intent.coverPoint,
          intent.enemy,
        ),
        recorder,
      );
      noteDecision(state, champion, 'defend', recorder);
      return;
    }
    const finishNow =
      isFinishableEnemy(champion, intent.enemy) ||
      intent.enemy.hp / Math.max(1, intent.enemy.maxHp) < 0.18;
    if (
      intent.kind === 'trade' ||
      shouldShortTrade(state, champion, intent.enemy, finishNow)
    ) {
      if (finishNow && canSafelyCommit(state, champion, intent.enemy, champion.hp / Math.max(1, champion.maxHp))) {
        fightTarget(state, champion, intent.enemy, 'fight', recorder);
      } else {
        executeShortTrade(state, champion, intent.enemy, recorder);
      }
      return;
    }
    fightTarget(state, champion, intent.enemy, intent.kind === 'gank' ? 'gank' : 'fight', recorder);
    return;
  }

  if (intent.kind === 'defend' && intent.structure) {
    const defendLane = intent.structure.lane ?? laneIdOf(champion);
    const nearbyEnemy = state.champions.find(
      (enemy) =>
        enemy.alive &&
        enemy.side !== champion.side &&
        dist(enemy.position, intent.structure!.position) < 1600,
    );
    if (nearbyEnemy) {
      fightTarget(state, champion, nearbyEnemy, 'defend', recorder);
      return;
    }
    if (dist(champion.position, intent.structure.position) > 420) {
      moveAlongLane(state, champion, defendLane, intent.structure.position, recorder);
    }
    noteDecision(state, champion, 'defend', recorder);
    return;
  }

  if (intent.kind === 'siege' && intent.structure) {
    const pressured = wavePressuringStructure(state, champion.side, intent.structure);
    const nexusFamily =
      intent.structure.structureKind === 'nexus' ||
      intent.structure.structureKind === 'nexus_tower';
    const siegeLane = intent.structure.lane ?? laneIdOf(champion);
    const crashWave = assessChampionLaneWave(state, champion, siegeLane);
    const crashingOuter =
      crashWave.isCrashingOuter && intent.structure.structureKind === 'outer_tower';
    const outerDamaged =
      intent.structure.structureKind === 'outer_tower' &&
      (intent.structure.hp < intent.structure.maxHp * 0.98 ||
        intent.structure.platesBroken > 0);
    const minionCover =
      alliedMinionsCoveringTower(state, champion.side, intent.structure) ||
      alliedMinionPresentUnderTower(state, champion.side, intent.structure);
    const waveCover = pressured || crashingOuter;
    const towerCover =
      intent.structure.ad <= 0 ||
      intent.structure.range <= 0 ||
      minionCover ||
      waveCover;
    if (!pressured && !nexusFamily && !crashingOuter && !outerDamaged) {
      const stand = escortSiegeStand(state, champion, intent.structure);
      if (dist(champion.position, stand) > 140) {
        moveAlongLane(state, champion, siegeLane, stand, recorder);
      }
      noteDecision(state, champion, 'siege', recorder);
      return;
    }
    if (!pressured && !nexusFamily && !crashingOuter && outerDamaged) {
      if (crashWave.enemyCount > 0 || crashWave.allyCount > 0) {
        executeWaveOrFarm(state, champion, siegeLane, 'shove', 'wave_shove', recorder);
        return;
      }
      const stand = escortSiegeStand(state, champion, intent.structure);
      if (dist(champion.position, stand) > 140) {
        moveAlongLane(state, champion, siegeLane, stand, recorder);
      }
      noteDecision(state, champion, 'siege', recorder);
      return;
    }
    const towerRange = intent.structure.range > 0 ? intent.structure.range : 750;
    const canHitNow = ((pressured || crashingOuter) && towerCover) || nexusFamily;
    const safeSiegeDist = canHitNow
      ? champion.attackRange + 60
      : Math.max(champion.attackRange + 60, towerRange + 40);
    const siegePoint = canHitNow
      ? intent.structure.position
      : escortSiegeStand(state, champion, intent.structure);
    if (dist(champion.position, intent.structure.position) > safeSiegeDist) {
      moveAlongLane(state, champion, siegeLane, siegePoint, recorder);
    } else if (canHitNow) {
      attackStructure(state, champion, intent.structure, recorder);
    } else {
      const stand = escortSiegeStand(state, champion, intent.structure);
      moveAlongLane(state, champion, siegeLane, stand, recorder);
    }
    noteDecision(state, champion, 'siege', recorder);
    return;
  }

  if (intent.kind === 'clear' && intent.coverPoint && !intent.camp) {
    orderMove(
      state,
      champion,
      clampAwayFromEmptyEnemyTower(state, champion, intent.coverPoint),
      recorder,
    );
    noteDecision(state, champion, 'path_camp', recorder);
    return;
  }

  if ((intent.kind === 'objective' || intent.kind === 'clear') && intent.camp) {
    runJungleClearStep(
      state,
      champion,
      intent.camp,
      (target) => {
        orderMove(
          state,
          champion,
          clampAwayFromEmptyEnemyTower(state, champion, target),
          recorder,
        );
      },
      recorder,
    );
    noteDecision(state, champion, intent.kind === 'objective' ? 'objective' : 'jungle', recorder);
    return;
  }

  moveAlongLane(state, champion, laneIdOf(champion), laneTarget(state, champion), recorder);
  noteDecision(state, champion, 'lane', recorder);
}

export function decideForChampion(
  state: GameState,
  champion: ChampionEntity,
  recorder?: ReplayRecorder,
  assignment: UnitAssignment | null = null,
): void {
  if (!champion.alive || state.ended) {
    return;
  }
  maybeLevel(champion);
  refreshLaningPhaseClock(state, champion);
  const invadeLease = getMatchAiRuntime(state).invadeRespond.get(champion.id);
  if (invadeLease && invadeLease.until > state.scheduler.time) {
    if (dist(champion.position, invadeLease.point) > 420) {
      orderMove(state, champion, invadeLease.point, recorder);
      noteDecision(state, champion, 'defend', recorder);
      return;
    }
  } else if (invadeLease) {
    getMatchAiRuntime(state).invadeRespond.delete(champion.id);
  }
  const closeout = getCloseoutPlan(state, champion.side);
  if (closeout && isCloseoutActive(state, champion.side)) {
    if (champion.recallPhase !== 'none' && champion.hp / Math.max(1, champion.maxHp) > 0.22) {
      cancelRecall(champion);
    }
    const target = closeoutTargetStructure(state, champion.side);
    const shoveLane =
      (target?.lane === 'top' || target?.lane === 'mid' || target?.lane === 'bot'
        ? target.lane
        : null) ??
      closeout.shoveLanes[0] ??
      laneIdOf(champion);
    const onShoveLane =
      champion.positionLabel === 'JUNGLE' ||
      closeout.shoveLanes.includes(laneIdOf(champion)) ||
      champion.positionLabel === 'MID' ||
      champion.positionLabel === 'SUPPORT' ||
      (champion.assignedLane != null && closeout.shoveLanes.includes(champion.assignedLane));
    if (
      target &&
      (closeout.stage === 'siege_nexus_towers' || closeout.stage === 'crack_nexus')
    ) {
      const pressured = wavePressuringStructure(state, champion.side, target);
      if (pressured || closeout.stage === 'crack_nexus' || closeout.stage === 'siege_nexus_towers') {
        const gap = dist(champion.position, target.position);
        const siegeLane = target.lane ?? shoveLane;
        if (gap > champion.attackRange + 80) {
          moveAlongLane(state, champion, siegeLane, target.position, recorder);
        } else {
          attackStructure(state, champion, target, recorder);
        }
        noteDecision(state, champion, 'siege', recorder);
        return;
      }
    }
    if ((closeout.stage === 'shove_lane' || !target) && onShoveLane) {
      executeWaveOrFarm(state, champion, shoveLane, 'shove', 'wave_shove', recorder);
      return;
    }
  }
  const hpRatio = champion.hp / Math.max(1, champion.maxHp);
  const laneEnemyPreview = nearestLaneEnemy(state, champion);
  const finishOpp = nearbyFinishOpportunity(state, champion, CONTACT_SOFT_RANGE);
  const winningTrade =
    (!!laneEnemyPreview &&
      laneEnemyPreview.hp / Math.max(1, laneEnemyPreview.maxHp) < hpRatio - 0.1) ||
    (!!finishOpp &&
      finishOpp.enemy.hp / Math.max(1, finishOpp.enemy.maxHp) < hpRatio - 0.08);
  const canFinish =
    (!!laneEnemyPreview &&
      (laneEnemyPreview.hp < laneEnemyPreview.maxHp * 0.14 || laneEnemyPreview.hp < 130)) ||
    (!!finishOpp && isFinishableEnemy(champion, finishOpp.enemy));

  if (
    champion.recallPhase === 'moving_home' &&
    hpRatio > 0.22 &&
    committedNexusSiege(state, champion)
  ) {
    cancelRecall(champion);
  }

  const lethal = isLethalDanger(state, champion, hpRatio);
  const hardContactEnemy = nearestVisibleEnemy(state, champion, CONTACT_HARD_RANGE);
  const safeHardFinish =
    !!hardContactEnemy &&
    canSafelyCommit(state, champion, hardContactEnemy.enemy, hpRatio) &&
    isFinishableEnemy(champion, hardContactEnemy.enemy);
  const safeSoftFinish =
    !!finishOpp && canSafelyCommit(state, champion, finishOpp.enemy, hpRatio);

  if (
    champion.recallPhase === 'moving_home' &&
    hpRatio > 0.4 &&
    !lethal &&
    safeHardFinish &&
    finishOpp &&
    finishOpp.dist <= CONTACT_HARD_RANGE
  ) {
    cancelRecall(champion);
  }

  if (handleRecallFlow(state, champion, recorder)) {
    return;
  }

  const fountain = fountainOf(state, champion);
  if (dist(champion.position, fountain) <= 700) {
    const prefer = shopPrefer(state, champion);
    if (canBuyAnyPreferred(state, champion, prefer)) {
      champion.hp = Math.min(champion.maxHp, Math.max(champion.hp, champion.maxHp * 0.95));
      buyAffordableItems(state, champion, prefer, recorder);
      maybeBuyControlWard(state, champion, recorder);
      if (canBuyAnyPreferred(state, champion, prefer) && champion.gold >= 300) {
        noteDecision(state, champion, 'shop', recorder);
        return;
      }
    }
  }

  if (maybeUseSummoners(state, champion, hpRatio, recorder)) {
    return;
  }

  const divePreview =
    (finishOpp &&
    coveringEnemyTower(state, champion.side, finishOpp.enemy.position, 80)
      ? finishOpp.enemy
      : null) ??
    (laneEnemyPreview &&
    coveringEnemyTower(state, champion.side, laneEnemyPreview.position, 80)
      ? laneEnemyPreview
      : nearestLaneEnemy(state, champion));
  if (!canStayUnderEnemyTower(state, champion, divePreview)) {
    const runtimeBail = getMatchAiRuntime(state);
    runtimeBail.intentStick.delete(champion.id);
    moveAlongLane(
      state,
      champion,
      laneIdOf(champion),
      softDisengagePos(state, champion, true),
      recorder,
    );
    noteDecision(state, champion, 'tower_bail', recorder);
    return;
  }

  const runtime = getMatchAiRuntime(state);
  const shoveUntil = runtime.shoveUntil.get(champion.id) ?? 0;
  if (shoveUntil > 0 && state.scheduler.time >= shoveUntil) {
    runtime.shoveUntil.delete(champion.id);
  }

  if (lethal && !safeHardFinish && !safeSoftFinish) {
    if (tryDisengage(state, champion, hpRatio, false, recorder)) {
      return;
    }
    if (wantsRecall(state, champion, hpRatio, false, false) || hpRatio < 0.34) {
      beginRecallIfSafe(state, champion, recorder);
      return;
    }
  }

  if (
    !(safeHardFinish && hpRatio > 0.34) &&
    wantsRecall(state, champion, hpRatio, canFinish && (safeHardFinish || safeSoftFinish), winningTrade)
  ) {
    if (tryShoveBeforeRecall(state, champion, hpRatio, recorder)) {
      return;
    }
    beginRecallIfSafe(state, champion, recorder);
    return;
  }

  if (hardContactEnemy && hpRatio > 0.28) {
    const towerBlocks =
      (underEnemyTower(state, champion) || !!enemyTowerAggroOn(state, champion)) &&
      !canCommitDive(state, champion, hardContactEnemy.enemy);
    if (!towerBlocks) {
      const canFinishContact = isFinishableEnemy(champion, hardContactEnemy.enemy);
      const safeCommit = canSafelyCommit(state, champion, hardContactEnemy.enemy, hpRatio);
      const contactRead = laneMatchupRead(state, champion);
      const commitFactor = hardContactCommitFactor(contactRead);
      const softDoomed = contactRead.deficit >= 0.7;
      const earlyLanePoke =
        !canFinishContact &&
        shouldShortTrade(state, champion, hardContactEnemy.enemy, false);
      const willing =
        canFinishContact ||
        (!softDoomed && hpRatio > 0.48 + contactRead.deficit * 0.16 && commitFactor >= 0.42) ||
        (hpRatio > 0.62 && commitFactor >= 0.55);
      if (earlyLanePoke) {
        runtime.intentStick.delete(champion.id);
        executeShortTrade(state, champion, hardContactEnemy.enemy, recorder);
        return;
      }
      if (safeCommit && willing) {
        runtime.intentStick.delete(champion.id);
        if (canFinishContact) {
          enterCommitAllIn(state, champion);
        }
        fightTarget(state, champion, hardContactEnemy.enemy, 'fight', recorder);
        return;
      }
    }
  }

  if (
    finishOpp &&
    safeSoftFinish &&
    hpRatio > 0.36 &&
    finishOpp.dist <= CONTACT_SOFT_RANGE
  ) {
    runtime.intentStick.delete(champion.id);
    fightTarget(state, champion, finishOpp.enemy, 'fight', recorder);
    return;
  }

  if (
    maybeResetLaneMinionAggro(
      state,
      champion,
      hpRatio,
      canFinish && (safeHardFinish || safeSoftFinish),
      recorder,
    )
  ) {
    return;
  }

  if (tryDisengage(state, champion, hpRatio, canFinish && (safeHardFinish || safeSoftFinish), recorder)) {
    return;
  }

  maybeActOnVision(state, champion, recorder);

  const mission = assignment ?? getUnitAssignment(state, champion.id);
  const intents = applyMissionBounds(
    state,
    champion,
    scoreIntents(state, champion, hpRatio),
    mission,
  );
  intents.sort((left, right) => right.score - left.score);
  const now = state.scheduler.time;
  const contactNow = nearestVisibleEnemy(state, champion, CONTACT_HARD_RANGE);
  let stick = runtime.intentStick.get(champion.id);
  if (
    contactNow &&
    stick &&
    (stick.kind === 'clear' ||
      stick.kind === 'farm' ||
      stick.kind === 'lane' ||
      stick.kind === 'wave_freeze' ||
      stick.kind === 'wave_shove')
  ) {
    runtime.intentStick.delete(champion.id);
    stick = undefined;
  }
  let best = intents[0];
  if (stick && stick.until > now) {
    const sticky = intents.find((intent) => intent.kind === stick.kind);
    if (sticky && sticky.score >= 8) {
      best = sticky;
    }
  }
  if (contactNow) {
    const fightIntent = intents.find(
      (intent) =>
        (intent.kind === 'skirmish' || intent.kind === 'trade' || intent.kind === 'gank') &&
        intent.enemy?.id === contactNow.enemy.id,
    );
    if (fightIntent && fightIntent.score >= 24) {
      best = fightIntent;
    }
  }
  if (!best || best.score < 8) {
    const lane = mission?.lane ?? laneIdOf(champion);
    const stand = laningStand(state, champion, lane);
    if (dist(champion.position, stand) > LANE_MOVE_MICRO) {
      moveAlongLane(state, champion, lane, stand, recorder);
    }
    noteDecision(state, champion, 'lane', recorder);
    return;
  }
  if (
    best.kind === 'farm' ||
    best.kind === 'lane' ||
    best.kind === 'wave_freeze' ||
    best.kind === 'wave_shove' ||
    best.kind === 'trade' ||
    best.kind === 'clear' ||
    best.kind === 'siege'
  ) {
    const clearStickSec =
      best.kind === 'siege'
        ? 12
        : best.kind === 'clear' && champion.positionLabel === 'JUNGLE'
          ? jungleFarmAheadAmount(jungleFarmPace(champion, now)) > 0.2
            ? 2.5
            : 4.5
          : best.kind === 'clear'
            ? 6
            : INTENT_STICK_SEC;
    const stickSec = clearStickSec;
    const keep =
      stick && stick.kind === best.kind && stick.until > now
        ? stick.until
        : now + stickSec;
    runtime.intentStick.set(champion.id, { kind: best.kind, until: keep });
  } else {
    runtime.intentStick.delete(champion.id);
  }
  executeIntent(state, champion, best, recorder);
}


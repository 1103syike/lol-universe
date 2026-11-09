import { combatProfile } from '../champion/combat-profile';
import { CHAMPION_KITS } from '../../../core/data/champion-kits';
import { axis01, championIdentity } from '../champion/identity-runtime';
import { basicAttack, castAbility, levelAbility } from '../combat/combat';
import {
  castBarrier,
  castCleanse,
  castExhaust,
  castFlash,
  castGhost,
  castHeal,
  castIgnite,
  castTeleport,
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
  nearestFriendlyCamp,
  runJungleClearStep,
  nearestObjectiveCamp,
  isObjectiveSetupWindow,
  objectiveWindowBoost,
} from '../jungle/jungle-system';
import { faceOffLanePoint, humanizeLaneStand } from '../map/lane-stand';
import { orderMove, orderMoveOnLane } from '../map/movement';
import { dist } from '../map/pathfinding';
import {
  alliedWaveAnchor,
  nearestEnemyMinionOnLane,
  tryLastHit,
  type LastHitMode,
} from '../minion/lane-system';
import {
  assessChampionLaneWave,
  freezeHoldProgress,
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
  return state.champions.filter(
    (enemy) => enemy.alive && enemy.side !== side && dist(enemy.position, point) < range,
  ).length;
}

function alliesNearPoint(
  state: GameState,
  side: ChampionEntity['side'],
  point: { x: number; y: number },
  range: number,
): number {
  return state.champions.filter(
    (ally) => ally.alive && ally.side === side && dist(ally.position, point) < range,
  ).length;
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
  if (
    assignment?.lane &&
    assignment.play !== 'hold-lanes' &&
    assignment.expiresAt > t
  ) {
    const coverCrossEarly =
      assignment.mission === 'cover-side' &&
      assignment.lane !== homeLane &&
      t < LANE_LOCK_UNTIL_SEC &&
      (champion.positionLabel === 'BOT' || champion.positionLabel === 'TOP');
    if (coverCrossEarly) {
      commitLaneLease(state, champion, homeLane, LANE_LOCK_UNTIL_SEC - t);
      return;
    }
    commitLaneLease(state, champion, assignment.lane, Math.max(4, assignment.expiresAt - t));
    return;
  }
  const dragon = state.monsters.find((monster) => monster.campId === 'dragon' && monster.alive);
  const dragonBoost = dragon ? objectiveWindowBoost(state, 'dragon') : 0;
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
    if (champion.positionLabel === 'BOT') {
      commitLaneLease(state, champion, 'bot');
      return;
    }
    if (
      (champion.positionLabel === 'MID' || champion.positionLabel === 'TOP') &&
      dragonBoost > 0.85
    ) {
      commitLaneLease(state, champion, 'bot', 18);
      return;
    }
  }

  if (champion.positionLabel === 'MID') {
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

const LANE_MOVE_DEADZONE = 70;
const LANE_MOVE_MICRO = 36;

function moveAlongLane(
  state: GameState,
  champion: ChampionEntity,
  lane: LaneId,
  target: { x: number; y: number },
  recorder?: ReplayRecorder,
): void {
  const gap = dist(champion.position, target);
  if (gap < LANE_MOVE_MICRO) {
    return;
  }
  if (champion.moving && champion.path.length > 0) {
    const currentEnd = champion.path[champion.path.length - 1];
    const endGap = dist(currentEnd, target);
    if (endGap < LANE_MOVE_DEADZONE && gap < LANE_MOVE_DEADZONE * 1.6) {
      return;
    }
  } else if (gap < LANE_MOVE_DEADZONE * 0.55) {
    return;
  }
  orderMoveOnLane(state, champion, lane, target, recorder);
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

function laningWaveAnchor(
  state: GameState,
  champion: ChampionEntity,
  lane: LaneId,
): { x: number; y: number } | null {
  const allies = state.minions.filter(
    (minion) => minion.alive && minion.side === champion.side && minion.lane === lane,
  );
  if (allies.length === 0) {
    return null;
  }
  const enemies = state.minions.filter(
    (minion) => minion.alive && minion.side !== champion.side && minion.lane === lane,
  );
  if (enemies.length === 0) {
    return alliedWaveAnchor(state, champion, lane);
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
  return { x: bestAlly.position.x, y: bestAlly.position.y };
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
  const deepCap = laningDeepCap(state, champion, lane);

  if (!ally && !hasEnemyWave) {
    progress = wait;
  } else if (allyProgress !== null) {
    if (champion.side === 'blue') {
      if (allyProgress < wait) {
        progress = wait;
      } else {
        progress = Math.min(progress, allyProgress + 0.05, deepCap - 0.04);
        progress = Math.max(progress, allyProgress - 0.04);
      }
    } else if (allyProgress > wait) {
      progress = wait;
    } else {
      progress = Math.max(progress, allyProgress - 0.05, deepCap + 0.04);
      progress = Math.min(progress, allyProgress + 0.04);
    }
  } else if (!ally && hasEnemyWave) {
    if (champion.side === 'blue') {
      progress = Math.min(progress, wait + 0.06, deepCap - 0.08);
    } else {
      progress = Math.max(progress, wait - 0.06, deepCap + 0.08);
    }
  }

  return pointOnLaneProgress(state, lane, progress) ?? wavePoint;
}

function laningStand(
  state: GameState,
  champion: ChampionEntity,
  lane: LaneId,
): { x: number; y: number } {
  const enemy = nearestEnemyMinionOnLane(state, champion, lane);
  const ally = laningWaveAnchor(state, champion, lane);
  let wavePoint: { x: number; y: number } | null = null;
  if (ally && enemy) {
    wavePoint = {
      x: ally.x * 0.65 + enemy.position.x * 0.35,
      y: ally.y * 0.65 + enemy.position.y * 0.35,
    };
  } else if (ally) {
    wavePoint = { ...ally };
  } else if (enemy) {
    wavePoint = { ...enemy.position };
  } else {
    const wait = outerWaitProgress(state, champion, lane);
    wavePoint = pointOnLaneProgress(state, lane, wait);
    if (!wavePoint) {
      return fountainOf(state, champion);
    }
  }
  wavePoint = clampStandToWave(state, champion, lane, wavePoint, ally, !!enemy);
  const stand = faceOffLanePoint(state, champion, lane, wavePoint);
  return humanizeLaneStand(state, champion, lane, stand);
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
  return humanizeLaneStand(
    state,
    champion,
    lane,
    faceOffLanePoint(state, champion, lane, point),
  );
}

function shoveStand(
  state: GameState,
  champion: ChampionEntity,
  lane: LaneId,
): { x: number; y: number } {
  const enemy = nearestEnemyMinionOnLane(state, champion, lane);
  const ally = laningWaveAnchor(state, champion, lane);
  let wavePoint: { x: number; y: number } | null = null;
  if (ally && enemy) {
    wavePoint = {
      x: ally.x * 0.4 + enemy.position.x * 0.6,
      y: ally.y * 0.4 + enemy.position.y * 0.6,
    };
  } else if (enemy) {
    wavePoint = { ...enemy.position };
  } else if (ally) {
    wavePoint = { ...ally };
  }
  if (!wavePoint) {
    return laningStand(state, champion, lane);
  }
  wavePoint = clampStandToWave(state, champion, lane, wavePoint, ally, !!enemy);
  return humanizeLaneStand(
    state,
    champion,
    lane,
    faceOffLanePoint(state, champion, lane, wavePoint),
  );
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
) {
  const target = nearestEnemyMinionOnLane(state, champion, lane);
  if (!target) {
    return null;
  }
  if (isPastAlliedWave(state, champion, lane, target.position, 0.06)) {
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
  const expected = champion.level;
  let invested = champion.abilities.reduce(
    (sum, ability) => sum + (ability.slot === 'P' ? 0 : ability.level),
    0,
  );
  const wantR =
    champion.level >= 16 ? 3 : champion.level >= 11 ? 2 : champion.level >= 6 ? 1 : 0;
  while (invested < expected) {
    let gained = false;
    const currentR = champion.abilities.find((ability) => ability.slot === 'R')?.level ?? 0;
    const order: Array<'Q' | 'W' | 'E' | 'R'> =
      currentR < wantR ? ['R', 'Q', 'E', 'W'] : ['Q', 'E', 'W', 'R'];
    for (const slot of order) {
      const before = champion.abilities.find((ability) => ability.slot === slot)?.level ?? 0;
      if (slot === 'R' && (champion.level < 6 || before >= wantR)) {
        continue;
      }
      levelAbility(champion, slot);
      const after = champion.abilities.find((ability) => ability.slot === slot)?.level ?? 0;
      if (after > before) {
        invested += 1;
        gained = true;
        break;
      }
    }
    if (!gained) {
      break;
    }
  }
}

function castKit(
  state: GameState,
  champion: ChampionEntity,
  enemy: ChampionEntity | MonsterEntity,
  recorder?: ReplayRecorder,
): void {
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

function canCommitDive(
  state: GameState,
  champion: ChampionEntity,
  enemy: ChampionEntity,
): boolean {
  const enemyHp = enemy.hp / Math.max(1, enemy.maxHp);
  const allies = alliesNearPoint(state, champion.side, enemy.position, 950);
  const enemies = enemiesNearPoint(state, champion.side, enemy.position, 1050);
  const hpRatio = champion.hp / Math.max(1, champion.maxHp);
  if (hpRatio < 0.52) {
    return false;
  }
  if (enemies > allies) {
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
  if (allies >= 2 && enemyHp < 0.45) {
    return true;
  }
  if (allies >= 1 && enemyHp < 0.3 && wave.isCrashingOuter) {
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

function nearbyAllies(state: GameState, champion: ChampionEntity, radius: number): number {
  let count = 0;
  for (const ally of state.champions) {
    if (!ally.alive || ally.side !== champion.side || ally.id === champion.id) {
      continue;
    }
    if (dist(champion.position, ally.position) <= radius) {
      count += 1;
    }
  }
  return count;
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
  let count = 0;
  for (const enemy of state.champions) {
    if (!enemy.alive || enemy.side === champion.side) {
      continue;
    }
    if (dist(champion.position, enemy.position) <= radius) {
      count += 1;
    }
  }
  return count;
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
  return point;
}

function fightTarget(
  state: GameState,
  champion: ChampionEntity,
  enemy: ChampionEntity,
  action: string,
  recorder?: ReplayRecorder,
): void {
  const dive = canCommitDive(state, champion, enemy);
  if (underEnemyTower(state, champion) && !dive) {
    orderMove(state, champion, softDisengagePos(state, champion, true), recorder);
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
  const step = deep ? 0.08 : 0.04;
  const retreat =
    champion.side === 'blue'
      ? Math.max(wait - (deep ? 0.08 : 0.02), current - step)
      : Math.min(wait + (deep ? 0.08 : 0.02), current + step);
  const index = Math.min(path.length - 1, Math.max(0, Math.round(retreat * (path.length - 1))));
  return humanizeLaneStand(state, champion, lane, faceOffLanePoint(state, champion, lane, path[index]));
}

function tryDisengage(
  state: GameState,
  champion: ChampionEntity,
  hpRatio: number,
  canFinish: boolean,
  recorder?: ReplayRecorder,
): boolean {
  if (canFinish && hpRatio > 0.38) {
    return false;
  }
  const enemy = nearestLaneEnemy(state, champion);
  const enemyNear = !!enemy && dist(champion.position, enemy.position) < 1100;
  const inFight =
    champion.currentAction === 'fight' ||
    champion.currentAction === 'trade' ||
    champion.currentAction === 'gank' ||
    champion.currentAction === 'skirmish';
  const outnumbered =
    nearbyEnemies(state, champion, 1200) > nearbyAllies(state, champion, 1200) + 1;
  const underTower = underEnemyTower(state, champion);
  const profile = combatProfile(state, champion);
  const enemyHp = enemy ? enemy.hp / Math.max(1, enemy.maxHp) : 1;
  const winning = !!enemy && enemyHp < hpRatio - 0.12;
  const leaveHp = winning
    ? profile.disengageHp - 0.04 * profile.allInAppetite
    : profile.disengageHp + 0.06;
  const supportEarly =
    champion.positionLabel === 'SUPPORT' && state.scheduler.time < 360;
  const supportAlone =
    champion.positionLabel === 'SUPPORT' &&
    nearbyAllies(state, champion, 1000) === 0 &&
    enemyNear;
  const shouldLeave =
    (enemyNear || inFight || underTower || outnumbered || supportAlone) &&
    ((!canFinish && hpRatio < leaveHp) ||
      (!canFinish && outnumbered) ||
      (!canFinish && underTower) ||
      (hpRatio < 0.42 && !winning) ||
      (hpRatio < 0.34 && !canFinish) ||
      (supportEarly && hpRatio < 0.72 && enemyNear) ||
      (supportAlone && hpRatio < 0.85));
  if (!shouldLeave) {
    return false;
  }
  const deep = hpRatio < 0.4 || outnumbered || underTower;
  moveAlongLane(state, champion, laneIdOf(champion), softDisengagePos(state, champion, deep), recorder);
  noteDecision(state, champion, 'lane', recorder);
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

function recallSpotDangerous(state: GameState, champion: ChampionEntity): boolean {
  if (underEnemyTower(state, champion)) {
    return true;
  }
  if (nearbyEnemies(state, champion, 850) >= 2) {
    return true;
  }
  if (nearbyEnemies(state, champion, 700) >= 1 && nearbyAllies(state, champion, 750) === 0) {
    return true;
  }
  const lane = laneIdOf(champion);
  const progress = laneProgress(state, lane, champion.position);
  const wait = outerWaitProgress(state, champion, lane);
  if (champion.side === 'blue') {
    return progress > wait + 0.06;
  }
  return progress < wait - 0.06;
}

function safeRecallPos(state: GameState, champion: ChampionEntity) {
  const lane = laneIdOf(champion);
  const path = state.lockedPack.map.lanePaths[lane];
  if (!path || path.length === 0) {
    return fountainOf(state, champion);
  }
  const current = laneProgress(state, lane, champion.position);
  const wait = outerWaitProgress(state, champion, lane);
  const pocket =
    champion.side === 'blue'
      ? Math.min(current, Math.max(0.04, wait - 0.07))
      : Math.max(current, Math.min(0.96, wait + 0.07));
  const index = Math.min(path.length - 1, Math.max(0, Math.round(pocket * (path.length - 1))));
  return humanizeLaneStand(state, champion, lane, faceOffLanePoint(state, champion, lane, path[index]));
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

  if (dangerous) {
    return false;
  }

  if (hpRatio < 0.4 && !winningTrade && !canFinish) {
    return true;
  }

  const prefer = shopPrefer(state, champion);
  const pending = nextPendingPurchase(state, champion, prefer);
  const shopSpend = nextFocusPurchaseCost(state, champion, prefer);
  const meaningful = hasMeaningfulShopBuy(state, champion, prefer);

  if (
    pending &&
    pending.deficit > 0 &&
    pending.deficit <= 220 &&
    hpRatio > 0.4 &&
    !winningTrade
  ) {
    return false;
  }

  if (!waveOk && hpRatio > 0.42 && !(meaningful && shopSpend >= 1400)) {
    return false;
  }

  if (champion.recallCount > 3 + Math.floor(state.scheduler.time / 210) && hpRatio > 0.32) {
    return false;
  }

  if (canFinishPreferredLegendary(state, champion, prefer) && !canFinish && waveOk) {
    return true;
  }
  if (shopSpend >= 1200 && meaningful && !winningTrade && !canFinish && (waveOk || hpRatio < 0.5)) {
    return true;
  }
  if (meaningful && hpRatio < 0.42 && !winningTrade && champion.positionLabel !== 'JUNGLE') {
    return true;
  }
  if (champion.positionLabel === 'JUNGLE') {
    const campUp = nearestFriendlyCamp(state, champion);
    const clearingNow = isClearingCamp(state, champion) || (!!campUp && dist(champion.position, campUp.position) < 750);
    if (clearingNow && hpRatio > 0.34 && champion.gold < 2800) {
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
    if (!winningTrade && meaningful && champion.gold >= 1100 && hpRatio < 0.48 && waveOk) {
      return true;
    }
    if (meaningful && champion.gold >= 1600 && shopSpend >= 900 && waveOk) {
      return true;
    }
    return false;
  }
  if (!winningTrade && meaningful && champion.gold >= 1500 && hpRatio < 0.55 && waveOk) {
    return true;
  }
  if (meaningful && champion.gold >= 2000 && waveOk) {
    return true;
  }
  return false;
}

function cancelRecall(champion: ChampionEntity): void {
  champion.recallPhase = 'none';
  champion.recallChannelUntil = 0;
  champion.recallChannelDuration = 0;
  champion.recallHpSnapshot = 0;
  if (champion.currentAction === 'recall') {
    champion.currentAction = 'idle';
  }
}

function bestTeleportDestination(
  state: GameState,
  champion: ChampionEntity,
): { x: number; y: number } | null {
  const lane = laneIdOf(champion);
  const allyOuter = state.structures.find(
    (structure) =>
      structure.alive &&
      structure.side === champion.side &&
      structure.lane === lane &&
      structure.structureKind === 'outer_tower',
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
    hpRatio < 0.35 &&
    enemyCount >= 2 &&
    hasSummoner(champion, 'Flash') &&
    summonerReady(state, champion, 'Flash')
  ) {
    const fountain = fountainOf(state, champion);
    return castFlash(state, champion, fountain, recorder);
  }

  if (
    enemy &&
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
    champion.positionLabel === 'TOP' &&
    state.scheduler.time >= 480 &&
    hasSummoner(champion, 'Teleport') &&
    summonerReady(state, champion, 'Teleport')
  ) {
    const dest = bestTeleportDestination(state, champion);
    const assignment = getUnitAssignment(state, champion.id);
    const wantRotate =
      assignment?.mission === 'setup-objective' ||
      assignment?.mission === 'take-objective' ||
      assignment?.play === 'defend-base';
    if (dest && wantRotate && dist(champion.position, dest) > 3200) {
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
  if (champion.currentAction === 'teleport') {
    return finishTeleportIfReady(state, champion, recorder);
  }

  const fountain = fountainOf(state, champion);
  const atFountain = dist(champion.position, fountain) < 520;

  if (champion.recallPhase === 'moving_home') {
    if (champion.teleportDestination) {
      return finishTeleportIfReady(state, champion, recorder);
    }
    if (atFountain) {
      champion.recallPhase = 'at_base';
      champion.moving = false;
      champion.path = [];
      champion.recallChannelUntil = 0;
      champion.recallChannelDuration = 0;
      noteDecision(state, champion, 'recall', recorder);
      return true;
    }
    if (
      recallInterruptible(state, champion) &&
      champion.hp + 0.5 < champion.recallHpSnapshot
    ) {
      cancelRecall(champion);
      return false;
    }
    if (champion.moving || champion.path.length > 0) {
      champion.moving = false;
      champion.path = [];
    }
    if (state.scheduler.time >= champion.recallChannelUntil) {
      champion.position = { ...fountain };
      champion.moving = false;
      champion.path = [];
      champion.recallPhase = 'at_base';
      champion.recallChannelUntil = 0;
      champion.recallChannelDuration = 0;
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
  const nexusWaveReady =
    !!openEnemyNexus &&
    wavePressuringStructure(state, champion.side, openEnemyNexus);
  const needsSiegeWave = !!openEnemyNexus && !nexusWaveReady && t >= 1200;
  const closeoutFightScale = (enemyPos?: { x: number; y: number }): number => {
    if (t < 1200) {
      return 1;
    }
    if (!openEnemyNexus) {
      return t >= 1500 ? 0.55 : 0.8;
    }
    if (nexusWaveReady) {
      if (!enemyPos) {
        return 0.8;
      }
      return dist(enemyPos, openEnemyNexus.position) < BASE_SIEGE_PRESENCE_RANGE + 400
        ? 1.05
        : 0.4;
    }
    return 0.3;
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
      const pressuredSiege = state.structures.some(
        (structure) =>
          structure.alive &&
          structure.side !== champion.side &&
          wavePressuringStructure(state, champion.side, structure) &&
          dist(champion.position, structure.position) < 1600,
      );
      const lateFarmCut = pressuredSiege ? (t > 1200 ? 35 : 22) : t > 1500 ? 12 : 0;
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
      const tradeContest =
        champion.positionLabel === 'BOT'
          ? tradeContestRaw * 0.42
          : champion.positionLabel === 'TOP'
            ? tradeContestRaw * 0.55
            : champion.positionLabel === 'MID'
              ? tradeContestRaw * 1.15
              : tradeContestRaw;
      const farmWave = assessChampionLaneWave(state, champion, lane);
      const towerDiveFarm =
        underEnemyTower(state, champion) && !farmWave.isCrashingOuter ? 55 : 0;
      intents.push({
        kind: 'farm',
        score:
          68 +
          laning * 28 +
          idLaning * 18 +
          execute +
          roleFarm +
          phaseFarm -
          lateFarmCut -
          tradeContest -
          towerDiveFarm -
          (laneEnemy && !early && !execute ? 8 : 0) +
          (midLate && idSplit > 0.7 ? 6 : 0) +
          (needsSiegeWave ? 28 : 0),
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
          (champion.positionLabel === 'BOT' ? 12 : 0),
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
    const farmDebtNow = Math.max(
      0,
      (t < 600 ? 14 : t < 900 ? 20 : t < 1200 ? 26 : 32) - champion.campKills,
    );
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
          (farmDebtNow <= 0 ? 22 : farmDebtNow <= 1 ? 12 : 0),
        minionLane: bestLane,
      });
    }
  }

  if (laneEnemy && hpRatio > 0.58 && t > 180) {
    const profile = combatProfile(state, champion);
    const enemyHp = laneEnemy.hp / Math.max(1, laneEnemy.maxHp);
    const d = dist(champion.position, laneEnemy.position);
    const canFinish = enemyHp < 0.1 || laneEnemy.hp < champion.ad * 1.05;
    const winning = enemyHp < hpRatio - 0.22;
    const inRange = d < champion.attackRange + 180;
    const tradeOverpace = killOverpace(state);
    const partner = champion.positionLabel === 'SUPPORT' ? duoPartner(state, champion) : null;
    const partnerNear =
      !!partner && dist(champion.position, partner.position) <= 950;
    let tradeScore =
      12 +
      laning * 6 +
      idSkirmish * 5 +
      profile.pokeAppetite * 14 +
      profile.allInAppetite * 5 +
      (winning ? 5 + profile.allInAppetite * 5 : 0) +
      (canFinish ? 28 + idCloseout * 12 : 0);
    if (champion.positionLabel === 'BOT') {
      tradeScore += profile.pokeAppetite * 2;
      if (!canFinish && t < 720) {
        tradeScore *= 0.72;
      }
    } else if (champion.positionLabel === 'TOP') {
      tradeScore += 3 + profile.pokeAppetite * 5;
    } else if (champion.positionLabel === 'MID') {
      tradeScore *= 0.65;
    } else if (champion.positionLabel === 'SUPPORT') {
      tradeScore *= partnerNear ? 0.4 : 0.08;
      if (t < 300 && !canFinish) {
        tradeScore *= 0.08;
      }
      if (enemiesNear > allies) {
        tradeScore *= 0.15;
      }
    }
    if (inRange && canFinish) {
      tradeScore += 12;
    }
    if (!canFinish && inRange) {
      tradeScore += (early ? 3 : 6) + profile.pokeAppetite * 4;
    }
    if (early && !canFinish) {
      tradeScore *= 0.2;
    }
    if (t < 420 && !canFinish) {
      tradeScore *= 0.18;
    }
    if (underEnemyTower(state, champion) && !canFinish) {
      tradeScore -= 80;
    }
    if (
      coveringEnemyTower(state, champion.side, laneEnemy.position, 40) &&
      !canCommitDive(state, champion, laneEnemy) &&
      !canFinish
    ) {
      tradeScore *= 0.12;
    }
    if (enemiesNear > allies) {
      tradeScore -= 42 + sense * 14;
    }
    if (hpRatio < profile.disengageHp + 0.08 && !canFinish) {
      tradeScore *= 0.2;
    }
    if (tradeOverpace >= 1.1 && !canFinish) {
      tradeScore *= tradeOverpace >= 1.25 ? 0.25 : 0.5;
    }
    if (tradeScore >= 14) {
      intents.push({ kind: 'trade', score: tradeScore, enemy: laneEnemy });
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
      const gankRange =
        champion.positionLabel === 'JUNGLE' ? (t < 360 ? 4200 : 3600) : 2200;
      if (d > gankRange) {
        continue;
      }
      const enemyLane =
        enemy.assignedLane ??
        (enemy.positionLabel === 'TOP'
          ? 'top'
          : enemy.positionLabel === 'BOT' || enemy.positionLabel === 'SUPPORT'
            ? 'bot'
            : 'mid');
      const progress = laneProgress(state, enemyLane, enemy.position);
      const pushed =
        enemy.side === 'blue' ? progress > 0.48 : progress < 0.52;
      const overextended =
        pushed ||
        (enemy.side === 'blue' ? progress > 0.4 : progress < 0.6);
      const allyNear = alliesNearPoint(state, champion.side, enemy.position, 1400);
      const enemyNear = enemiesNearPoint(state, champion.side, enemy.position, 1500);
      const hpGate =
        champion.positionLabel === 'JUNGLE'
          ? overextended
            ? 0.95
            : allyNear >= 1
              ? 0.85
              : 0.72
          : 0.58;
      if (enemyHp > hpGate) {
        continue;
      }
      if (enemyNear >= allyNear + 2) {
        continue;
      }
      if (champion.positionLabel === 'JUNGLE' && !overextended && allyNear < 1) {
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
        (pushed ? 34 : overextended ? 18 : -10) +
        (1 - enemyHp) * 22 +
        sense * 12 +
        idGank * 28 +
        idSkirmish * 10 +
        (d < 1600 ? 14 : 0) +
        allyNear * 14 -
        enemyNear * 12 +
        (champion.positionLabel === 'JUNGLE' ? 28 : 0) -
        risk * 8 +
        laneVision * 5;
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
        score *= champion.positionLabel === 'JUNGLE' ? 0.85 : 0.55;
      }
      if (champion.positionLabel === 'JUNGLE') {
        const expectedCamps =
          t < 180 ? 5 : t < 360 ? 9 : t < 600 ? 14 : t < 900 ? 20 : t < 1200 ? 26 : 32;
        const farmDebt = Math.max(0, expectedCamps - champion.campKills);
        const behind = champion.deaths >= champion.kills + 1;
        if (farmDebt >= 5 || (behind && farmDebt >= 3)) {
          score *= 0.32;
        } else if (farmDebt >= 3) {
          score *= 0.55;
        } else if (farmDebt >= 2) {
          score *= 0.78;
        }
        if (t < 180 && champion.campKills < 4) {
          score *= 0.45;
        }
        if (farmDebt <= 0 && !behind) {
          score += 26;
        } else if (farmDebt <= 1 && !behind) {
          score += 16;
        }
        if (enemyHp <= 0.55 && farmDebt < 3 && overextended) {
          score += 20;
        }
        if (allyNear >= 1 && overextended && farmDebt < 3 && !behind) {
          score += 22;
        }
        if (champion.campKills >= 5 && overextended && farmDebt <= 1 && !behind) {
          score += 20;
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
    if (bestGank && hpRatio > (champion.positionLabel === 'JUNGLE' ? 0.42 : 0.58) && overpace < 1.45) {
      intents.push({
        kind: 'gank',
        score:
          bestGankScore *
          (champion.positionLabel === 'JUNGLE' ? 1.12 : 0.72) *
          closeoutFightScale(bestGank.position),
        enemy: bestGank,
      });
    }
  }

  const jungleThreat = findJungleInvadeThreat(state, champion);
  if (jungleThreat && t > 110) {
    const cover = visionCoverScore(state, champion, jungleThreat);
    if (cover >= 18) {
      intents.push({
        kind: 'skirmish',
        score: cover,
        enemy: jungleThreat.enemy,
        coverPoint: jungleThreat.point,
      });
    }
  }

  const laningLock = t < 480;
  const known = knownEnemies(champion, t);
  if (!laningLock && known.length > 0 && hpRatio > 0.62 && t > 300) {
    const enemy = state.champions.find((item) => item.id === known[0] && item.alive);
    if (enemy) {
      const d = dist(champion.position, enemy.position);
      const numbers = allies - enemiesNear;
      const overpace = killOverpace(state);
      if (d < 1400 && numbers >= 0) {
        let score =
          18 +
          teamfight * 12 +
          idTeamfight * 10 +
          idCloseout * 8 +
          numbers * 10 +
          (enemy.hp < 280 ? 16 + idCloseout * 12 : 0);
        if (early) {
          score *= 0.25;
        }
        if (numbers < 1) {
          score *= 0.4;
        }
        if (
          (champion.positionLabel === 'BOT' || champion.positionLabel === 'MID') &&
          t < 900
        ) {
          score *= 0.4;
        }
        if (hpRatio < 0.75) {
          score *= 0.45;
        }
        if (overpace >= 1.05) {
          score *= overpace >= 1.25 ? 0.2 : overpace >= 1.12 ? 0.4 : 0.55;
        }
        score *= 0.55;
        score *= closeoutFightScale(enemy.position);
        if (score >= 14) {
          intents.push({ kind: 'skirmish', score, enemy });
        }
      }
    }
  }
  if (!laningLock && enemiesNear >= 2 && allies >= 2 && hpRatio > 0.65 && t > 540) {
    const clusterEnemy = state.champions.find(
      (enemy) =>
        enemy.alive &&
        enemy.side !== champion.side &&
        dist(champion.position, enemy.position) < 1100,
    );
    if (clusterEnemy) {
      let clusterScore =
        16 + teamfight * 12 + idTeamfight * 10 + allies * 5 + (midLate ? 8 : 0);
      if (enemiesNear > allies) {
        clusterScore *= 0.22;
      }
      if ((champion.positionLabel === 'BOT' || champion.positionLabel === 'MID') && t < 900) {
        clusterScore *= 0.4;
      }
      if (early) {
        clusterScore *= 0.35;
      }
      const clusterOverpace = killOverpace(state);
      if (clusterOverpace >= 1.1) {
        clusterScore *= clusterOverpace >= 1.25 ? 0.25 : 0.5;
      }
      clusterScore *= 0.55;
      clusterScore *= closeoutFightScale(clusterEnemy.position);
      if (clusterScore >= 12) {
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
        focus.currentAction === 'fight' ||
        focus.currentAction === 'trade' ||
        focus.currentAction === 'skirmish' ||
        dist(ally.position, focus.position) < Math.max(ally.attackRange, focus.attackRange) + 160;
      if (!allyFighting) {
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
      const sideRotate =
        champion.positionLabel === 'MID' && laneIdOf(focus) !== 'mid';
      let joinScore = 26 + teamfight * 14 + sense * 10;
      if (champion.positionLabel === 'JUNGLE' || champion.positionLabel === 'SUPPORT') {
        joinScore += 12;
      }
      if (sideRotate) {
        joinScore += 55 + sense * 12;
      }
      if (champion.positionLabel === 'JUNGLE') {
        joinScore += 24;
      }
      if (midLate) {
        joinScore += 6;
      }
      if (laningLock && !sideRotate) {
        joinScore *= 0.45;
      }
      if (early && !sideRotate) {
        joinScore *= champion.positionLabel === 'JUNGLE' ? 0.75 : 0.5;
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
    const d = dist(champion.position, structure.position);
    const team = champion.side === 'blue' ? state.blue : state.red;
    let siegeScore =
      (pressured ? 72 : 10) +
      (t > 480 ? 18 : 0) +
      (t > 900 ? 26 : 0) +
      (midLate ? 36 : 0) +
      idSplit * 18 +
      idCloseout * 16;
    if (d < 1400 && pressured) {
      siegeScore += 34;
    }
    if (t > 1500) {
      siegeScore += 48 + idCloseout * 24;
    }
    if (team.hasBaron && pressured) {
      siegeScore += 55;
    }
    if (
      structure.structureKind === 'nexus_tower' ||
      structure.structureKind === 'inhibitor' ||
      structure.structureKind === 'nexus'
    ) {
      siegeScore += 30;
    }
    if (isNexusSiegeStructure(structure) && pressured) {
      siegeScore += 70;
    }
    if (!pressured) {
      siegeScore *= early ? 0.25 : 0.55;
    } else if (early) {
      siegeScore *= 0.9;
    } else {
      siegeScore *= 1.12;
    }
    if (pressured && champion.positionLabel !== 'SUPPORT') {
      siegeScore += 16 + idCloseout * 10;
    }
    const homeWave = assessChampionLaneWave(state, champion, laneIdOf(champion));
    if (homeWave.isCrashingOuter && pressured) {
      siegeScore += 28 + idCloseout * 8;
    }
    if (baseThreat) {
      siegeScore *= 0.2;
    }
    if (pressured || midLate || team.hasBaron) {
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
      (objective.campId === 'dragon' ? 40 : 0) +
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
    if (midLate && (objective.campId === 'dragon' || objective.campId === 'baron')) {
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
        objScore *= champion.campKills < 3 && t < 480 ? 0.28 : 0.4;
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
          monster.campId === 'herald' ||
          monster.campId === 'baron'),
    );
    const expectedCamps =
      t < 180 ? 5 : t < 360 ? 9 : t < 600 ? 14 : t < 900 ? 20 : t < 1200 ? 26 : 32;
    const farmDebt = Math.max(0, expectedCamps - champion.campKills);
    const behind = champion.deaths >= champion.kills + 1;
    if (camp) {
      const d = dist(champion.position, camp.position);
      const overpace = killOverpace(state);
      const risk = invadeRisk(state, champion, camp.position);
      const combatClass = CHAMPION_KITS[champion.championId]?.combatClass ?? 'fighter';
      let clearScore = 72 + sense * 6 - d / 200 + (early ? 30 : 0) - risk * 8;
      clearScore += farmDebt * 26 + (behind ? 32 : 0);
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
      if (
        t > 140 &&
        t < 360 &&
        champion.campKills >= 5 &&
        pushedLaneOpen &&
        farmDebt < 1 &&
        !behind
      ) {
        clearScore *= 0.62;
      }
      if (t > 210 && t < 600) {
        clearScore *= farmDebt >= 2 || behind ? 1.08 : 0.9;
      }
      if (t >= 600 && t < 900) {
        clearScore *= farmDebt >= 2 || behind ? 1.02 : 0.84;
      }
      if (midLate) {
        clearScore *= farmDebt >= 2 || behind ? 0.96 : 0.78;
      }
      if (objUp && t > 300) {
        clearScore *= farmDebt >= 3 || behind ? 0.9 : farmDebt >= 1 ? 0.72 : 0.55;
      }
      if (overpace >= 1.15) {
        clearScore *= 1.05;
      }
      if (enemiesNear >= 1 && d > 700) {
        clearScore *= 0.5;
      }
      if (combatClass === 'tank' && t >= 210 && t < 900 && farmDebt < 2 && !behind) {
        clearScore *= 0.88;
      }
      if (champion.campKills >= 5 && pushedLaneOpen && farmDebt < 1 && !behind) {
        clearScore *= 0.68;
      }
      if (champion.campKills >= 12 && farmDebt <= 0 && !behind) {
        clearScore *= 0.8;
      }
      if (
        farmDebt <= 0 &&
        !behind &&
        champion.campKills > 0 &&
        champion.campKills % 4 === 0 &&
        pushedLaneOpen
      ) {
        clearScore *= 0.78;
      }
      if (farmDebt <= 0 && pushedLaneOpen && !behind) {
        clearScore = Math.min(clearScore, 82);
      }
      intents.push({
        kind: 'clear',
        score: Math.max(28, clearScore),
        camp,
      });
    } else {
      const waitCamp = nearestOwnCampAnchor(state, champion);
      if (waitCamp) {
        intents.push({
          kind: 'clear',
          score: 42 + farmDebt * 8 + (behind ? 18 : 0),
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

    if (
      wave.canPush &&
      (!wave.isCrashingOuter || shoveForced) &&
      (wave.enemyCount > 0 || wave.zone !== 'enemy')
    ) {
      let shoveScore =
        16 +
        laning * 8 +
        objBoost +
        setupBoost +
        (needsSiegeWave ? 26 : 0) +
        (wave.zone === 'own' ? 10 : wave.zone === 'river' ? 14 : 4) +
        (shoveForced ? 58 : 0);
      if (champion.positionLabel === 'SUPPORT') {
        shoveScore *= 0.72;
      }
      if (early && objBoost < 12 && setupBoost === 0 && !shoveForced) {
        shoveScore *= 0.42;
      }
      if (hpRatio < 0.28) {
        shoveScore *= 0.18;
      }
      if (wave.isCrashingOuter && !shoveForced) {
        shoveScore *= 0.25;
      }
      intents.push({ kind: 'wave_shove', score: shoveScore, minionLane: lane });
    }

    if (
      champion.positionLabel !== 'SUPPORT' &&
      t >= 90 &&
      t < 960 &&
      wave.canPush &&
      wave.enemyCount > 0 &&
      (wave.zone === 'own' || waveNearFreezeSpot(wave, champion.side)) &&
      objBoost < 18 &&
      setupBoost === 0 &&
      !shoveForced &&
      !needsSiegeWave
    ) {
      let freezeScore =
        22 +
        laning * 16 +
        idLaning * 10 +
        (waveNearFreezeSpot(wave, champion.side) ? 20 : 8) +
        (wave.allyAdvantage > -0.8 && wave.allyAdvantage < 2.2 ? 12 : 0) +
        (hpRatio > 0.48 && laneEnemy ? 8 : 0) +
        (wave.allyAdvantage > 1.2 ? 8 : 0) +
        (early ? 8 : 0);
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
      const pocket = humanizeLaneStand(
        state,
        champion,
        lane,
        faceOffLanePoint(state, champion, lane, partner.position),
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
  const stand =
    mode === 'freeze'
      ? freezeStand(state, champion, lane, wave)
      : mode === 'shove'
        ? shoveStand(state, champion, lane)
        : laningStand(state, champion, lane);

  if (
    underEnemyTower(state, champion) &&
    !wave.isCrashingOuter &&
    mode !== 'shove'
  ) {
    moveAlongLane(state, champion, lane, softDisengagePos(state, champion, true), recorder);
    noteDecision(state, champion, 'lane', recorder);
    return;
  }

  const pastSlack = mode === 'shove' ? 0.08 : 0.04;
  if (
    mode !== 'shove' &&
    isPastAlliedWave(state, champion, lane, champion.position, pastSlack) &&
    dist(champion.position, stand) > 120
  ) {
    moveAlongLane(state, champion, lane, stand, recorder);
    noteDecision(state, champion, actionLabel, recorder);
    return;
  }

  const hitMode: LastHitMode =
    mode === 'freeze' ? 'freeze' : mode === 'shove' ? 'shove' : 'default';
  const target = nearestFarmMinion(state, champion, lane);
  const foe = nearestLaneEnemy(state, champion);
  if (target && dist(champion.position, target.position) <= champion.attackRange + 40) {
    const didHit = tryLastHit(state, champion, target, recorder, hitMode);
    if (
      mode !== 'freeze' &&
      !didHit &&
      target.alive &&
      target.hp > champion.ad * (mode === 'shove' ? 1.05 : 1.35)
    ) {
      castAbility(state, champion, 'Q', target, recorder);
    }
    if (
      mode !== 'freeze' &&
      foe &&
      champion.positionLabel !== 'SUPPORT' &&
      dist(champion.position, foe.position) <= champion.attackRange + 120
    ) {
      basicAttack(state, champion, foe, recorder);
      if (state.rng() < (mode === 'shove' ? 0.25 : 0.45)) {
        castAbility(state, champion, 'Q', foe, recorder);
      }
    }
    const comfort =
      foe && champion.attackRange > 300
        ? champion.attackRange * 0.9
        : foe
          ? 260
          : 0;
    const needsSpace = !!foe && dist(champion.position, foe.position) < comfort;
    if (needsSpace || dist(champion.position, stand) > LANE_MOVE_MICRO) {
      moveAlongLane(state, champion, lane, stand, recorder);
    }
    noteDecision(state, champion, actionLabel, recorder);
    return;
  }

  if (
    mode === 'default' &&
    foe &&
    champion.positionLabel !== 'SUPPORT' &&
    dist(champion.position, foe.position) <= champion.attackRange + 180 &&
    champion.hp / Math.max(1, champion.maxHp) > 0.42
  ) {
    fightTarget(state, champion, foe, 'trade', recorder);
    return;
  }

  if (dist(champion.position, stand) > LANE_MOVE_MICRO) {
    moveAlongLane(state, champion, lane, stand, recorder);
  }
  noteDecision(state, champion, actionLabel, recorder);
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
      intent.kind === 'wave_shove') &&
    intent.minionLane
  ) {
    const mode =
      intent.kind === 'wave_freeze'
        ? 'freeze'
        : intent.kind === 'wave_shove'
          ? 'shove'
          : 'default';
    const label =
      intent.kind === 'wave_freeze'
        ? 'wave_freeze'
        : intent.kind === 'wave_shove'
          ? 'wave_shove'
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
      orderMove(state, champion, intent.coverPoint, recorder);
      noteDecision(state, champion, 'defend', recorder);
      return;
    }
    fightTarget(state, champion, intent.enemy, 'fight', recorder);
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
    if (!pressured && intent.structure.structureKind !== 'nexus') {
      const stand = laningStand(state, champion, laneIdOf(champion));
      if (dist(champion.position, stand) > 140) {
        moveAlongLane(state, champion, laneIdOf(champion), stand, recorder);
      }
      noteDecision(state, champion, 'lane', recorder);
      return;
    }
    const siegeLane = intent.structure.lane ?? laneIdOf(champion);
    const towerRange = intent.structure.range > 0 ? intent.structure.range : 750;
    const safeSiegeDist = pressured
      ? champion.attackRange + 60
      : Math.max(champion.attackRange + 60, towerRange + 40);
    if (dist(champion.position, intent.structure.position) > safeSiegeDist) {
      moveAlongLane(state, champion, siegeLane, intent.structure.position, recorder);
    } else if (pressured || intent.structure.structureKind === 'nexus') {
      attackStructure(state, champion, intent.structure, recorder);
    } else {
      const stand = laningStand(state, champion, siegeLane);
      moveAlongLane(state, champion, siegeLane, stand, recorder);
    }
    noteDecision(state, champion, 'siege', recorder);
    return;
  }

  if (intent.kind === 'clear' && intent.coverPoint && !intent.camp) {
    orderMove(state, champion, intent.coverPoint, recorder);
    noteDecision(state, champion, 'path_camp', recorder);
    return;
  }

  if ((intent.kind === 'objective' || intent.kind === 'clear') && intent.camp) {
    runJungleClearStep(
      state,
      champion,
      intent.camp,
      (target) => {
        orderMove(state, champion, target, recorder);
      },
      recorder,
    );
    if (dist(champion.position, intent.camp.position) <= champion.attackRange + 80) {
      castKit(state, champion, intent.camp, recorder);
    }
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
  const hpRatio = champion.hp / Math.max(1, champion.maxHp);
  const laneEnemyPreview = nearestLaneEnemy(state, champion);
  const winningTrade =
    !!laneEnemyPreview &&
    laneEnemyPreview.hp / Math.max(1, laneEnemyPreview.maxHp) < hpRatio - 0.1;
  const canFinish =
    !!laneEnemyPreview &&
    (laneEnemyPreview.hp < laneEnemyPreview.maxHp * 0.14 || laneEnemyPreview.hp < 130);

  if (
    champion.recallPhase === 'moving_home' &&
    hpRatio > 0.22 &&
    committedNexusSiege(state, champion)
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

  const runtime = getMatchAiRuntime(state);
  const shoveUntil = runtime.shoveUntil.get(champion.id) ?? 0;
  if (shoveUntil > 0 && state.scheduler.time >= shoveUntil) {
    runtime.shoveUntil.delete(champion.id);
  }

  if (wantsRecall(state, champion, hpRatio, canFinish, winningTrade)) {
    if (tryShoveBeforeRecall(state, champion, hpRatio, recorder)) {
      return;
    }
    if (recallSpotDangerous(state, champion)) {
      moveAlongLane(state, champion, laneIdOf(champion), safeRecallPos(state, champion), recorder);
      noteDecision(state, champion, 'retreat', recorder);
      return;
    }
    startRecall(state, champion, recorder);
    return;
  }

  if (tryDisengage(state, champion, hpRatio, canFinish, recorder)) {
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
  const stick = runtime.intentStick.get(champion.id);
  let best = intents[0];
  if (stick && stick.until > now) {
    const sticky = intents.find((intent) => intent.kind === stick.kind);
    if (sticky && sticky.score >= 8) {
      best = sticky;
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
    best.kind === 'trade'
  ) {
    const keep =
      stick && stick.kind === best.kind && stick.until > now
        ? stick.until
        : now + INTENT_STICK_SEC;
    runtime.intentStick.set(champion.id, { kind: best.kind, until: keep });
  } else {
    runtime.intentStick.delete(champion.id);
  }
  executeIntent(state, champion, best, recorder);
}


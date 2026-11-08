import { combatProfile } from '../champion/combat-profile';
import { axis01, championIdentity } from '../champion/identity-runtime';
import { basicAttack, castAbility, levelAbility } from '../combat/combat';
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
  attackCamp,
  nearestFriendlyCamp,
  nearestObjectiveCamp,
  objectiveWindowBoost,
} from '../jungle/jungle-system';
import { faceOffLanePoint } from '../map/lane-stand';
import { orderMove, orderMoveOnLane } from '../map/movement';
import { dist } from '../map/pathfinding';
import {
  alliedWaveAnchor,
  nearestEnemyMinionOnLane,
  tryLastHit,
} from '../minion/lane-system';
import {
  attackStructure,
  nearestAttackableStructure,
  wavePressuringStructure,
} from '../objectives/structures';
import type { ReplayRecorder } from '../replay/recorder';
import type { ChampionEntity, MonsterEntity, StructureEntity } from '../state/entities';
import type { GameState } from '../state/game-state';
import type { LaneId } from '../types/ids';
import { knownEnemies } from '../vision/vision';

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
  | 'swap';

const RECALL_CHANNEL_SEC = 8;

interface ScoredIntent {
  kind: IntentKind;
  score: number;
  enemy?: ChampionEntity;
  minionLane?: 'top' | 'mid' | 'bot';
  camp?: MonsterEntity;
  structure?: StructureEntity;
}

function fountainOf(state: GameState, champion: ChampionEntity) {
  return champion.side === 'blue' ? state.lockedPack.map.blueFountain : state.lockedPack.map.redFountain;
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
  if (champion.positionLabel === 'MID') {
    champion.assignedLane = 'mid';
    return;
  }
  const t = state.scheduler.time;
  const identity = championIdentity(state, champion);
  const homeLane: LaneId = champion.positionLabel === 'TOP' ? 'top' : 'bot';
  const crossLane: LaneId = homeLane === 'top' ? 'bot' : 'top';
  const dragon = state.monsters.find((monster) => monster.campId === 'dragon' && monster.alive);
  const dragonBoost = dragon ? objectiveWindowBoost(state, 'dragon') : 0;

  if (t < 540) {
    champion.assignedLane = homeLane;
    return;
  }

  const enemySide = champion.side === 'blue' ? 'red' : 'blue';
  const enemyHomeOuter = outerTowerAlive(state, enemySide, homeLane);
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
    champion.assignedLane = siegeLane ?? 'mid';
    return;
  }

  if (dragon && dragonBoost > 0.55 && !splitPrefer && t > 600) {
    if (champion.positionLabel === 'BOT' || champion.positionLabel === 'TOP') {
      champion.assignedLane = 'bot';
      return;
    }
  }

  if (t >= 600 && t <= 1320 && !enemyCrossOuter && enemyHomeOuter) {
    champion.assignedLane = crossLane;
    return;
  }

  if (t >= 720 && t <= 1500 && !splitPrefer && axis01(identity, 'teamfight') > 0.68) {
    if (!enemyCrossOuter || (dragonBoost > 0.4 && homeLane === 'top')) {
      champion.assignedLane = crossLane;
      return;
    }
  }

  if (splitPrefer && enemyHomeOuter) {
    champion.assignedLane = homeLane;
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
    champion.assignedLane = pressured ?? homeLane;
    return;
  }

  champion.assignedLane = homeLane;
}

function moveAlongLane(
  state: GameState,
  champion: ChampionEntity,
  lane: LaneId,
  target: { x: number; y: number },
  recorder?: ReplayRecorder,
): void {
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

function laningStand(
  state: GameState,
  champion: ChampionEntity,
  lane: LaneId,
): { x: number; y: number } {
  const enemy = nearestEnemyMinionOnLane(state, champion, lane);
  const ally = alliedWaveAnchor(state, champion, lane);
  let wavePoint: { x: number; y: number } | null = null;
  if (enemy && ally) {
    wavePoint = {
      x: (enemy.position.x + ally.x) * 0.5,
      y: (enemy.position.y + ally.y) * 0.5,
    };
  } else if (enemy) {
    wavePoint = { ...enemy.position };
  } else if (ally) {
    wavePoint = { ...ally };
  } else {
    const path = state.lockedPack.map.lanePaths[lane];
    if (!path || path.length === 0) {
      return fountainOf(state, champion);
    }
    const hold = laneHoldProgress(state, champion, lane);
    const index = Math.min(path.length - 1, Math.max(0, Math.round(hold * (path.length - 1))));
    wavePoint = path[index] ?? path[0];
  }
  const stand = faceOffLanePoint(state, champion, lane, wavePoint);
  const foe = nearestLaneEnemy(state, champion);
  const hpRatio = champion.hp / Math.max(1, champion.maxHp);
  if (!foe || hpRatio < 0.4 || champion.positionLabel === 'SUPPORT') {
    return stand;
  }
  const mix =
    champion.positionLabel === 'BOT' ? 0.78 : champion.positionLabel === 'TOP' ? 0.58 : 0.48;
  return {
    x: stand.x * (1 - mix) + foe.position.x * mix,
    y: stand.y * (1 - mix) + foe.position.y * mix,
  };
}

function laneTarget(state: GameState, champion: ChampionEntity) {
  return laningStand(state, champion, laneIdOf(champion));
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

function underEnemyTower(state: GameState, champion: ChampionEntity): boolean {
  return state.structures.some(
    (structure) =>
      structure.alive &&
      structure.side !== champion.side &&
      structure.ad > 0 &&
      dist(champion.position, structure.position) <= structure.range + 40,
  );
}

function threatenedOwnStructure(state: GameState, champion: ChampionEntity): StructureEntity | null {
  let best: StructureEntity | null = null;
  let bestScore = 0;
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
                  ? 22
                  : 0;
    if (kindWeight <= 0) {
      continue;
    }
    const laneBonus =
      structure.lane && structure.lane === laneIdOf(champion) ? 12 : 0;
    const score = kindWeight + enemyMinions * 10 + enemyChamps * 20 + laneBonus;
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

function fightTarget(
  state: GameState,
  champion: ChampionEntity,
  enemy: ChampionEntity,
  action: string,
  recorder?: ReplayRecorder,
): void {
  const range = champion.attackRange + 40;
  if (dist(champion.position, enemy.position) > range) {
    orderMove(state, champion, enemy.position, recorder);
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

function safeLanePos(state: GameState, champion: ChampionEntity) {
  const lane = laneIdOf(champion);
  const path = state.lockedPack.map.lanePaths[lane];
  if (!path || path.length === 0) {
    return fountainOf(state, champion);
  }
  const current = laneProgress(state, lane, champion.position);
  const hold = laneHoldProgress(state, champion, lane);
  const retreat =
    champion.side === 'blue'
      ? Math.max(0.14, Math.min(hold, current) - 0.08)
      : Math.min(0.86, Math.max(hold, current) + 0.08);
  const index = Math.min(path.length - 1, Math.max(0, Math.round(retreat * (path.length - 1))));
  return faceOffLanePoint(state, champion, lane, path[index]);
}

function tryDisengage(
  state: GameState,
  champion: ChampionEntity,
  hpRatio: number,
  canFinish: boolean,
  recorder?: ReplayRecorder,
): boolean {
  const overpace = killOverpace(state);
  if (canFinish && hpRatio > 0.22 && overpace < 1.1) {
    return false;
  }
  if (canFinish && overpace >= 1.2 && hpRatio < 0.48) {
    moveAlongLane(state, champion, laneIdOf(champion), safeLanePos(state, champion), recorder);
    noteDecision(state, champion, 'lane', recorder);
    return true;
  }
  const inFight =
    champion.currentAction === 'fight' ||
    champion.currentAction === 'trade' ||
    champion.currentAction === 'gank' ||
    champion.currentAction === 'skirmish';
  if (!inFight && hpRatio >= 0.45) {
    return false;
  }
  const profile = combatProfile(state, champion);
  if (inFight && !canFinish && champion.positionLabel !== 'JUNGLE') {
    const enemy = nearestLaneEnemy(state, champion);
    const enemyHp = enemy ? enemy.hp / Math.max(1, enemy.maxHp) : 1;
    const winning = !!enemy && enemyHp < hpRatio - 0.1;
    const paceBias = overpace >= 1.25 ? 0.05 : overpace >= 1.1 ? 0.02 : 0;
    const leaveHp = winning
      ? profile.disengageHp - 0.08 * profile.allInAppetite + paceBias
      : profile.disengageHp + paceBias;
    if ((!winning && hpRatio < leaveHp) || (winning && hpRatio < leaveHp - 0.12)) {
      moveAlongLane(state, champion, laneIdOf(champion), safeLanePos(state, champion), recorder);
      noteDecision(state, champion, 'lane', recorder);
      return true;
    }
  }
  if (hpRatio > 0.58) {
    return false;
  }
  if (hpRatio < 0.18) {
    return false;
  }
  moveAlongLane(state, champion, laneIdOf(champion), safeLanePos(state, champion), recorder);
  noteDecision(state, champion, 'lane', recorder);
  return true;
}

function shouldStartRecall(
  state: GameState,
  champion: ChampionEntity,
  hpRatio: number,
  canFinish: boolean,
  winningTrade: boolean,
): boolean {
  if (canFinish && hpRatio > 0.2) {
    return false;
  }
  if (isClearingCamp(state, champion) && hpRatio > 0.16) {
    return false;
  }
  if (hpRatio < 0.26) {
    return true;
  }
  if (champion.positionLabel === 'JUNGLE' && hpRatio < 0.28) {
    return true;
  }
  if (underEnemyTower(state, champion) && hpRatio < 0.34 && !winningTrade) {
    return true;
  }

  const prefer = shopPrefer(state, champion);
  const pending = nextPendingPurchase(state, champion, prefer);
  const shopSpend = nextFocusPurchaseCost(state, champion, prefer);
  const meaningful = hasMeaningfulShopBuy(state, champion, prefer);
  const unsafeLane = underEnemyTower(state, champion) || hpRatio < 0.34;

  if (
    pending &&
    pending.deficit > 0 &&
    pending.deficit <= 220 &&
    hpRatio > 0.34 &&
    !unsafeLane &&
    !winningTrade
  ) {
    return false;
  }

  if (
    dist(champion.position, fountainOf(state, champion)) <= 600 &&
    canBuyAnyPreferred(state, champion, prefer)
  ) {
    return true;
  }
  if (canFinishPreferredLegendary(state, champion, prefer) && !canFinish) {
    return true;
  }
  if (shopSpend >= 1000 && !winningTrade && !canFinish) {
    return true;
  }
  if (meaningful && hpRatio < 0.4 && !winningTrade && champion.positionLabel !== 'JUNGLE') {
    return true;
  }
  if (canFinish && hpRatio > 0.45 && champion.gold < 2000) {
    return false;
  }
  if (champion.positionLabel === 'JUNGLE') {
    if (!winningTrade && meaningful && champion.gold >= 1200 && hpRatio < 0.7) {
      return true;
    }
    if (meaningful && champion.gold >= 1600) {
      return true;
    }
    if (champion.gold >= 2400) {
      return true;
    }
    return false;
  }
  if (!winningTrade && meaningful && champion.gold >= 1350 && hpRatio < 0.62) {
    return true;
  }
  if (meaningful && champion.gold >= 1850) {
    return true;
  }
  if (champion.gold >= 2600) {
    return true;
  }
  return false;
}

function cancelRecall(champion: ChampionEntity): void {
  champion.recallPhase = 'none';
  champion.recallChannelUntil = 0;
  champion.recallHpSnapshot = 0;
  if (champion.currentAction === 'recall') {
    champion.currentAction = 'idle';
  }
}

function handleRecallFlow(
  state: GameState,
  champion: ChampionEntity,
  recorder?: ReplayRecorder,
): boolean {
  const fountain = fountainOf(state, champion);
  const atFountain = dist(champion.position, fountain) < 520;

  if (champion.recallPhase === 'moving_home') {
    if (atFountain) {
      champion.recallPhase = 'at_base';
      champion.moving = false;
      champion.path = [];
      champion.recallChannelUntil = 0;
      noteDecision(state, champion, 'recall', recorder);
      return true;
    }
    if (champion.hp + 0.5 < champion.recallHpSnapshot) {
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
    const prefer = shopPrefer(state, champion);
    buyAffordableItems(state, champion, prefer, recorder);
    const stillBuying = canBuyAnyPreferred(state, champion, shopPrefer(state, champion));
    if (stillBuying && champion.gold >= 300) {
      noteDecision(state, champion, 'recall', recorder);
      return true;
    }
    cancelRecall(champion);
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
  champion.moving = false;
  champion.path = [];
  champion.recallPhase = 'moving_home';
  champion.recallChannelUntil = state.scheduler.time + RECALL_CHANNEL_SEC;
  champion.recallHpSnapshot = champion.hp;
  champion.currentAction = 'recall';
  noteDecision(state, champion, 'recall', recorder);
}

function firstFriendlyCampPos(state: GameState, champion: ChampionEntity) {
  const camp = state.lockedPack.monsters.find(
    (item) =>
      item.side === champion.side &&
      item.id !== 'dragon' &&
      item.id !== 'baron' &&
      item.id !== 'herald',
  );
  return camp?.position ?? null;
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

  if (champion.positionLabel !== 'JUNGLE' && champion.positionLabel !== 'SUPPORT') {
    const lane = laneIdOf(champion);
    const minion = nearestEnemyMinionOnLane(state, champion, lane);
    if (minion) {
      const execute = minion.hp <= champion.ad * 1.5 ? 28 : 8;
      const roleFarm =
        champion.positionLabel === 'BOT' ? 64 : champion.positionLabel === 'MID' ? 42 : 48;
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
              ? 52
              : midLate
                ? 38
                : 44;
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
          (laneEnemy && !early && !execute ? 8 : 0) +
          (midLate && idSplit > 0.7 ? 6 : 0),
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
    const partnerFar = !partner || dist(champion.position, partner.position) > 1400;
    if (
      minion &&
      partnerFar &&
      minion.role === 'cannon' &&
      minion.hp <= champion.ad * 1.35
    ) {
      intents.push({ kind: 'farm', score: 22 + sense * 6, minionLane: lane });
    }
  } else if (champion.positionLabel === 'JUNGLE' && t > 480) {
    const lane = laneIdOf(champion);
    const minion = nearestEnemyMinionOnLane(state, champion, lane);
    if (minion && dist(champion.position, minion.position) < 900) {
      intents.push({
        kind: 'farm',
        score: 18 + (minion.role === 'cannon' ? 10 : 0) + (midLate ? 8 : 0),
        minionLane: lane,
      });
    }
  }

  if (laneEnemy && hpRatio > 0.4 && t > 70) {
    const profile = combatProfile(state, champion);
    const overpace = killOverpace(state);
    const enemyHp = laneEnemy.hp / Math.max(1, laneEnemy.maxHp);
    const d = dist(champion.position, laneEnemy.position);
    const canFinish = enemyHp < 0.14 || laneEnemy.hp < champion.ad * 1.25;
    const winning = enemyHp < hpRatio - 0.16;
    const inRange = d < champion.attackRange + 260;
    let tradeScore =
      42 +
      laning * 14 +
      idSkirmish * 14 +
      profile.pokeAppetite * 48 +
      profile.allInAppetite * 16 +
      (winning ? 12 + profile.allInAppetite * 12 : 0) +
      (canFinish ? 36 + idCloseout * 20 : 0);
    if (champion.positionLabel === 'BOT') {
      tradeScore += 10 + profile.pokeAppetite * 10;
    } else if (champion.positionLabel === 'TOP') {
      tradeScore += 16 + profile.pokeAppetite * 14;
    } else if (champion.positionLabel === 'MID') {
      tradeScore *= 0.82;
    }
    if (inRange) {
      tradeScore += 22 + profile.pokeAppetite * 22;
    }
    if (inRange && (winning || canFinish)) {
      tradeScore += 10 + profile.allInAppetite * 12;
    }
    if (d < 750 && canFinish) {
      tradeScore += 8;
    }
    if (!canFinish && inRange) {
      tradeScore += (early ? 20 : 18) + profile.pokeAppetite * 14;
    }
    if (midLate && !canFinish) {
      tradeScore *= 0.96 + profile.allInAppetite * 0.06;
    }
    if (early && !canFinish) {
      tradeScore *= 0.92 + profile.pokeAppetite * 0.12;
    }
    if (canFinish && overpace >= 1.08) {
      tradeScore *= overpace >= 1.3 ? 0.28 : overpace >= 1.18 ? 0.42 : 0.58;
    }
    if (!canFinish && overpace >= 1.05) {
      tradeScore *= 1.22;
    }
    if (underEnemyTower(state, champion) && !canFinish) {
      tradeScore -= 55;
    }
    if (enemiesNear > allies + 1) {
      tradeScore -= 36 + sense * 12;
    }
    if (hpRatio < profile.disengageHp + 0.05 && !canFinish) {
      tradeScore *= 0.55 + profile.allInAppetite * 0.12;
    }
    intents.push({ kind: 'trade', score: tradeScore, enemy: laneEnemy });
  }

  if (
    (champion.positionLabel === 'JUNGLE' || (sense > 0.55 && t > 600) || idGank > 0.7) &&
    t > 150
  ) {
    const overpace = killOverpace(state);
    let bestGank: ChampionEntity | null = null;
    let bestGankScore = 0;
    for (const enemy of state.champions) {
      if (!enemy.alive || enemy.side === champion.side) {
        continue;
      }
      const enemyHp = enemy.hp / Math.max(1, enemy.maxHp);
      const d = dist(champion.position, enemy.position);
      if (d > 2200 || enemyHp > 0.58) {
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
        enemy.side === 'blue' ? progress > 0.55 : progress < 0.45;
      const allyNear = alliesNearPoint(state, champion.side, enemy.position, 1400);
      const enemyNear = enemiesNearPoint(state, champion.side, enemy.position, 1500);
      if (enemyNear >= allyNear + 2) {
        continue;
      }
      let score =
        18 +
        (1 - enemyHp) * 34 +
        sense * 12 +
        idGank * 22 +
        idSkirmish * 10 +
        (d < 1300 ? 8 : 0) +
        (pushed ? 16 : -10) +
        allyNear * 8 -
        enemyNear * 16 +
        (champion.positionLabel === 'JUNGLE' ? 14 : 0);
      if (t < 300) {
        score *= 0.65;
      }
      if (champion.positionLabel === 'BOT') {
        score *= 0.28;
      }
      if (champion.positionLabel === 'MID' && t < 720) {
        score *= 0.5;
      }
      if (champion.positionLabel === 'TOP') {
        score *= 0.55;
      }
      if (enemyNear > allyNear) {
        score *= 0.45;
      }
      if (enemyHp > 0.55) {
        score *= 0.7;
      }
      if (overpace >= 1.08) {
        score *= overpace >= 1.3 ? 0.22 : overpace >= 1.18 ? 0.4 : 0.58;
      }
      if (score > bestGankScore) {
        bestGank = enemy;
        bestGankScore = score;
      }
    }
    if (bestGank && hpRatio > 0.45 && overpace < 1.45) {
      intents.push({ kind: 'gank', score: bestGankScore, enemy: bestGank });
    }
  }

  const known = knownEnemies(champion, t);
  if (known.length > 0 && hpRatio > 0.5 && t > 180) {
    const enemy = state.champions.find((item) => item.id === known[0] && item.alive);
    if (enemy) {
      const d = dist(champion.position, enemy.position);
      const numbers = allies - enemiesNear;
      const overpace = killOverpace(state);
      if (d < 1600) {
        let score =
          30 +
          teamfight * 22 +
          idTeamfight * 18 +
          idCloseout * 10 +
          numbers * 16 +
          (enemy.hp < 320 ? 20 + idCloseout * 16 : 0);
        if (early) {
          score *= 0.4;
        }
        if (midLate) {
          score += 10;
        }
        if (numbers < 0) {
          score *= 0.35;
        }
        if (
          (champion.positionLabel === 'BOT' || champion.positionLabel === 'MID') &&
          t < 720
        ) {
          score *= 0.5;
        }
        if (hpRatio < 0.7) {
          score *= 0.55;
        }
        if (overpace >= 1.08) {
          score *= overpace >= 1.3 ? 0.25 : overpace >= 1.18 ? 0.45 : 0.62;
        }
        score *= 0.72;
        intents.push({ kind: 'skirmish', score, enemy });
      }
    }
  }
  if (enemiesNear >= 2 && allies >= 1 && hpRatio > 0.58 && t > 420) {
    const clusterEnemy = state.champions.find(
      (enemy) =>
        enemy.alive &&
        enemy.side !== champion.side &&
        dist(champion.position, enemy.position) < 1100,
    );
    if (clusterEnemy) {
      let clusterScore =
        26 + teamfight * 18 + idTeamfight * 14 + allies * 8 + (midLate ? 14 : 0);
      if (enemiesNear > allies + 1) {
        clusterScore *= 0.28;
      }
      if ((champion.positionLabel === 'BOT' || champion.positionLabel === 'MID') && t < 720) {
        clusterScore *= 0.55;
      }
      if (early) {
        clusterScore *= 0.5;
      }
      clusterScore *= 0.7;
      intents.push({
        kind: 'skirmish',
        score: clusterScore,
        enemy: clusterEnemy,
      });
    }
  }

  const joinRange =
    champion.positionLabel === 'JUNGLE' || champion.positionLabel === 'SUPPORT'
      ? midLate
        ? 3000
        : 2200
      : midLate
        ? 2400
        : early
          ? 1400
          : 1800;
  for (const ally of state.champions) {
    if (!ally.alive || ally.side !== champion.side || ally.id === champion.id) {
      continue;
    }
    if (
      ally.currentAction !== 'fight' &&
      ally.currentAction !== 'trade' &&
      ally.currentAction !== 'gank' &&
      ally.currentAction !== 'skirmish'
    ) {
      continue;
    }
    if (dist(champion.position, ally.position) > joinRange) {
      continue;
    }
    const focus = state.champions.find(
      (enemy) =>
        enemy.alive &&
        enemy.side !== champion.side &&
        dist(ally.position, enemy.position) < 1300,
    );
    if (!focus || hpRatio < 0.45) {
      continue;
    }
    let joinScore = 62 + teamfight * 34 + sense * 18;
    if (champion.positionLabel === 'JUNGLE' || champion.positionLabel === 'SUPPORT') {
      joinScore += 28;
    }
    if (midLate) {
      joinScore += 18;
    }
    intents.push({
      kind: 'skirmish',
      score: joinScore,
      enemy: focus,
    });
  }

  if (champion.positionLabel === 'SUPPORT') {
    const partner = duoPartner(state, champion);
    if (partner) {
      const botThreat = state.champions.find(
        (enemy) =>
          enemy.alive &&
          enemy.side !== champion.side &&
          dist(partner.position, enemy.position) < 1400,
      );
      if (botThreat && hpRatio > 0.45) {
        intents.push({
          kind: 'skirmish',
          score: (early ? 36 : 70) + teamfight * 20 + (botThreat.hp < botThreat.maxHp * 0.35 ? 24 : 0),
          enemy: botThreat,
        });
      }
    }
  }

  const baseThreat = threatenedOwnStructure(state, champion);
  if (baseThreat) {
    intents.push({
      kind: 'defend',
      score: 110 + sense * 20 + idObjective * 10 + (baseThreat.structureKind === 'nexus' ? 40 : 0),
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
    if (!pressured) {
      siegeScore *= early ? 0.25 : 0.4;
    } else if (early) {
      siegeScore *= 0.78;
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
    let objScore =
      boost * 95 +
      idObjective * 28 +
      idTeamfight * 12 +
      (objective.campId === 'dragon' ? 40 : 0) +
      (objective.campId === 'herald' ? 38 : 0) +
      (objective.campId === 'baron' ? 55 : 0) +
      allyNearObj * 18 -
      enemyNearObj * 14 -
      d / 100;
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
      objScore += 18 + idGank * 8;
    }
    if (idSplit > 0.75 && objective.campId === 'dragon' && champion.positionLabel === 'TOP') {
      objScore *= 0.55;
    }
    if (t < 300 && objective.campId !== 'herald') {
      objScore *= 0.35;
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
    if (camp) {
      const d = dist(champion.position, camp.position);
      const overpace = killOverpace(state);
      let clearScore = 90 + sense * 14 - d / 120 + (early ? 30 : 0);
      if (midLate) {
        clearScore *= 0.86;
      }
      if (objUp && t > 300) {
        clearScore *= 0.65;
      }
      if (overpace >= 1.05) {
        clearScore *= 1.25;
      }
      intents.push({
        kind: 'clear',
        score: clearScore,
        camp,
      });
    } else {
      intents.push({ kind: 'clear', score: 50 + (early ? 14 : 0) });
    }
  }

  return intents;
}

function executeIntent(
  state: GameState,
  champion: ChampionEntity,
  intent: ScoredIntent,
  recorder?: ReplayRecorder,
): void {
  if ((intent.kind === 'farm' || intent.kind === 'lane') && intent.minionLane) {
    if (champion.positionLabel === 'SUPPORT') {
      const partner = duoPartner(state, champion);
      if (partner && dist(champion.position, partner.position) > 750) {
        moveAlongLane(state, champion, intent.minionLane, partner.position, recorder);
        noteDecision(state, champion, 'lane', recorder);
        return;
      }
    }
    const stand = laningStand(state, champion, intent.minionLane);
    const target = nearestEnemyMinionOnLane(state, champion, intent.minionLane);
    const foe = nearestLaneEnemy(state, champion);
    if (target && dist(champion.position, target.position) <= champion.attackRange + 40) {
      const didHit = tryLastHit(state, champion, target, recorder);
      if (!didHit && target.alive && target.hp > champion.ad * 1.35) {
        castAbility(state, champion, 'Q', target, recorder);
      }
      if (
        foe &&
        champion.positionLabel !== 'SUPPORT' &&
        dist(champion.position, foe.position) <= champion.attackRange + 120
      ) {
        basicAttack(state, champion, foe, recorder);
        if (state.rng() < 0.45) {
          castAbility(state, champion, 'Q', foe, recorder);
        }
      }
      noteDecision(state, champion, intent.kind === 'farm' ? 'farm' : 'lane', recorder);
      return;
    }
    if (
      foe &&
      champion.positionLabel !== 'SUPPORT' &&
      dist(champion.position, foe.position) <= champion.attackRange + 180 &&
      champion.hp / Math.max(1, champion.maxHp) > 0.42
    ) {
      fightTarget(state, champion, foe, 'trade', recorder);
      return;
    }
    if (dist(champion.position, stand) > 100) {
      moveAlongLane(state, champion, intent.minionLane, stand, recorder);
    }
    noteDecision(state, champion, intent.kind === 'farm' ? 'farm' : 'lane', recorder);
    return;
  }

  if (
    (intent.kind === 'trade' || intent.kind === 'gank' || intent.kind === 'skirmish') &&
    intent.enemy
  ) {
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

  if ((intent.kind === 'objective' || intent.kind === 'clear') && intent.camp) {
    if (dist(champion.position, intent.camp.position) > champion.attackRange + 20) {
      orderMove(state, champion, intent.camp.position, recorder);
    } else {
      attackCamp(state, champion, intent.camp, recorder);
      castKit(state, champion, intent.camp, recorder);
    }
    noteDecision(state, champion, intent.kind === 'objective' ? 'objective' : 'jungle', recorder);
    return;
  }

  if (intent.kind === 'clear') {
    const stand = firstFriendlyCampPos(state, champion);
    orderMove(state, champion, stand ?? laneTarget(state, champion), recorder);
    noteDecision(state, champion, 'jungle', recorder);
    return;
  }

  moveAlongLane(state, champion, laneIdOf(champion), laneTarget(state, champion), recorder);
  noteDecision(state, champion, 'lane', recorder);
}

export function decideForChampion(
  state: GameState,
  champion: ChampionEntity,
  recorder?: ReplayRecorder,
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

  if (handleRecallFlow(state, champion, recorder)) {
    return;
  }

  if (shouldStartRecall(state, champion, hpRatio, canFinish, winningTrade)) {
    startRecall(state, champion, recorder);
    return;
  }

  if (tryDisengage(state, champion, hpRatio, canFinish, recorder)) {
    return;
  }

  const intents = scoreIntents(state, champion, hpRatio);
  intents.sort((left, right) => right.score - left.score);
  const best = intents[0];
  if (!best || best.score < 8) {
    const lane = laneIdOf(champion);
    const stand = laningStand(state, champion, lane);
    if (dist(champion.position, stand) > 140) {
      moveAlongLane(state, champion, lane, stand, recorder);
    }
    noteDecision(state, champion, 'lane', recorder);
    return;
  }
  executeIntent(state, champion, best, recorder);
}

export function runAiTick(state: GameState, recorder?: ReplayRecorder): void {
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
  const blueFirst = state.rng() < 0.5;
  const order = blueFirst ? [...state.champions] : [...state.champions].reverse();
  for (const champion of order) {
    decideForChampion(state, champion, recorder);
  }
}

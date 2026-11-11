import { basicAttack } from '../combat/combat';
import { applyDamage, creditMinionKill } from '../combat/damage';
import { supportCanSharedRichesExecute } from '../economy/economy';
import {
  advanceAlongWalkablePath,
  dist,
  findPath,
  nearestWalkable,
} from '../map/pathfinding';
import {
  allInhibitorsDownForSupers,
  canSiege,
  laneInhibitorDownForSupers,
  minionAttackStructure,
} from '../objectives/structures';
import type { ReplayRecorder } from '../replay/recorder';
import type { ChampionEntity, MinionEntity } from '../state/entities';
import { allocEntityId, type GameState } from '../state/game-state';
import type { LaneId, TeamSide } from '../types/ids';
import { shouldSpawnCannon } from '../version/shared-content';

const MINION_SPAWN_GAP_SEC = 0.792;
const MINION_ACQUIRE_RANGE = 500;
const MINION_CHASE_LEASH = 390;
const MINION_STICKY_DROP_RANGE = MINION_ACQUIRE_RANGE + 40;
const CALL_FOR_HELP_ALLY_RANGE = 1000;
const CALL_FOR_HELP_HOLD_SEC = 3;
const MINION_VS_CHAMPION_DAMAGE = 0.6;

export function minionRawDamageToChampion(minion: MinionEntity): number {
  return minion.ad * MINION_VS_CHAMPION_DAMAGE;
}

function findCallForHelpAttacker(
  state: GameState,
  minion: MinionEntity,
): ChampionEntity | null {
  const now = state.scheduler.time;
  let best: ChampionEntity | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const ally of state.champions) {
    if (!ally.alive || ally.side !== minion.side) {
      continue;
    }
    if (dist(minion.position, ally.position) > CALL_FOR_HELP_ALLY_RANGE) {
      continue;
    }
    for (const [attackerId, threat] of Object.entries(ally.threatTable)) {
      if (
        !threat.callHelp ||
        now - threat.at > CALL_FOR_HELP_HOLD_SEC ||
        threat.amount <= 0
      ) {
        continue;
      }
      const attacker = state.champions.find((champ) => champ.id === attackerId);
      if (!attacker?.alive || attacker.side === minion.side) {
        continue;
      }
      if (attacker.recallPhase === 'at_base') {
        continue;
      }
      const gap = dist(minion.position, attacker.position);
      if (gap > MINION_ACQUIRE_RANGE) {
        continue;
      }
      if (gap < bestDist) {
        best = attacker;
        bestDist = gap;
      }
    }
  }
  return best;
}

type MinionCombatKind = 'champion' | 'minion' | 'structure';

interface MinionCombatTarget {
  kind: MinionCombatKind;
  id: string;
  priority: number;
  gap: number;
}

const PRIORITY_CFH_CHAMP = 1;
const PRIORITY_MINION_ON_ALLY_CHAMP = 2;
const PRIORITY_MINION_ON_ALLY_MINION = 3;
const PRIORITY_STICKY_CHAMP = 4;
const PRIORITY_CLOSEST_ENEMY_MINION = 5;
const PRIORITY_STRUCTURE = 7;

function clearMinionAggro(minion: MinionEntity, keepAnchor = false): void {
  minion.targetId = null;
  minion.aggroUntil = 0;
  if (!keepAnchor) {
    minion.aggroAnchor = null;
  }
}

function lockMinionTarget(
  minion: MinionEntity,
  targetId: string,
  until: number,
  withChampionAnchor: boolean,
): void {
  if (withChampionAnchor && !minion.aggroAnchor) {
    minion.aggroAnchor = { ...minion.position };
  }
  if (!withChampionAnchor) {
    minion.aggroAnchor = null;
  }
  minion.targetId = targetId;
  minion.aggroUntil = until;
}

function championTargetInvalid(
  minion: MinionEntity,
  champ: ChampionEntity,
): boolean {
  return (
    !champ.alive ||
    champ.side === minion.side ||
    champ.recallPhase === 'at_base' ||
    dist(minion.position, champ.position) > MINION_STICKY_DROP_RANGE
  );
}

function pastChampionChaseLeash(minion: MinionEntity): boolean {
  return (
    !!minion.aggroAnchor &&
    dist(minion.position, minion.aggroAnchor) >= MINION_CHASE_LEASH - 12
  );
}

function enemyMinionPriority(
  state: GameState,
  minion: MinionEntity,
  other: MinionEntity,
): number {
  if (!other.targetId) {
    return PRIORITY_CLOSEST_ENEMY_MINION;
  }
  const targetChamp = state.champions.find((champ) => champ.id === other.targetId);
  if (targetChamp?.alive && targetChamp.side === minion.side) {
    return PRIORITY_MINION_ON_ALLY_CHAMP;
  }
  const targetMinion = state.minions.find((ally) => ally.id === other.targetId);
  if (targetMinion?.alive && targetMinion.side === minion.side) {
    return PRIORITY_MINION_ON_ALLY_MINION;
  }
  return PRIORITY_CLOSEST_ENEMY_MINION;
}

function findSiegeStructure(
  state: GameState,
  minion: MinionEntity,
): { id: string; gap: number } | null {
  let best: { id: string; gap: number } | null = null;
  for (const item of state.structures) {
    if (
      !item.alive ||
      item.side === minion.side ||
      (item.lane &&
        item.lane !== minion.lane &&
        item.structureKind !== 'nexus' &&
        item.structureKind !== 'nexus_tower') ||
      !canSiege(state, item)
    ) {
      continue;
    }
    const gap = dist(minion.position, item.position);
    if (gap > Math.max(item.range, 750) + 40) {
      continue;
    }
    if (!best || gap < best.gap) {
      best = { id: item.id, gap };
    }
  }
  return best;
}

function currentSiegeStructure(
  state: GameState,
  minion: MinionEntity,
): { id: string; gap: number } | null {
  if (!minion.targetId) {
    return null;
  }
  const item = state.structures.find((structure) => structure.id === minion.targetId);
  if (
    !item?.alive ||
    item.side === minion.side ||
    !canSiege(state, item)
  ) {
    return null;
  }
  const gap = dist(minion.position, item.position);
  if (gap > Math.max(item.range, 750) + 40) {
    return null;
  }
  return { id: item.id, gap };
}

function pickMinionCombatTarget(
  state: GameState,
  minion: MinionEntity,
  acquireRange: number,
): MinionCombatTarget | null {
  const now = state.scheduler.time;
  const sieging = currentSiegeStructure(state, minion);
  const candidates: MinionCombatTarget[] = [];

  if (!sieging) {
    const callHelp = findCallForHelpAttacker(state, minion);
    if (callHelp && !championTargetInvalid(minion, callHelp)) {
      const gap = dist(minion.position, callHelp.position);
      const hitRange = minion.attackRange + 80;
      if (!(pastChampionChaseLeash(minion) && gap > hitRange)) {
        candidates.push({
          kind: 'champion',
          id: callHelp.id,
          priority: PRIORITY_CFH_CHAMP,
          gap,
        });
      }
    }
  }

  for (const other of state.minions) {
    if (!other.alive || other.side === minion.side || other.id === minion.id) {
      continue;
    }
    const gap = dist(minion.position, other.position);
    if (gap > acquireRange) {
      continue;
    }
    candidates.push({
      kind: 'minion',
      id: other.id,
      priority: enemyMinionPriority(state, minion, other),
      gap,
    });
  }

  if (
    !sieging &&
    minion.targetId &&
    minion.aggroUntil > now &&
    !candidates.some((item) => item.kind === 'champion' && item.id === minion.targetId)
  ) {
    const sticky = state.champions.find((champ) => champ.id === minion.targetId);
    if (sticky && !championTargetInvalid(minion, sticky)) {
      const gap = dist(minion.position, sticky.position);
      const hitRange = minion.attackRange + 80;
      if (!(pastChampionChaseLeash(minion) && gap > hitRange)) {
        candidates.push({
          kind: 'champion',
          id: sticky.id,
          priority: PRIORITY_STICKY_CHAMP,
          gap,
        });
      }
    }
  }

  const structure = sieging ?? findSiegeStructure(state, minion);
  if (structure) {
    candidates.push({
      kind: 'structure',
      id: structure.id,
      priority: PRIORITY_STRUCTURE,
      gap: structure.gap,
    });
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((left, right) => {
    if (left.priority !== right.priority) {
      return left.priority - right.priority;
    }
    return left.gap - right.gap;
  });
  return candidates[0];
}

function waveRoles(
  state: GameState,
  side: TeamSide,
  lane: LaneId,
  waveIndex: number,
): Array<MinionEntity['role']> {
  const timeSec = state.scheduler.time;
  const allDown = allInhibitorsDownForSupers(state, side);
  const withSuper = allDown || laneInhibitorDownForSupers(state, side, lane);
  const withCannon = !withSuper && shouldSpawnCannon(timeSec, waveIndex);
  const roles: Array<MinionEntity['role']> = [];
  if (withSuper) {
    roles.push('super');
    if (allDown) {
      roles.push('super');
    }
  }
  const meleeCount = timeSec >= 14 * 60 && withCannon ? 2 : 3;
  const casterCount = timeSec >= 30 * 60 ? 2 : 3;
  for (let i = 0; i < meleeCount; i += 1) {
    roles.push('melee');
  }
  if (withCannon) {
    roles.push('cannon');
  }
  for (let i = 0; i < casterCount; i += 1) {
    roles.push('caster');
  }
  return roles;
}

function spawnOneMinion(
  state: GameState,
  side: TeamSide,
  lane: LaneId,
  role: MinionEntity['role'],
): void {
  const rules = state.lockedPack.minions;
  const path =
    side === 'blue'
      ? state.lockedPack.map.lanePaths[lane]
      : [...state.lockedPack.map.lanePaths[lane]].reverse();
  if (path.length === 0) {
    return;
  }
  const timeSec = state.scheduler.time;
  const cannonGold = rules.cannonGold + Math.floor(timeSec / 90);
  const team = side === 'blue' ? state.blue : state.red;
  const ageBoost = 1 + Math.min(0.55, Math.floor(timeSec / 180) * 0.04);
  const hp =
    role === 'super'
      ? 2800 + Math.floor(timeSec / 30) * 40
      : role === 'cannon'
        ? Math.round(rules.cannonHp * ageBoost)
        : role === 'caster'
          ? Math.round(rules.casterHp * ageBoost)
          : Math.round(rules.meleeHp * ageBoost);
  const ad =
    role === 'super'
      ? 180 + Math.floor(timeSec / 60) * 4
      : role === 'cannon'
        ? Math.round(rules.cannonAd * ageBoost)
        : role === 'caster'
          ? Math.round(rules.casterAd * ageBoost)
          : Math.round(rules.meleeAd * ageBoost);
  const gold =
    role === 'super' ? 0 : role === 'cannon' ? cannonGold : role === 'caster' ? rules.casterGold : rules.meleeGold;
  const minion: MinionEntity = {
    id: allocEntityId(state, 'minion'),
    kind: 'minion',
    side,
    lane,
    role,
    position: { ...path[0] },
    pathIndex: 0,
    hp,
    maxHp: hp,
    ad: team.hasBaron ? Math.round(ad * 1.5) : ad,
    moveSpeed:
      rules.moveSpeed * (team.hasBaron ? 1.25 : role === 'super' ? 1.1 : 1),
    attackRange: role === 'caster' ? 550 : role === 'super' ? 200 : rules.attackRange,
    nextAttackAt: 0,
    alive: true,
    gold,
    targetId: null,
    aggroUntil: 0,
    aggroAnchor: null,
  };
  state.minions.push(minion);
}

function scheduleWaveSide(
  state: GameState,
  side: TeamSide,
  lane: LaneId,
  waveIndex: number,
): void {
  const roles = waveRoles(state, side, lane, waveIndex);
  roles.forEach((role, roleIndex) => {
    if (roleIndex === 0) {
      spawnOneMinion(state, side, lane, role);
      return;
    }
    state.scheduler.scheduleAfter(
      roleIndex * MINION_SPAWN_GAP_SEC,
      `minion_spawn_${side}_${lane}_${waveIndex}_${roleIndex}`,
      () => {
        if (state.ended) {
          return;
        }
        spawnOneMinion(state, side, lane, role);
      },
    );
  });
}

export function spawnWave(state: GameState, recorder?: ReplayRecorder): void {
  state.waveIndex += 1;
  for (const lane of ['top', 'mid', 'bot'] as LaneId[]) {
    scheduleWaveSide(state, 'blue', lane, state.waveIndex);
    scheduleWaveSide(state, 'red', lane, state.waveIndex);
  }
  recorder?.record(state, {
    type: 'minion_spawn',
    payload: { waveIndex: state.waveIndex },
  });
}

export function tickMinions(state: GameState, dt: number, recorder?: ReplayRecorder): void {
  const rules = state.lockedPack.minions;
  const map = state.lockedPack.map;
  const now = state.scheduler.time;
  for (const minion of state.minions) {
    if (!minion.alive) {
      continue;
    }
    const path =
      minion.side === 'blue'
        ? map.lanePaths[minion.lane]
        : [...map.lanePaths[minion.lane]].reverse();
    const hitLeeway = 80;
    const acquireRange = Math.max(MINION_ACQUIRE_RANGE, minion.attackRange);
    const combat = pickMinionCombatTarget(state, minion, acquireRange);

    if (!combat) {
      clearMinionAggro(minion);
      if (minion.pathIndex < path.length - 1) {
        const waypoint = path[minion.pathIndex + 1];
        const moved = advanceAlongWalkablePath(
          map,
          minion.position,
          [waypoint],
          minion.moveSpeed,
          dt,
        );
        minion.position = moved.position;
        if (moved.arrived) {
          minion.pathIndex += 1;
        }
      }
      continue;
    }

    if (combat.kind === 'champion') {
      const champ = state.champions.find((item) => item.id === combat.id);
      if (!champ || championTargetInvalid(minion, champ)) {
        clearMinionAggro(minion);
        continue;
      }
      lockMinionTarget(minion, champ.id, now + CALL_FOR_HELP_HOLD_SEC, true);
      const hitRange = minion.attackRange + hitLeeway;
      const champDist = dist(minion.position, champ.position);
      if (champDist > hitRange) {
        const anchor = minion.aggroAnchor ?? { ...minion.position };
        if (!minion.aggroAnchor) {
          minion.aggroAnchor = { ...minion.position };
        }
        const leashLeft = MINION_CHASE_LEASH - dist(minion.position, anchor);
        if (leashLeft <= 12) {
          clearMinionAggro(minion, true);
          continue;
        }
        const dx = champ.position.x - minion.position.x;
        const dy = champ.position.y - minion.position.y;
        const gap = Math.hypot(dx, dy) || 1;
        const step = Math.min(
          minion.moveSpeed * dt,
          Math.max(0, gap - hitRange + 8),
          leashLeft,
        );
        if (step <= 0.5) {
          clearMinionAggro(minion, true);
          continue;
        }
        const next = {
          x: minion.position.x + (dx / gap) * step,
          y: minion.position.y + (dy / gap) * step,
        };
        if (dist(next, anchor) > MINION_CHASE_LEASH) {
          clearMinionAggro(minion, true);
          continue;
        }
        minion.position = next;
        continue;
      }
      if (now < minion.nextAttackAt) {
        continue;
      }
      applyDamage(
        state,
        minion,
        champ,
        minionRawDamageToChampion(minion),
        'physical',
        recorder,
        'minion',
      );
      minion.nextAttackAt = now + rules.attackIntervalSec;
      continue;
    }

    if (combat.kind === 'minion') {
      const enemy = state.minions.find((item) => item.id === combat.id && item.alive);
      if (!enemy) {
        clearMinionAggro(minion);
        continue;
      }
      lockMinionTarget(minion, enemy.id, now + CALL_FOR_HELP_HOLD_SEC, false);
      const hitRange = minion.attackRange + hitLeeway;
      if (dist(minion.position, enemy.position) > hitRange) {
        const dx = enemy.position.x - minion.position.x;
        const dy = enemy.position.y - minion.position.y;
        const gap = Math.hypot(dx, dy) || 1;
        const step = Math.min(minion.moveSpeed * dt, Math.max(0, gap - hitRange + 8));
        if (step > 0.5) {
          minion.position = {
            x: minion.position.x + (dx / gap) * step,
            y: minion.position.y + (dy / gap) * step,
          };
        }
        continue;
      }
      if (now < minion.nextAttackAt) {
        continue;
      }
      enemy.hp -= minion.ad;
      minion.nextAttackAt = now + rules.attackIntervalSec;
      if (enemy.hp <= 0) {
        enemy.alive = false;
        creditMinionKill(state, null, enemy, recorder, 'minion');
        clearMinionAggro(minion);
      }
      continue;
    }

    const structure = state.structures.find((item) => item.id === combat.id && item.alive);
    if (!structure) {
      clearMinionAggro(minion);
      continue;
    }
    lockMinionTarget(minion, structure.id, now + CALL_FOR_HELP_HOLD_SEC, false);
    const hitRange = minion.attackRange + hitLeeway;
    if (dist(minion.position, structure.position) > hitRange) {
      const approach = nearestWalkable(map, structure.position) ?? structure.position;
      const siegePath = findPath(map, minion.position, approach);
      const moved = advanceAlongWalkablePath(
        map,
        minion.position,
        siegePath.length > 0 ? siegePath : [approach],
        minion.moveSpeed,
        dt,
      );
      minion.position = moved.position;
      continue;
    }
    if (now >= minion.nextAttackAt) {
      minionAttackStructure(state, minion, structure, recorder);
      minion.nextAttackAt = now + rules.attackIntervalSec;
      if (!structure.alive) {
        clearMinionAggro(minion);
      }
    }
  }
  state.minions = state.minions.filter((minion) => minion.alive);
}

export function attackMinion(
  state: GameState,
  champion: ChampionEntity,
  minion: MinionEntity,
  recorder?: ReplayRecorder,
): boolean {
  return basicAttack(state, champion, minion, recorder);
}

export function expectedAutoDamage(champion: ChampionEntity): number {
  const skill = champion.skills.mechanics / 100;
  const roleMult =
    champion.positionLabel === 'BOT'
      ? 1.15
      : champion.positionLabel === 'SUPPORT'
        ? 0.45
        : champion.positionLabel === 'MID'
          ? 0.85
          : 1;
  return champion.ad * (1.05 + 0.55 * skill) * roleMult;
}

export type LastHitMode = 'default' | 'freeze' | 'shove';

export function tryLastHit(
  state: GameState,
  champion: ChampionEntity,
  minion: MinionEntity,
  recorder?: ReplayRecorder,
  mode: LastHitMode = 'default',
): boolean {
  if (!minion.alive) {
    return false;
  }
  if (champion.positionLabel === 'SUPPORT') {
    if (!supportCanSharedRichesExecute(state, champion)) {
      return false;
    }
    const executeRatio = champion.attackRange > 300 ? 0.3 : 0.5;
    const hpRatio = minion.hp / Math.max(1, minion.maxHp);
    if (hpRatio <= executeRatio) {
      minion.hp = 0;
      minion.alive = false;
      creditMinionKill(state, champion, minion, recorder, 'support_execute');
      return true;
    }
    if (minion.hp > expectedAutoDamage(champion) * 1.15) {
      return false;
    }
    return attackMinion(state, champion, minion, recorder);
  }
  const expected = expectedAutoDamage(champion);
  const skill = champion.skills.laning / 100;
  const canExecute = minion.hp <= expected * (1.05 + skill * 0.35);
  if (mode === 'freeze') {
    if (!canExecute) {
      return false;
    }
    return attackMinion(state, champion, minion, recorder);
  }
  const shoving =
    mode === 'shove' ||
    champion.currentAction === 'siege' ||
    champion.currentAction === 'wave_shove';
  const underWave =
    shoving ||
    champion.currentAction === 'farm' ||
    champion.currentAction === 'lane' ||
    champion.currentAction === 'wave_freeze';
  const hpRatio = champion.hp / Math.max(1, champion.maxHp);
  const laneThreat = state.champions.find(
    (enemy) =>
      enemy.alive &&
      enemy.side !== champion.side &&
      enemy.positionLabel !== 'JUNGLE' &&
      dist(champion.position, enemy.position) <
        Math.max(620, enemy.attackRange + 240),
  );
  const threatHp = laneThreat
    ? laneThreat.hp / Math.max(1, laneThreat.maxHp)
    : 1;
  const farmFear =
    !!laneThreat &&
    (hpRatio < 0.55 || (hpRatio < 0.72 && threatHp > hpRatio + 0.08));
  const underOwnTower = state.structures.some(
    (structure) =>
      structure.alive &&
      structure.side === champion.side &&
      structure.ad > 0 &&
      dist(champion.position, structure.position) <= structure.range + 80,
  );
  let contestChance = shoving ? 0.62 + skill * 0.28 : 0.1 + skill * 0.22;
  let shoveChance = 0.68 + skill * 0.22;
  const threatGap = laneThreat ? dist(champion.position, laneThreat.position) : 9999;
  const safeTowerFarm =
    underOwnTower &&
    (!laneThreat || threatGap > Math.max(520, laneThreat.attackRange + 160));
  if (farmFear && !safeTowerFarm) {
    contestChance *= underOwnTower ? 0.55 : 0.22;
    shoveChance *= 0.2;
  } else if (laneThreat && hpRatio < threatHp - 0.12) {
    contestChance *= 0.5;
    shoveChance *= 0.38;
  } else if (!laneThreat || hpRatio > threatHp + 0.15) {
    contestChance *= shoving ? 1.12 : 1.02;
    shoveChance *= 1.12;
  }
  if (underOwnTower && canExecute) {
    return attackMinion(state, champion, minion, recorder);
  }
  if (underOwnTower && farmFear && !safeTowerFarm) {
    return false;
  }
  const hittingMe = minion.targetId === champion.id;
  if (hittingMe) {
    contestChance = Math.min(0.95, contestChance + 0.35);
    shoveChance = Math.min(0.98, shoveChance + 0.2);
  }
  const contestHit =
    underWave &&
    !shoving &&
    minion.hp <= expected * (hittingMe ? 2.1 + skill * 0.5 : 1.45 + skill * 0.45) &&
    state.rng() < contestChance;
  const shoveHit =
    shoving &&
    minion.hp <= expected * (minion.role === 'caster' ? 3.6 : 2.8) &&
    state.rng() < shoveChance;
  if (!canExecute && !contestHit && !shoveHit) {
    return false;
  }
  return attackMinion(state, champion, minion, recorder);
}

export function nearestEnemyMinionOnLane(
  state: GameState,
  champion: ChampionEntity,
  lane: LaneId,
  mode: LastHitMode = 'default',
): MinionEntity | null {
  let best: MinionEntity | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const minion of state.minions) {
    if (!minion.alive || minion.side === champion.side || minion.lane !== lane) {
      continue;
    }
    const d = dist(champion.position, minion.position);
    if (d > 1400) {
      continue;
    }
    const executeBonus = minion.hp <= champion.ad * 1.35 ? -400 : 0;
    const roleBias =
      mode === 'shove'
        ? minion.role === 'caster'
          ? -180
          : minion.role === 'cannon'
            ? -60
            : 0
        : mode === 'freeze'
          ? minion.hp <= champion.ad * 1.5
            ? -220
            : 80
          : 0;
    let aggroBias = 0;
    if (minion.targetId === champion.id) {
      aggroBias = -520;
    } else if (minion.targetId) {
      const aggroAlly = state.champions.find(
        (ally) =>
          ally.id === minion.targetId &&
          ally.alive &&
          ally.side === champion.side,
      );
      if (aggroAlly) {
        aggroBias = -280;
      }
    }
    const score = d + minion.hp * 0.15 + executeBonus + roleBias + aggroBias;
    if (score < bestScore) {
      best = minion;
      bestScore = score;
    }
  }
  return best;
}

function lanePathProgress(
  state: GameState,
  lane: LaneId,
  point: { x: number; y: number },
): number {
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

export function alliedWaveAnchor(
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
  let front = allies[0];
  let frontProgress = lanePathProgress(state, lane, front.position);
  for (let i = 1; i < allies.length; i += 1) {
    const progress = lanePathProgress(state, lane, allies[i].position);
    const isFront =
      champion.side === 'blue' ? progress > frontProgress : progress < frontProgress;
    if (isFront) {
      front = allies[i];
      frontProgress = progress;
    }
  }
  return { x: front.position.x, y: front.position.y };
}

export function enemyWaveAnchor(
  state: GameState,
  champion: ChampionEntity,
  lane: LaneId,
): { x: number; y: number } | null {
  const enemies = state.minions.filter(
    (minion) => minion.alive && minion.side !== champion.side && minion.lane === lane,
  );
  if (enemies.length === 0) {
    return null;
  }
  let closest = enemies[0];
  let closestProgress = lanePathProgress(state, lane, closest.position);
  for (let i = 1; i < enemies.length; i += 1) {
    const progress = lanePathProgress(state, lane, enemies[i].position);
    const isCloser =
      champion.side === 'blue' ? progress < closestProgress : progress > closestProgress;
    if (isCloser) {
      closest = enemies[i];
      closestProgress = progress;
    }
  }
  return { x: closest.position.x, y: closest.position.y };
}

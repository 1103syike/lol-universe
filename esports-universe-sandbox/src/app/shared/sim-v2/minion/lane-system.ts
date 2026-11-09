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
  for (const minion of state.minions) {
    if (!minion.alive) {
      continue;
    }
    const path =
      minion.side === 'blue'
        ? map.lanePaths[minion.lane]
        : [...map.lanePaths[minion.lane]].reverse();
    const champAcquire = Math.max(minion.attackRange + 40, 380);
    let enemyChamp: (typeof state.champions)[number] | null = null;
    let enemyChampDist = Number.POSITIVE_INFINITY;
    for (const champ of state.champions) {
      if (!champ.alive || champ.side === minion.side || champ.recallPhase === 'at_base') {
        continue;
      }
      const d = dist(minion.position, champ.position);
      if (d <= champAcquire && d < enemyChampDist) {
        enemyChamp = champ;
        enemyChampDist = d;
      }
    }
    const enemyMinion = state.minions.find(
      (other) =>
        other.alive &&
        other.side !== minion.side &&
        other.lane === minion.lane &&
        dist(minion.position, other.position) <= minion.attackRange + 40,
    );
    const champDrewAggro =
      !!enemyChamp &&
      Object.values(enemyChamp.threatTable).some(
        (threat) => state.scheduler.time - threat.at <= 3.5 && threat.amount > 0,
      );
    const preferChamp =
      !!enemyChamp &&
      !enemyMinion &&
      (champDrewAggro || enemyChamp.hp / Math.max(1, enemyChamp.maxHp) < 0.42);
    if (preferChamp && enemyChamp) {
      if (enemyChampDist > minion.attackRange + 40) {
        const approach = nearestWalkable(map, enemyChamp.position) ?? enemyChamp.position;
        const chasePath = findPath(map, minion.position, approach);
        const moved = advanceAlongWalkablePath(
          map,
          minion.position,
          chasePath.length > 0 ? chasePath : [approach],
          minion.moveSpeed,
          dt,
        );
        minion.position = moved.position;
      } else if (state.scheduler.time >= minion.nextAttackAt) {
        const t = state.scheduler.time;
        const earlyScale = t < 480 ? 0.22 : t < 720 ? 0.38 : t < 1200 ? 0.55 : 0.72;
        applyDamage(
          state,
          null,
          enemyChamp,
          minion.ad * earlyScale,
          'physical',
          recorder,
          'minion',
        );
        minion.nextAttackAt = state.scheduler.time + rules.attackIntervalSec;
      }
      continue;
    }
    if (enemyMinion) {
      if (state.scheduler.time >= minion.nextAttackAt) {
        enemyMinion.hp -= minion.ad;
        minion.nextAttackAt = state.scheduler.time + rules.attackIntervalSec;
        if (enemyMinion.hp <= 0) {
          enemyMinion.alive = false;
          creditMinionKill(state, null, enemyMinion, recorder, 'minion');
        }
      }
      continue;
    }
    const structure = state.structures.find(
      (item) =>
        item.alive &&
        item.side !== minion.side &&
        (!item.lane || item.lane === minion.lane || item.structureKind === 'nexus') &&
        canSiege(state, item) &&
        dist(minion.position, item.position) <= Math.max(item.range, 750) + 40,
    );
    if (structure) {
      const hitRange = minion.attackRange + 80;
      if (dist(minion.position, structure.position) > hitRange) {
        const approach =
          nearestWalkable(map, structure.position) ?? structure.position;
        const siegePath = findPath(map, minion.position, approach);
        const moved = advanceAlongWalkablePath(
          map,
          minion.position,
          siegePath.length > 0 ? siegePath : [approach],
          minion.moveSpeed,
          dt,
        );
        minion.position = moved.position;
      } else if (state.scheduler.time >= minion.nextAttackAt) {
        minionAttackStructure(state, minion, structure, recorder);
        minion.nextAttackAt = state.scheduler.time + rules.attackIntervalSec;
      }
      continue;
    }
    if (minion.pathIndex < path.length - 1) {
      const target = path[minion.pathIndex + 1];
      const moved = advanceAlongWalkablePath(
        map,
        minion.position,
        [target],
        minion.moveSpeed,
        dt,
      );
      minion.position = moved.position;
      if (moved.arrived) {
        minion.pathIndex += 1;
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
  const contestHit =
    underWave &&
    minion.hp <= expected * (1.8 + skill * 0.8) &&
    state.rng() < (shoving ? 0.55 + skill * 0.3 : 0.18 + skill * 0.35);
  const shoveHit =
    shoving &&
    minion.hp <= expected * (shoving ? 3.2 : 2.4) &&
    state.rng() < 0.55 + skill * 0.25;
  if (!canExecute && !contestHit && !shoveHit) {
    return false;
  }
  return attackMinion(state, champion, minion, recorder);
}

export function nearestEnemyMinionOnLane(
  state: GameState,
  champion: ChampionEntity,
  lane: LaneId,
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
    const score = d + minion.hp * 0.15 + executeBonus;
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

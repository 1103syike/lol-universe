import { basicAttack } from '../combat/combat';
import { applyDamage, creditMinionKill } from '../combat/damage';
import { dist, advanceAlongPath } from '../map/pathfinding';
import { canSiege, minionAttackStructure } from '../objectives/structures';
import type { ReplayRecorder } from '../replay/recorder';
import type { ChampionEntity, MinionEntity } from '../state/entities';
import { allocEntityId, type GameState } from '../state/game-state';
import type { LaneId, TeamSide } from '../types/ids';
import { shouldSpawnCannon } from '../version/shared-content';

function enemyInhibDown(state: GameState, side: TeamSide, lane: LaneId): boolean {
  const enemySide = side === 'blue' ? 'red' : 'blue';
  return state.structures.some(
    (structure) =>
      !structure.alive &&
      structure.side === enemySide &&
      structure.lane === lane &&
      structure.structureKind === 'inhibitor',
  );
}

function spawnWaveSide(state: GameState, side: TeamSide, lane: LaneId, waveIndex: number): void {
  const rules = state.lockedPack.minions;
  const path =
    side === 'blue'
      ? state.lockedPack.map.lanePaths[lane]
      : [...state.lockedPack.map.lanePaths[lane]].reverse();
  if (path.length === 0) {
    return;
  }
  const timeSec = state.scheduler.time;
  const withSuper = enemyInhibDown(state, side, lane);
  const withCannon = !withSuper && shouldSpawnCannon(timeSec, waveIndex);
  const roles: Array<MinionEntity['role']> = [];
  if (withSuper) {
    roles.push('super', 'super', 'caster', 'caster', 'caster');
  } else {
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
  }
  const cannonGold = rules.cannonGold + Math.floor(timeSec / 90);
  const team = side === 'blue' ? state.blue : state.red;
  const ageBoost = 1 + Math.min(0.55, Math.floor(timeSec / 180) * 0.04);
  roles.forEach((role, roleIndex) => {
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
    const startIndex = Math.min(roleIndex * 2, Math.max(0, path.length - 1));
    const minion: MinionEntity = {
      id: allocEntityId(state, 'minion'),
      kind: 'minion',
      side,
      lane,
      role,
      position: { ...path[startIndex] },
      pathIndex: startIndex,
      hp,
      maxHp: hp,
      ad: team.hasBaron ? Math.round(ad * 1.5) : ad,
      moveSpeed: rules.moveSpeed * (team.hasBaron ? 1.25 : role === 'super' ? 1.1 : 1),
      attackRange: role === 'caster' ? 550 : role === 'super' ? 200 : rules.attackRange,
      nextAttackAt: 0,
      alive: true,
      gold,
      targetId: null,
    };
    state.minions.push(minion);
  });
}

export function spawnWave(state: GameState, recorder?: ReplayRecorder): void {
  state.waveIndex += 1;
  for (const lane of ['top', 'mid', 'bot'] as LaneId[]) {
    spawnWaveSide(state, 'blue', lane, state.waveIndex);
    spawnWaveSide(state, 'red', lane, state.waveIndex);
  }
  recorder?.record(state, {
    type: 'minion_spawn',
    payload: { waveIndex: state.waveIndex },
  });
}

export function tickMinions(state: GameState, dt: number, recorder?: ReplayRecorder): void {
  const rules = state.lockedPack.minions;
  for (const minion of state.minions) {
    if (!minion.alive) {
      continue;
    }
    const path =
      minion.side === 'blue'
        ? state.lockedPack.map.lanePaths[minion.lane]
        : [...state.lockedPack.map.lanePaths[minion.lane]].reverse();
    const enemyMinion = state.minions.find(
      (other) =>
        other.alive &&
        other.side !== minion.side &&
        other.lane === minion.lane &&
        dist(minion.position, other.position) <= minion.attackRange + 40,
    );
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
    const enemyChamp = state.champions.find(
      (champ) =>
        champ.alive &&
        champ.side !== minion.side &&
        dist(minion.position, champ.position) <= minion.attackRange + 40,
    );
    if (enemyChamp && state.scheduler.time >= minion.nextAttackAt) {
      applyDamage(state, null, enemyChamp, minion.ad, 'physical', recorder, 'minion');
      minion.nextAttackAt = state.scheduler.time + rules.attackIntervalSec;
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
        const moved = advanceAlongPath(
          minion.position,
          [{ ...structure.position }],
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
      const moved = advanceAlongPath(minion.position, [target], minion.moveSpeed, dt);
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

export function tryLastHit(
  state: GameState,
  champion: ChampionEntity,
  minion: MinionEntity,
  recorder?: ReplayRecorder,
): boolean {
  if (!minion.alive) {
    return false;
  }
  const expected = expectedAutoDamage(champion);
  const canExecute = minion.hp <= expected * 1.2;
  const carry =
    champion.positionLabel === 'BOT' ||
    champion.positionLabel === 'MID' ||
    champion.positionLabel === 'TOP';
  const farmPush =
    carry &&
    (champion.currentAction === 'farm' ||
      champion.currentAction === 'lane' ||
      champion.currentAction === 'siege') &&
    (minion.hp <= expected * 3.4 ||
      state.rng() <
        (champion.positionLabel === 'BOT' ? 0.86 : champion.positionLabel === 'MID' ? 0.78 : 0.8));
  const shove =
    champion.currentAction === 'siege' ||
    (champion.skills.laning < 55 && state.rng() < 0.4);
  if (!canExecute && !farmPush && !shove) {
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

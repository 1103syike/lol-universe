import { applyDamage, creditMinionKill } from '../combat/damage';
import { grantGold } from '../economy/economy';
import { dist } from '../map/pathfinding';
import type { ReplayRecorder } from '../replay/recorder';
import type { ChampionEntity, StructureEntity } from '../state/entities';
import { allocEntityId, pushGoldSample, type GameState } from '../state/game-state';
import type { LaneId } from '../types/ids';

export const BASE_SIEGE_PRESENCE_RANGE = 850;
export const NEXUS_TOWER_PRESENCE_RANGE = 1050;
export const LANE_SIEGE_PRESENCE_RANGE = 1400;
export const TOWER_ATTACK_RANGE = 825;
export const INHIBITOR_RESPAWN_SEC = 300;
export const INHIBITOR_SUPER_STOP_BEFORE_RESPAWN_SEC = 60;

function isPassiveStructure(kind: string): boolean {
  return kind === 'nexus' || kind === 'inhibitor';
}

function isNexusStructure(structure: StructureEntity): boolean {
  return structure.structureKind === 'nexus';
}

export function siegePresenceRange(structure: StructureEntity): number {
  if (structure.structureKind === 'nexus') {
    return BASE_SIEGE_PRESENCE_RANGE;
  }
  if (structure.structureKind === 'nexus_tower') {
    return NEXUS_TOWER_PRESENCE_RANGE;
  }
  return LANE_SIEGE_PRESENCE_RANGE;
}

export function hasAlliedSiegePresence(
  state: GameState,
  side: 'blue' | 'red',
  structure: StructureEntity,
): boolean {
  const range = siegePresenceRange(structure);
  return state.champions.some(
    (champ) =>
      champ.alive &&
      champ.side === side &&
      champ.recallPhase === 'none' &&
      dist(champ.position, structure.position) < range,
  );
}

function nearestSiegeAttacker(
  state: GameState,
  structure: StructureEntity,
): ChampionEntity | null {
  const range = siegePresenceRange(structure);
  let best: ChampionEntity | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const champ of state.champions) {
    if (!champ.alive || champ.side === structure.side || champ.recallPhase !== 'none') {
      continue;
    }
    const d = dist(champ.position, structure.position);
    if (d < range && d < bestDist) {
      best = champ;
      bestDist = d;
    }
  }
  return best;
}

export function bootstrapStructures(state: GameState): void {
  for (const def of state.lockedPack.structures) {
    const passive = isPassiveStructure(def.kind);
    const entity: StructureEntity = {
      id: allocEntityId(state, 'struct'),
      kind: 'structure',
      structureId: def.id,
      structureKind: def.kind,
      side: def.side,
      lane: def.lane,
      position: { ...def.position },
      hp: def.hp,
      maxHp: def.hp,
      ad: passive ? 0 : def.ad,
      range: passive ? 0 : Math.max(def.range, TOWER_ATTACK_RANGE),
      gold: def.gold,
      alive: true,
      nextAttackAt: 0,
      aggroTargetId: null,
      aggroUntil: 0,
      respawnAt: 0,
    };
    state.structures.push(entity);
  }
}

function sameLaneStructure(
  state: GameState,
  structure: StructureEntity,
  kind: string,
): StructureEntity | undefined {
  return state.structures.find(
    (item) =>
      item.side === structure.side &&
      item.lane === structure.lane &&
      item.structureKind === kind,
  );
}

export function canSiege(state: GameState, structure: StructureEntity): boolean {
  if (structure.structureKind === 'outer_tower') {
    return true;
  }
  if (structure.structureKind === 'inner_tower') {
    const outer = sameLaneStructure(state, structure, 'outer_tower');
    return !outer || !outer.alive;
  }
  if (structure.structureKind === 'inhib_tower') {
    const inner = sameLaneStructure(state, structure, 'inner_tower');
    return !inner || !inner.alive;
  }
  if (structure.structureKind === 'inhibitor') {
    const inhibTower = sameLaneStructure(state, structure, 'inhib_tower');
    if (inhibTower) {
      return !inhibTower.alive;
    }
    const inner = sameLaneStructure(state, structure, 'inner_tower');
    return !inner || !inner.alive;
  }
  if (structure.structureKind === 'nexus_tower') {
    const inhibs = state.structures.filter(
      (item) => item.side === structure.side && item.structureKind === 'inhibitor',
    );
    return inhibs.some((item) => !item.alive) || inhibs.length === 0;
  }
  if (structure.structureKind === 'nexus') {
    const nexusTowers = state.structures.filter(
      (item) => item.side === structure.side && item.structureKind === 'nexus_tower',
    );
    return nexusTowers.length === 0 || nexusTowers.every((item) => !item.alive);
  }
  return false;
}

function towerFountain(state: GameState, structure: StructureEntity) {
  return structure.side === 'blue'
    ? state.lockedPack.map.blueFountain
    : state.lockedPack.map.redFountain;
}

function isPastTowerTowardBase(
  state: GameState,
  structure: StructureEntity,
  point: { x: number; y: number },
): boolean {
  const fountain = towerFountain(state, structure);
  return dist(point, fountain) + 60 < dist(structure.position, fountain);
}

function pickTowerChampionTarget(
  state: GameState,
  structure: StructureEntity,
): ChampionEntity | null {
  const t = state.scheduler.time;
  if (structure.aggroTargetId && structure.aggroUntil > t) {
    const locked = state.champions.find(
      (champ) =>
        champ.id === structure.aggroTargetId &&
        champ.alive &&
        champ.side !== structure.side &&
        dist(champ.position, structure.position) <= structure.range,
    );
    if (locked) {
      return locked;
    }
    structure.aggroTargetId = null;
    structure.aggroUntil = 0;
  }
  let best: ChampionEntity | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const champ of state.champions) {
    if (!champ.alive || champ.side === structure.side) {
      continue;
    }
    const d = dist(champ.position, structure.position);
    if (d > structure.range) {
      continue;
    }
    const past = isPastTowerTowardBase(state, structure, champ.position) ? -400 : 0;
    const score = d + past;
    if (score < bestScore) {
      best = champ;
      bestScore = score;
    }
  }
  return best;
}

function respawnInhibitor(state: GameState, structure: StructureEntity, recorder?: ReplayRecorder): void {
  structure.alive = true;
  structure.hp = structure.maxHp;
  structure.respawnAt = 0;
  structure.aggroTargetId = null;
  structure.aggroUntil = 0;
  recorder?.record(state, {
    type: 'structure_kill',
    targetId: structure.id,
    payload: {
      structureId: structure.structureId,
      kind: structure.structureKind,
      lane: structure.lane ?? null,
      event: 'respawn',
      defenderSide: structure.side,
      defenderTeamId: structure.side === 'blue' ? state.blue.teamId : state.red.teamId,
    },
  });
}

export function tickStructures(state: GameState, recorder?: ReplayRecorder): void {
  const now = state.scheduler.time;
  for (const structure of state.structures) {
    if (
      !structure.alive &&
      structure.structureKind === 'inhibitor' &&
      structure.respawnAt > 0 &&
      now >= structure.respawnAt
    ) {
      respawnInhibitor(state, structure, recorder);
    }
  }
  for (const structure of state.structures) {
    if (!structure.alive || isPassiveStructure(structure.structureKind)) {
      continue;
    }
    if (structure.ad <= 0 || structure.range <= 0) {
      continue;
    }
    if (state.scheduler.time < structure.nextAttackAt) {
      continue;
    }
    const recallingEnemy = state.champions.find(
      (champ) =>
        champ.alive &&
        champ.side !== structure.side &&
        champ.recallPhase === 'moving_home' &&
        dist(champ.position, structure.position) <= structure.range,
    );
    if (recallingEnemy) {
      applyDamage(state, null, recallingEnemy, structure.ad * 0.85, 'physical', recorder, 'tower');
      structure.nextAttackAt = state.scheduler.time + 1.25;
      continue;
    }
    const aggroChamp = pickTowerChampionTarget(state, structure);
    if (
      aggroChamp &&
      (structure.aggroTargetId === aggroChamp.id ||
        isPastTowerTowardBase(state, structure, aggroChamp.position))
    ) {
      applyDamage(state, null, aggroChamp, structure.ad * 0.85, 'physical', recorder, 'tower');
      structure.nextAttackAt = state.scheduler.time + 1.25;
      continue;
    }
    const enemyMinion = state.minions.find(
      (minion) =>
        minion.alive &&
        minion.side !== structure.side &&
        dist(minion.position, structure.position) <= structure.range,
    );
    if (enemyMinion) {
      enemyMinion.hp -= structure.ad;
      if (enemyMinion.hp <= 0) {
        enemyMinion.alive = false;
        creditMinionKill(state, null, enemyMinion, recorder, 'tower');
      }
      structure.nextAttackAt = state.scheduler.time + 1.25;
      continue;
    }
    if (!aggroChamp) {
      continue;
    }
    applyDamage(state, null, aggroChamp, structure.ad * 0.85, 'physical', recorder, 'tower');
    structure.nextAttackAt = state.scheduler.time + 1.25;
  }
}

export function resolveStructureKill(
  state: GameState,
  structure: StructureEntity,
  killer: ChampionEntity | null,
  recorder?: ReplayRecorder,
): void {
  if (killer) {
    grantGold(state, killer, structure.gold, 'tower', recorder);
    for (const ally of state.champions) {
      if (ally.side === killer.side && ally.id !== killer.id) {
        grantGold(state, ally, structure.gold * 0.25, 'tower_share', recorder);
      }
    }
  } else {
    const beneficiaries = state.champions.filter(
      (champ) =>
        champ.alive &&
        champ.side !== structure.side &&
        champ.recallPhase === 'none' &&
        dist(champ.position, structure.position) < siegePresenceRange(structure),
    );
    const pool =
      beneficiaries.length > 0
        ? beneficiaries
        : state.champions.filter((champ) => champ.alive && champ.side !== structure.side);
    const share = structure.gold / Math.max(1, pool.length);
    for (const champ of pool) {
      grantGold(state, champ, share, 'tower_share', recorder);
    }
  }
  const actor = killer ?? nearestSiegeAttacker(state, structure);
  const assistRange = siegePresenceRange(structure);
  const assistIds = actor
    ? state.champions
        .filter(
          (champ) =>
            champ.alive &&
            champ.side === actor.side &&
            champ.id !== actor.id &&
            champ.recallPhase === 'none' &&
            dist(champ.position, structure.position) < assistRange,
        )
        .map((champ) => champ.id)
    : [];
  recorder?.record(state, {
    type: 'structure_kill',
    actorId: actor?.id,
    targetId: structure.id,
    payload: {
      structureId: structure.structureId,
      kind: structure.structureKind,
      lane: structure.lane ?? null,
      defenderSide: structure.side,
      defenderTeamId: structure.side === 'blue' ? state.blue.teamId : state.red.teamId,
      assistIds,
    },
  });
  pushGoldSample(state);
  if (structure.structureKind === 'inhibitor') {
    structure.respawnAt = state.scheduler.time + INHIBITOR_RESPAWN_SEC;
  }
  if (structure.structureKind === 'nexus') {
    state.ended = true;
    state.endReason = 'nexus';
    state.winnerTeamId =
      actor?.teamId ?? (structure.side === 'blue' ? state.red.teamId : state.blue.teamId);
    pushGoldSample(state);
    recorder?.record(state, {
      type: 'match_end',
      teamId: state.winnerTeamId,
      payload: { reason: 'nexus' },
    });
  }
}

export function laneInhibitorDownForSupers(
  state: GameState,
  attackingSide: 'blue' | 'red',
  lane: LaneId,
): boolean {
  const defenderSide = attackingSide === 'blue' ? 'red' : 'blue';
  const inhib = state.structures.find(
    (structure) =>
      structure.side === defenderSide &&
      structure.structureKind === 'inhibitor' &&
      structure.lane === lane,
  );
  if (!inhib || inhib.alive) {
    return false;
  }
  if (
    inhib.respawnAt > 0 &&
    inhib.respawnAt - state.scheduler.time <= INHIBITOR_SUPER_STOP_BEFORE_RESPAWN_SEC
  ) {
    return false;
  }
  return true;
}

export function allInhibitorsDownForSupers(
  state: GameState,
  attackingSide: 'blue' | 'red',
): boolean {
  for (const lane of ['top', 'mid', 'bot'] as const) {
    if (!laneInhibitorDownForSupers(state, attackingSide, lane)) {
      return false;
    }
  }
  return true;
}

function isBaseStructure(structure: StructureEntity): boolean {
  return (
    structure.structureKind === 'inhib_tower' ||
    structure.structureKind === 'inhibitor' ||
    structure.structureKind === 'nexus_tower' ||
    structure.structureKind === 'nexus'
  );
}

function structureFortify(structure: StructureEntity, t: number): number {
  if (isBaseStructure(structure)) {
    if (t < 1200) return 0.42;
    if (t < 1500) return 0.58;
    if (t < 1800) return 0.78;
    if (t < 2100) return 0.95;
    return 1.12;
  }
  if (t < 900) return 0.85;
  return 1;
}

function hasSiegeWave(
  state: GameState,
  side: 'blue' | 'red',
  structure: StructureEntity,
): boolean {
  const near = state.minions.filter(
    (minion) =>
      minion.alive &&
      minion.side === side &&
      dist(minion.position, structure.position) < 900,
  );
  if (near.length === 0) {
    return false;
  }
  if (near.some((minion) => minion.role === 'cannon' || minion.role === 'super')) {
    return true;
  }
  if (structure.structureKind === 'nexus' || structure.structureKind === 'nexus_tower') {
    return near.length >= 3;
  }
  if (isBaseStructure(structure)) {
    return near.length >= 2;
  }
  return true;
}

export function attackStructure(
  state: GameState,
  champion: ChampionEntity,
  structure: StructureEntity,
  recorder?: ReplayRecorder,
): void {
  if (!champion.alive || !structure.alive) {
    return;
  }
  if (!canSiege(state, structure)) {
    return;
  }
  const now = state.scheduler.time;
  if (now < champion.nextAttackAt) {
    return;
  }
  if (champion.recallPhase !== 'none') {
    return;
  }
  if (dist(champion.position, structure.position) > champion.attackRange + 80) {
    return;
  }
  if (!hasSiegeWave(state, champion.side, structure)) {
    return;
  }
  const team = champion.side === 'blue' ? state.blue : state.red;
  const t = state.scheduler.time;
  const baronBoost = team.hasBaron ? (t > 1500 ? 1.35 : 1.18) : 1;
  const closeout = t > 2100 ? 1.2 : t > 1800 ? 1.1 : t > 1500 ? 1.04 : 1;
  const itemCap = t > 1500 ? 0.35 : 0.14;
  const itemSiege = 1 + Math.min(itemCap, champion.items.length * (t > 1500 ? 0.06 : 0.03));
  const fortify = structureFortify(structure, t);
  const raw = champion.ad * baronBoost * closeout * itemSiege * fortify;
  applyDamage(state, champion, structure, raw, 'physical', recorder, 'siege');
  champion.nextAttackAt = now + 1 / Math.max(0.55, champion.attackSpeed);
  recorder?.record(state, {
    type: 'structure_damage',
    actorId: champion.id,
    targetId: structure.id,
    amount: raw,
  });
  if (!structure.alive) {
    resolveStructureKill(state, structure, champion, recorder);
  }
}

export function minionAttackStructure(
  state: GameState,
  minion: {
    side: 'blue' | 'red';
    ad: number;
    attackRange: number;
    position: { x: number; y: number };
    role?: string;
  },
  structure: StructureEntity,
  recorder?: ReplayRecorder,
): void {
  if (!structure.alive || !canSiege(state, structure)) {
    return;
  }
  if (dist(minion.position, structure.position) > minion.attackRange + 60) {
    return;
  }
  const alliedChampNear = hasAlliedSiegePresence(state, minion.side, structure);
  const isSuper = minion.role === 'super';
  const needsChampion =
    isNexusStructure(structure) ||
    structure.structureKind === 'nexus_tower' ||
    isBaseStructure(structure);
  if (!alliedChampNear && (needsChampion || !isSuper)) {
    return;
  }
  if (isNexusStructure(structure) && !alliedChampNear) {
    return;
  }
  const t = state.scheduler.time;
  const lateBoost = t > 1800 ? 1.1 : t > 1500 ? 1.03 : 1;
  const roleBonus =
    minion.role === 'super'
      ? 2.0
      : minion.role === 'cannon'
        ? 1.45
        : minion.role === 'caster'
          ? 0.85
          : 1.0;
  const aloneFactor = alliedChampNear ? 1 : isSuper ? 0.55 : 0;
  if (aloneFactor <= 0) {
    return;
  }
  const team = minion.side === 'blue' ? state.blue : state.red;
  const baronBoost = team.hasBaron ? (t > 1500 ? 1.45 : 1.2) : 1;
  const fortify = structureFortify(structure, t);
  structure.hp = Math.max(
    0,
    structure.hp - minion.ad * roleBonus * lateBoost * aloneFactor * baronBoost * fortify,
  );
  if (structure.hp <= 0) {
    structure.alive = false;
    resolveStructureKill(state, structure, null, recorder);
  }
}

export function wavePressuringStructure(
  state: GameState,
  side: 'blue' | 'red',
  structure: StructureEntity,
): boolean {
  return hasSiegeWave(state, side, structure);
}

export function nearestAttackableStructure(
  state: GameState,
  champion: ChampionEntity,
): StructureEntity | null {
  let best: StructureEntity | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const structure of state.structures) {
    if (!structure.alive || structure.side === champion.side) {
      continue;
    }
    if (!canSiege(state, structure)) {
      continue;
    }
    const d = dist(champion.position, structure.position);
    if (d < bestDist) {
      best = structure;
      bestDist = d;
    }
  }
  return best;
}

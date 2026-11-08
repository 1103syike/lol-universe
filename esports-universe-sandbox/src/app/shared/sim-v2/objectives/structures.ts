import { applyDamage, creditMinionKill } from '../combat/damage';
import { grantGold } from '../economy/economy';
import { dist } from '../map/pathfinding';
import type { ReplayRecorder } from '../replay/recorder';
import type { ChampionEntity, StructureEntity } from '../state/entities';
import { allocEntityId, pushGoldSample, type GameState } from '../state/game-state';

function isPassiveStructure(kind: string): boolean {
  return kind === 'nexus' || kind === 'inhibitor';
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
      range: passive ? 0 : def.range,
      gold: def.gold,
      alive: true,
      nextAttackAt: 0,
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

export function tickStructures(state: GameState, recorder?: ReplayRecorder): void {
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
    const target = state.champions.find(
      (champ) =>
        champ.alive &&
        champ.side !== structure.side &&
        dist(champ.position, structure.position) <= structure.range,
    );
    if (!target) {
      continue;
    }
    applyDamage(state, null, target, structure.ad * 0.85, 'physical', recorder, 'tower');
    structure.nextAttackAt = state.scheduler.time + 1.25;
  }
}

export function resolveStructureKill(
  state: GameState,
  structure: StructureEntity,
  killer: ChampionEntity | null,
  recorder?: ReplayRecorder,
  overtime = false,
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
      (champ) => champ.alive && champ.side !== structure.side,
    );
    const share = structure.gold / Math.max(1, beneficiaries.length);
    for (const champ of beneficiaries) {
      grantGold(state, champ, share, 'tower_share', recorder);
    }
  }
  const actor = killer ?? state.champions.find((champ) => champ.side !== structure.side);
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
      overtime: overtime || undefined,
    },
  });
  pushGoldSample(state);
  if (structure.structureKind === 'nexus') {
    state.ended = true;
    state.endReason = 'nexus';
    state.winnerTeamId =
      actor?.teamId ?? (structure.side === 'blue' ? state.red.teamId : state.blue.teamId);
    pushGoldSample(state);
    recorder?.record(state, {
      type: 'match_end',
      teamId: state.winnerTeamId,
      payload: { reason: overtime ? 'nexus_overtime' : 'nexus' },
    });
  }
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
  const alliedChampNear = state.champions.some(
    (champ) =>
      champ.alive &&
      champ.side === minion.side &&
      dist(champ.position, structure.position) < 1400,
  );
  const isSuper = minion.role === 'super';
  if (!alliedChampNear && !isSuper) {
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

export function destroyStructureForSiege(
  state: GameState,
  structure: StructureEntity,
  killer: ChampionEntity,
  recorder?: ReplayRecorder,
): void {
  if (!structure.alive || !canSiege(state, structure)) {
    return;
  }
  structure.hp = 0;
  structure.alive = false;
  resolveStructureKill(state, structure, killer, recorder, true);
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

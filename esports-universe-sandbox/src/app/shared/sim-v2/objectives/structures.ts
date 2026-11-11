import { applyDamage, creditMinionKill, mitigate } from '../combat/damage';

const MINION_TO_STRUCTURE_DAMAGE = 0.6;
import { grantGold } from '../economy/economy';
import { dist } from '../map/pathfinding';
import type { ReplayRecorder } from '../replay/recorder';
import type { ChampionEntity, MinionEntity, StructureEntity } from '../state/entities';
import { allocEntityId, pushGoldSample, type GameState } from '../state/game-state';
import type { LaneId } from '../types/ids';
import {
  DEFAULT_FOUNTAIN_ATTACK_RANGE,
  DEFAULT_MAP_LAYOUT,
  DEFAULT_TOWER_ATTACK_RANGE,
} from '../version/map-layout';

export const BASE_SIEGE_PRESENCE_RANGE = 850;
export const NEXUS_TOWER_PRESENCE_RANGE = 1050;
export const LANE_SIEGE_PRESENCE_RANGE = 1400;
export const TOWER_ATTACK_RANGE = DEFAULT_TOWER_ATTACK_RANGE;
export const TOWER_ATTACK_INTERVAL_SEC = 1.2;
export const INHIBITOR_RESPAWN_SEC = 300;
export const INHIBITOR_SUPER_STOP_BEFORE_RESPAWN_SEC = 60;
export const TURRET_PLATE_COUNT = 5;
export const TURRET_PLATING_END_SEC = 14 * 60;
export const TURRET_PLATE_GOLD = 120;
export const TURRET_PLATE_GOLD_RANGE = 1400;
export const TURRET_BULWARK_DURATION_SEC = 20;
export const TURRET_BULWARK_RESIST_PER_STACK = 40;

function isPassiveStructure(kind: string): boolean {
  return kind === 'nexus' || kind === 'inhibitor';
}

function isNexusStructure(structure: StructureEntity): boolean {
  return structure.structureKind === 'nexus';
}

export function towerDamageRatioVsMinion(
  structure: StructureEntity,
  minion: Pick<MinionEntity, 'role'>,
): number {
  if (minion.role === 'melee') {
    return 0.45;
  }
  if (minion.role === 'caster') {
    return 0.7;
  }
  if (minion.role === 'super') {
    return 0.07;
  }
  if (structure.structureKind === 'outer_tower') {
    return 0.14;
  }
  if (structure.structureKind === 'inner_tower') {
    return 0.11;
  }
  return 0.08;
}

export function applyTowerDamageToMinion(
  state: GameState,
  structure: StructureEntity,
  minion: MinionEntity,
  recorder?: ReplayRecorder,
): void {
  const ratio = towerDamageRatioVsMinion(structure, minion);
  const damage = Math.max(1, Math.round(minion.maxHp * ratio));
  minion.hp -= damage;
  if (minion.hp <= 0) {
    minion.alive = false;
    creditMinionKill(state, null, minion, recorder, 'tower');
  }
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

function hasTurretPlating(kind: string): boolean {
  return (
    kind === 'outer_tower' || kind === 'inner_tower' || kind === 'inhib_tower'
  );
}

export function bootstrapStructures(state: GameState): void {
  for (const def of state.lockedPack.structures) {
    const passive = isPassiveStructure(def.kind);
    const plated = hasTurretPlating(def.kind);
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
      range: passive ? 0 : Math.max(0, def.range || DEFAULT_TOWER_ATTACK_RANGE),
      armor: def.armor ?? (passive ? 20 : 60),
      mr: def.mr ?? (passive ? 0 : 60),
      gold: def.gold,
      alive: true,
      nextAttackAt: 0,
      aggroTargetId: null,
      aggroUntil: 0,
      respawnAt: 0,
      platesTotal: plated ? TURRET_PLATE_COUNT : 0,
      platesBroken: 0,
      platingEndsAt: plated ? TURRET_PLATING_END_SEC : 0,
      bulwarkStacks: 0,
      bulwarkUntil: 0,
    };
    state.structures.push(entity);
  }
}

function grantPlateGold(
  state: GameState,
  structure: StructureEntity,
  breaker: ChampionEntity | null,
  recorder?: ReplayRecorder,
): void {
  const recipients = new Map<string, ChampionEntity>();
  if (breaker && breaker.alive && breaker.side !== structure.side) {
    recipients.set(breaker.id, breaker);
  }
  for (const champ of state.champions) {
    if (!champ.alive || champ.side === structure.side) {
      continue;
    }
    if (dist(champ.position, structure.position) > TURRET_PLATE_GOLD_RANGE) {
      continue;
    }
    recipients.set(champ.id, champ);
  }
  if (recipients.size === 0) {
    return;
  }
  for (const champ of recipients.values()) {
    grantGold(state, champ, TURRET_PLATE_GOLD, 'turret_plate', recorder);
  }
  recorder?.record(state, {
    type: 'structure_damage',
    actorId: breaker?.id,
    targetId: structure.id,
    amount: TURRET_PLATE_GOLD,
    payload: {
      plateBroken: structure.platesBroken,
      platesRemaining: Math.max(0, structure.platesTotal - structure.platesBroken),
      reason: 'turret_plate',
    },
  });
}

export function syncTurretPlating(
  state: GameState,
  structure: StructureEntity,
  breaker: ChampionEntity | null,
  recorder?: ReplayRecorder,
): void {
  if (!structure.alive || structure.platesTotal <= 0) {
    return;
  }
  const t = state.scheduler.time;
  if (t >= structure.platingEndsAt) {
    structure.platesBroken = structure.platesTotal;
    return;
  }
  const plateHp = structure.maxHp / Math.max(1, structure.platesTotal);
  const brokenByHp = Math.min(
    structure.platesTotal,
    Math.floor((structure.maxHp - structure.hp) / plateHp + 1e-6),
  );
  while (structure.platesBroken < brokenByHp) {
    structure.platesBroken += 1;
    structure.bulwarkStacks = Math.min(4, structure.bulwarkStacks + 1);
    structure.bulwarkUntil = t + TURRET_BULWARK_DURATION_SEC;
    grantPlateGold(state, structure, breaker, recorder);
  }
}

function structureCombatArmor(structure: StructureEntity, t: number): number {
  const bulwark =
    structure.bulwarkUntil > t
      ? structure.bulwarkStacks * TURRET_BULWARK_RESIST_PER_STACK
      : 0;
  return structure.armor + bulwark;
}

function structureCombatMr(structure: StructureEntity, t: number): number {
  const bulwark =
    structure.bulwarkUntil > t
      ? structure.bulwarkStacks * TURRET_BULWARK_RESIST_PER_STACK
      : 0;
  return structure.mr + bulwark;
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

function towerMinionPriority(role: MinionEntity['role']): number {
  if (role === 'cannon' || role === 'super') {
    return 0;
  }
  if (role === 'melee') {
    return 1;
  }
  return 2;
}

export function pickTowerMinionTarget(
  state: GameState,
  structure: StructureEntity,
): MinionEntity | null {
  let best: MinionEntity | null = null;
  let bestPriority = Number.POSITIVE_INFINITY;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const minion of state.minions) {
    if (!minion.alive || minion.side === structure.side) {
      continue;
    }
    const d = dist(minion.position, structure.position);
    if (d > structure.range) {
      continue;
    }
    const priority = towerMinionPriority(minion.role);
    if (priority < bestPriority || (priority === bestPriority && d < bestDist)) {
      best = minion;
      bestPriority = priority;
      bestDist = d;
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
    updateTowerCombatStats(structure, now);
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
      applyDamage(
        state,
        structure,
        recallingEnemy,
        structure.ad * 0.85,
        'physical',
        recorder,
        'tower',
      );
      structure.nextAttackAt = state.scheduler.time + TOWER_ATTACK_INTERVAL_SEC;
      continue;
    }
    const aggroChamp = pickTowerChampionTarget(state, structure);
    if (
      aggroChamp &&
      (structure.aggroTargetId === aggroChamp.id ||
        isPastTowerTowardBase(state, structure, aggroChamp.position))
    ) {
      applyDamage(state, structure, aggroChamp, structure.ad * 0.85, 'physical', recorder, 'tower');
      structure.nextAttackAt = state.scheduler.time + TOWER_ATTACK_INTERVAL_SEC;
      continue;
    }
    const enemyMinion = pickTowerMinionTarget(state, structure);
    if (enemyMinion) {
      applyTowerDamageToMinion(state, structure, enemyMinion, recorder);
      structure.nextAttackAt = state.scheduler.time + TOWER_ATTACK_INTERVAL_SEC;
      continue;
    }
    if (!aggroChamp) {
      continue;
    }
    applyDamage(state, structure, aggroChamp, structure.ad * 0.85, 'physical', recorder, 'tower');
    structure.nextAttackAt = state.scheduler.time + TOWER_ATTACK_INTERVAL_SEC;
  }
  tickFountainLasers(state, recorder);
}

function tickFountainLasers(state: GameState, recorder?: ReplayRecorder): void {
  const fountainRange =
    DEFAULT_MAP_LAYOUT.attackRanges.fountain || DEFAULT_FOUNTAIN_ATTACK_RANGE;
  const now = state.scheduler.time;
  for (const side of ['blue', 'red'] as const) {
    if (now < state.fountainNextShotAt[side]) {
      continue;
    }
    const fountain =
      side === 'blue' ? state.lockedPack.map.blueFountain : state.lockedPack.map.redFountain;
    let hit = false;
    for (const champ of state.champions) {
      if (!champ.alive || champ.side === side) {
        continue;
      }
      if (dist(champ.position, fountain) > fountainRange) {
        continue;
      }
      applyDamage(state, null, champ, 220, 'true', recorder, 'fountain');
      hit = true;
    }
    if (hit) {
      state.fountainNextShotAt[side] = now + 0.25;
    }
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
  const attackerSide = structure.side === 'blue' ? 'red' : 'blue';
  const actor = killer ?? nearestSiegeAttacker(state, structure);
  const viaMinion = !actor;
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
  const nearbyMinion = state.minions.find(
    (minion) =>
      minion.alive &&
      minion.side === attackerSide &&
      dist(minion.position, structure.position) <= Math.max(structure.range, 900),
  );
  recorder?.record(state, {
    type: 'structure_kill',
    actorId: actor?.id,
    targetId: structure.id,
    teamId: actor?.teamId ?? (attackerSide === 'blue' ? state.blue.teamId : state.red.teamId),
    payload: {
      structureId: structure.structureId,
      kind: structure.structureKind,
      lane: structure.lane ?? null,
      defenderSide: structure.side,
      defenderTeamId: structure.side === 'blue' ? state.blue.teamId : state.red.teamId,
      attackerSide,
      viaMinion,
      minionRole: viaMinion ? nearbyMinion?.role ?? 'melee' : undefined,
      minionSide: viaMinion ? attackerSide : undefined,
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
    if (t < 1200) return 0.55;
    if (t < 1500) return 0.72;
    if (t < 1800) return 0.88;
    return 1;
  }
  return 1;
}

function updateTowerCombatStats(structure: StructureEntity, t: number): void {
  if (structure.ad <= 0 || structure.range <= 0) {
    return;
  }
  const minutes = Math.max(0, Math.floor(t / 60));
  if (structure.structureKind === 'outer_tower') {
    structure.ad = Math.min(350, Math.round(182 + minutes * 4.2));
    if (minutes >= 11) {
      const steps = Math.min(4, minutes - 10);
      structure.armor = Math.max(20, 60 - steps * 10);
      structure.mr = Math.max(0, 60 - steps * 15);
    } else {
      structure.armor = 60;
      structure.mr = 60;
    }
    return;
  }
  if (structure.structureKind === 'inner_tower' || structure.structureKind === 'inhib_tower') {
    structure.ad = Math.min(427, Math.round(187 + minutes * 6));
    structure.armor = 60;
    structure.mr = 60;
    return;
  }
  if (structure.structureKind === 'nexus_tower') {
    structure.ad = Math.min(405, Math.round(165 + minutes * 6));
    structure.armor = 60;
    structure.mr = 60;
  }
}

function isNexusFamily(structure: StructureEntity): boolean {
  return structure.structureKind === 'nexus' || structure.structureKind === 'nexus_tower';
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
  if (isNexusFamily(structure)) {
    return near.length >= 3;
  }
  if (isBaseStructure(structure)) {
    return near.length >= 2;
  }
  if (structure.structureKind === 'outer_tower') {
    return near.length >= 1;
  }
  if (structure.structureKind === 'inner_tower' || structure.structureKind === 'inhib_tower') {
    return near.length >= 2;
  }
  return near.length >= 1;
}

function hasOuterTowerMinionCover(
  state: GameState,
  side: 'blue' | 'red',
  structure: StructureEntity,
): boolean {
  if (structure.structureKind !== 'outer_tower') {
    return false;
  }
  const coverRange = Math.max(900, structure.range + 80);
  return state.minions.some(
    (minion) =>
      minion.alive &&
      minion.side === side &&
      dist(minion.position, structure.position) <= coverRange,
  );
}

function siegeWaveDamageBonus(
  state: GameState,
  side: 'blue' | 'red',
  structure: StructureEntity,
): number {
  const near = state.minions.filter(
    (minion) =>
      minion.alive &&
      minion.side === side &&
      dist(minion.position, structure.position) < 900,
  );
  if (near.length === 0) {
    return 1;
  }
  if (near.some((minion) => minion.role === 'super')) {
    return 1.35;
  }
  if (near.some((minion) => minion.role === 'cannon')) {
    return 1.25;
  }
  if (near.length >= 3) {
    return 1.18;
  }
  if (near.length >= 1) {
    return 1.08;
  }
  return 1;
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
  const waveReady = hasSiegeWave(state, champion.side, structure);
  const presenceReady = hasAlliedSiegePresence(state, champion.side, structure);
  const lateCloseout = state.scheduler.time >= 1080;
  const outerCoverReady =
    structure.structureKind === 'outer_tower' &&
    presenceReady &&
    hasOuterTowerMinionCover(state, champion.side, structure);
  if (
    !isNexusFamily(structure) &&
    !waveReady &&
    !outerCoverReady &&
    !(lateCloseout && presenceReady && isBaseStructure(structure))
  ) {
    return;
  }
  const team = champion.side === 'blue' ? state.blue : state.red;
  const t = state.scheduler.time;
  const baronBoost = team.hasBaron ? (t > 1500 ? 1.35 : 1.18) : 1;
  const closeout = t > 2100 ? 1.2 : t > 1800 ? 1.1 : t > 1500 ? 1.04 : 1;
  const itemCap = t > 1500 ? 0.35 : t < 900 ? 0.22 : 0.14;
  const itemSiege = 1 + Math.min(itemCap, champion.items.length * (t > 1500 ? 0.06 : 0.03));
  const fortify = structureFortify(structure, t);
  const waveBonus = isNexusFamily(structure)
    ? waveReady
      ? siegeWaveDamageBonus(state, champion.side, structure)
      : 0.88
    : 1;
  const earlyOuterBoost =
    structure.structureKind === 'outer_tower'
      ? t < 900
        ? 1.65
        : t < 1200
          ? 1.28
          : 1
      : 1;
  const raw =
    champion.ad * baronBoost * closeout * itemSiege * fortify * waveBonus * earlyOuterBoost;
  const beforeHp = structure.hp;
  const bulwarkBonus =
    structure.bulwarkUntil > t
      ? structure.bulwarkStacks * TURRET_BULWARK_RESIST_PER_STACK
      : 0;
  structure.armor += bulwarkBonus;
  structure.mr += bulwarkBonus;
  applyDamage(state, champion, structure, raw, 'physical', recorder, 'siege');
  structure.armor -= bulwarkBonus;
  structure.mr -= bulwarkBonus;
  syncTurretPlating(state, structure, champion, recorder);
  champion.nextAttackAt = now + 1 / Math.max(0.55, champion.attackSpeed);
  recorder?.record(state, {
    type: 'structure_damage',
    actorId: champion.id,
    targetId: structure.id,
    amount: Math.max(0, beforeHp - structure.hp),
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
  if (dist(minion.position, structure.position) > minion.attackRange + 80) {
    return;
  }
  const alliedChampNear = hasAlliedSiegePresence(state, minion.side, structure);
  const isSuper = minion.role === 'super';
  const needsChampion =
    isNexusStructure(structure) || structure.structureKind === 'nexus_tower';
  if (!alliedChampNear && needsChampion && !isSuper) {
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
  const aloneFactor = alliedChampNear ? 1 : isSuper ? 0.55 : needsChampion ? 0 : 1;
  if (aloneFactor <= 0) {
    return;
  }
  const team = minion.side === 'blue' ? state.blue : state.red;
  const baronBoost = team.hasBaron ? (t > 1500 ? 1.45 : 1.2) : 1;
  const fortify = structureFortify(structure, t);
  const earlyOuterMinion =
    structure.structureKind === 'outer_tower' && alliedChampNear && t < 960 ? 1.35 : 1;
  const raw =
    minion.ad *
    roleBonus *
    lateBoost *
    aloneFactor *
    baronBoost *
    fortify *
    earlyOuterMinion *
    MINION_TO_STRUCTURE_DAMAGE;
  const dealt = mitigate(
    raw,
    'physical',
    structureCombatArmor(structure, t),
    structureCombatMr(structure, t),
  );
  structure.hp = Math.max(0, structure.hp - dealt);
  const nearestBreaker =
    state.champions.find(
      (champ) =>
        champ.alive &&
        champ.side === minion.side &&
        dist(champ.position, structure.position) <= TURRET_PLATE_GOLD_RANGE,
    ) ?? null;
  syncTurretPlating(state, structure, nearestBreaker, recorder);
  if (structure.hp <= 0) {
    structure.alive = false;
    resolveStructureKill(state, structure, nearestBreaker, recorder);
  }
}

export function wavePressuringStructure(
  state: GameState,
  side: 'blue' | 'red',
  structure: StructureEntity,
): boolean {
  if (hasSiegeWave(state, side, structure)) {
    return true;
  }
  if (
    isNexusFamily(structure) &&
    canSiege(state, structure) &&
    hasAlliedSiegePresence(state, side, structure)
  ) {
    return true;
  }
  return (
    state.scheduler.time >= 1080 &&
    isBaseStructure(structure) &&
    canSiege(state, structure) &&
    hasAlliedSiegePresence(state, side, structure)
  );
}

export function siegeEligibility(
  state: GameState,
  side: 'blue' | 'red',
  structure: StructureEntity,
): {
  unlocked: boolean;
  championsMayAttack: boolean;
  minionsMayAttack: boolean;
  needsWave: boolean;
  needsPresence: boolean;
  pressured: boolean;
} {
  const unlocked = canSiege(state, structure);
  const waveReady = hasSiegeWave(state, side, structure);
  const presence = hasAlliedSiegePresence(state, side, structure);
  const nexusFamily = isNexusFamily(structure);
  const lateCloseout = state.scheduler.time >= 1080;
  const outerCoverReady =
    structure.structureKind === 'outer_tower' &&
    presence &&
    hasOuterTowerMinionCover(state, side, structure);
  return {
    unlocked,
    championsMayAttack:
      unlocked &&
      (nexusFamily ||
        waveReady ||
        outerCoverReady ||
        (lateCloseout && presence && isBaseStructure(structure))),
    minionsMayAttack: unlocked && (presence || waveReady),
    needsWave: !nexusFamily,
    needsPresence: nexusFamily || lateCloseout,
    pressured: wavePressuringStructure(state, side, structure),
  };
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

import { CHAMPION_COMBAT_BY_ID } from '../../../core/data/champion-combat';
import { dist } from '../map/pathfinding';
import type { ChampionEntity } from '../state/entities';
import type { GameState } from '../state/game-state';
import type { AbilitySlot } from '../types/ids';
import type { ReplayRecorder } from '../replay/recorder';
import {
  CHAMPION_ABILITY_CATALOG,
  type SlotSpec,
} from './champion-ability-catalog';
import { applyDamage, type Damageable } from './damage';
import { dealToTarget, heal, hitChampionsInRadius, rank } from './ability-helpers';
import { aatroxState, ezrealState } from './ability-runtime-state';
import { detonateEzrealW } from './combo-champions';
import { resolveAbilityExecutor } from './executors';

function monsterAbilityFallback(
  state: GameState,
  caster: ChampionEntity,
  slot: AbilitySlot,
  target: Damageable,
  level: number,
  recorder?: ReplayRecorder,
): boolean {
  if (target.kind !== 'monster' || slot === 'P') {
    return false;
  }
  const profile = CHAMPION_ABILITY_CATALOG[caster.championId];
  const spec: SlotSpec | null =
    profile && (slot === 'Q' || slot === 'W' || slot === 'E' || slot === 'R')
      ? profile[slot]
      : null;
  const r = rank(level);
  if (spec) {
    if (
      spec.kind === 'hook' ||
      spec.kind === 'snare' ||
      spec.kind === 'peel' ||
      spec.kind === 'executeUlt' ||
      spec.kind === 'assassinate' ||
      spec.kind === 'duelUlt' ||
      spec.kind === 'burstUlt' ||
      spec.kind === 'teamUlt'
    ) {
      return false;
    }
    const raw =
      spec.base +
      spec.perLevel * (r - 1) +
      caster.ad * spec.ad +
      caster.ap * spec.ap;
    const dtype = profile?.damageType ?? 'physical';
    if (spec.kind === 'cleave' || spec.kind === 'wave' || spec.kind === 'zone') {
      hitChampionsInRadius(
        state,
        caster,
        spec.kind === 'zone' ? 360 : 320,
        raw,
        dtype,
        `${caster.championId}:${slot}:jg`,
        recorder,
      );
    }
    dealToTarget(
      state,
      caster,
      target,
      raw * (spec.kind === 'sweetspot' ? 0.85 : 1),
      dtype,
      `${caster.championId}:${slot}:jg`,
      recorder,
    );
    return true;
  }
  if (slot === 'R') {
    return false;
  }
  const raw =
    slot === 'Q'
      ? 55 + (r - 1) * 28 + caster.ad * 0.7 + caster.ap * 0.45
      : slot === 'W'
        ? 40 + (r - 1) * 22 + caster.ad * 0.45 + caster.ap * 0.4
        : 45 + (r - 1) * 24 + caster.ad * 0.55 + caster.ap * 0.35;
  dealToTarget(
    state,
    caster,
    target,
    raw,
    caster.ap >= caster.ad ? 'magic' : 'physical',
    `${caster.championId}:${slot}:jg`,
    recorder,
  );
  return true;
}

export function basicAttack(
  state: GameState,
  attacker: ChampionEntity,
  target: Damageable,
  recorder?: ReplayRecorder,
): boolean {
  if (!attacker.alive || !target.alive) {
    return false;
  }
  if (attacker.statuses.some((status) => status.kind === 'stun')) {
    return false;
  }
  const t = state.scheduler.time;
  if (t < attacker.nextAttackAt) {
    return false;
  }
  if (dist(attacker.position, target.position) > attacker.attackRange + 25) {
    return false;
  }
  const skill = attacker.skills.mechanics / 100;
  const roleScale = attacker.positionLabel === 'BOT' ? 0.88 : 1;
  const raw = attacker.ad * (1 + 0.12 * skill) * roleScale;
  applyDamage(state, attacker, target, raw, 'physical', recorder, 'auto');
  if (attacker.championId === 'Aatrox' && target.kind === 'champion') {
    applyAatroxPassive(state, attacker, target, recorder);
  }
  if (attacker.championId === 'Ezreal') {
    detonateEzrealW(state, attacker, target, false, recorder);
  }
  if (attacker.championId === 'Graves') {
    applyGravesBuckshot(state, attacker, target, raw, recorder);
  }
  attacker.nextAttackAt = t + 1 / Math.max(0.2, attacker.attackSpeed);
  recorder?.record(state, {
    type: 'attack',
    actorId: attacker.id,
    targetId: target.id,
    amount: raw,
  });
  return true;
}

function applyAatroxPassive(
  state: GameState,
  attacker: ChampionEntity,
  target: Damageable,
  recorder?: ReplayRecorder,
): void {
  if (target.kind !== 'champion') {
    return;
  }
  const bag = aatroxState(attacker);
  const now = state.scheduler.time;
  if (now < bag.passiveReadyAt) {
    bag.passiveReadyAt = Math.max(0, bag.passiveReadyAt - 2);
    return;
  }
  const pct = 0.04 + Math.min(0.04, (attacker.level - 1) * 0.0025);
  const raw = Math.min(target.maxHp * pct, 180 + attacker.level * 8);
  applyDamage(state, attacker, target, raw, 'magic', recorder, 'aatrox:p');
  const healMult = bag.rUntil > now ? bag.rHealMult : 1;
  heal(attacker, raw * healMult, attacker);
  bag.passiveReadyAt = now + Math.max(8, 22 - attacker.level * 0.7);
}

function applyGravesBuckshot(
  state: GameState,
  attacker: ChampionEntity,
  primary: Damageable,
  pelletRaw: number,
  recorder?: ReplayRecorder,
): void {
  const dx = primary.position.x - attacker.position.x;
  const dy = primary.position.y - attacker.position.y;
  const len = Math.hypot(dx, dy) || 1;
  const fx = dx / len;
  const fy = dy / len;
  const range = attacker.attackRange + 100;
  const cosMin = 0.5;
  const splash = (unit: Damageable, scale: number) => {
    if (!unit.alive || unit.id === primary.id) {
      return;
    }
    const gap = dist(attacker.position, unit.position);
    if (gap > range) {
      return;
    }
    const ux = unit.position.x - attacker.position.x;
    const uy = unit.position.y - attacker.position.y;
    const ulen = Math.hypot(ux, uy) || 1;
    const cos = (ux * fx + uy * fy) / ulen;
    if (cos < cosMin) {
      return;
    }
    applyDamage(state, attacker, unit, pelletRaw * scale, 'physical', recorder, 'auto');
  };
  for (const enemy of state.champions) {
    if (enemy.side === attacker.side) {
      continue;
    }
    splash(enemy, 0.42);
  }
  for (const minion of state.minions) {
    if (minion.side === attacker.side) {
      continue;
    }
    splash(minion, 0.7);
  }
  for (const monster of state.monsters) {
    splash(monster, 0.9);
  }
}

export function castAbility(
  state: GameState,
  caster: ChampionEntity,
  slot: AbilitySlot,
  target: Damageable | null,
  recorder?: ReplayRecorder,
): boolean {
  if (!caster.alive || slot === 'P') {
    return false;
  }
  if (caster.statuses.some((status) => status.kind === 'stun')) {
    return false;
  }
  const def = state.lockedPack.champions[caster.championId]?.abilities.find((a) => a.slot === slot);
  const runtime = caster.abilities.find((a) => a.slot === slot);
  if (!def || !runtime || runtime.level <= 0) {
    return false;
  }
  if (def.implementationStatus === 'stub') {
    return false;
  }
  const t = state.scheduler.time;
  if (t < runtime.cooldownUntil) {
    return false;
  }
  const rankIndex = Math.max(0, runtime.level - 1);
  const rankedCost = def.manaCostByRank?.[rankIndex];
  const manaCost =
    caster.maxMana <= 1 ? 0 : rankedCost != null ? rankedCost : def.manaCost;
  if (caster.mana < manaCost) {
    return false;
  }
  if (target && dist(caster.position, target.position) > def.range + 40) {
    return false;
  }
  caster.mana = Math.max(0, caster.mana - manaCost);
  if (caster.maxMana > 1) {
    caster.mana = Math.min(caster.maxMana, caster.mana + 8);
  }
  const combatTarget = target && 'kind' in target && target.kind === 'champion';
  const cdScale = combatTarget ? 0.85 : 0.95;
  const minCd = caster.positionLabel === 'SUPPORT' ? 2.5 : 1.8;
  const rankedCd = def.cooldownByRank?.[rankIndex];
  const cooldownSec = rankedCd != null ? rankedCd : def.cooldownSec;
  const previousCd = runtime.cooldownUntil;
  recorder?.record(state, {
    type: 'ability',
    actorId: caster.id,
    targetId: target?.id,
    payload: { slot, status: def.implementationStatus },
  });
  const executor = resolveAbilityExecutor(caster.championId, slot);
  let ok = executor({
    state,
    caster,
    slot,
    target,
    level: runtime.level,
    recorder,
  });
  if (!ok && target && target.kind === 'monster') {
    ok = monsterAbilityFallback(state, caster, slot, target, runtime.level, recorder);
  }
  if (!ok) {
    caster.mana = Math.min(caster.maxMana, caster.mana + manaCost);
    return false;
  }
  if (caster.abilityBag.customCooldownApplied) {
    caster.abilityBag.customCooldownApplied = false;
  } else if (runtime.cooldownUntil === previousCd) {
    runtime.cooldownUntil = t + Math.max(minCd, cooldownSec * cdScale);
  }
  return true;
}

export function levelAbility(champion: ChampionEntity, slot: AbilitySlot): void {
  const ability = champion.abilities.find((item) => item.slot === slot);
  if (!ability || slot === 'P') {
    return;
  }
  const dataMax = CHAMPION_COMBAT_BY_ID[champion.championId]?.abilities.find(
    (item) => item.slot === slot,
  )?.maxRank;
  const max = slot === 'R' ? 3 : Math.max(1, Math.min(6, dataMax ?? 5));
  if (ability.level >= max) {
    return;
  }
  ability.level += 1;
}

import { CHAMPION_COMBAT_BY_ID } from '../../../core/data/champion-combat';
import { dist } from '../map/pathfinding';
import type { ChampionEntity } from '../state/entities';
import type { GameState } from '../state/game-state';
import type { AbilitySlot } from '../types/ids';
import type { ReplayRecorder } from '../replay/recorder';
import { applyDamage, type Damageable } from './damage';
import { resolveAbilityExecutor } from './executors';

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
  attacker.nextAttackAt = t + 1 / Math.max(0.2, attacker.attackSpeed);
  recorder?.record(state, {
    type: 'attack',
    actorId: attacker.id,
    targetId: target.id,
    amount: raw,
  });
  return true;
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
  runtime.cooldownUntil = t + Math.max(minCd, cooldownSec * cdScale);
  recorder?.record(state, {
    type: 'ability',
    actorId: caster.id,
    targetId: target?.id,
    payload: { slot, status: def.implementationStatus },
  });
  const executor = resolveAbilityExecutor(caster.championId, slot);
  return executor({
    state,
    caster,
    slot,
    target,
    level: runtime.level,
    recorder,
  });
}

export function levelAbility(champion: ChampionEntity, slot: AbilitySlot): void {
  const ability = champion.abilities.find((item) => item.slot === slot);
  if (!ability || slot === 'P') {
    return;
  }
  const dataMax = CHAMPION_COMBAT_BY_ID[champion.championId]?.abilities.find(
    (item) => item.slot === slot,
  )?.maxRank;
  const max =
    slot === 'R' ? 3 : Math.max(1, Math.min(6, dataMax ?? 5));
  if (ability.level >= max) {
    return;
  }
  ability.level += 1;
}
